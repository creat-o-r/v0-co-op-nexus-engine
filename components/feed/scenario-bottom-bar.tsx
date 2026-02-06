'use client'

import { MessageCircle, BarChart3, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommentThread } from './comment-thread'

interface ScenarioBottomBarProps {
  feedItemId: string
  currentUserId?: string
  showComments: boolean
  commentsCount: number
  isFlipped: boolean
  onToggleComments: () => void
  onFlip: () => void
  onCommentsCountChange: (count: number) => void
}

export function ScenarioBottomBar({
  feedItemId,
  currentUserId,
  showComments,
  commentsCount,
  isFlipped,
  onToggleComments,
  onFlip,
  onCommentsCountChange,
}: ScenarioBottomBarProps) {
  return (
    <div className="space-y-0">
      {/* Icon row */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={onToggleComments}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-colors',
            showComments
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:bg-muted'
          )}
          aria-label={showComments ? 'Hide discussion' : 'Show discussion'}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {commentsCount > 0 && <span className="tabular-nums">{commentsCount}</span>}
        </button>

        <button
          onClick={onFlip}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:bg-muted transition-colors"
          aria-label={isFlipped ? 'Back to front' : 'View votes'}
        >
          {isFlipped ? (
            <RotateCcw className="h-3.5 w-3.5" />
          ) : (
            <BarChart3 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Comment thread */}
      {showComments && (
        <div className="pt-3">
          <CommentThread
            feedItemId={feedItemId}
            currentUserId={currentUserId}
            commentsCount={commentsCount}
            onCountChange={onCommentsCountChange}
          />
        </div>
      )}
    </div>
  )
}
