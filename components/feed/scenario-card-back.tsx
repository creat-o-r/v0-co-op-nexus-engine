'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RotateCcw, Link2, MapPin, Package, Hammer, Truck, MessageCircle, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/utils/date'
import { CommentThread } from './comment-thread'
import type { DoneItem } from './done-scenario-card'
import useSWR from 'swr'

interface VoteData {
  likeCount: number
  discardCount: number
  totalCount: number
  optionCounts: Record<string, number>
}

interface ScenarioCardBackProps {
  item: DoneItem
  currentUserId?: string
  showComments: boolean
  commentsCount: number
  onToggleComments: () => void
  onCommentsCountChange: (count: number) => void
  onFlip: () => void
  onEdit: (item: DoneItem) => void
}

const voteFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch votes')
  return res.json() as Promise<VoteData>
}

export function ScenarioCardBack({
  item,
  currentUserId,
  showComments,
  commentsCount,
  onToggleComments,
  onCommentsCountChange,
  onFlip,
  onEdit,
}: ScenarioCardBackProps) {
  const { data: votes, isLoading: votesLoading } = useSWR<VoteData>(
    `/api/scenarios/votes?feedItemId=${item.id}`,
    voteFetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  const userAnswer = item._userAnswer
  const wasSkipped = item._responseType === 'discard'

  const options = item.scenario_options || []
  const optionCounts = votes?.optionCounts || {}
  const maxOptionCount = Math.max(1, ...Object.values(optionCounts))

  // Linked items
  const hasLinkedProduct = !!item.related_product_id || item.tagged_products.length > 0
  const hasLinkedAgreement = !!item.related_agreement_id
  const hasLinkedRoute = !!item.related_route_id
  const hasLinks = hasLinkedProduct || hasLinkedAgreement || hasLinkedRoute

  return (
    <Card className={cn(
      'overflow-hidden border-2 transition-all',
      wasSkipped
        ? 'border-dashed border-muted-foreground/25 bg-muted/40'
        : 'border-border bg-card'
    )}>
      <CardContent className="px-4 py-4 space-y-4">
        {/* Question context -- edit at top right */}
        <div>
          <div className="flex items-center gap-2 text-xs mb-1.5">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
              Scenario
            </span>
            {item.tagged_products?.length > 0 && (
              <span className="px-2 py-0.5 bg-accent/30 text-accent-foreground rounded-full">
                {item.tagged_products[0]}
              </span>
            )}
            <span className="flex-1" />
            <button
              onClick={() => onEdit(item)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={wasSkipped ? 'Answer' : 'Edit response'}
            >
              <Pencil className="h-3 w-3" />
              <span className="text-[10px]">{wasSkipped ? 'Answer' : 'Edit'}</span>
            </button>
          </div>
          <p className="text-sm font-medium text-foreground leading-snug">
            {item.title}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Created {formatDistanceToNow(new Date(item.created_at))}
          </p>
        </div>

        {/* Vote breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Community responses</span>
            {votesLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span className="tabular-nums">{votes?.totalCount || 0} total</span>
            )}
          </div>

          {!votesLoading && votes && (
            <>
              {/* Yes / Skip summary bars */}
              <div className="space-y-1.5">
                <VoteBar
                  label="Confirmed"
                  count={votes.likeCount}
                  total={votes.totalCount}
                  color="bg-primary"
                  isUserChoice={!wasSkipped}
                />
                <VoteBar
                  label="Skipped"
                  count={votes.discardCount}
                  total={votes.totalCount}
                  color="bg-muted-foreground/40"
                  isUserChoice={wasSkipped}
                />
              </div>

              {/* Per-option breakdown */}
              {options.length > 0 && Object.keys(optionCounts).length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Option breakdown
                  </span>
                  {options.map((option) => {
                    const count = optionCounts[option] || 0
                    const userSelected = userAnswer?.split(', ').includes(option)
                    return (
                      <OptionBar
                        key={option}
                        label={option}
                        count={count}
                        maxCount={maxOptionCount}
                        isUserChoice={!!userSelected}
                      />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Linkings */}
        {hasLinks && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link2 className="h-3 w-3" />
              <span className="font-medium">Linked items</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {item.tagged_products.map((product) => (
                <Badge
                  key={product}
                  variant="secondary"
                  className="gap-1 text-xs text-secondary-foreground"
                >
                  <Package className="h-3 w-3" />
                  {product}
                </Badge>
              ))}
              {hasLinkedAgreement && (
                <Badge variant="secondary" className="gap-1 text-xs text-secondary-foreground">
                  <Hammer className="h-3 w-3" />
                  Build Task
                </Badge>
              )}
              {hasLinkedRoute && (
                <Badge variant="secondary" className="gap-1 text-xs text-secondary-foreground">
                  <Truck className="h-3 w-3" />
                  Route
                </Badge>
              )}
              {item.tagged_hubs.length > 0 && item.tagged_hubs.map((hub) => (
                <Badge
                  key={hub}
                  variant="outline"
                  className="gap-1 text-xs text-foreground border-border"
                >
                  <MapPin className="h-3 w-3" />
                  {hub}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Bottom bar: chat + flip back */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <button
            onClick={onToggleComments}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-colors',
              showComments
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{commentsCount > 0 ? commentsCount : 'Discuss'}</span>
          </button>

          <button
            onClick={onFlip}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Comment thread */}
        {showComments && (
          <div className="pt-2">
            <CommentThread
              feedItemId={item.id}
              currentUserId={currentUserId}
              commentsCount={commentsCount}
              onCountChange={onCommentsCountChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Sub-components ─────────────────────────────────────────────── */

function VoteBar({
  label,
  count,
  total,
  color,
  isUserChoice,
}: {
  label: string
  count: number
  total: number
  color: string
  isUserChoice: boolean
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className={cn(
          'font-medium',
          isUserChoice ? 'text-primary' : 'text-foreground'
        )}>
          {label}
          {isUserChoice && (
            <span className="ml-1.5 text-[10px] text-primary/70">(you)</span>
          )}
        </span>
        <span className="tabular-nums text-muted-foreground">{count} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function OptionBar({
  label,
  count,
  maxCount,
  isUserChoice,
}: {
  label: string
  count: number
  maxCount: number
  isUserChoice: boolean
}) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs mb-0.5">
          <span className={cn(
            'truncate',
            isUserChoice ? 'text-primary font-medium' : 'text-foreground'
          )}>
            {label}
            {isUserChoice && (
              <span className="ml-1 text-[10px] text-primary/70">*</span>
            )}
          </span>
          <span className="tabular-nums text-muted-foreground ml-2 shrink-0">{count}</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isUserChoice ? 'bg-primary' : 'bg-primary/40'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
