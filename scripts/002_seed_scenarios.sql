-- Seed Initial Scenario Cards for Market Research
-- These are the first cards new users see during onboarding

-- Insert system user for scenarios (optional, can use NULL)
-- We'll use the first admin user or create scenarios without a user_id initially

-- ============================================
-- MOTIVATION SCENARIOS
-- ============================================

INSERT INTO public.feed_items (id, user_id, feed_type, title, content, scenario_question, scenario_options, tagged_products, is_pinned)
VALUES 
  (
    'a1000000-0000-0000-0000-000000000001',
    NULL,
    'scenario',
    'What Matters Most',
    'Help us understand what drives your food choices so we can match you with the right producers.',
    'When choosing food, what matters most to you?',
    '["Price - I need the best value for my budget", "Quality - I want the freshest, best-tasting options", "Ethics - Supporting local and sustainable matters most", "Convenience - Easy pickup or delivery is key", "Health - Specific dietary needs drive my choices"]',
    '{}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    NULL,
    'scenario',
    'Bulk Buying Interest',
    'Buying in bulk with neighbors can unlock wholesale prices. Would you participate?',
    'Would you join a bulk buying group to save money?',
    '["Yes! I''d love to split large orders with neighbors", "Maybe, if the savings were significant (20%+)", "I''d need to know more about how it works", "No, I prefer buying smaller quantities"]',
    '{}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    NULL,
    'scenario',
    'Distribution Hub',
    'Some members become pickup points for their neighborhood, earning trust points.',
    'Would you be willing to be a local pickup point?',
    '["Yes, I have space and would love to help", "Maybe occasionally, for small orders", "I''d prefer to just pick up from others", "I''d rather have items delivered directly"]',
    '{}',
    true
  );

-- ============================================
-- PRODUCT WISHLIST SCENARIOS
-- ============================================

INSERT INTO public.feed_items (id, user_id, feed_type, title, content, scenario_question, scenario_options, tagged_products, is_pinned)
VALUES 
  (
    'a1000000-0000-0000-0000-000000000004',
    NULL,
    'scenario',
    'Fresh Eggs',
    'Pasture-raised eggs from local farms - often available within days of being laid.',
    'I want access to local, pasture-raised eggs',
    '["Yes! This is exactly what I want", "I''m interested but price matters", "I already have a source", "Not interested in eggs"]',
    '{"eggs", "poultry"}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    NULL,
    'scenario',
    'Bulk Organic Flour',
    'High-quality organic flour at wholesale prices by pooling orders with your neighbors.',
    'I would buy bulk organic flour (25-50lb bags split with neighbors)',
    '["Yes! I bake regularly and would love this", "Interested if I can split with others", "I''d want to try a smaller amount first", "I don''t use much flour"]',
    '{"flour", "grains", "baking"}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    NULL,
    'scenario',
    'Raw Milk',
    'Fresh, unprocessed milk direct from local dairy farms.',
    'I''m interested in raw or farm-fresh milk',
    '["Yes, I actively seek out raw milk", "I''d try it if it was convenient", "I prefer pasteurized milk", "I don''t consume dairy"]',
    '{"milk", "dairy", "raw"}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000007',
    NULL,
    'scenario',
    'Seasonal Produce Box',
    'Weekly or bi-weekly boxes of whatever is fresh and in season locally.',
    'I''d subscribe to a seasonal produce box',
    '["Yes! I love variety and eating seasonally", "Maybe monthly, not weekly", "I prefer to choose specific items", "I grow most of my own produce"]',
    '{"vegetables", "produce", "seasonal"}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000008',
    NULL,
    'scenario',
    'Grass-Fed Beef',
    'Locally raised, grass-fed beef - often available as quarter, half, or whole shares.',
    'I''m interested in buying local grass-fed beef',
    '["Yes, I''d buy a quarter or half cow", "I''d want smaller portions available", "I''m interested but need a freezer", "I don''t eat beef"]',
    '{"beef", "meat", "grass-fed"}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000009',
    NULL,
    'scenario',
    'Fermented Foods',
    'Locally made kimchi, sauerkraut, kombucha, and other probiotic-rich foods.',
    'I want access to local fermented foods',
    '["Yes! I love fermented foods", "I''d try some varieties", "I make my own", "Not interested in fermented foods"]',
    '{"fermented", "kimchi", "kombucha", "probiotics"}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000010',
    NULL,
    'scenario',
    'Local Honey',
    'Raw, unfiltered honey from neighborhood beekeepers - great for allergies and health.',
    'I want to buy local raw honey',
    '["Yes! Local honey is a priority for me", "I''d buy if the price was right", "I already have a local source", "I don''t use much honey"]',
    '{"honey", "sweeteners", "raw"}',
    true
  );

-- ============================================
-- TALENT & INVOLVEMENT SCENARIOS
-- ============================================

INSERT INTO public.feed_items (id, user_id, feed_type, title, content, scenario_question, scenario_options, tagged_products, is_pinned)
VALUES 
  (
    'a1000000-0000-0000-0000-000000000011',
    NULL,
    'scenario',
    'Your Talents',
    'Our community runs on member contributions. Everyone has something to offer!',
    'What talents could you contribute? (Select all that apply)',
    '["Tech - I can help with apps, websites, or data", "Negotiation - I''m good at deals and sourcing", "Logistics - I drive regularly and can help with deliveries", "Growing - I have a garden or farm experience", "Admin - I can help organize and coordinate", "Promotion - I''m good at outreach and social media"]',
    '{}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000012',
    NULL,
    'scenario',
    'Peer Verification',
    'Trust is built through community. Would you help verify local producers?',
    'Would you visit a local farm/producer to verify their practices?',
    '["Yes! I''d love to see where my food comes from", "I''d do it occasionally for bonus trust points", "I''d read others'' verification reports instead", "I trust the community to handle this"]',
    '{}',
    true
  );

-- ============================================
-- DIETARY PREFERENCES SCENARIOS
-- ============================================

INSERT INTO public.feed_items (id, user_id, feed_type, title, content, scenario_question, scenario_options, tagged_products, is_pinned)
VALUES 
  (
    'a1000000-0000-0000-0000-000000000013',
    NULL,
    'scenario',
    'Dietary Restrictions',
    'Help us filter products that match your dietary needs.',
    'Do you have any dietary restrictions? (Select all that apply)',
    '["No seed oils (canola, soy, sunflower)", "Gluten-free", "Dairy-free", "Nut allergies", "Vegetarian", "Vegan", "Keto/Low-carb", "No restrictions"]',
    '{}',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000014',
    NULL,
    'scenario',
    'Growing Methods',
    'Which growing practices matter most to you?',
    'Which growing methods do you prefer? (Select all that apply)',
    '["Certified Organic", "No-spray (but not certified)", "Regenerative/No-till", "Permaculture", "Biodynamic", "Conventional is fine if local", "I just want fresh and affordable"]',
    '{}',
    true
  );

-- ============================================
-- SAMPLE PRODUCTS
-- ============================================

INSERT INTO public.products (id, name, description, category, product_type, ingredients, unit)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Pasture-Raised Eggs', 'Eggs from hens raised on pasture with access to bugs, grass, and sunshine', 'dairy', 'raw', '{}', 'dozen'),
  ('b1000000-0000-0000-0000-000000000002', 'Organic Bread Flour', 'Stone-ground organic bread flour, perfect for artisan breads', 'baked', 'raw', '{}', 'lb'),
  ('b1000000-0000-0000-0000-000000000003', 'Raw Milk', 'Fresh, unpasteurized whole milk from grass-fed cows', 'dairy', 'raw', '{}', 'gallon'),
  ('b1000000-0000-0000-0000-000000000004', 'Seasonal Vegetable Box', 'Weekly selection of whatever is freshest from local farms', 'produce', 'raw', '{}', 'each'),
  ('b1000000-0000-0000-0000-000000000005', 'Grass-Fed Ground Beef', 'Ground beef from 100% grass-fed and finished cattle', 'meat', 'raw', '{}', 'lb'),
  ('b1000000-0000-0000-0000-000000000006', 'Raw Local Honey', 'Unfiltered, raw honey from neighborhood beekeepers', 'other', 'raw', '{}', 'lb'),
  ('b1000000-0000-0000-0000-000000000007', 'Sourdough Bread', 'Naturally leavened bread made with local flour and long fermentation', 'baked', 'value_added', '{"flour", "water", "salt", "sourdough starter"}', 'each'),
  ('b1000000-0000-0000-0000-000000000008', 'Kimchi', 'Traditional Korean fermented vegetables, probiotic-rich', 'preserved', 'value_added', '{"napa cabbage", "radish", "garlic", "ginger", "korean chili"}', 'lb'),
  ('b1000000-0000-0000-0000-000000000009', 'Kombucha', 'Raw, unpasteurized fermented tea with live cultures', 'other', 'value_added', '{"tea", "sugar", "scoby"}', 'gallon'),
  ('b1000000-0000-0000-0000-000000000010', 'Pastured Chicken', 'Whole chickens raised on pasture with supplemental organic feed', 'meat', 'raw', '{}', 'lb');
