'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, X, ChevronRight, ChevronDown, ChevronUp, PenLine } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface ScenarioCardProps {
  item: FeedItem
  onLike: (itemId: string, selectedOption?: string) => Promise<void>
  onDiscard: (itemId: string) => Promise<void>
  isAdmin?: boolean
}

export function ScenarioCard({ item, onLike, onDiscard, isAdmin = false }: ScenarioCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnimating, setIsAnimating] = useState<'like' | 'discard' | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [otherText, setOtherText] = useState('')
  const [showOtherInput, setShowOtherInput] = useState(false)

  const options = item.scenario_options || []
  const multiSelect = isAdmin
  const hasSelection = selectedOptions.length > 0 || (showOtherInput && otherText.trim().length > 0)

  // For non-admin: single select; for admin: multi-select toggle
  const handleOptionSelect = useCallback((option: string) => {
    if (multiSelect) {
      setSelectedOptions(prev =>
        prev.includes(option)
          ? prev.filter(o => o !== option)
          : [...prev, option]
      )
    } else {
      setSelectedOptions(prev => prev[0] === option ? [] : [option])
    }
    // If user selects a predefined option, hide the "other" input unless they explicitly want it
  }, [multiSelect])

  const toggleOtherInput = useCallback(() => {
    setShowOtherInput(prev => !prev)
    if (showOtherInput) {
      setOtherText('')
    }
  }, [showOtherInput])

  const handleLike = async () => {
    if (options.length > 0 && !hasSelection) return
    
    // Build the response string
    let response: string | undefined
    const parts: string[] = [...selectedOptions]
    if (showOtherInput && otherText.trim()) {
      parts.push(otherText.trim())
    }
    response = parts.length > 0 ? parts.join(', ') : undefined

    setIsAnimating('like')
    setIsSubmitting(true)
    try {
      await onLike(item.id, response)
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

  // Show only the first option when collapsed, all when expanded
  const visibleOptions = isExpanded ? options : options.slice(0, 1)
  const hasMoreOptions = options.length > 1

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
          {multiSelect && (
            <span className="px-2 py-0.5 bg-info/10 text-info rounded-full font-medium">
              Multi-select
            </span>
          )}
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
            {visibleOptions.map((option) => {
              const isSelected = selectedOptions.includes(option)
              return (
                <button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  disabled={isSubmitting}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border-2 transition-all',
                    'hover:border-primary/50 hover:bg-primary/5',
                    isSelected
                      ? 'border-primary bg-primary/10 text-foreground' 
                      : 'border-border bg-card text-foreground'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">{option}</span>
                    {multiSelect ? (
                      <div className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40 bg-card'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    ) : (
                      isSelected && <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              )
            })}

            {/* Expand / Collapse toggle */}
            {hasMoreOptions && (
              <button
                onClick={() => setIsExpanded(prev => !prev)}
                className="flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {isExpanded ? (
                  <>
                    Show less
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show all {options.length} options
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            )}

            {/* "Other" text input option */}
            <button
              onClick={toggleOtherInput}
              className={cn(
                'w-full text-left p-3 rounded-lg border-2 transition-all',
                'hover:border-primary/50 hover:bg-primary/5',
                showOtherInput
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-dashed border-border bg-card text-muted-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 shrink-0" />
                <span className="text-sm">Other (type your own)</span>
              </div>
            </button>

            {showOtherInput && (
              <div className="pl-2">
                <Input
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Type your response here..."
                  disabled={isSubmitting}
                  className="bg-card"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}

        {/* Selection summary for multi-select */}
        {multiSelect && selectedOptions.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedOptions.map((opt) => (
              <span
                key={opt}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {opt}
                <button
                  onClick={() => handleOptionSelect(opt)}
                  className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5"
                  aria-label={`Remove ${opt}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
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
            disabled={isSubmitting || (options.length > 0 && !hasSelection)}
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
