'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Heart, MessageCircle, Share2, MapPin, MoreHorizontal } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/utils/date'
import { CommentThread } from './comment-thread'

interface DiscussionCardProps {
  item: FeedItem
  onLike: (itemId: string) => Promise<void>
  currentUserId?: string
  onShare?: (itemId: string) => void
}

export function DiscussionCard({ item, onLike, currentUserId, onShare }: DiscussionCardProps) {
  const [isLiked, setIsLiked] = useState(!!item.user_interaction)
  const [likesCount, setLikesCount] = useState(item.likes_count)
  const [commentsCount, setCommentsCount] = useState(item.comments_count)
  const [showComments, setShowComments] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const profile = item.profile

  const handleLike = async () => {
    setIsSubmitting(true)
    try {
      await onLike(item.id)
      setIsLiked(!isLiked)
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="overflow-hidden border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {profile?.display_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm text-foreground">{profile?.display_name || 'Community Member'}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {profile?.neighborhood_hub && (
                  <>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profile.neighborhood_hub}
                    </span>
                    <span>·</span>
                  </>
                )}
                <span>{formatDistanceToNow(new Date(item.created_at))}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {item.title && (
          <h3 className="font-semibold text-foreground">{item.title}</h3>
        )}
        
        {item.content && (
          <p className="text-foreground whitespace-pre-wrap">{item.content}</p>
        )}

        {item.image_url && (
          <div className="rounded-lg overflow-hidden -mx-6">
            <img 
              src={item.image_url || "/placeholder.svg"} 
              alt=""
              className="w-full object-cover max-h-96"
            />
          </div>
        )}

        {/* Tags */}
        {(item.tagged_products.length > 0 || item.tagged_hubs.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {item.tagged_products.map((product) => (
              <Badge key={product} variant="secondary" className="text-secondary-foreground">
                #{product}
              </Badge>
            ))}
            {item.tagged_hubs.map((hub) => (
              <Badge key={hub} variant="outline" className="text-foreground border-border">
                <MapPin className="h-3 w-3 mr-1" />
                {hub}
              </Badge>
            ))}
          </div>
        )}

        {/* Engagement bar */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            <button 
              onClick={handleLike}
              disabled={isSubmitting}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
                isLiked 
                  ? 'text-destructive bg-destructive/10' 
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
              <span>{likesCount > 0 ? likesCount : ''}</span>
            </button>
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
                showComments
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <MessageCircle className="h-4 w-4" />
              <span>{commentsCount > 0 ? commentsCount : ''}</span>
            </button>
          </div>
          
          {onShare && (
            <button 
              onClick={() => onShare(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Comment thread */}
        {showComments && (
          <div className="pt-3">
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
