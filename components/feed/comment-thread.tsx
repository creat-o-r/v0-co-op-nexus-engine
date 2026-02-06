'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Trash2, MapPin, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/utils/date'
import useSWR, { mutate as globalMutate } from 'swr'

export interface Comment {
  id: string
  user_id: string
  feed_item_id: string
  interaction_type: string
  comment_text: string | null
  created_at: string
  profile: {
    id: string
    display_name: string | null
    neighborhood_hub: string | null
    avatar_url: string | null
  } | null
}

interface CommentThreadProps {
  feedItemId: string
  currentUserId?: string
  /** Start in collapsed mode -- user must click to expand */
  collapsible?: boolean
  /** Show initial comment count (used when collapsed) */
  commentsCount?: number
  /** Called when the local count changes (so parent can update its UI) */
  onCountChange?: (newCount: number) => void
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch comments')
  const json = await res.json()
  return json.comments as Comment[]
}

export function CommentThread({
  feedItemId,
  currentUserId,
  collapsible = false,
  commentsCount = 0,
  onCountChange,
}: CommentThreadProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsible)
  const [newComment, setNewComment] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const swrKey = isExpanded ? `/api/feed/comments?feedItemId=${feedItemId}` : null

  const { data: comments = [], isLoading } = useSWR<Comment[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current && comments.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments.length])

  const handleSend = useCallback(async () => {
    const text = newComment.trim()
    if (!text || isSending) return

    setIsSending(true)
    try {
      const res = await fetch('/api/feed/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedItemId, commentText: text }),
      })

      if (!res.ok) throw new Error('Failed to post comment')

      const { comment } = await res.json()

      // Optimistic update -- add to SWR cache
      globalMutate(
        `/api/feed/comments?feedItemId=${feedItemId}`,
        (prev: Comment[] | undefined) => [...(prev || []), comment],
        false
      )

      setNewComment('')
      onCountChange?.((comments?.length || 0) + 1)

      // Focus back on input for quick follow-ups
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch {
      // Could show a toast here
    } finally {
      setIsSending(false)
    }
  }, [newComment, isSending, feedItemId, comments?.length, onCountChange])

  const handleDelete = useCallback(async (commentId: string) => {
    setDeletingId(commentId)
    try {
      const res = await fetch(`/api/feed/comments/${commentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')

      // Optimistic removal
      globalMutate(
        `/api/feed/comments?feedItemId=${feedItemId}`,
        (prev: Comment[] | undefined) => (prev || []).filter(c => c.id !== commentId),
        false
      )

      onCountChange?.(Math.max(0, (comments?.length || 1) - 1))
    } catch {
      // Could show a toast here
    } finally {
      setDeletingId(null)
    }
  }, [feedItemId, comments?.length, onCountChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Collapsed mode -- show a button to expand
  if (collapsible && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span>
          {commentsCount > 0
            ? `${commentsCount} comment${commentsCount !== 1 ? 's' : ''}`
            : 'Start a discussion'}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Discussion{comments.length > 0 ? ` (${comments.length})` : ''}
        </span>
        {collapsible && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Collapse
          </button>
        )}
      </div>

      {/* Comments list */}
      <div
        ref={scrollRef}
        className={cn(
          'space-y-3 overflow-y-auto',
          comments.length > 4 && 'max-h-64'
        )}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No comments yet. Be the first to share your thoughts.
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5 group">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {comment.profile?.display_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground truncate">
                    {comment.profile?.display_name || 'Community Member'}
                  </span>
                  {comment.profile?.neighborhood_hub && (
                    <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5" />
                      {comment.profile.neighborhood_hub}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at))}
                  </span>
                  {comment.user_id === currentUserId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="opacity-0 group-hover:opacity-100 ml-auto text-muted-foreground hover:text-destructive transition-all"
                      aria-label="Delete comment"
                    >
                      {deletingId === comment.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">
                  {comment.comment_text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compose input */}
      {currentUserId && (
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment..."
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
              'min-h-[36px] max-h-24'
            )}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSend}
            disabled={!newComment.trim() || isSending}
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
