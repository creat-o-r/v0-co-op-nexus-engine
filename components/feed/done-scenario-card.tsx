'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, SkipForward, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeedItem } from '@/lib/types/database'

export interface DoneItem extends FeedItem {
  _userAnswer: string | null
  _responseType: string
}

interface DoneScenarioCardProps {
  item: DoneItem
  onEdit: (item: DoneItem) => void
}

export function DoneScenarioCard({ item, onEdit }: DoneScenarioCardProps) {
  const wasSkipped = item._responseType === 'discard'
  const answers = item._userAnswer?.split(', ').filter(Boolean) || []

  return (
    <Card
      className={cn(
        'group border transition-colors cursor-pointer',
        wasSkipped
          ? 'border-dashed border-muted-foreground/25 bg-muted/40 hover:border-primary/40 hover:bg-muted/60'
          : 'border-border bg-card hover:border-primary/30'
      )}
      onClick={() => onEdit(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onEdit(item) }}
    >
      <CardContent className="px-4 py-3">
        {/* Top: status + title + edit hint */}
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            wasSkipped
              ? 'bg-muted-foreground/10'
              : 'bg-primary/10'
          )}>
            {wasSkipped ? (
              <SkipForward className="h-3 w-3 text-muted-foreground" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-primary" />
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs mb-1">
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                Scenario
              </span>
              {item.tagged_products?.length > 0 && (
                <span className="px-2 py-0.5 bg-accent/30 text-accent-foreground rounded-full">
                  {item.tagged_products[0]}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-foreground leading-snug">
              {item.title}
            </p>

            {/* Answer display or skipped prompt */}
            {wasSkipped ? (
              <p className="mt-1.5 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Tap to answer
              </p>
            ) : answers.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {answers.map((answer) => (
                  <span
                    key={answer}
                    className="inline-block rounded-full bg-primary/8 px-2 py-0.5 text-xs text-primary/80"
                  >
                    {answer}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Confirmed
              </p>
            )}
          </div>

          {/* Edit icon -- visible on hover / always visible on mobile */}
          <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  )
}
