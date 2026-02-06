'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, X, ChevronRight, PenLine } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import { ScenarioCardBackContent } from './scenario-card-back'
import { ScenarioBottomBar } from './scenario-bottom-bar'
import { ProductPill } from './item-links'

interface ScenarioCardProps {
  item: FeedItem
  onLike: (itemId: string, selectedOption?: string) => Promise<void>
  onDiscard: (itemId: string) => Promise<void>
  currentUserId?: string
  initialSelection?: string | null
}

export function ScenarioCard({ item, onLike, onDiscard, currentUserId, initialSelection }: ScenarioCardProps) {
  const options = item.scenario_options || []

  const parsedInitial = (() => {
    if (!initialSelection) return { known: [] as string[], other: '' }
    const parts = initialSelection.split(', ').filter(Boolean)
    const known = parts.filter(p => options.includes(p))
    const other = parts.filter(p => !options.includes(p)).join(', ')
    return { known, other }
  })()

  const [selectedOptions, setSelectedOptions] = useState<string[]>(parsedInitial.known)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnimating, setIsAnimating] = useState<'like' | 'discard' | null>(null)
  const [otherText, setOtherText] = useState(parsedInitial.other)
  const [showOtherInput, setShowOtherInput] = useState(parsedInitial.other.length > 0)
  const [showComments, setShowComments] = useState(false)
  const [commentsCount, setCommentsCount] = useState(item.comments_count)
  const [isFlipped, setIsFlipped] = useState(false)

  const multiSelect = useMemo(() => {
    const q = (item.scenario_question || '').toLowerCase()
    return q.includes('select all') || q.includes('multi')
  }, [item.scenario_question])

  const hasSelection = selectedOptions.length > 0 || (showOtherInput && otherText.trim().length > 0)

  const handleOptionSelect = useCallback((option: string) => {
    if (multiSelect) {
      setSelectedOptions(prev =>
        prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
      )
    } else {
      setSelectedOptions(prev => prev[0] === option ? [] : [option])
    }
  }, [multiSelect])

  const toggleOtherInput = useCallback(() => {
    setShowOtherInput(prev => !prev)
    if (showOtherInput) setOtherText('')
  }, [showOtherInput])

  const handleLike = async () => {
    if (options.length > 0 && !hasSelection) return
    const parts: string[] = [...selectedOptions]
    if (showOtherInput && otherText.trim()) parts.push(otherText.trim())
    const response = parts.length > 0 ? parts.join(', ') : undefined

    setIsAnimating('like')
    setIsSubmitting(true)
    try { await onLike(item.id, response) } finally { setIsSubmitting(false) }
  }

  const handleDiscard = async () => {
    setIsAnimating('discard')
    setIsSubmitting(true)
    try { await onDiscard(item.id) } finally { setIsSubmitting(false) }
  }

  /* ── Flipped: back content ─────────────────────── */
  if (isFlipped) {
    return (
      <Card className="overflow-hidden border-2 border-border">
        <CardContent className="px-4 py-4 space-y-4">
          <ScenarioCardBackContent item={item} />
          <ScenarioBottomBar
            feedItemId={item.id}
            currentUserId={currentUserId}
            showComments={showComments}
            commentsCount={commentsCount}
            isFlipped
            onToggleComments={() => setShowComments(!showComments)}
            onFlip={() => setIsFlipped(false)}
            onCommentsCountChange={setCommentsCount}
          />
        </CardContent>
      </Card>
    )
  }

  /* ── Front: question + options ──────────────────── */
  return (
    <Card
      className={cn(
        'transition-all duration-300 overflow-hidden border-2 border-border',
        isAnimating === 'like' && 'translate-x-full opacity-0 border-primary',
        isAnimating === 'discard' && '-translate-x-full opacity-0 border-destructive'
      )}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">Scenario</span>
          {item.tagged_products.length > 0 && (
            <ProductPill name={item.tagged_products[0]} />
          )}
        </div>
        <CardTitle className="text-base text-balance leading-snug">{item.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4">
        {item.scenario_question && (
          <p className="text-sm font-medium text-foreground leading-snug">{item.scenario_question}</p>
        )}

        {options.length > 0 && (
          <div className="space-y-1.5">
            {options.map((option) => {
              const isSelected = selectedOptions.includes(option)
              return (
                <button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  disabled={isSubmitting}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg border transition-all',
                    'hover:border-primary/50 hover:bg-primary/5',
                    isSelected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-foreground'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm leading-snug">{option}</span>
                    {multiSelect ? (
                      <div className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-card'
                      )}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                    ) : (
                      isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              )
            })}

            <button
              onClick={toggleOtherInput}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg border transition-all',
                'hover:border-primary/50 hover:bg-primary/5',
                showOtherInput
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-dashed border-border bg-card text-muted-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                <PenLine className="h-3.5 w-3.5 shrink-0" />
                <span className="text-sm">Other</span>
              </div>
            </button>

            {showOtherInput && (
              <Input
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Type your response..."
                disabled={isSubmitting}
                className="bg-card h-8 text-sm"
                autoFocus
              />
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent"
            onClick={handleDiscard}
            disabled={isSubmitting}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Skip
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleLike}
            disabled={isSubmitting || (options.length > 0 && !hasSelection)}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {multiSelect && selectedOptions.length > 1
              ? `Confirm (${selectedOptions.length})`
              : options.length > 0 ? 'Confirm' : 'Yes!'}
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        <ScenarioBottomBar
          feedItemId={item.id}
          currentUserId={currentUserId}
          showComments={showComments}
          commentsCount={commentsCount}
          isFlipped={false}
          onToggleComments={() => setShowComments(!showComments)}
          onFlip={() => setIsFlipped(true)}
          onCommentsCountChange={setCommentsCount}
        />
      </CardContent>
    </Card>
  )
}
