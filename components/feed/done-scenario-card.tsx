'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, SkipForward, Pencil, BarChart3, MessageCircle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeedItem } from '@/lib/types/database'
import { ScenarioCardBack } from './scenario-card-back'
import { CommentThread } from './comment-thread'

export interface DoneItem extends FeedItem {
  _userAnswer: string | null
  _responseType: string
}

interface DoneScenarioCardProps {
  item: DoneItem
  onEdit: (item: DoneItem) => void
  currentUserId?: string
}

export function DoneScenarioCard({ item, onEdit, currentUserId }: DoneScenarioCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentsCount, setCommentsCount] = useState(item.comments_count)
  const wasSkipped = item._responseType === 'discard'
  const answers = item._userAnswer?.split(', ').filter(Boolean) || []

  // Back view (votes + linkings)
  if (isFlipped) {
    return (
      <ScenarioCardBack
        item={item}
        currentUserId={currentUserId}
        showComments={showComments}
        commentsCount={commentsCount}
        onToggleComments={() => setShowComments(!showComments)}
        onCommentsCountChange={setCommentsCount}
        onFlip={() => setIsFlipped(false)}
        onEdit={onEdit}
      />
    )
  }

  return (
    <Card
      className={cn(
        'group border transition-colors',
        wasSkipped
          ? 'border-dashed border-muted-foreground/25 bg-muted/40'
          : 'border-border bg-card'
      )}
    >
      <CardContent className="px-4 py-3">
        {/* Content area */}
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

          {/* Question + answer */}
          <div className="min-w-0 flex-1">
            {/* Badge row -- edit at top right */}
            <div className="flex items-center gap-2 text-xs mb-1">
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

            {wasSkipped ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Skipped
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
        </div>

        {/* Bottom bar: chat + flip */}
        <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-border">
          <button
            onClick={() => setShowComments(!showComments)}
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
            onClick={() => setIsFlipped(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Votes</span>
          </button>
        </div>

        {/* Comment thread */}
        {showComments && (
          <div className="pt-3 mt-1">
            <CommentThread
              feedItemId={item.id}
              currentUserId={currentUserId}
              commentsCount={commentsCount}
              onCountChange={setCommentsCount}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
