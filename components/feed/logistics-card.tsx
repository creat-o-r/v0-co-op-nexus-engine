'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Truck, MapPin, Clock, Package, ArrowRight, CheckCircle } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface LogisticsCardProps {
  item: FeedItem
  onAccept: (itemId: string) => Promise<void>
  onDecline: (itemId: string) => Promise<void>
}

export function LogisticsCard({ item, onAccept, onDecline }: LogisticsCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>('pending')

  const route = item.route
  const profile = item.profile

  const handleAccept = async () => {
    setIsSubmitting(true)
    try {
      await onAccept(item.id)
      setStatus('accepted')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDecline = async () => {
    setIsSubmitting(true)
    try {
      await onDecline(item.id)
      setStatus('declined')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status !== 'pending') {
    return (
      <Card className={cn(
        'border-2 transition-all',
        status === 'accepted' ? 'border-primary bg-primary/5' : 'border-muted bg-muted/50'
      )}>
        <CardContent className="py-6 text-center">
          <CheckCircle className={cn(
            'h-8 w-8 mx-auto mb-2',
            status === 'accepted' ? 'text-primary' : 'text-muted-foreground'
          )} />
          <p className={cn(
            'font-medium',
            status === 'accepted' ? 'text-primary' : 'text-muted-foreground'
          )}>
            {status === 'accepted' ? 'Delivery Accepted!' : 'Skipped'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-2 border-info/30 bg-info/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-info text-info-foreground gap-1">
            <Truck className="h-3 w-3" />
            Delivery Request
          </Badge>
          {route?.max_cargo_size && (
            <Badge variant="outline" className="text-foreground border-border">
              <Package className="h-3 w-3 mr-1" />
              {route.max_cargo_size} cargo
            </Badge>
          )}
        </div>
        
        <CardTitle className="text-lg text-foreground">{item.title}</CardTitle>
        {item.content && (
          <CardDescription className="text-muted-foreground">{item.content}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Route visualization */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="font-medium text-foreground">{route?.start_hub || 'Pickup'}</span>
              </div>
              
              <div className="ml-1.5 border-l-2 border-dashed border-muted-foreground/30 h-6" />
              
              {route?.waypoints && route.waypoints.length > 0 && (
                <>
                  {route.waypoints.map((waypoint, idx) => (
                    <div key={idx}>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                        <span>{waypoint}</span>
                      </div>
                      <div className="ml-1.5 border-l-2 border-dashed border-muted-foreground/30 h-6" />
                    </div>
                  ))}
                </>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="font-medium text-foreground">{route?.end_hub || 'Dropoff'}</span>
              </div>
            </div>
            
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        {/* Schedule info */}
        {route && (
          <div className="flex flex-wrap gap-2">
            {route.schedule.map((day) => (
              <Badge key={day} variant="secondary" className="capitalize text-secondary-foreground">
                {day}
              </Badge>
            ))}
            {route.departure_time && (
              <Badge variant="outline" className="gap-1 text-foreground border-border">
                <Clock className="h-3 w-3" />
                {route.departure_time}
              </Badge>
            )}
          </div>
        )}

        {/* Driver info */}
        {profile && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {profile.display_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm text-foreground">{profile.display_name}</p>
              {profile.neighborhood_hub && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.neighborhood_hub}
                </p>
              )}
            </div>
            {profile.trust_points > 0 && (
              <Badge variant="secondary" className="ml-auto text-secondary-foreground">
                {profile.trust_points} trust pts
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 bg-transparent"
            onClick={handleDecline}
            disabled={isSubmitting}
          >
            Not this time
          </Button>
          <Button
            size="lg"
            className="flex-1 bg-info text-info-foreground hover:bg-info/90"
            onClick={handleAccept}
            disabled={isSubmitting}
          >
            <Truck className="h-4 w-4 mr-2" />
            Accept Delivery
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
