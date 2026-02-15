import type { Talent, Frequency, Priority, CargoSize, OrderStatus } from './types/database'

// ── Product & Trade ──────────────────────────────────────────────

export const PRODUCT_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Dairy',
  'Grains',
  'Meat',
  'Preserves',
  'Baked Goods',
  'Herbs & Spices',
  'Beverages',
  'Other',
] as const

export const UNITS = [
  'kg', 'g', 'lb', 'oz',
  'L', 'mL', 'gallon',
  'unit', 'bunch', 'dozen', 'crate', 'bag', 'jar', 'bottle',
] as const

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'once', label: 'One time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
]

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
]

// ── Talent System ────────────────────────────────────────────────

export const TALENTS: Talent[] = ['Tech', 'Negotiation', 'Logistics', 'Growing', 'Admin', 'Promotion']

// ── Cargo ────────────────────────────────────────────────────────

export const CARGO_SIZES: { value: CargoSize; label: string }[] = [
  { value: 'small', label: 'Small (backpack/bike)' },
  { value: 'medium', label: 'Medium (car trunk)' },
  { value: 'large', label: 'Large (van/truck)' },
]

// ── Order Status Transitions ─────────────────────────────────────

export const ORDER_STATUS_TRANSITIONS: Record<
  string,
  { by: 'initiator' | 'counterparty' | 'either'; to: OrderStatus[] }
> = {
  proposed:   { by: 'counterparty', to: ['accepted', 'rejected'] },
  accepted:   { by: 'either',       to: ['in_transit', 'cancelled'] },
  in_transit: { by: 'either',       to: ['delivered', 'disputed'] },
  delivered:  { by: 'either',       to: ['completed', 'disputed'] },
}

// ── Feed ─────────────────────────────────────────────────────────

export const FEED_PAGE_SIZE = 20
export const COMMENT_MAX_LENGTH = 2000
export const EXPAND_THRESHOLD = 3
export const INSTANT_MATCH_LIMIT = 5

// ── Trust ────────────────────────────────────────────────────────

export const DEFAULT_TRUST_REWARD = 5
export const MATCH_SCORE_MULTIPLIER = 10
export const MATCH_SCORE_MAX = 100
