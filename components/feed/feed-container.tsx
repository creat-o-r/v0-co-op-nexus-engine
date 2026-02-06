'use client'

import { useCallback, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScenarioCard } from './scenario-card'
import { ProductCard } from './product-card'
import { LogisticsCard } from './logistics-card'
import { BuildCard } from './build-card'
import { DiscussionCard } from './discussion-card'
import type { FeedItem, Profile, Talent } from '@/lib/types/database'
import { Loader2, RefreshCw, ChevronDown, ChevronUp, LayoutGrid, LayoutList } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FeedContainerProps {
  initialItems: FeedItem[]
  userProfile?: Profile | null
  isOnboarding?: boolean
  isAdmin?: boolean
}

export function FeedContainer({ initialItems, userProfile, isOnboarding = false, isAdmin = false }: FeedContainerProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showAll, setShowAll] = useState(false)
  const supabase = createClient()

  const userTalents = (userProfile?.talents || []) as Talent[]

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

    // Remove the item from the list
    startTransition(() => {
      setItems(prev => prev.filter(i => i.id !== itemId))
    })
  }, [items, supabase, userProfile])

  const handleScenarioDiscard = useCallback(async (itemId: string) => {
    await supabase.from('scenario_responses').insert({
      user_id: userProfile?.id,
      feed_item_id: itemId,
      response_type: 'discard',
    })

    startTransition(() => {
      setItems(prev => prev.filter(i => i.id !== itemId))
    })
  }, [supabase, userProfile])

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
            isAdmin={isAdmin}
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

  return (
    <div className="space-y-4">
      {/* View toggle header */}
      {displayItems.length > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
          <p className="text-sm text-muted-foreground">
            {showAll ? (
              <>Showing all <span className="font-medium text-foreground">{displayItems.length}</span> items</>
            ) : (
              <>Showing <span className="font-medium text-foreground">1</span> of <span className="font-medium text-foreground">{displayItems.length}</span> items</>
            )}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(prev => !prev)}
            className="gap-1.5 text-primary hover:text-primary/80"
          >
            {showAll ? (
              <>
                <LayoutList className="h-4 w-4" />
                Collapse
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" />
                Show all ({hiddenCount} more)
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      )}

      {visibleItems.map(renderFeedItem)}
      
      {/* Expand prompt after the single visible card */}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="group flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          View {hiddenCount} more {hiddenCount === 1 ? 'item' : 'items'}
        </button>
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
