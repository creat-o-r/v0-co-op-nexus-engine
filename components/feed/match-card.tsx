'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ArrowLeftRight,
  MapPin,
  Truck,
  ShoppingCart,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MatchResult {
  match_id: string
  need_id: string
  surplus_id: string
  product_name: string
  needed_qty: number
  available_qty: number
  unit: string
  max_price: number | null
  offer_price: number | null
  buyer_hub: string | null
  seller_hub: string | null
  route_id: string | null
  route_name: string | null
  score: number
  buyer_profile?: { display_name: string | null; avatar_url: string | null }
  seller_profile?: { display_name: string | null; avatar_url: string | null }
}

interface MatchCardProps {
  match: MatchResult
  currentUserId?: string
  onPropose: (match: MatchResult) => Promise<void>
  onDismiss: (matchId: string) => void
}

export function MatchCard({ match, currentUserId, onPropose, onDismiss }: MatchCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [proposing, setProposing] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const fillable = Math.min(match.available_qty, match.needed_qty)
  const fillPct = Math.round((fillable / match.needed_qty) * 100)
  const hasRoute = !!match.route_name
  const priceMatch = match.max_price && match.offer_price
    ? match.offer_price <= match.max_price
    : null

  const handlePropose = async () => {
    setProposing(true)
    try {
      await onPropose(match)
    } finally {
      setProposing(false)
    }
  }

  return (
    <Card className="overflow-hidden border-2 border-chart-3/30 bg-chart-3/5">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-3/15">
              <ArrowLeftRight className="h-4 w-4 text-chart-3" />
            </div>
            <div>
              <Badge className="bg-chart-3/15 text-chart-3 border-0 text-[10px] font-semibold">
                Match Found
              </Badge>
            </div>
          </div>
          <button
            onClick={() => { setDismissed(true); onDismiss(match.match_id) }}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Product + quantity */}
        <div>
          <h3 className="text-sm font-semibold text-foreground">{match.product_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fillable} {match.unit} available of {match.needed_qty} needed
            <span className="ml-1.5 text-chart-3 font-medium">({fillPct}% fill)</span>
          </p>
        </div>

        {/* Parties */}
        <div className="flex items-center gap-3">
          {/* Seller */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                {match.seller_profile?.display_name?.charAt(0) || 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {match.seller_profile?.display_name || 'Seller'}
              </p>
              {match.seller_hub && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" />{match.seller_hub}
                </p>
              )}
            </div>
          </div>

          <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />

          {/* Buyer */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {match.buyer_profile?.display_name || 'You'}
              </p>
              {match.buyer_hub && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
                  <MapPin className="h-2.5 w-2.5" />{match.buyer_hub}
                </p>
              )}
            </div>
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-chart-3/10 text-chart-3 text-[10px]">
                {match.buyer_profile?.display_name?.charAt(0) || 'B'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Details
        </button>

        {expanded && (
          <div className="space-y-2 text-xs">
            {/* Price info */}
            {(match.offer_price || match.max_price) && (
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5">
                {match.offer_price != null && (
                  <span className="text-muted-foreground">
                    Asking: <span className="font-medium text-foreground">${match.offer_price}/{match.unit}</span>
                  </span>
                )}
                {match.max_price != null && (
                  <span className="text-muted-foreground">
                    Budget: <span className={cn(
                      'font-medium',
                      priceMatch ? 'text-primary' : 'text-destructive'
                    )}>${match.max_price}/{match.unit}</span>
                  </span>
                )}
              </div>
            )}

            {/* Route */}
            {hasRoute && (
              <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Route available: <span className="font-medium text-foreground">{match.route_name}</span>
                </span>
              </div>
            )}

            {/* Score */}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              Match quality:
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-chart-3 rounded-full"
                  style={{ width: `${Math.min(match.score * 10, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-chart-3">{match.score.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-chart-3 text-white hover:bg-chart-3/90"
            onClick={handlePropose}
            disabled={proposing}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            {proposing ? 'Proposing...' : 'Propose Order'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
