export type Talent = 'Tech' | 'Negotiation' | 'Logistics' | 'Growing' | 'Admin' | 'Promotion'

export type FeedType = 'scenario' | 'product' | 'logistics' | 'build' | 'discussion' | 'verification'

export type InteractionType = 'like' | 'discard' | 'claim' | 'complete' | 'comment'

export type ProductType = 'raw' | 'value_added'

export type VerificationStatus = 'unverified' | 'peer_verified' | 'multiple_verified'

export type AgreementType = 'community_standard' | 'build_task' | 'trade_agreement' | 'verification_report'

export type AgreementStatus = 'proposed' | 'active' | 'completed' | 'archived'

export type Frequency = 'once' | 'weekly' | 'biweekly' | 'monthly'

export type Priority = 'low' | 'normal' | 'high'

export type CargoSize = 'small' | 'medium' | 'large'

export interface Profile {
  id: string
  display_name: string | null
  neighborhood_hub: string | null
  talents: Talent[]
  ingredient_blacklist: string[]
  trust_points: number
  is_distribution_hub: boolean
  bio: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  category: string
  product_type: ProductType
  ingredients: string[]
  unit: string
  image_url: string | null
  created_at: string
}

export interface UserNeed {
  id: string
  user_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit: string
  frequency: Frequency
  max_price_per_unit: number | null
  notes: string | null
  priority: Priority
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserSurplus {
  id: string
  user_id: string
  product_id: string | null
  product_name: string
  quantity_available: number
  unit: string
  price_per_unit: number | null
  methods_inputs: string[]
  available_from: string | null
  available_until: string | null
  verification_status: VerificationStatus
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface LogisticsRoute {
  id: string
  user_id: string
  route_name: string
  start_hub: string
  end_hub: string
  waypoints: string[]
  schedule: string[]
  departure_time: string | null
  is_active: boolean
  max_cargo_size: CargoSize
  willing_to_detour: boolean
  created_at: string
  profile?: Profile
}

export interface Agreement {
  id: string
  agreement_type: AgreementType
  title: string
  description: string | null
  status: AgreementStatus
  created_by: string | null
  assigned_to: string | null
  required_talent: Talent | null
  related_product_id: string | null
  batch_threshold: number | null
  current_volume: number
  deadline: string | null
  reward_trust_points: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  creator_profile?: Profile
  assignee_profile?: Profile
  product?: Product
}

export interface FeedItem {
  id: string
  user_id: string
  feed_type: FeedType
  title: string
  content: string | null
  image_url: string | null
  related_product_id: string | null
  related_agreement_id: string | null
  related_surplus_id: string | null
  related_need_id: string | null
  related_route_id: string | null
  scenario_question: string | null
  scenario_options: string[] | null
  likes_count: number
  comments_count: number
  tagged_hubs: string[]
  tagged_products: string[]
  is_pinned: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  profile?: Profile
  product?: Product
  agreement?: Agreement
  surplus?: UserSurplus
  need?: UserNeed
  route?: LogisticsRoute
  user_interaction?: FeedInteraction | null
}

export interface FeedInteraction {
  id: string
  user_id: string
  feed_item_id: string
  interaction_type: InteractionType
  comment_text: string | null
  created_at: string
}

export interface PeerVerification {
  id: string
  verifier_id: string
  verified_user_id: string
  surplus_id: string | null
  verification_type: string
  report: string | null
  video_url: string | null
  photos: string[]
  methods_confirmed: string[]
  rating: number | null
  trust_points_awarded: number
  created_at: string
  verifier_profile?: Profile
}

export interface ScenarioResponse {
  id: string
  user_id: string
  feed_item_id: string
  response_type: 'like' | 'discard'
  selected_option: string | null
  created_at: string
}

// Aggregated types for the Bulk-Matching Engine
export interface AggregatedDemand {
  product_name: string
  product_id: string | null
  total_quantity: number
  unit: string
  user_count: number
  avg_max_price: number | null
  hubs: string[]
}

// Logistics Bridge match
export interface LogisticsMatch {
  driver: Profile
  route: LogisticsRoute
  supplier: UserSurplus
  buyer: UserNeed
  pickup_hub: string
  dropoff_hub: string
}
