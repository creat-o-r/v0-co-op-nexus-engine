'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
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
    <Card className="border border-border bg-card transition-colors">
      <CardHeader className="pb-1.5 pt-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              {wasSkipped ? (
                <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
              <span className={cn(
                'text-xs font-medium',
                wasSkipped ? 'text-muted-foreground' : 'text-primary'
              )}>
                {wasSkipped ? 'Skipped' : 'Answered'}
              </span>
            </div>
            <CardTitle className="text-sm font-medium text-foreground leading-snug">
              {item.title}
            </CardTitle>
          </div>
          <button
            onClick={() => onEdit(item)}
            className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:bg-primary/5"
            title="Change your answer"
          >
            <RotateCcw className="h-3 w-3" />
            Edit
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 pt-0">
        {!wasSkipped && answers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {answers.map((answer) => (
              <span
                key={answer}
                className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {answer}
              </span>
            ))}
          </div>
        ) : wasSkipped ? (
          <p className="mt-1 text-xs text-muted-foreground italic">
            No answer provided
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
