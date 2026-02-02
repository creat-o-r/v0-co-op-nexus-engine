-- Co-Op Nexus Database Schema
-- This schema creates the complete data model for the peer-to-peer circular economy platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  neighborhood_hub TEXT, -- Fuzzy location (e.g., "North Portland", "East Side")
  talents TEXT[] DEFAULT '{}', -- Array: 'Tech', 'Negotiation', 'Logistics', 'Growing', 'Admin', 'Promotion'
  ingredient_blacklist TEXT[] DEFAULT '{}', -- e.g., 'seed oils', 'gluten', 'dairy'
  trust_points INTEGER DEFAULT 0,
  is_distribution_hub BOOLEAN DEFAULT FALSE,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'produce', 'dairy', 'meat', 'baked', 'preserved', 'crafts', 'other'
  product_type TEXT NOT NULL DEFAULT 'raw', -- 'raw' (single ingredient) or 'value_added' (prepared/multi-ingredient)
  ingredients TEXT[] DEFAULT '{}', -- For value-added products
  unit TEXT NOT NULL, -- 'lb', 'kg', 'each', 'dozen', 'gallon', 'liter'
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_all" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_insert_auth" ON public.products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- USER NEEDS TABLE (Demand Side)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_needs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, -- Denormalized for scenarios that create new products
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  frequency TEXT DEFAULT 'weekly', -- 'once', 'weekly', 'biweekly', 'monthly'
  max_price_per_unit NUMERIC,
  notes TEXT,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_needs_select_all" ON public.user_needs FOR SELECT USING (true);
CREATE POLICY "user_needs_insert_own" ON public.user_needs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_needs_update_own" ON public.user_needs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_needs_delete_own" ON public.user_needs FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- USER SURPLUS TABLE (Supply Side)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_surplus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity_available NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  price_per_unit NUMERIC,
  methods_inputs TEXT[] DEFAULT '{}', -- e.g., 'No-dig', 'Rainwater', 'Organic', 'Permaculture'
  available_from DATE,
  available_until DATE,
  verification_status TEXT DEFAULT 'unverified', -- 'unverified', 'peer_verified', 'multiple_verified'
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_surplus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_surplus_select_all" ON public.user_surplus FOR SELECT USING (true);
CREATE POLICY "user_surplus_insert_own" ON public.user_surplus FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_surplus_update_own" ON public.user_surplus FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_surplus_delete_own" ON public.user_surplus FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- LOGISTICS ROUTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.logistics_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL, -- e.g., "Daily commute", "Weekend market run"
  start_hub TEXT NOT NULL, -- Fuzzy location
  end_hub TEXT NOT NULL, -- Fuzzy location
  waypoints TEXT[] DEFAULT '{}', -- Intermediate stops
  schedule TEXT[] DEFAULT '{}', -- e.g., ['monday', 'wednesday', 'friday']
  departure_time TIME,
  is_active BOOLEAN DEFAULT TRUE,
  max_cargo_size TEXT DEFAULT 'small', -- 'small', 'medium', 'large'
  willing_to_detour BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.logistics_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logistics_routes_select_all" ON public.logistics_routes FOR SELECT USING (true);
CREATE POLICY "logistics_routes_insert_own" ON public.logistics_routes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "logistics_routes_update_own" ON public.logistics_routes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "logistics_routes_delete_own" ON public.logistics_routes FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- COMMUNITY AGREEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_type TEXT NOT NULL, -- 'community_standard', 'build_task', 'trade_agreement', 'verification_report'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'proposed', -- 'proposed', 'active', 'completed', 'archived'
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  required_talent TEXT, -- For build tasks: 'Tech', 'Negotiation', etc.
  related_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  batch_threshold NUMERIC, -- For bulk negotiations
  current_volume NUMERIC DEFAULT 0,
  deadline DATE,
  reward_trust_points INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agreements_select_all" ON public.agreements FOR SELECT USING (true);
CREATE POLICY "agreements_insert_auth" ON public.agreements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "agreements_update_own" ON public.agreements FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = assigned_to);

-- ============================================
-- FEED ITEMS TABLE (Central Social Feed)
-- ============================================
CREATE TABLE IF NOT EXISTS public.feed_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_type TEXT NOT NULL, -- 'scenario', 'product', 'logistics', 'build', 'discussion', 'verification'
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  
  -- Polymorphic references
  related_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  related_agreement_id UUID REFERENCES public.agreements(id) ON DELETE SET NULL,
  related_surplus_id UUID REFERENCES public.user_surplus(id) ON DELETE SET NULL,
  related_need_id UUID REFERENCES public.user_needs(id) ON DELETE SET NULL,
  related_route_id UUID REFERENCES public.logistics_routes(id) ON DELETE SET NULL,
  
  -- Scenario-specific fields
  scenario_question TEXT,
  scenario_options JSONB, -- For multiple choice scenarios
  
  -- Engagement
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  
  -- Tagged locations/products for filtering
  tagged_hubs TEXT[] DEFAULT '{}',
  tagged_products TEXT[] DEFAULT '{}',
  
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feed_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_items_select_all" ON public.feed_items FOR SELECT USING (true);
CREATE POLICY "feed_items_insert_auth" ON public.feed_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "feed_items_update_own" ON public.feed_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "feed_items_delete_own" ON public.feed_items FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FEED INTERACTIONS TABLE (Likes, Discards, Claims)
-- ============================================
CREATE TABLE IF NOT EXISTS public.feed_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_item_id UUID NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'like', 'discard', 'claim', 'complete', 'comment'
  comment_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feed_item_id, interaction_type)
);

ALTER TABLE public.feed_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_interactions_select_all" ON public.feed_interactions FOR SELECT USING (true);
CREATE POLICY "feed_interactions_insert_own" ON public.feed_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feed_interactions_delete_own" ON public.feed_interactions FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PEER VERIFICATIONS TABLE (PGS System)
-- ============================================
CREATE TABLE IF NOT EXISTS public.peer_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verifier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surplus_id UUID REFERENCES public.user_surplus(id) ON DELETE SET NULL,
  verification_type TEXT NOT NULL, -- 'site_visit', 'product_sample', 'video_tour'
  report TEXT,
  video_url TEXT,
  photos TEXT[] DEFAULT '{}',
  methods_confirmed TEXT[] DEFAULT '{}',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  trust_points_awarded INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.peer_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "peer_verifications_select_all" ON public.peer_verifications FOR SELECT USING (true);
CREATE POLICY "peer_verifications_insert_own" ON public.peer_verifications FOR INSERT WITH CHECK (auth.uid() = verifier_id);

-- ============================================
-- SCENARIO RESPONSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.scenario_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_item_id UUID NOT NULL REFERENCES public.feed_items(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL, -- 'like', 'discard'
  selected_option TEXT, -- For multiple choice
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feed_item_id)
);

ALTER TABLE public.scenario_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scenario_responses_select_own" ON public.scenario_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scenario_responses_insert_own" ON public.scenario_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- UPDATE TIMESTAMPS TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER user_needs_updated_at BEFORE UPDATE ON public.user_needs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER user_surplus_updated_at BEFORE UPDATE ON public.user_surplus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER agreements_updated_at BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER feed_items_updated_at BEFORE UPDATE ON public.feed_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- UPDATE LIKES COUNT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_feed_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.interaction_type = 'like' THEN
    UPDATE public.feed_items SET likes_count = likes_count + 1 WHERE id = NEW.feed_item_id;
  ELSIF TG_OP = 'DELETE' AND OLD.interaction_type = 'like' THEN
    UPDATE public.feed_items SET likes_count = likes_count - 1 WHERE id = OLD.feed_item_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER feed_interactions_likes_count
  AFTER INSERT OR DELETE ON public.feed_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feed_likes_count();
