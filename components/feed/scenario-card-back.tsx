'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/utils/date'
import { ItemLinks, ProductPill } from './item-links'
import { ScenarioBottomBar } from './scenario-bottom-bar'
import type { DoneItem } from './done-scenario-card'
import type { FeedItem } from '@/lib/types/database'
import useSWR from 'swr'

/* ── Types ─────────────────────────────────────────────────────── */

interface VoteData {
  likeCount: number
  discardCount: number
  totalCount: number
  optionCounts: Record<string, number>
}

const voteFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch votes')
  return res.json() as Promise<VoteData>
}

/* ── Reusable back content (votes + links) ─────────────────────── */

interface ScenarioCardBackContentProps {
  item: FeedItem
}

export function ScenarioCardBackContent({ item }: ScenarioCardBackContentProps) {
  const { data: votes, isLoading: votesLoading } = useSWR<VoteData>(
    `/api/scenarios/votes?feedItemId=${item.id}`,
    voteFetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  const options = item.scenario_options || []
  const optionCounts = votes?.optionCounts || {}
  const maxOptionCount = Math.max(1, ...Object.values(optionCounts))

  return (
    <>
      {/* Vote breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">Responses</span>
          {votesLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className="tabular-nums">{votes?.totalCount || 0} total</span>
          )}
        </div>

        {!votesLoading && votes && (
          <>
            <div className="space-y-1.5">
              <VoteBar label="Confirmed" count={votes.likeCount} total={votes.totalCount} color="bg-primary" />
              <VoteBar label="Skipped" count={votes.discardCount} total={votes.totalCount} color="bg-muted-foreground/40" />
            </div>

            {options.length > 0 && Object.keys(optionCounts).length > 0 && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Per option
                </span>
                {options.map((option) => (
                  <OptionBar key={option} label={option} count={optionCounts[option] || 0} maxCount={maxOptionCount} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Links (shared component, excludes the product already in the badge row) */}
      <ItemLinks
        item={item}
        exclude={item.tagged_products?.length > 0 ? [item.tagged_products[0]] : []}
      />
    </>
  )
}

/* ── Full card back (wraps content + bottom bar) ───────────────── */

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

export function ScenarioCardBack({
  item, currentUserId, showComments, commentsCount,
  onToggleComments, onCommentsCountChange, onFlip, onEdit,
}: ScenarioCardBackProps) {
  const wasSkipped = item._responseType === 'discard'
  const userAnswer = item._userAnswer

  return (
    <Card className={cn(
      'overflow-hidden border-2 transition-all',
      wasSkipped
        ? 'border-dashed border-muted-foreground/25 bg-muted/40'
        : 'border-border bg-card'
    )}>
      <CardContent className="px-4 py-4 space-y-4">
        {/* Question context */}
        <div>
          <div className="flex items-center gap-2 text-xs mb-1.5">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">Scenario</span>
            {item.tagged_products?.length > 0 && (
              <ProductPill name={item.tagged_products[0]} />
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
          <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>

          {userAnswer && !wasSkipped && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {userAnswer.split(', ').filter(Boolean).map((answer) => (
                <span key={answer} className="inline-block rounded-full bg-primary/8 px-2 py-0.5 text-xs text-primary/80">
                  {answer}
                </span>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-1">
            Created {formatDistanceToNow(new Date(item.created_at))}
          </p>
        </div>

        <ScenarioCardBackContent item={item} />

        <ScenarioBottomBar
          feedItemId={item.id}
          currentUserId={currentUserId}
          showComments={showComments}
          commentsCount={commentsCount}
          isFlipped
          onToggleComments={onToggleComments}
          onFlip={onFlip}
          onCommentsCountChange={onCommentsCountChange}
        />
      </CardContent>
    </Card>
  )
}

/* ── Sub-components ─────────────────────────────────────────────── */

function VoteBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{count} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function OptionBar({ label, count, maxCount }: { label: string; count: number; maxCount: number }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs mb-0.5">
          <span className="truncate text-foreground">{label}</span>
          <span className="tabular-nums text-muted-foreground ml-2 shrink-0">{count}</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500 bg-primary/40" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}
