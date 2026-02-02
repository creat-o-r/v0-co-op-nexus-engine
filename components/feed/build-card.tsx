'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Hammer, 
  Users, 
  Calendar, 
  Award,
  Code,
  Handshake,
  Truck as TruckIcon,
  Sprout,
  Megaphone,
  ClipboardList
} from 'lucide-react'
import type { FeedItem, Talent } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface BuildCardProps {
  item: FeedItem
  onClaim: (itemId: string) => Promise<void>
  userTalents?: Talent[]
}

const talentIcons: Record<Talent, typeof Code> = {
  Tech: Code,
  Negotiation: Handshake,
  Logistics: TruckIcon,
  Growing: Sprout,
  Admin: ClipboardList,
  Promotion: Megaphone,
}

const talentColors: Record<Talent, string> = {
  Tech: 'bg-chart-3 text-info-foreground',
  Negotiation: 'bg-accent text-accent-foreground',
  Logistics: 'bg-info text-info-foreground',
  Growing: 'bg-primary text-primary-foreground',
  Admin: 'bg-secondary text-secondary-foreground',
  Promotion: 'bg-chart-5 text-info-foreground',
}

export function BuildCard({ item, onClaim, userTalents = [] }: BuildCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClaimed, setIsClaimed] = useState(!!item.agreement?.assigned_to)

  const agreement = item.agreement
  const requiredTalent = agreement?.required_talent as Talent | undefined
  const hasRequiredTalent = requiredTalent ? userTalents.includes(requiredTalent) : true

  const TalentIcon = requiredTalent ? talentIcons[requiredTalent] : Hammer

  const handleClaim = async () => {
    setIsSubmitting(true)
    try {
      await onClaim(item.id)
      setIsClaimed(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = agreement?.batch_threshold && agreement.current_volume
    ? Math.min((agreement.current_volume / agreement.batch_threshold) * 100, 100)
    : null

  return (
    <Card className={cn(
      'overflow-hidden border-2',
      isClaimed ? 'border-primary/50 bg-primary/5' : 'border-warning/30 bg-warning/5'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-warning text-warning-foreground gap-1">
            <Hammer className="h-3 w-3" />
            Build Task
          </Badge>
          {requiredTalent && (
            <Badge className={cn('gap-1', talentColors[requiredTalent])}>
              <TalentIcon className="h-3 w-3" />
              {requiredTalent}
            </Badge>
          )}
          {agreement?.status === 'active' && (
            <Badge variant="outline" className="ml-auto text-foreground border-border">
              In Progress
            </Badge>
          )}
        </div>
        
        <CardTitle className="text-lg text-foreground">{item.title}</CardTitle>
        {item.content && (
          <CardDescription className="text-muted-foreground">{item.content}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar for bulk negotiations */}
        {progress !== null && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Community Interest</span>
              <span className="font-medium text-foreground">
                {agreement?.current_volume} / {agreement?.batch_threshold} {item.product?.unit || 'units'}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress >= 100 && (
              <p className="text-xs text-primary font-medium">
                Threshold reached! Ready for negotiation
              </p>
            )}
          </div>
        )}

        {/* Task details */}
        <div className="flex flex-wrap gap-3">
          {agreement?.deadline && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Due {new Date(agreement.deadline).toLocaleDateString()}</span>
            </div>
          )}
          {agreement?.reward_trust_points && agreement.reward_trust_points > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-primary">
              <Award className="h-4 w-4" />
              <span>+{agreement.reward_trust_points} trust points</span>
            </div>
          )}
        </div>

        {/* Assigned user */}
        {isClaimed && agreement?.assignee_profile && (
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {agreement.assignee_profile.display_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {agreement.assignee_profile.display_name}
              </p>
              <p className="text-xs text-muted-foreground">Claimed this task</p>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Action buttons */}
        {!isClaimed && (
          <div className="pt-2">
            <Button
              size="lg"
              className={cn(
                'w-full',
                hasRequiredTalent 
                  ? 'bg-warning text-warning-foreground hover:bg-warning/90' 
                  : 'bg-muted text-muted-foreground'
              )}
              onClick={handleClaim}
              disabled={isSubmitting || !hasRequiredTalent}
            >
              <Hammer className="h-4 w-4 mr-2" />
              {hasRequiredTalent ? 'Claim This Task' : `Requires ${requiredTalent} talent`}
            </Button>
            {!hasRequiredTalent && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Update your profile to add this talent
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
