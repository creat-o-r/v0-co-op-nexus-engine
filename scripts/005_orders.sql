-- ============================================================
-- Migration 005: Orders, Order Items, Order Preferences
-- ============================================================

-- ── Order Preferences (per-user default order agreement) ────
CREATE TABLE IF NOT EXISTS order_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allow_swaps       BOOLEAN DEFAULT true,
  allow_money       BOOLEAN DEFAULT true,
  allow_mixed       BOOLEAN DEFAULT true,
  min_trust_points  INT DEFAULT 0,
  auto_accept       BOOLEAN DEFAULT false,
  accepted_hubs     TEXT[] DEFAULT '{}',
  blacklisted_items TEXT[] DEFAULT '{}',
  notes             TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT order_prefs_user_unique UNIQUE (user_id)
);

ALTER TABLE order_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_prefs_select_own ON order_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY order_prefs_insert_own ON order_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY order_prefs_update_own ON order_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow reading other users' preferences (so you know what they accept)
CREATE POLICY order_prefs_select_public ON order_preferences
  FOR SELECT USING (true);

-- ── Orders ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id      UUID NOT NULL REFERENCES auth.users(id),
  counterparty_id   UUID NOT NULL REFERENCES auth.users(id),
  order_type        TEXT NOT NULL CHECK (order_type IN ('purchase', 'swap', 'mixed')),
  status            TEXT NOT NULL DEFAULT 'proposed'
                      CHECK (status IN (
                        'proposed',    -- initiator proposed
                        'accepted',    -- counterparty accepted
                        'in_transit',  -- items picked up / en route
                        'delivered',   -- items arrived
                        'completed',   -- both parties confirmed
                        'rejected',    -- counterparty rejected
                        'cancelled',   -- either party cancelled before transit
                        'disputed'     -- disagreement, needs resolution
                      )),
  -- Money component
  money_amount      NUMERIC DEFAULT 0,
  money_direction   TEXT CHECK (money_direction IN ('initiator_pays', 'counterparty_pays')),

  -- Linked entities
  related_agreement_id UUID REFERENCES agreements(id),
  related_route_id     UUID REFERENCES logistics_routes(id),
  related_need_id      UUID REFERENCES user_needs(id),
  related_surplus_id   UUID REFERENCES user_surplus(id),

  -- Location
  pickup_hub        TEXT,
  dropoff_hub       TEXT,

  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  -- Can't order with yourself
  CONSTRAINT orders_different_parties CHECK (initiator_id != counterparty_id)
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Both parties can see their orders
CREATE POLICY orders_select_own ON orders
  FOR SELECT USING (auth.uid() IN (initiator_id, counterparty_id));

-- Authenticated users can create orders
CREATE POLICY orders_insert_auth ON orders
  FOR INSERT WITH CHECK (auth.uid() = initiator_id);

-- Both parties can update (for status changes)
CREATE POLICY orders_update_party ON orders
  FOR UPDATE USING (auth.uid() IN (initiator_id, counterparty_id));

-- Only initiator can delete (cancel) while still proposed
CREATE POLICY orders_delete_initiator ON orders
  FOR DELETE USING (auth.uid() = initiator_id AND status = 'proposed');

-- ── Order Items (bi-directional line items) ─────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  product_type_id UUID REFERENCES product_types(id),
  surplus_id      UUID REFERENCES user_surplus(id),
  product_name    TEXT NOT NULL,
  quantity        NUMERIC NOT NULL CHECK (quantity > 0),
  unit            TEXT NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('to_counterparty', 'to_initiator')),
  -- to_counterparty: initiator sends this TO the counterparty
  -- to_initiator: counterparty sends this TO the initiator
  price_per_unit  NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Items visible to both parties
CREATE POLICY order_items_select ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND auth.uid() IN (o.initiator_id, o.counterparty_id)
    )
  );

CREATE POLICY order_items_insert ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND auth.uid() = o.initiator_id
        AND o.status = 'proposed'
    )
  );

CREATE POLICY order_items_delete ON order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND auth.uid() = o.initiator_id
        AND o.status = 'proposed'
    )
  );

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_initiator ON orders(initiator_id);
CREATE INDEX IF NOT EXISTS idx_orders_counterparty ON orders(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_prefs_user ON order_preferences(user_id);

-- ── Seed: Default order preferences for existing users ──────
-- Give every seed user default preferences
INSERT INTO order_preferences (user_id, allow_swaps, allow_money, allow_mixed, min_trust_points, auto_accept, notes)
SELECT
  p.id,
  true,
  true,
  true,
  0,
  false,
  'Default order preferences'
FROM profiles p
ON CONFLICT (user_id) DO NOTHING;

-- ── Seed: Sample orders to demonstrate all types ────────────
DO $$
DECLARE
  v_users UUID[];
  v_surplus_id UUID;
  v_need_id UUID;
  v_route_id UUID;
  v_order_id UUID;
BEGIN
  -- Grab first 4 user IDs
  SELECT array_agg(id ORDER BY created_at) INTO v_users
  FROM (SELECT id, created_at FROM profiles LIMIT 4) sub;

  IF array_length(v_users, 1) < 2 THEN
    RAISE NOTICE 'Not enough users to seed orders';
    RETURN;
  END IF;

  -- Grab a surplus, need, and route for linking
  SELECT id INTO v_surplus_id FROM user_surplus WHERE is_active = true LIMIT 1;
  SELECT id INTO v_need_id FROM user_needs WHERE is_active = true LIMIT 1;
  SELECT id INTO v_route_id FROM logistics_routes WHERE is_active = true LIMIT 1;

  -- 1. Purchase order (User 1 buys from User 2)
  INSERT INTO orders (initiator_id, counterparty_id, order_type, status, money_amount, money_direction, related_surplus_id, pickup_hub, dropoff_hub, notes)
  VALUES (v_users[1], v_users[2], 'purchase', 'accepted', 12.50, 'initiator_pays', v_surplus_id, 'Greendale Hub', 'Riverside Hub', 'Weekly egg order')
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_name, quantity, unit, direction, surplus_id, price_per_unit)
  VALUES (v_order_id, 'Free-Range Eggs', 2, 'dozen', 'to_initiator', v_surplus_id, 6.25);

  -- 2. Pure swap (User 1 trades flour for User 3's honey)
  INSERT INTO orders (initiator_id, counterparty_id, order_type, status, money_amount, pickup_hub, dropoff_hub, notes)
  VALUES (v_users[1], v_users[3], 'swap', 'proposed', 0, 'Greendale Hub', 'Greendale Hub', 'Flour-for-honey swap')
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_name, quantity, unit, direction) VALUES
    (v_order_id, 'Organic Flour', 3, 'kg', 'to_counterparty'),
    (v_order_id, 'Raw Honey', 1, 'jar', 'to_initiator');

  -- 3. Mixed order (User 2 sends bread + $3 for User 4's preserves)
  INSERT INTO orders (initiator_id, counterparty_id, order_type, status, money_amount, money_direction, pickup_hub, notes)
  VALUES (v_users[2], v_users[4], 'mixed', 'in_transit', 3.00, 'initiator_pays', 'Riverside Hub', 'Bread + cash for preserves')
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_name, quantity, unit, direction) VALUES
    (v_order_id, 'Sourdough Bread', 2, 'loaves', 'to_counterparty'),
    (v_order_id, 'Berry Preserves', 3, 'jars', 'to_initiator');

  -- 4. Route-linked purchase (User 3 buys from User 2 via a route)
  IF v_route_id IS NOT NULL THEN
    INSERT INTO orders (initiator_id, counterparty_id, order_type, status, money_amount, money_direction, related_route_id, related_need_id, pickup_hub, dropoff_hub, notes)
    VALUES (v_users[3], v_users[2], 'purchase', 'delivered', 8.00, 'initiator_pays', v_route_id, v_need_id, 'Riverside Hub', 'Greendale Hub', 'Delivery via community route')
    RETURNING id INTO v_order_id;

    INSERT INTO order_items (order_id, product_name, quantity, unit, direction, price_per_unit)
    VALUES (v_order_id, 'Mixed Vegetables', 4, 'kg', 'to_initiator', 2.00);
  END IF;

END $$;
