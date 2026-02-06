-- Migration: Allow multiple comments per user per feed item
-- The existing UNIQUE(user_id, feed_item_id, interaction_type) blocks multiple comments.
-- We drop it and re-add a partial unique for non-comment types so likes/claims stay unique.

-- Step 1: Drop the blanket unique constraint
ALTER TABLE public.feed_interactions
  DROP CONSTRAINT IF EXISTS feed_interactions_user_id_feed_item_id_interaction_type_key;

-- Step 2: Re-add unique for non-comment interactions (likes, discards, claims stay 1-per-user)
CREATE UNIQUE INDEX IF NOT EXISTS feed_interactions_unique_non_comment
  ON public.feed_interactions(user_id, feed_item_id, interaction_type)
  WHERE interaction_type != 'comment';

-- Step 3: Add a trigger to auto-increment/decrement comments_count on feed_items
CREATE OR REPLACE FUNCTION public.update_feed_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.interaction_type = 'comment' THEN
    UPDATE public.feed_items SET comments_count = comments_count + 1 WHERE id = NEW.feed_item_id;
  ELSIF TG_OP = 'DELETE' AND OLD.interaction_type = 'comment' THEN
    UPDATE public.feed_items SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.feed_item_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS feed_interactions_comments_count ON public.feed_interactions;

CREATE TRIGGER feed_interactions_comments_count
  AFTER INSERT OR DELETE ON public.feed_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feed_comments_count();

-- Step 4: Update RLS -- allow users to read all comments (currently select_all exists)
-- Also update scenario_responses SELECT policy to allow reading aggregate vote data
DROP POLICY IF EXISTS "scenario_responses_select_own" ON public.scenario_responses;
CREATE POLICY "scenario_responses_select_all" ON public.scenario_responses FOR SELECT USING (true);
