-- 008: Add privacy columns + default_orders_private preference

-- Add is_private to orders (default true per user request)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT true;

-- Add is_private to user_needs (default false so matching works)
ALTER TABLE user_needs ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- Add is_private to user_surplus (default false so matching works)
ALTER TABLE user_surplus ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- Add default_orders_private to order_preferences
ALTER TABLE order_preferences ADD COLUMN IF NOT EXISTS default_orders_private boolean DEFAULT true;

-- Update RLS on orders: public orders visible to everyone, private only to parties
DROP POLICY IF EXISTS orders_select_own ON orders;
CREATE POLICY orders_select_visible ON orders
  FOR SELECT USING (
    is_private = false
    OR initiator_id = (SELECT auth.uid())
    OR counterparty_id = (SELECT auth.uid())
  );

-- Update RLS on user_needs: public visible to all, private only to owner
DROP POLICY IF EXISTS user_needs_select_all ON user_needs;
CREATE POLICY user_needs_select_visible ON user_needs
  FOR SELECT USING (
    is_private = false
    OR user_id = (SELECT auth.uid())
  );

-- Update RLS on user_surplus: public visible to all, private only to owner
DROP POLICY IF EXISTS user_surplus_select_all ON user_surplus;
CREATE POLICY user_surplus_select_visible ON user_surplus
  FOR SELECT USING (
    is_private = false
    OR user_id = (SELECT auth.uid())
  );
