-- ============================================
-- AGREEMENT COLLABORATION & DRAFT APPROVAL SYSTEM
-- ============================================

-- 1) Collaborators table: who can create/edit scenarios linked to an agreement
CREATE TABLE IF NOT EXISTS public.agreement_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'collaborator', -- 'owner', 'collaborator'
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agreement_id, user_id)
);

ALTER TABLE public.agreement_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collab_select_all" ON public.agreement_collaborators FOR SELECT USING (true);
CREATE POLICY "collab_insert_owner" ON public.agreement_collaborators FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agreement_collaborators ac
    WHERE ac.agreement_id = agreement_id AND ac.user_id = auth.uid() AND ac.role = 'owner'
  ) OR auth.uid() IS NOT NULL
);
CREATE POLICY "collab_delete_owner" ON public.agreement_collaborators FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.agreement_collaborators ac
    WHERE ac.agreement_id = agreement_id AND ac.user_id = auth.uid() AND ac.role = 'owner'
  ) OR auth.uid() = user_id
);

-- 2) Feed item drafts: proposed edits or new scenarios that need approval
CREATE TABLE IF NOT EXISTS public.feed_item_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- What is being edited (NULL = new creation)
  feed_item_id UUID REFERENCES public.feed_items(id) ON DELETE CASCADE,
  -- Which agreement this belongs to
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  -- Who proposed the change
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Draft content (full snapshot of the feed_item fields)
  draft_title TEXT NOT NULL,
  draft_content TEXT,
  draft_question TEXT,
  draft_options JSONB,
  draft_tagged_products TEXT[] DEFAULT '{}',
  draft_tagged_hubs TEXT[] DEFAULT '{}',
  draft_image_url TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'withdrawn'
  -- How many approvals are needed vs received
  approvals_needed INTEGER NOT NULL DEFAULT 0, -- 0 = auto-calculated from collaborator count
  approvals_received INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  change_summary TEXT, -- Brief description of what changed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feed_item_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drafts_select_collaborator" ON public.feed_item_drafts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.agreement_collaborators ac
    WHERE ac.agreement_id = agreement_id AND ac.user_id = auth.uid()
  )
);
CREATE POLICY "drafts_insert_collaborator" ON public.feed_item_drafts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agreement_collaborators ac
    WHERE ac.agreement_id = agreement_id AND ac.user_id = auth.uid()
  )
);
CREATE POLICY "drafts_update_own" ON public.feed_item_drafts FOR UPDATE USING (
  proposed_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.agreement_collaborators ac
    WHERE ac.agreement_id = agreement_id AND ac.user_id = auth.uid() AND ac.role = 'owner'
  )
);

-- 3) Draft approvals: individual votes on a draft
CREATE TABLE IF NOT EXISTS public.draft_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id UUID NOT NULL REFERENCES public.feed_item_drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved BOOLEAN NOT NULL, -- true = approve, false = reject
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draft_id, user_id)
);

ALTER TABLE public.draft_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_select_collaborator" ON public.draft_approvals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.feed_item_drafts d
    JOIN public.agreement_collaborators ac ON ac.agreement_id = d.agreement_id
    WHERE d.id = draft_id AND ac.user_id = auth.uid()
  )
);
CREATE POLICY "approvals_insert_collaborator" ON public.draft_approvals FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.feed_item_drafts d
    JOIN public.agreement_collaborators ac ON ac.agreement_id = d.agreement_id
    WHERE d.id = draft_id AND ac.user_id = auth.uid()
  )
);

-- 4) Trigger: auto-update approvals_received and auto-apply when all approved
CREATE OR REPLACE FUNCTION public.handle_draft_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_total_collabs INTEGER;
  v_approval_count INTEGER;
  v_reject_count INTEGER;
BEGIN
  -- Get the draft
  SELECT * INTO v_draft FROM public.feed_item_drafts WHERE id = NEW.draft_id;
  
  -- Count collaborators (excluding the proposer -- they implicitly approve)
  SELECT COUNT(*) INTO v_total_collabs
  FROM public.agreement_collaborators
  WHERE agreement_id = v_draft.agreement_id AND user_id != v_draft.proposed_by;
  
  -- Count approvals and rejections
  SELECT 
    COUNT(*) FILTER (WHERE approved = true),
    COUNT(*) FILTER (WHERE approved = false)
  INTO v_approval_count, v_reject_count
  FROM public.draft_approvals WHERE draft_id = NEW.draft_id;
  
  -- Update the draft counts
  UPDATE public.feed_item_drafts
  SET approvals_received = v_approval_count,
      approvals_needed = v_total_collabs,
      updated_at = NOW()
  WHERE id = NEW.draft_id;
  
  -- If all collaborators approved -> apply the draft
  IF v_approval_count >= v_total_collabs AND v_total_collabs > 0 THEN
    -- Mark draft as approved
    UPDATE public.feed_item_drafts SET status = 'approved', updated_at = NOW() WHERE id = NEW.draft_id;
    
    IF v_draft.feed_item_id IS NOT NULL THEN
      -- Edit existing feed item
      UPDATE public.feed_items SET
        title = v_draft.draft_title,
        content = v_draft.draft_content,
        scenario_question = v_draft.draft_question,
        scenario_options = v_draft.draft_options,
        tagged_products = v_draft.draft_tagged_products,
        tagged_hubs = v_draft.draft_tagged_hubs,
        image_url = COALESCE(v_draft.draft_image_url, image_url),
        updated_at = NOW()
      WHERE id = v_draft.feed_item_id;
    ELSE
      -- Create new feed item
      INSERT INTO public.feed_items (
        user_id, feed_type, title, content, scenario_question, scenario_options,
        tagged_products, tagged_hubs, image_url, related_agreement_id, is_active
      ) VALUES (
        v_draft.proposed_by, 'scenario', v_draft.draft_title, v_draft.draft_content,
        v_draft.draft_question, v_draft.draft_options,
        v_draft.draft_tagged_products, v_draft.draft_tagged_hubs,
        v_draft.draft_image_url, v_draft.agreement_id, true
      );
    END IF;
  END IF;
  
  -- If any collaborator rejected -> reject the draft
  IF v_reject_count > 0 THEN
    UPDATE public.feed_item_drafts SET status = 'rejected', updated_at = NOW() WHERE id = NEW.draft_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_draft_approval_inserted
  AFTER INSERT ON public.draft_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_draft_approval();

-- Timestamps trigger for drafts
CREATE TRIGGER feed_item_drafts_updated_at 
  BEFORE UPDATE ON public.feed_item_drafts 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 5) SEED: Default community agreement + collaborators + link scenarios
-- ============================================

-- Create the default agreement
INSERT INTO public.agreements (id, agreement_type, title, description, status, reward_trust_points)
VALUES (
  'c1000000-0000-0000-0000-000000000001',
  'community_standard',
  'Community Food Network',
  'The founding community agreement. All onboarding scenarios and market research questions are governed by this agreement. Collaborators can propose new scenarios or edit existing ones, but changes only go live when all collaborators approve.',
  'active',
  10
) ON CONFLICT (id) DO NOTHING;

-- Link all seed scenarios to this agreement
UPDATE public.feed_items
SET related_agreement_id = 'c1000000-0000-0000-0000-000000000001'
WHERE id IN (
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000007',
  'a1000000-0000-0000-0000-000000000008',
  'a1000000-0000-0000-0000-000000000009',
  'a1000000-0000-0000-0000-000000000010',
  'a1000000-0000-0000-0000-000000000011',
  'a1000000-0000-0000-0000-000000000012',
  'a1000000-0000-0000-0000-000000000013',
  'a1000000-0000-0000-0000-000000000014'
);
