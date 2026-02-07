-- ============================================================
-- Migration 007: Seed a system demo user with surplus + needs
-- so the matching engine has data to match against real users
-- ============================================================

-- Create a system/demo user in auth.users (admin-only operation)
-- Uses a well-known UUID so we can reference it consistently
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, instance_id)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'demo-farmer@coop.local',
  crypt('not-a-real-password', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, instance_id)
VALUES (
  'd0000000-0000-0000-0000-000000000002',
  'demo-baker@coop.local',
  crypt('not-a-real-password', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (id) DO NOTHING;

-- Create profiles for system users
INSERT INTO profiles (id, display_name, bio, hubs, talents, trust_points, is_verified)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Greendale Farm', 'Local organic farm supplying the community with fresh produce, eggs, and honey.', '{"Greendale Hub"}', '{"farming", "beekeeping", "organic"}', 42, true),
  ('d0000000-0000-0000-0000-000000000002', 'Riverside Bakery', 'Artisan bakery specializing in sourdough, pastries, and custom bread.', '{"Riverside Hub"}', '{"baking", "pastry", "sourdough"}', 38, true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  hubs = EXCLUDED.hubs,
  talents = EXCLUDED.talents,
  trust_points = EXCLUDED.trust_points,
  is_verified = EXCLUDED.is_verified;

-- ── Seed surplus (offers) on system users ───────────────────
DELETE FROM user_surplus WHERE user_id IN (
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002'
);

INSERT INTO user_surplus (user_id, product_name, quantity_available, unit, price_per_unit, available_from, notes, is_active, verification_status) VALUES
  -- Greendale Farm offers
  ('d0000000-0000-0000-0000-000000000001', 'Free-Range Eggs',     10, 'dozen',  5.50, now()::date, 'Pasture-raised, collected daily',          true, 'peer_verified'),
  ('d0000000-0000-0000-0000-000000000001', 'Raw Honey',            8, 'jar',    9.00, now()::date, 'Wildflower honey, 500g jars',              true, 'peer_verified'),
  ('d0000000-0000-0000-0000-000000000001', 'Mixed Vegetables',    20, 'kg',     3.50, now()::date, 'Seasonal mix: carrots, beans, courgettes', true, 'self_reported'),
  ('d0000000-0000-0000-0000-000000000001', 'Organic Potatoes',    30, 'kg',     2.00, now()::date, 'King Edwards, freshly dug',                true, 'self_reported'),
  ('d0000000-0000-0000-0000-000000000001', 'Fresh Herbs Bundle',  15, 'bundle', 3.00, now()::date, 'Basil, rosemary, thyme',                   true, 'self_reported'),
  -- Riverside Bakery offers
  ('d0000000-0000-0000-0000-000000000002', 'Sourdough Bread',     12, 'loaf',   4.50, now()::date, 'Traditional 48hr ferment sourdough',       true, 'peer_verified'),
  ('d0000000-0000-0000-0000-000000000002', 'Croissants',          20, 'piece',  2.50, now()::date, 'Butter croissants, baked fresh daily',     true, 'self_reported'),
  ('d0000000-0000-0000-0000-000000000002', 'Organic Flour',       50, 'kg',     1.80, now()::date, 'Stoneground, from local mill',             true, 'peer_verified'),
  ('d0000000-0000-0000-0000-000000000002', 'Berry Preserves',     10, 'jar',    6.00, now()::date, 'Mixed berry, small-batch',                 true, 'self_reported');

-- ── Seed needs on system users (so real users' offers can match too) ──
DELETE FROM user_needs WHERE user_id IN (
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002'
);

INSERT INTO user_needs (user_id, product_name, quantity, unit, frequency, max_price_per_unit, priority, notes, is_active) VALUES
  -- Greendale Farm needs
  ('d0000000-0000-0000-0000-000000000001', 'Sourdough Bread',  4, 'loaf',   'weekly',   5.00, 'normal', 'For the farm shop',           true),
  ('d0000000-0000-0000-0000-000000000001', 'Organic Flour',   10, 'kg',     'monthly',  2.00, 'low',    'For farm kitchen baking',     true),
  ('d0000000-0000-0000-0000-000000000001', 'Berry Preserves',  3, 'jar',    'monthly',  7.00, 'low',    'For farmhouse breakfast',     true),
  -- Riverside Bakery needs
  ('d0000000-0000-0000-0000-000000000002', 'Free-Range Eggs', 10, 'dozen',  'weekly',   6.00, 'high',   'Essential for daily baking',  true),
  ('d0000000-0000-0000-0000-000000000002', 'Raw Honey',        2, 'jar',    'monthly',  10.00,'normal', 'For honey pastries',          true),
  ('d0000000-0000-0000-0000-000000000002', 'Fresh Herbs Bundle',5,'bundle', 'weekly',   4.00, 'normal', 'For focaccia and bread',      true),
  ('d0000000-0000-0000-0000-000000000002', 'Mixed Vegetables', 5, 'kg',     'weekly',   4.00, 'low',    'Staff lunches',               true);

-- ── Seed a logistics route between the two hubs ─────────────
INSERT INTO logistics_routes (user_id, route_name, start_hub, end_hub, waypoints, schedule, departure_time, max_cargo_size, willing_to_detour, is_active)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Greendale to Riverside Weekly',
  'Greendale Hub',
  'Riverside Hub',
  '{}',
  '{"Wednesday", "Saturday"}',
  '08:00',
  50,
  true,
  true
)
ON CONFLICT DO NOTHING;

-- ── Add system users as collaborators on the seeded agreement ──
INSERT INTO agreement_collaborators (agreement_id, user_id, role)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'collaborator'),
  ('c1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'collaborator')
ON CONFLICT DO NOTHING;
