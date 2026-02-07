'use client'

import { useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeftRight, ArrowRight, DollarSign, Clock,
  CheckCircle, Truck, MapPin, Package, ShoppingCart,
  Leaf, AlertTriangle, X, Plus, Zap, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR, { mutate } from 'swr'
import type { Order, OrderItem, UserNeed, UserSurplus, Profile } from '@/lib/types/database'

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

type Tab = 'orders' | 'needs' | 'offers'

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
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">Orders</h1>
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

  const isNeed = forType === 'need' // posting a need -> matches are surplus offers
  const label = isNeed ? 'Available offers' : 'People looking for this'
  const LabelIcon = isNeed ? Leaf : ShoppingCart

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
                {profile?.neighborhood_hub && ` -- ${profile.neighborhood_hub}`}
              </p>
            </div>
            <LabelIcon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          </div>
        )
      })}
    </div>
  )
}

/* ── Need Form ────────────────────────────────────────── */
function NeedForm({ onClose }: { onClose: () => void }) {
  const [productName, setProductName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kg')
  const [maxPrice, setMaxPrice] = useState('')
  const [priority, setPriority] = useState('normal')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!productName.trim()) return
    setSubmitting(true)
    await fetch('/api/orders/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'need',
        product_name: productName.trim(),
        quantity: Number(quantity) || 1,
        unit,
        max_price_per_unit: maxPrice ? Number(maxPrice) : null,
        priority,
        notes: notes.trim() || null,
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
            Post a Need
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Input
          placeholder="What do you need? e.g. Eggs, Flour..."
          value={productName}
          onChange={e => setProductName(e.target.value)}
          className="text-sm"
          autoFocus
        />

        {/* Instant matches as user types */}
        <InstantMatches query={productName} forType="need" />

        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            placeholder="Qty"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="text-sm"
          />
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {['kg', 'g', 'lb', 'oz', 'dozen', 'unit', 'bunch', 'loaf', 'jar', 'liter'].map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="Max $/unit"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            className="text-sm"
            step="0.01"
          />
        </div>

        <div className="flex gap-1.5">
          {(['low', 'normal', 'high'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize',
                priority === p
                  ? p === 'high' ? 'bg-red-500/15 text-red-700' : p === 'normal' ? 'bg-blue-500/15 text-blue-700' : 'bg-muted text-muted-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted'
              )}
            >
              {p}
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Any notes? Organic only, delivery preference..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="text-sm resize-none"
        />

        <Button
          onClick={handleSubmit}
          disabled={!productName.trim() || submitting}
          className="w-full"
          size="sm"
        >
          {submitting ? 'Posting...' : 'Post Need'}
        </Button>
      </CardContent>
    </Card>
  )
}

/* ── Offer Form ───────────────────────────────────────── */
function OfferForm({ onClose }: { onClose: () => void }) {
  const [productName, setProductName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kg')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!productName.trim()) return
    setSubmitting(true)
    await fetch('/api/orders/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'offer',
        product_name: productName.trim(),
        quantity_available: Number(quantity) || 1,
        unit,
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
            Post an Offer
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Input
          placeholder="What do you have? e.g. Eggs, Honey..."
          value={productName}
          onChange={e => setProductName(e.target.value)}
          className="text-sm"
          autoFocus
        />

        {/* Instant matches as user types */}
        <InstantMatches query={productName} forType="offer" />

        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            placeholder="Qty"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="text-sm"
          />
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {['kg', 'g', 'lb', 'oz', 'dozen', 'unit', 'bunch', 'loaf', 'jar', 'liter'].map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="$/unit"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="text-sm"
            step="0.01"
          />
        </div>

        <p className="text-[10px] text-muted-foreground">
          Leave price empty to indicate you are open to swaps
        </p>

        <Textarea
          placeholder="Notes? Organic, homemade, pickup location..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="text-sm resize-none"
        />

        <Button
          onClick={handleSubmit}
          disabled={!productName.trim() || submitting}
          className="w-full"
          size="sm"
        >
          {submitting ? 'Posting...' : 'Post Offer'}
        </Button>
      </CardContent>
    </Card>
  )
}

/* ── Orders Tab ──────────────────────────────────────── */
function OrdersTab() {
  const { data: orders, isLoading } = useSWR<Order[]>('/api/orders', fetcher)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-4 px-4"><div className="h-16 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!orders?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ArrowLeftRight className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Post a need or offer to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  )
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
    <Card
      className="cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2 shrink-0">
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback className="text-[10px] bg-accent/30 text-accent-foreground">{counterInitials}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-foreground truncate">
                {order.order_type === 'swap' ? 'Swap' : order.order_type === 'mixed' ? 'Mixed' : 'Purchase'}
                {order.notes && <span className="text-muted-foreground font-normal"> -- {order.notes}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium', statusCfg.color)}>
                <StatusIcon className="h-2.5 w-2.5" />
                {statusCfg.label}
              </span>
              {order.money_amount > 0 && (
                <span className="text-[10px] text-muted-foreground">${Number(order.money_amount).toFixed(2)}</span>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="space-y-2">
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
            </div>

            {(order.pickup_hub || order.dropoff_hub) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{order.pickup_hub || '?'}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{order.dropoff_hub || '?'}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{order.initiator_profile?.display_name || 'Initiator'}</span>
              <ArrowLeftRight className="h-3 w-3" />
              <span>{order.counterparty_profile?.display_name || 'Counterparty'}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Needs Tab ───────────────────────────────────────── */
function NeedsTab() {
  const [showForm, setShowForm] = useState(false)
  const { data: needs, isLoading } = useSWR<(UserNeed & { profile?: Profile })[]>(
    '/api/orders/listings?type=needs', fetcher
  )

  return (
    <div className="space-y-3">
      {/* + Need button or form */}
      {showForm ? (
        <NeedForm onClose={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-chart-3/30 py-3 text-sm font-medium text-chart-3 hover:bg-chart-3/5 hover:border-chart-3/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Post a Need
        </button>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="py-4 px-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>)}</div>
      ) : !needs?.length ? (
        <Card>
          <CardContent className="py-10 text-center">
            <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">No active needs</p>
            <p className="text-xs text-muted-foreground mt-1">Post what you are looking for</p>
          </CardContent>
        </Card>
      ) : (
        needs.map(need => (
          <Card key={need.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 shrink-0">
                  <ShoppingCart className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{need.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {need.quantity} {need.unit} -- {need.frequency}
                    {need.max_price_per_unit && ` -- max $${Number(need.max_price_per_unit).toFixed(2)}/${need.unit}`}
                  </p>
                  {need.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{need.notes}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    {need.profile?.display_name && (
                      <span className="text-[10px] text-muted-foreground">{need.profile.display_name}</span>
                    )}
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                      need.priority === 'high' ? 'bg-red-500/15 text-red-700' :
                      need.priority === 'normal' ? 'bg-blue-500/15 text-blue-700' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {need.priority}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 text-xs h-7">
                  Offer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

/* ── Offers Tab ──────────────────────────────────────── */
function OffersTab() {
  const [showForm, setShowForm] = useState(false)
  const { data: offers, isLoading } = useSWR<(UserSurplus & { profile?: Profile })[]>(
    '/api/orders/listings?type=offers', fetcher
  )

  return (
    <div className="space-y-3">
      {/* + Offer button or form */}
      {showForm ? (
        <OfferForm onClose={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 py-3 text-sm font-medium text-primary hover:bg-primary/5 hover:border-primary/50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Post an Offer
        </button>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="py-4 px-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>)}</div>
      ) : !offers?.length ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Leaf className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">No active offers</p>
            <p className="text-xs text-muted-foreground mt-1">List your surplus products</p>
          </CardContent>
        </Card>
      ) : (
        offers.map(offer => (
          <Card key={offer.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Leaf className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{offer.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {offer.quantity_available} {offer.unit} available
                    {offer.price_per_unit ? ` -- $${Number(offer.price_per_unit).toFixed(2)}/${offer.unit}` : ' -- open to swap'}
                  </p>
                  {offer.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{offer.notes}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    {offer.profile?.display_name && (
                      <span className="text-[10px] text-muted-foreground">{offer.profile.display_name}</span>
                    )}
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                      offer.verification_status === 'multiple_verified' ? 'bg-primary/15 text-primary' :
                      offer.verification_status === 'peer_verified' ? 'bg-blue-500/15 text-blue-700' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {(offer.verification_status || 'self_reported').replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 text-xs h-7">
                  Order
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
