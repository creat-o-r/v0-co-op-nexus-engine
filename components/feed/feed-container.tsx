'use client'

import { useCallback, useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScenarioCard } from './scenario-card'
import { ProductCard } from './product-card'
import { LogisticsCard } from './logistics-card'
import { BuildCard } from './build-card'
import { DiscussionCard } from './discussion-card'
import type { FeedItem, FeedType, Profile, Talent } from '@/lib/types/database'
import { Loader2, RefreshCw, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FeedFilter {
  type: FeedType | 'all'
  label: string
}

interface FeedContainerProps {
  initialItems: FeedItem[]
  userProfile?: Profile | null
  isOnboarding?: boolean
  feedFilters?: FeedFilter[]
}

const EXPAND_THRESHOLD = 3

export function FeedContainer({ initialItems, userProfile, isOnboarding = false, feedFilters }: FeedContainerProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showAll, setShowAll] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FeedType | 'all'>('all')
  const expandCount = useRef(0)
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const supabase = createClient()

  const userTalents = (userProfile?.talents || []) as Talent[]

  const handleExpand = useCallback(() => {
    setShowAll(true)
    expandCount.current += 1
    if (expandCount.current >= EXPAND_THRESHOLD && !pinned) {
      setShowPinPrompt(true)
    }
  }, [pinned])

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

  // Apply type filter, then onboarding filter
  const typeFiltered = activeFilter === 'all'
    ? items
    : items.filter(i => i.feed_type === activeFilter)
  
  const displayItems = isOnboarding 
    ? typeFiltered.filter(i => i.feed_type === 'scenario')
    : typeFiltered

  // Show one card or all
  const visibleItems = showAll ? displayItems : displayItems.slice(0, 1)

  // Progress: how many have been answered from the original set
  const answeredCount = initialItems.length - items.length
  const totalCount = initialItems.length

  // Count items per feed type for filter badges
  const countByType = (type: FeedType) => items.filter(i => i.feed_type === type).length

  if (displayItems.length === 0) {
    return (
      <div className="space-y-3">
        {/* Filter chips even on empty state */}
        {feedFilters && feedFilters.length > 0 && (
          <FilterChips
            filters={feedFilters}
            active={activeFilter}
            onSelect={setActiveFilter}
            countByType={countByType}
            totalCount={items.length}
          />
        )}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">
            {isOnboarding ? 'All caught up!' : 'Nothing here yet'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {isOnboarding 
              ? 'Head to your feed to see what\'s happening!'
              : 'Check back later for new items.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Feed type filter chips */}
      {feedFilters && feedFilters.length > 0 && (
        <FilterChips
          filters={feedFilters}
          active={activeFilter}
          onSelect={setActiveFilter}
          countByType={countByType}
          totalCount={items.length}
        />
      )}

      {visibleItems.map(renderFeedItem)}

      {/* Progress counter below cards -- fully tappable */}
      {totalCount > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {/* Tap current count to collapse to single */}
            <button
              onClick={() => setShowAll(false)}
              className={cn(
                'font-medium transition-colors',
                !showAll ? 'text-primary' : 'text-foreground hover:text-primary'
              )}
              title="Show current card"
            >
              {answeredCount + 1}
            </button>
            <span>/</span>
            {/* Tap total to show all */}
            <button
              onClick={handleExpand}
              className={cn(
                'font-medium transition-colors',
                showAll ? 'text-primary' : 'text-foreground hover:text-primary'
              )}
              title="Show all"
            >
              {totalCount}
            </button>

            {pinned && (
              <Pin className="h-3 w-3 ml-1 text-primary" />
            )}
          </div>

          {/* Show all / load more — simple language */}
          {!showAll && displayItems.length > 1 && (
            <button
              onClick={handleExpand}
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              Show all
            </button>
          )}
        </div>
      )}

      {/* Pin prompt after repeated expansions */}
      {showPinPrompt && !pinned && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-xs text-foreground">Keep expanded?</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowPinPrompt(false)}
            >
              No
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 text-xs bg-primary text-primary-foreground"
              onClick={handlePin}
            >
              Yes
            </Button>
          </div>
        </div>
      )}

      {showAll && !isOnboarding && items.length >= 10 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMoreItems}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
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

// ── Filter chips component ──────────────────────────────────────────
interface FilterChipsProps {
  filters: FeedFilter[]
  active: FeedType | 'all'
  onSelect: (type: FeedType | 'all') => void
  countByType: (type: FeedType) => number
  totalCount: number
}

function FilterChips({ filters, active, onSelect, countByType, totalCount }: FilterChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {filters.map(({ type, label }) => {
        const count = type === 'all' ? totalCount : countByType(type as FeedType)
        const isActive = active === type
        if (type !== 'all' && count === 0) return null
        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                'ml-1.5 tabular-nums',
                isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60'
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
