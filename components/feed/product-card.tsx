'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Heart, MessageCircle, MapPin, ShieldCheck, Leaf } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  item: FeedItem
  onLike: (itemId: string) => Promise<void>
  onComment?: (itemId: string) => void
  onContact?: (itemId: string) => void
}

export function ProductCard({ item, onLike, onComment, onContact }: ProductCardProps) {
  const [isLiked, setIsLiked] = useState(!!item.user_interaction)
  const [likesCount, setLikesCount] = useState(item.likes_count)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const surplus = item.surplus
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

  const getVerificationBadge = () => {
    if (!surplus) return null
    switch (surplus.verification_status) {
      case 'multiple_verified':
        return (
          <Badge variant="default" className="bg-primary text-primary-foreground gap-1">
            <ShieldCheck className="h-3 w-3" />
            Verified
          </Badge>
        )
      case 'peer_verified':
        return (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            Peer Verified
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card className="overflow-hidden border border-border">
      {item.image_url && (
        <div className="relative h-48 bg-muted">
          <img 
            src={item.image_url || "/placeholder.svg"} 
            alt={item.title}
            className="w-full h-full object-cover"
          />
          {getVerificationBadge() && (
            <div className="absolute top-3 right-3">
              {getVerificationBadge()}
            </div>
          )}
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {profile?.display_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm text-foreground">{profile?.display_name || 'Anonymous'}</p>
              {profile?.neighborhood_hub && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.neighborhood_hub}
                </p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 text-foreground border-border">
            {item.product?.category || 'Product'}
          </Badge>
        </div>
        
        <CardTitle className="text-lg mt-3 text-foreground">{item.title}</CardTitle>
        {item.content && (
          <CardDescription className="text-muted-foreground">{item.content}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {surplus && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-secondary-foreground">
              {surplus.quantity_available} {surplus.unit} available
            </Badge>
            {surplus.price_per_unit && (
              <Badge variant="secondary" className="text-secondary-foreground">
                ${surplus.price_per_unit}/{surplus.unit}
              </Badge>
            )}
          </div>
        )}

        {surplus?.methods_inputs && surplus.methods_inputs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {surplus.methods_inputs.map((method) => (
              <span 
                key={method}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
              >
                <Leaf className="h-3 w-3" />
                {method}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              disabled={isSubmitting}
              className={cn(
                'flex items-center gap-1.5 text-sm transition-colors',
                isLiked ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'
              )}
            >
              <Heart className={cn('h-5 w-5', isLiked && 'fill-current')} />
              <span>{likesCount}</span>
            </button>
            {onComment && (
              <button 
                onClick={() => onComment(item.id)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{item.comments_count}</span>
              </button>
            )}
          </div>
          {onContact && (
            <Button 
              size="sm" 
              onClick={() => onContact(item.id)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Contact
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
