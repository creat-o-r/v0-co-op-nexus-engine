'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, ChevronRight } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface ScenarioCardProps {
  item: FeedItem
  onLike: (itemId: string, selectedOption?: string) => Promise<void>
  onDiscard: (itemId: string) => Promise<void>
}

export function ScenarioCard({ item, onLike, onDiscard }: ScenarioCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnimating, setIsAnimating] = useState<'like' | 'discard' | null>(null)

  const options = item.scenario_options || []

  const handleLike = async () => {
    if (options.length > 0 && !selectedOption) return
    setIsAnimating('like')
    setIsSubmitting(true)
    try {
      await onLike(item.id, selectedOption || undefined)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDiscard = async () => {
    setIsAnimating('discard')
    setIsSubmitting(true)
    try {
      await onDiscard(item.id)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card 
      className={cn(
        'transition-all duration-300 overflow-hidden border-2 border-border',
        isAnimating === 'like' && 'translate-x-full opacity-0 border-primary',
        isAnimating === 'discard' && '-translate-x-full opacity-0 border-destructive'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
            Scenario
          </span>
          {item.tagged_products.length > 0 && (
            <span className="px-2 py-0.5 bg-accent/30 text-accent-foreground rounded-full">
              {item.tagged_products[0]}
            </span>
          )}
        </div>
        <CardTitle className="text-lg text-balance">{item.title}</CardTitle>
        <CardDescription className="text-pretty">{item.content}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {item.scenario_question && (
          <p className="font-medium text-foreground">{item.scenario_question}</p>
        )}
        
        {options.length > 0 && (
          <div className="space-y-2">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedOption(option)}
                disabled={isSubmitting}
                className={cn(
                  'w-full text-left p-3 rounded-lg border-2 transition-all',
                  'hover:border-primary/50 hover:bg-primary/5',
                  selectedOption === option 
                    ? 'border-primary bg-primary/10 text-foreground' 
                    : 'border-border bg-card text-foreground'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">{option}</span>
                  {selectedOption === option && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent"
            onClick={handleDiscard}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button
            size="lg"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleLike}
            disabled={isSubmitting || (options.length > 0 && !selectedOption)}
          >
            <Check className="h-4 w-4 mr-2" />
            {options.length > 0 ? 'Confirm' : 'Yes!'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
