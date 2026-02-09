'use client'

import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeftRight, ArrowRight, DollarSign, Clock,
  CheckCircle, Truck, MapPin, Package, ShoppingCart,
  Leaf, AlertTriangle, X, Plus, Zap, User, PenLine,
  BarChart3, RotateCcw, Settings, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR, { mutate } from 'swr'
import { ProductSelector, type ProductSelection } from './product-selector'
import type { Order, OrderItem, Profile } from '@/lib/types/database'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  proposed:   { label: 'Proposed',   color: 'bg-amber-500/15 text-amber-700',  icon: Clock },
  accepted:   { label: 'Accepted',   color: 'bg-blue-500/15 text-blue-700',    icon: CheckCircle },
  in_transit: { label: 'In Transit', color: 'bg-purple-500/15 text-purple-700', icon: Truck },
  delivered:  { label: 'Delivered',  color: 'bg-emerald-500/15 text-emerald-700', icon: Package },
  completed:  { label: 'Completed',  color: 'bg-primary/15 text-primary',       icon: CheckCircle },
  rejected:   { label: 'Rejected',   color: 'bg-destructive/15 text-destructive', icon: X },
  cancelled:  { label: 'Cancelled',  color: 'bg-muted text-muted-foreground',   icon: X },
  disputed:   { label: 'Disputed',   color: 'bg-red-500/15 text-red-700',       icon: AlertTriangle },
}

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Flexible',  desc: 'No rush, when convenient', color: 'bg-muted text-muted-foreground' },
  { value: 'normal', label: 'Standard',  desc: 'Within a week or so',     color: 'bg-blue-500/15 text-blue-700' },
  { value: 'high',   label: 'Urgent',    desc: 'Need this ASAP',          color: 'bg-red-500/15 text-red-700' },
] as const

const UNIT_OPTIONS = ['kg', 'g', 'lb', 'oz', 'dozen', 'unit', 'bunch', 'loaf', 'jar', 'liter'] as const

type Tab = 'orders' | 'needs' | 'offers'
type GroupBy = 'all' | 'hub' | 'category'

/* ── Current user hook ─────────────────────────────────── */
function useCurrentUser() {
  const { data } = useSWR('/api/auth/me', fetcher, { dedupingInterval: 60000 })
  return data?.id as string | undefined
}

export function OrdersPageClient() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) || 'orders'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'orders', label: 'Orders', icon: ArrowLeftRight },
    { key: 'needs',  label: 'Needs',  icon: ShoppingCart },
    { key: 'offers', label: 'Offers', icon: Leaf },
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">Orders</h1>
          <a href="/orders/preferences" className="text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-4.5 w-4.5" />
            <span className="sr-only">Preferences</span>
          </a>
        </div>
        <div className="max-w-lg mx-auto px-4 flex gap-1 pb-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                activeTab === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'needs' && <NeedsTab />}
        {activeTab === 'offers' && <OffersTab />}
      </div>
    </div>
  )
}

/* ── Instant Match Results ────────────────────────────── */
function InstantMatches({ query, forType }: { query: string; forType: 'need' | 'offer' }) {
  const { data: matches } = useSWR(
    query.length >= 2 ? `/api/orders/instant-match?q=${encodeURIComponent(query)}&for=${forType}` : null,
    fetcher,
    { dedupingInterval: 500 }
  )

  if (!matches || matches.length === 0) return null

  const isNeed = forType === 'need'
  const label = isNeed ? 'Available offers' : 'People looking for this'

  return (
    <div className="rounded-lg border border-chart-3/30 bg-chart-3/5 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5 text-chart-3" />
        <p className="text-[11px] font-semibold text-chart-3">{label}</p>
      </div>
      {matches.map((m: Record<string, unknown>) => {
        const profile = m.profile as Profile | null
        return (
          <div key={m.id as string} className="flex items-center gap-2 rounded-md bg-background/80 px-2.5 py-2 border border-border/40">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0">
              {profile?.display_name
                ? <span className="text-[10px] font-semibold">{(profile.display_name as string).slice(0, 2).toUpperCase()}</span>
                : <User className="h-3 w-3 text-muted-foreground" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {isNeed
                  ? `${(m.quantity_available as number)} ${m.unit as string} @ ${m.price_per_unit ? `$${Number(m.price_per_unit).toFixed(2)}` : 'open to swap'}`
                  : `${(m.quantity as number)} ${m.unit as string} needed${m.max_price_per_unit ? ` (max $${Number(m.max_price_per_unit).toFixed(2)})` : ''}`
                }
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {profile?.display_name || 'Member'}
                {profile?.neighborhood_hub && ` \u2014 ${profile.neighborhood_hub}`}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Need Form ────────────────────────────────────────── */
function NeedForm({ onClose, initial }: { onClose: () => void; initial?: { product_name: string; quantity: number; unit: string; max_price_per_unit: number | null; priority: string; notes: string | null; id?: string } }) {
  const emptySelection: ProductSelection = {
    product_name: initial?.product_name || '',
    product_id: null, product_type_id: null, category: null,
    unit: initial?.unit || null, isNew: !initial,
  }
  const [selection, setSelection] = useState<ProductSelection>(emptySelection)
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() || '')
  const [unit, setUnit] = useState(initial?.unit || 'kg')
  const [maxPrice, setMaxPrice] = useState(initial?.max_price_per_unit?.toString() || '')
  const [priority, setPriority] = useState(initial?.priority || 'normal')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSelection = (s: ProductSelection) => {
    setSelection(s)
    if (s.unit) setUnit(s.unit)
  }

  const handleSubmit = async () => {
    if (!selection.product_name.trim()) return
    setSubmitting(true)
    await fetch('/api/orders/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'need', id: initial?.id,
        product_name: selection.product_name.trim(),
        product_id: selection.product_id,
        quantity: Number(quantity) || 1, unit,
        max_price_per_unit: maxPrice ? Number(maxPrice) : null,
        priority, notes: notes.trim() || null,
      }),
    })
    mutate('/api/orders/listings?type=needs')
    setSubmitting(false)
    onClose()
  }

  return (
    <Card className="border-chart-3/40 bg-chart-3/5">
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <ShoppingCart className="h-4 w-4 text-chart-3" />
            {initial?.id ? 'Edit Need' : 'Post a Need'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <ProductSelector value={selection} onChange={handleSelection} placeholder="Search products or add new..." autoFocus />
        <InstantMatches query={selection.product_name} forType="need" />

        <div className="grid grid-cols-3 gap-2">
          <Input type="number" placeholder="Qty" value={quantity} onChange={e => setQuantity(e.target.value)} className="text-sm" />
          <select value={unit} onChange={e => setUnit(e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm">
            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <Input type="number" placeholder="Max $/unit" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="text-sm" step="0.01" />
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">How soon?</p>
          <div className="flex gap-1.5">
            {PRIORITY_OPTIONS.map(p => (
              <button key={p.value} onClick={() => setPriority(p.value)}
                className={cn('flex-1 rounded-lg px-2.5 py-2 text-left transition-colors border',
                  priority === p.value ? `${p.color} border-current/20` : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60'
                )}>
                <p className="text-xs font-semibold">{p.label}</p>
                <p className="text-[10px] opacity-70">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Textarea placeholder="Any notes? Organic only, delivery preference..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm resize-none" />
        <Button onClick={handleSubmit} disabled={!selection.product_name.trim() || submitting} className="w-full" size="sm">
          {submitting ? 'Saving...' : initial?.id ? 'Save Changes' : 'Post Need'}
        </Button>
      </CardContent>
    </Card>
  )
}

/* ── Offer Form ───────────────────────────────────────── */
function OfferForm({ onClose, initial }: { onClose: () => void; initial?: { product_name: string; quantity_available: number; unit: string; price_per_unit: number | null; notes: string | null; id?: string } }) {
  const emptySelection: ProductSelection = {
    product_name: initial?.product_name || '',
    product_id: null, product_type_id: null, category: null,
    unit: initial?.unit || null, isNew: !initial,
  }
  const [selection, setSelection] = useState<ProductSelection>(emptySelection)
  const [quantity, setQuantity] = useState(initial?.quantity_available?.toString() || '')
  const [unit, setUnit] = useState(initial?.unit || 'kg')
  const [price, setPrice] = useState(initial?.price_per_unit?.toString() || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSelection = (s: ProductSelection) => { setSelection(s); if (s.unit) setUnit(s.unit) }

  const handleSubmit = async () => {
    if (!selection.product_name.trim()) return
    setSubmitting(true)
    await fetch('/api/orders/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'offer', id: initial?.id,
        product_name: selection.product_name.trim(),
        product_id: selection.product_id,
        quantity_available: Number(quantity) || 1, unit,
        price_per_unit: price ? Number(price) : null,
        notes: notes.trim() || null,
      }),
    })
    mutate('/api/orders/listings?type=offers')
    setSubmitting(false)
    onClose()
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Leaf className="h-4 w-4 text-primary" />
            {initial?.id ? 'Edit Offer' : 'Post an Offer'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <ProductSelector value={selection} onChange={handleSelection} placeholder="Search products or add new..." autoFocus />
        <InstantMatches query={selection.product_name} forType="offer" />

        <div className="grid grid-cols-3 gap-2">
          <Input type="number" placeholder="Qty" value={quantity} onChange={e => setQuantity(e.target.value)} className="text-sm" />
          <select value={unit} onChange={e => setUnit(e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm">
            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <Input type="number" placeholder="$/unit" value={price} onChange={e => setPrice(e.target.value)} className="text-sm" step="0.01" />
        </div>
        <p className="text-[10px] text-muted-foreground">Leave price empty to indicate open to swaps</p>

        <Textarea placeholder="Notes? Organic, homemade, pickup location..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="text-sm resize-none" />
        <Button onClick={handleSubmit} disabled={!selection.product_name.trim() || submitting} className="w-full" size="sm">
          {submitting ? 'Saving...' : initial?.id ? 'Save Changes' : 'Post Offer'}
        </Button>
      </CardContent>
    </Card>
  )
}

/* ── Group header ──────────────────────────────────────── */
function GroupHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <div className="h-px flex-1 bg-border/60" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 shrink-0">{label}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  )
}

/* ── Grouping chips ────────────────────────────────────── */
function GroupChips({ value, onChange }: { value: GroupBy; onChange: (v: GroupBy) => void }) {
  const options: { key: GroupBy; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'hub', label: 'By Hub' },
    { key: 'category', label: 'By Product' },
  ]
  return (
    <div className="flex gap-1">
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
            value === o.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Need Card (mine = editable, other = view only) ──── */
interface NeedRow { id: string; user_id: string; product_name: string; quantity: number; unit: string; frequency: string; max_price_per_unit: number | null; priority: string; notes: string | null; is_active: boolean; profile?: Profile }

function NeedCard({ need, isMine }: { need: NeedRow; isMine: boolean }) {
  const [flipped, setFlipped] = useState(false)
  const [editing, setEditing] = useState(false)

  if (editing && isMine) return (
    <NeedForm onClose={() => setEditing(false)}
      initial={{ product_name: need.product_name, quantity: need.quantity, unit: need.unit, max_price_per_unit: need.max_price_per_unit, priority: need.priority, notes: need.notes, id: need.id }} />
  )

  const priorityCfg = PRIORITY_OPTIONS.find(p => p.value === need.priority) || PRIORITY_OPTIONS[1]

  if (flipped) {
    return (
      <Card className={cn('border-chart-3/20', isMine && 'ring-1 ring-chart-3/20')}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-chart-3" />
              Matches for {need.product_name}
            </p>
            <div className="flex items-center gap-1">
              {isMine && <button onClick={() => setEditing(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"><PenLine className="h-3.5 w-3.5" /></button>}
              <button onClick={() => setFlipped(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <InstantMatches query={need.product_name} forType="need" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Quantity</p>
              <p className="text-sm font-semibold">{need.quantity} {need.unit}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Max Price</p>
              <p className="text-sm font-semibold">{need.max_price_per_unit ? `$${Number(need.max_price_per_unit).toFixed(2)}/${need.unit}` : 'Any'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('hover:border-chart-3/30 transition-colors', isMine && 'ring-1 ring-chart-3/20')}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 shrink-0">
            <ShoppingCart className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{need.product_name}</p>
            <p className="text-xs text-muted-foreground">
              {need.quantity} {need.unit} &middot; {need.frequency.replace('_', ' ')}
              {need.max_price_per_unit && ` \u2014 max $${Number(need.max_price_per_unit).toFixed(2)}/${need.unit}`}
            </p>
            {need.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{need.notes}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              {!isMine && need.profile?.display_name && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <User className="h-2.5 w-2.5" />{need.profile.display_name}
                  {need.profile.neighborhood_hub && <span className="opacity-60">&middot; {need.profile.neighborhood_hub}</span>}
                </span>
              )}
              <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium', priorityCfg.color)}>
                {priorityCfg.label}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => setFlipped(true)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50">
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            {isMine && (
              <button onClick={() => setEditing(true)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50">
                <PenLine className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Offer Card ────────────────────────────────────────── */
interface OfferRow { id: string; user_id: string; product_name: string; quantity_available: number; unit: string; price_per_unit: number | null; verification_status: string; notes: string | null; is_active: boolean; profile?: Profile }

function OfferCard({ offer, isMine }: { offer: OfferRow; isMine: boolean }) {
  const [flipped, setFlipped] = useState(false)
  const [editing, setEditing] = useState(false)

  if (editing && isMine) return (
    <OfferForm onClose={() => setEditing(false)}
      initial={{ product_name: offer.product_name, quantity_available: offer.quantity_available, unit: offer.unit, price_per_unit: offer.price_per_unit, notes: offer.notes, id: offer.id }} />
  )

  if (flipped) {
    return (
      <Card className={cn('border-primary/20', isMine && 'ring-1 ring-primary/20')}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              Demand for {offer.product_name}
            </p>
            <div className="flex items-center gap-1">
              {isMine && <button onClick={() => setEditing(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"><PenLine className="h-3.5 w-3.5" /></button>}
              <button onClick={() => setFlipped(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <InstantMatches query={offer.product_name} forType="offer" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Available</p>
              <p className="text-sm font-semibold">{offer.quantity_available} {offer.unit}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Price</p>
              <p className="text-sm font-semibold">{offer.price_per_unit ? `$${Number(offer.price_per_unit).toFixed(2)}/${offer.unit}` : 'Open to swap'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('hover:border-primary/30 transition-colors', isMine && 'ring-1 ring-primary/20')}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
            <Leaf className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{offer.product_name}</p>
            <p className="text-xs text-muted-foreground">
              {offer.quantity_available} {offer.unit} available
              {offer.price_per_unit ? ` \u2014 $${Number(offer.price_per_unit).toFixed(2)}/${offer.unit}` : ' \u2014 open to swap'}
            </p>
            {offer.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{offer.notes}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              {!isMine && offer.profile?.display_name && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <User className="h-2.5 w-2.5" />{offer.profile.display_name}
                  {offer.profile.neighborhood_hub && <span className="opacity-60">&middot; {offer.profile.neighborhood_hub}</span>}
                </span>
              )}
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                offer.verification_status === 'multiple_verified' ? 'bg-primary/15 text-primary' :
                offer.verification_status === 'peer_verified' ? 'bg-blue-500/15 text-blue-700' :
                'bg-muted text-muted-foreground'
              )}>
                {(offer.verification_status || 'self reported').replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button onClick={() => setFlipped(true)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50">
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
            {isMine && (
              <button onClick={() => setEditing(true)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50">
                <PenLine className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Orders Tab ────────────────────────────────────────── */
function OrdersTab() {
  const { data: orders, isLoading } = useSWR<Order[]>('/api/orders', fetcher)

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="py-4 px-4"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}</div>

  if (!orders?.length) return (
    <Card><CardContent className="py-12 text-center">
      <ArrowLeftRight className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <p className="font-semibold">No orders yet</p>
      <p className="text-sm text-muted-foreground mt-1">Post a need or offer to get started</p>
    </CardContent></Card>
  )

  return <div className="space-y-3">{orders.map(order => <OrderCard key={order.id} order={order} />)}</div>
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false)
  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.proposed
  const StatusIcon = statusCfg.icon
  const initials = order.initiator_profile?.display_name?.slice(0, 2).toUpperCase() || '??'
  const counterInitials = order.counterparty_profile?.display_name?.slice(0, 2).toUpperCase() || '??'
  const outgoing = (order.items || []).filter((i: OrderItem) => i.direction === 'to_counterparty')
  const incoming = (order.items || []).filter((i: OrderItem) => i.direction === 'to_initiator')

  return (
    <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setExpanded(!expanded)}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2 shrink-0">
            <Avatar className="h-8 w-8 border-2 border-background"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback></Avatar>
            <Avatar className="h-8 w-8 border-2 border-background"><AvatarFallback className="text-[10px] bg-accent/30 text-accent-foreground">{counterInitials}</AvatarFallback></Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-foreground truncate">
                {order.order_type === 'swap' ? 'Swap' : order.order_type === 'mixed' ? 'Mixed' : 'Purchase'}
                {order.notes && <span className="text-muted-foreground font-normal"> &mdash; {order.notes}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium', statusCfg.color)}>
                <StatusIcon className="h-2.5 w-2.5" />{statusCfg.label}
              </span>
              {order.money_amount > 0 && <span className="text-[10px] text-muted-foreground">${Number(order.money_amount).toFixed(2)}</span>}
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', expanded && 'rotate-180')} />
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            {incoming.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">Receiving</p>
                {incoming.map((item: OrderItem) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <Package className="h-3 w-3 text-primary shrink-0" />
                    <span>{item.quantity} {item.unit} {item.product_name}</span>
                    {item.price_per_unit && <span className="text-muted-foreground ml-auto">${Number(item.price_per_unit).toFixed(2)}/{item.unit}</span>}
                  </div>
                ))}
              </div>
            )}
            {outgoing.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">Sending</p>
                {outgoing.map((item: OrderItem) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <ArrowRight className="h-3 w-3 text-amber-600 shrink-0" />
                    <span>{item.quantity} {item.unit} {item.product_name}</span>
                  </div>
                ))}
              </div>
            )}
            {(order.pickup_hub || order.dropoff_hub) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{order.pickup_hub || '?'}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{order.dropoff_hub || '?'}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Needs Tab: Mine at top, Browse below ─────────────── */
function NeedsTab() {
  const currentUserId = useCurrentUser()
  const [showForm, setShowForm] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('all')
  const [browseOpen, setBrowseOpen] = useState(false)
  const { data: needs, isLoading } = useSWR<NeedRow[]>('/api/orders/listings?type=needs', fetcher)

  const mine = useMemo(() => (needs || []).filter(n => n.user_id === currentUserId), [needs, currentUserId])
  const others = useMemo(() => (needs || []).filter(n => n.user_id !== currentUserId), [needs, currentUserId])

  const grouped = useMemo(() => {
    if (groupBy === 'hub') {
      const map = new Map<string, NeedRow[]>()
      others.forEach(n => {
        const hub = n.profile?.neighborhood_hub || 'Unknown Hub'
        if (!map.has(hub)) map.set(hub, [])
        map.get(hub)!.push(n)
      })
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    }
    if (groupBy === 'category') {
      const map = new Map<string, NeedRow[]>()
      others.forEach(n => {
        const cat = n.product_name.split(' ').pop() || 'Other'
        if (!map.has(cat)) map.set(cat, [])
        map.get(cat)!.push(n)
      })
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    }
    return null
  }, [others, groupBy])

  return (
    <div className="space-y-3">
      {/* + Need form / button */}
      {showForm ? (
        <NeedForm onClose={() => setShowForm(false)} />
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-chart-3/30 py-3 text-sm font-medium text-chart-3 hover:bg-chart-3/5 hover:border-chart-3/50 transition-colors">
          <Plus className="h-4 w-4" /> Post a Need
        </button>
      )}

      {isLoading && <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="py-4 px-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>)}</div>}

      {/* My Needs */}
      {mine.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">My Needs</p>
            <span className="text-[10px] text-muted-foreground/40">{mine.length}</span>
          </div>
          {mine.map(n => <NeedCard key={n.id} need={n} isMine />)}
        </>
      )}

      {/* Browse others */}
      {others.length > 0 && (
        <>
          <button onClick={() => setBrowseOpen(!browseOpen)}
            className="flex w-full items-center justify-between pt-2 pb-1 group">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Browse Needs</p>
              <span className="text-[10px] text-muted-foreground/40">{others.length}</span>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground/40 transition-transform', browseOpen && 'rotate-180')} />
          </button>

          {browseOpen && (
            <div className="space-y-3">
              <GroupChips value={groupBy} onChange={setGroupBy} />

              {grouped ? (
                grouped.map(([label, items]) => (
                  <div key={label}>
                    <GroupHeader label={label} />
                    <div className="space-y-2 mt-1">
                      {items.map(n => <NeedCard key={n.id} need={n} isMine={false} />)}
                    </div>
                  </div>
                ))
              ) : (
                others.map(n => <NeedCard key={n.id} need={n} isMine={false} />)
              )}
            </div>
          )}
        </>
      )}

      {!isLoading && !mine.length && !others.length && (
        <Card><CardContent className="py-10 text-center">
          <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold">No active needs</p>
          <p className="text-xs text-muted-foreground mt-1">Post what you are looking for</p>
        </CardContent></Card>
      )}
    </div>
  )
}

/* ── Offers Tab: Mine at top, Browse below ────────────── */
function OffersTab() {
  const currentUserId = useCurrentUser()
  const [showForm, setShowForm] = useState(false)
  const [groupBy, setGroupBy] = useState<GroupBy>('all')
  const [browseOpen, setBrowseOpen] = useState(false)
  const { data: offers, isLoading } = useSWR<OfferRow[]>('/api/orders/listings?type=offers', fetcher)

  const mine = useMemo(() => (offers || []).filter(o => o.user_id === currentUserId), [offers, currentUserId])
  const others = useMemo(() => (offers || []).filter(o => o.user_id !== currentUserId), [offers, currentUserId])

  const grouped = useMemo(() => {
    if (groupBy === 'hub') {
      const map = new Map<string, OfferRow[]>()
      others.forEach(o => {
        const hub = o.profile?.neighborhood_hub || 'Unknown Hub'
        if (!map.has(hub)) map.set(hub, [])
        map.get(hub)!.push(o)
      })
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    }
    if (groupBy === 'category') {
      const map = new Map<string, OfferRow[]>()
      others.forEach(o => {
        const cat = o.product_name.split(' ').pop() || 'Other'
        if (!map.has(cat)) map.set(cat, [])
        map.get(cat)!.push(o)
      })
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    }
    return null
  }, [others, groupBy])

  return (
    <div className="space-y-3">
      {showForm ? (
        <OfferForm onClose={() => setShowForm(false)} />
      ) : (
        <button onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 py-3 text-sm font-medium text-primary hover:bg-primary/5 hover:border-primary/50 transition-colors">
          <Plus className="h-4 w-4" /> Post an Offer
        </button>
      )}

      {isLoading && <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="py-4 px-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>)}</div>}

      {/* My Offers */}
      {mine.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">My Offers</p>
            <span className="text-[10px] text-muted-foreground/40">{mine.length}</span>
          </div>
          {mine.map(o => <OfferCard key={o.id} offer={o} isMine />)}
        </>
      )}

      {/* Browse others */}
      {others.length > 0 && (
        <>
          <button onClick={() => setBrowseOpen(!browseOpen)}
            className="flex w-full items-center justify-between pt-2 pb-1 group">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Browse Offers</p>
              <span className="text-[10px] text-muted-foreground/40">{others.length}</span>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground/40 transition-transform', browseOpen && 'rotate-180')} />
          </button>

          {browseOpen && (
            <div className="space-y-3">
              <GroupChips value={groupBy} onChange={setGroupBy} />

              {grouped ? (
                grouped.map(([label, items]) => (
                  <div key={label}>
                    <GroupHeader label={label} />
                    <div className="space-y-2 mt-1">
                      {items.map(o => <OfferCard key={o.id} offer={o} isMine={false} />)}
                    </div>
                  </div>
                ))
              ) : (
                others.map(o => <OfferCard key={o.id} offer={o} isMine={false} />)
              )}
            </div>
          )}
        </>
      )}

      {!isLoading && !mine.length && !others.length && (
        <Card><CardContent className="py-10 text-center">
          <Leaf className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold">No active offers</p>
          <p className="text-xs text-muted-foreground mt-1">List your surplus products</p>
        </CardContent></Card>
      )}
    </div>
  )
}
