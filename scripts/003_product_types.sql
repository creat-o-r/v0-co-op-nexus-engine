-- ============================================
-- Product Types: lightweight grouping entity
-- A product type (e.g. "Flour") groups product variances
-- (e.g. "Bob's Organic Flour", "Jane's Whole Wheat Flour").
-- Preview data is inherited from member products at query time.
-- ============================================

-- 1. Create product_types table
CREATE TABLE IF NOT EXISTS public.product_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'produce', 'dairy', 'baked', 'preserved', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_types_select_all" ON public.product_types FOR SELECT USING (true);
CREATE POLICY "product_types_insert_auth" ON public.product_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "product_types_update_auth" ON public.product_types FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 2. Add FK on products to group variances under a type
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type_id UUID REFERENCES public.product_types(id) ON DELETE SET NULL;

-- 3. Add FK on feed_items so scenarios can link to a product type (not just text)
ALTER TABLE public.feed_items ADD COLUMN IF NOT EXISTS related_product_type_id UUID REFERENCES public.product_types(id) ON DELETE SET NULL;

-- 4. Seed some product types from existing tagged_products in feed_items
-- This creates types from any product names already used in scenarios
INSERT INTO public.product_types (name, category)
SELECT DISTINCT unnest(tagged_products), 'other'
FROM public.feed_items
WHERE array_length(tagged_products, 1) > 0
ON CONFLICT (name) DO NOTHING;

-- 5. Also seed from existing products table
INSERT INTO public.product_types (name, category)
SELECT DISTINCT p.name, p.category
FROM public.products p
WHERE NOT EXISTS (SELECT 1 FROM public.product_types pt WHERE pt.name = p.name)
ON CONFLICT (name) DO NOTHING;

-- 6. Backfill product_type_id on products
UPDATE public.products p
SET product_type_id = pt.id
FROM public.product_types pt
WHERE pt.name = p.name AND p.product_type_id IS NULL;

-- 7. Backfill related_product_type_id on feed_items from tagged_products[1]
UPDATE public.feed_items fi
SET related_product_type_id = pt.id
FROM public.product_types pt
WHERE fi.tagged_products[1] = pt.name
  AND fi.related_product_type_id IS NULL
  AND array_length(fi.tagged_products, 1) > 0;
