'use client'

import { useCallback, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScenarioCard } from './scenario-card'
import { ProductCard } from './product-card'
import { LogisticsCard } from './logistics-card'
import { BuildCard } from './build-card'
import { DiscussionCard } from './discussion-card'
import type { FeedItem, Profile, Talent } from '@/lib/types/database'
import { Loader2, RefreshCw, ChevronDown, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRef } from 'react'

interface FeedContainerProps {
  initialItems: FeedItem[]
  userProfile?: Profile | null
  isOnboarding?: boolean
}

const EXPAND_THRESHOLD = 3 // After this many manual expansions, offer to keep open

export function FeedContainer({ initialItems, userProfile, isOnboarding = false }: FeedContainerProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showAll, setShowAll] = useState(false)
  const [pinned, setPinned] = useState(false) // user chose to keep expanded
  const expandCount = useRef(0)
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const supabase = createClient()

  const userTalents = (userProfile?.talents || []) as Talent[]

  // Expand handler with persistence tracking
  const handleExpand = useCallback(() => {
    setShowAll(true)
    expandCount.current += 1
    if (expandCount.current >= EXPAND_THRESHOLD && !pinned) {
      setShowPinPrompt(true)
    }
  }, [pinned])

  // Auto-collapse after an item is answered (unless pinned)
  const collapseIfNeeded = useCallback(() => {
    if (!pinned) {
      setShowAll(false)
    }
  }, [pinned])

  const handlePin = useCallback(() => {
    setPinned(true)
    setShowAll(true)
    setShowPinPrompt(false)
  }, [])

  // Handle scenario like (creates user need if product-related)
  const handleScenarioLike = useCallback(async (itemId: string, selectedOption?: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    // Record the response
    await supabase.from('scenario_responses').insert({
      user_id: userProfile?.id,
      feed_item_id: itemId,
      response_type: 'like',
      selected_option: selectedOption,
    })

    // If it's a product scenario, create a user need
    if (item.tagged_products.length > 0) {
      const productName = item.tagged_products[0]
      await supabase.from('user_needs').insert({
        user_id: userProfile?.id,
        product_name: productName,
        quantity: 1,
        unit: 'each',
        frequency: 'weekly',
        notes: `From scenario: ${item.title}. Response: ${selectedOption || 'Yes'}`,
      })
    }

    // Update talents if it's the talents scenario
    if (item.title === 'Your Talents' && selectedOption) {
      const selectedTalents = selectedOption.split(',').map(t => t.trim().split(' - ')[0])
      const currentTalents = userProfile?.talents || []
      const newTalents = [...new Set([...currentTalents, ...selectedTalents])]
      
      await supabase
        .from('profiles')
        .update({ talents: newTalents })
        .eq('id', userProfile?.id)
    }

    // Remove the item from the list and auto-collapse to focus on next card
    startTransition(() => {
      setItems(prev => prev.filter(i => i.id !== itemId))
      collapseIfNeeded()
    })
  }, [items, supabase, userProfile, collapseIfNeeded])

  const handleScenarioDiscard = useCallback(async (itemId: string) => {
    await supabase.from('scenario_responses').insert({
      user_id: userProfile?.id,
      feed_item_id: itemId,
      response_type: 'discard',
    })

    startTransition(() => {
      setItems(prev => prev.filter(i => i.id !== itemId))
      collapseIfNeeded()
    })
  }, [supabase, userProfile, collapseIfNeeded])

  const handleProductLike = useCallback(async (itemId: string) => {
    const { data: existing } = await supabase
      .from('feed_interactions')
      .select('id')
      .eq('user_id', userProfile?.id)
      .eq('feed_item_id', itemId)
      .eq('interaction_type', 'like')
      .single()

    if (existing) {
      await supabase
        .from('feed_interactions')
        .delete()
        .eq('id', existing.id)
    } else {
      await supabase.from('feed_interactions').insert({
        user_id: userProfile?.id,
        feed_item_id: itemId,
        interaction_type: 'like',
      })
    }
  }, [supabase, userProfile])

  const handleLogisticsAccept = useCallback(async (itemId: string) => {
    await supabase.from('feed_interactions').insert({
      user_id: userProfile?.id,
      feed_item_id: itemId,
      interaction_type: 'claim',
    })
  }, [supabase, userProfile])

  const handleLogisticsDecline = useCallback(async (itemId: string) => {
    await supabase.from('feed_interactions').insert({
      user_id: userProfile?.id,
      feed_item_id: itemId,
      interaction_type: 'discard',
    })
  }, [supabase, userProfile])

  const handleBuildClaim = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item?.related_agreement_id) return

    await supabase
      .from('agreements')
      .update({ 
        assigned_to: userProfile?.id,
        status: 'active'
      })
      .eq('id', item.related_agreement_id)

    await supabase.from('feed_interactions').insert({
      user_id: userProfile?.id,
      feed_item_id: itemId,
      interaction_type: 'claim',
    })
  }, [items, supabase, userProfile])

  const loadMoreItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await supabase
        .from('feed_items')
        .select(`
          *,
          profile:profiles!feed_items_user_id_fkey(*),
          product:products(*),
          agreement:agreements(*),
          surplus:user_surplus(*),
          route:logistics_routes(*)
        `)
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(items.length, items.length + 9)

      if (data) {
        setItems(prev => [...prev, ...data as FeedItem[]])
      }
    } finally {
      setIsLoading(false)
    }
  }, [items.length, supabase])

  // Render the appropriate card type
  const renderFeedItem = (item: FeedItem) => {
    switch (item.feed_type) {
      case 'scenario':
        return (
          <ScenarioCard
            key={item.id}
            item={item}
            onLike={handleScenarioLike}
            onDiscard={handleScenarioDiscard}
          />
        )
      case 'product':
        return (
          <ProductCard
            key={item.id}
            item={item}
            onLike={handleProductLike}
          />
        )
      case 'logistics':
        return (
          <LogisticsCard
            key={item.id}
            item={item}
            onAccept={handleLogisticsAccept}
            onDecline={handleLogisticsDecline}
          />
        )
      case 'build':
        return (
          <BuildCard
            key={item.id}
            item={item}
            onClaim={handleBuildClaim}
            userTalents={userTalents}
          />
        )
      case 'discussion':
      case 'verification':
        return (
          <DiscussionCard
            key={item.id}
            item={item}
            onLike={handleProductLike}
          />
        )
      default:
        return null
    }
  }

  // For onboarding, filter to show only unanswered scenarios
  const displayItems = isOnboarding 
    ? items.filter(i => i.feed_type === 'scenario')
    : items

  // Default: show only the first card; expand to show all
  const visibleItems = showAll ? displayItems : displayItems.slice(0, 1)
  const hiddenCount = displayItems.length - 1

  if (displayItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <RefreshCw className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-2">
          {isOnboarding ? 'All caught up!' : 'No items in your feed'}
        </h3>
        <p className="text-muted-foreground max-w-sm">
          {isOnboarding 
            ? 'You\'ve completed all the scenario questions. Head to your feed to see what\'s happening in your community!'
            : 'Check back later for new posts, products, and community tasks.'}
        </p>
      </div>
    )
  }

  // Answered count = initial total minus remaining
  const answeredCount = initialItems.length - displayItems.length
  const totalCount = initialItems.length

  return (
    <div className="space-y-3">
      {visibleItems.map(renderFeedItem)}

      {/* Counter + expand — always below the card(s) */}
      {displayItems.length > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{answeredCount}</span>
            {' / '}
            <span className="font-medium text-foreground">{totalCount}</span>
            {' done'}
          </span>

          {!showAll && hiddenCount > 0 && (
            <button
              onClick={handleExpand}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              {hiddenCount} more
              <ChevronDown className="h-3 w-3" />
            </button>
          )}

          {pinned && showAll && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Pin className="h-3 w-3" />
              Pinned
            </span>
          )}
        </div>
      )}

      {/* Single-item fallback: still show counter */}
      {displayItems.length === 1 && totalCount > 1 && (
        <div className="px-1">
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{answeredCount}</span>
            {' / '}
            <span className="font-medium text-foreground">{totalCount}</span>
            {' done'}
          </span>
        </div>
      )}

      {/* Pin prompt after repeated expansions */}
      {showPinPrompt && !pinned && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-xs text-foreground">Keep feed expanded?</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowPinPrompt(false)}
            >
              Dismiss
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 text-xs bg-primary text-primary-foreground"
              onClick={handlePin}
            >
              <Pin className="h-3 w-3 mr-1" />
              Keep open
            </Button>
          </div>
        </div>
      )}

      {showAll && !isOnboarding && items.length >= 10 && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMoreItems}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
