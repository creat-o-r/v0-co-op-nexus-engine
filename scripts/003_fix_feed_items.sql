-- Fix feed_items table to allow NULL user_id for system-generated content
ALTER TABLE public.feed_items ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policy to allow system content
DROP POLICY IF EXISTS "feed_items_insert_auth" ON public.feed_items;
CREATE POLICY "feed_items_insert_auth" ON public.feed_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);

-- Update the insert policy to be more permissive for viewing
DROP POLICY IF EXISTS "feed_items_update_own" ON public.feed_items;
CREATE POLICY "feed_items_update_own" ON public.feed_items FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
