-- ── Add 'match' to the feed_type enum and create the matching engine function ──

-- 1. Extend the feed_type check constraint to include 'match'
ALTER TABLE feed_items DROP CONSTRAINT IF EXISTS feed_items_feed_type_check;
ALTER TABLE feed_items ADD CONSTRAINT feed_items_feed_type_check
  CHECK (feed_type IN ('scenario', 'product', 'logistics', 'build', 'discussion', 'verification', 'match'));

-- 2. Create the matching engine as a Postgres function.
--    It finds surplus-need pairs by product_name, optionally bridged by a route,
--    and returns JSON rows that the API can turn into feed cards.
CREATE OR REPLACE FUNCTION run_matching_engine(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  need_id        UUID,
  need_user_id   UUID,
  need_product    TEXT,
  need_quantity   NUMERIC,
  need_unit       TEXT,
  need_hub        TEXT,
  surplus_id      UUID,
  surplus_user_id UUID,
  surplus_product TEXT,
  surplus_qty     NUMERIC,
  surplus_unit    TEXT,
  surplus_hub     TEXT,
  surplus_price   NUMERIC,
  route_id        UUID,
  route_name      TEXT,
  route_driver_id UUID,
  pickup_hub      TEXT,
  dropoff_hub     TEXT,
  match_score     INT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id            AS need_id,
    n.user_id       AS need_user_id,
    n.product_name  AS need_product,
    n.quantity       AS need_quantity,
    n.unit           AS need_unit,
    COALESCE(np.neighborhood_hub, '')  AS need_hub,
    s.id            AS surplus_id,
    s.user_id       AS surplus_user_id,
    s.product_name  AS surplus_product,
    s.quantity_available AS surplus_qty,
    s.unit           AS surplus_unit,
    COALESCE(sp.neighborhood_hub, '') AS surplus_hub,
    COALESCE(s.price_per_unit, 0)     AS surplus_price,
    r.id            AS route_id,
    r.route_name    AS route_name,
    r.user_id       AS route_driver_id,
    r.start_hub     AS pickup_hub,
    r.end_hub       AS dropoff_hub,
    -- Simple score: higher is better
    (
      CASE WHEN s.verification_status = 'multiple_verified' THEN 30
           WHEN s.verification_status = 'peer_verified' THEN 20
           ELSE 10
      END
      + CASE WHEN s.quantity_available >= n.quantity THEN 20 ELSE 5 END
      + CASE WHEN r.id IS NOT NULL THEN 25 ELSE 0 END
      + CASE WHEN COALESCE(sp.neighborhood_hub,'') = COALESCE(np.neighborhood_hub,'') THEN 15 ELSE 0 END
    )::INT AS match_score
  FROM user_needs n
  JOIN profiles np ON np.id = n.user_id
  JOIN user_surplus s ON
    s.is_active = true
    AND s.user_id != n.user_id
    AND lower(trim(s.product_name)) = lower(trim(n.product_name))
    AND s.quantity_available > 0
  JOIN profiles sp ON sp.id = s.user_id
  LEFT JOIN logistics_routes r ON
    r.is_active = true
    AND r.user_id != n.user_id
    AND r.user_id != s.user_id
    AND (
      -- Route connects supplier hub to buyer hub
      (r.start_hub = COALESCE(sp.neighborhood_hub,'') AND r.end_hub = COALESCE(np.neighborhood_hub,''))
      OR COALESCE(sp.neighborhood_hub,'') = ANY(r.waypoints)
      OR COALESCE(np.neighborhood_hub,'') = ANY(r.waypoints)
    )
  WHERE n.is_active = true
    AND (p_user_id IS NULL OR n.user_id = p_user_id)
  ORDER BY match_score DESC
  LIMIT 50;
END;
$$;
