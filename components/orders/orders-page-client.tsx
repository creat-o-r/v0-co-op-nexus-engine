'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  ArrowLeftRight, ArrowRight, DollarSign, Clock,
  CheckCircle, Truck, MapPin, Package, ShoppingCart,
  Leaf, AlertTriangle, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'
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

const TYPE_ICON = {
  purchase: DollarSign,
  swap: ArrowLeftRight,
  mixed: ArrowRight,
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
        {/* Tabs */}
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
            Orders are created from needs, offers, or directly with other members
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
  const TypeIcon = TYPE_ICON[order.order_type] || ArrowLeftRight
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
        {/* Header row */}
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
              <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                <span className="text-[10px] text-muted-foreground">
                  ${Number(order.money_amount).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expanded: items + hubs */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            {/* Items flow */}
            <div className="space-y-2">
              {incoming.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
                    Receiving
                  </p>
                  {incoming.map((item: OrderItem) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                      <Package className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-foreground">{item.quantity} {item.unit} {item.product_name}</span>
                      {item.price_per_unit && (
                        <span className="text-muted-foreground ml-auto">${Number(item.price_per_unit).toFixed(2)}/{item.unit}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {outgoing.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
                    Sending
                  </p>
                  {outgoing.map((item: OrderItem) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                      <ArrowRight className="h-3 w-3 text-amber-600 shrink-0" />
                      <span className="text-foreground">{item.quantity} {item.unit} {item.product_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hubs */}
            {(order.pickup_hub || order.dropoff_hub) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{order.pickup_hub || '?'}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{order.dropoff_hub || '?'}</span>
              </div>
            )}

            {/* Parties */}
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
  const { data: needs, isLoading } = useSWR<(UserNeed & { profile?: Profile })[]>(
    '/api/orders/listings?type=needs', fetcher
  )

  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="py-4 px-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>)}</div>
  }

  if (!needs?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No active needs</p>
          <p className="text-sm text-muted-foreground mt-1">Post what you are looking for</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {needs.map(need => (
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
      ))}
    </div>
  )
}

/* ── Offers Tab ──────────────────────────────────────── */
function OffersTab() {
  const { data: offers, isLoading } = useSWR<(UserSurplus & { profile?: Profile })[]>(
    '/api/orders/listings?type=offers', fetcher
  )

  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="py-4 px-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>)}</div>
  }

  if (!offers?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Leaf className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No active offers</p>
          <p className="text-sm text-muted-foreground mt-1">List your surplus products here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {offers.map(offer => (
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
                  {offer.price_per_unit && ` -- $${Number(offer.price_per_unit).toFixed(2)}/${offer.unit}`}
                  {!offer.price_per_unit && ' -- open to swap'}
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
                    {offer.verification_status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 text-xs h-7">
                Order
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
