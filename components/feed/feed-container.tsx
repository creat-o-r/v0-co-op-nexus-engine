'use client'

import { useCallback, useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScenarioCard } from './scenario-card'
import { ProductCard } from './product-card'
import { LogisticsCard } from './logistics-card'
import { BuildCard } from './build-card'
import { DiscussionCard } from './discussion-card'
import type { FeedItem, FeedType, Profile, Talent } from '@/lib/types/database'
import { Loader2, RefreshCw, Pin, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DoneScenarioCard, type DoneItem } from './done-scenario-card'
import { MatchCard, type MatchResult } from './match-card'
import useSWR from 'swr'

interface FeedContainerProps {
  initialItems: FeedItem[]
  doneItems?: DoneItem[]
  userProfile?: Profile | null
  isOnboarding?: boolean
}

const EXPAND_THRESHOLD = 3

type ViewMode = 'pending' | 'done'
type DoneFilter = 'all' | 'answered' | 'skipped'

export function FeedContainer({ initialItems, doneItems = [], userProfile, isOnboarding = false }: FeedContainerProps) {
  // Deduplicate on init -- server could send overlapping items if queries overlap
  const [items, setItems] = useState<FeedItem[]>(() => {
    const seen = new Set<string>()
    return initialItems.filter(i => {
      if (seen.has(i.id)) return false
      seen.add(i.id)
      return true
    })
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showAll, setShowAll] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [activeType, setActiveType] = useState<FeedType | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('pending')
  const [doneFilter, setDoneFilter] = useState<DoneFilter>('all')
  const expandCount = useRef(0)
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const supabase = createClient()

  const userTalents = (userProfile?.talents || []) as Talent[]

  // Fetch matches from engine
  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const { data: matchData } = useSWR<{ matches: MatchResult[] }>(
    userProfile?.id ? '/api/feed/matches' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )
  const matches = matchData?.matches || []
  const [dismissedMatches, setDismissedMatches] = useState<Set<string>>(new Set())
  const visibleMatches = matches.filter(m => !dismissedMatches.has(m.match_id))

  const handleDismissMatch = useCallback((matchId: string) => {
    setDismissedMatches(prev => new Set(prev).add(matchId))
  }, [])

  const handleProposeOrder = useCallback(async (match: MatchResult) => {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        counterparty_id: match.surplus_id, // Will be resolved to the seller's user_id by the API
        order_type: 'purchase',
        related_need_id: match.need_id,
        related_surplus_id: match.surplus_id,
        related_route_id: match.route_id,
        pickup_hub: match.seller_hub,
        dropoff_hub: match.buyer_hub,
        money_amount: match.offer_price ? match.offer_price * Math.min(match.available_qty, match.needed_qty) : 0,
        money_direction: 'initiator_pays',
        notes: `Auto-matched: ${match.product_name}`,
        items: [{
          product_name: match.product_name,
          quantity: Math.min(match.available_qty, match.needed_qty),
          unit: match.unit,
          direction: 'to_initiator',
          surplus_id: match.surplus_id,
          price_per_unit: match.offer_price,
        }],
      }),
    })
    setDismissedMatches(prev => new Set(prev).add(match.match_id))
  }, [])

  // Track items that were answered in this session (move to done)
  const [sessionDone, setSessionDone] = useState<DoneItem[]>([])
  // Track IDs of server-loaded done items that have been edited out (moved back to pending)
  const [editedOutIds, setEditedOutIds] = useState<Set<string>>(new Set())

  // Combine server done + session done.
  // Session entries always win over server entries (fresher data).
  // Also exclude items currently being re-edited (moved back to pending).
  const sessionDoneIds = new Set(sessionDone.map(d => d.id))
  const allDoneItems = [
    ...doneItems.filter(d => !editedOutIds.has(d.id) && !sessionDoneIds.has(d.id)),
    ...sessionDone,
  ]

  // Edit handler: move a done item back to pending for re-answering
  // CRITICAL: viewMode and doneFilter set OUTSIDE startTransition so they apply immediately.
  // startTransition defers low-priority updates -- if viewMode is deferred, the done view
  // flashes an intermediate state with the item removed but view still on 'done'.
  const handleEditDone = useCallback(async (item: DoneItem) => {
    await supabase
      .from('scenario_responses')
      .delete()
      .eq('user_id', userProfile?.id)
      .eq('feed_item_id', item.id)

    // Immediate: switch view so user never sees stale done state
    setViewMode('pending')
    setShowAll(false)
    setDoneFilter('all')

    // Deferred: update lists (can batch with React)
    startTransition(() => {
      setEditedOutIds(prev => new Set(prev).add(item.id))
      setSessionDone(prev => prev.filter(d => d.id !== item.id))
      setItems(prev => [item, ...prev.filter(i => i.id !== item.id)])
    })
  }, [supabase, userProfile])

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

    // Move item to done, remove from pending, clear edited-out flag, reset done filter, auto-collapse
    const sourceItem = items.find(i => i.id === itemId)
    startTransition(() => {
      setItems(prev => prev.filter(i => i.id !== itemId))
      setEditedOutIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
      if (sourceItem) {
        setSessionDone(prev => [
          ...prev.filter(d => d.id !== itemId),
          {
            ...sourceItem,
            _userAnswer: selectedOption || null,
            _responseType: 'like',
          },
        ])
      }
      // Reset done sub-filter so newly answered item isn't hidden by stale filter
      setDoneFilter('all')
      collapseIfNeeded()
    })
  }, [items, supabase, userProfile, collapseIfNeeded])

  const handleScenarioDiscard = useCallback(async (itemId: string) => {
    await supabase.from('scenario_responses').insert({
      user_id: userProfile?.id,
      feed_item_id: itemId,
      response_type: 'discard',
    })

    const sourceItem = items.find(i => i.id === itemId)
    startTransition(() => {
      setItems(prev => prev.filter(i => i.id !== itemId))
      setEditedOutIds(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
      if (sourceItem) {
        setSessionDone(prev => [
          ...prev.filter(d => d.id !== itemId),
          {
            ...sourceItem,
            _userAnswer: null,
            _responseType: 'discard',
          },
        ])
      }
      setDoneFilter('all')
      collapseIfNeeded()
    })
  }, [items, supabase, userProfile, collapseIfNeeded])

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
      case 'scenario': {
        const priorAnswer = (item as DoneItem)._userAnswer
        return (
          <ScenarioCard
            key={`${item.id}-${priorAnswer ?? 'fresh'}`}
            item={item}
            onLike={handleScenarioLike}
            onDiscard={handleScenarioDiscard}
            currentUserId={userProfile?.id}
            initialSelection={priorAnswer}
          />
        )
      }
      case 'product':
        return (
          <ProductCard
            key={item.id}
            item={item}
            onLike={handleProductLike}
            currentUserId={userProfile?.id}
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
            currentUserId={userProfile?.id}
          />
        )
      default:
        return null
    }
  }

  // ── Derived state ───────────────────────────────────────────────
  // Unique feed types present in pending items (for type chips)
  const feedTypes = [...new Set(items.map(i => i.feed_type))]

  // Apply type filter
  const typeFiltered = activeType
    ? items.filter(i => i.feed_type === activeType)
    : items
  
  const displayItems = isOnboarding 
    ? typeFiltered.filter(i => i.feed_type === 'scenario')
    : typeFiltered

  const visibleItems = showAll ? displayItems : displayItems.slice(0, 1)

  // Progress
  const doneCount = allDoneItems.length
  const totalCount = doneCount + items.length

  // Type chip labels
  const typeLabel: Record<string, string> = {
    scenario: 'Scenarios',
    product: 'Products',
    build: 'Tasks',
    logistics: 'Logistics',
    discussion: 'Discussion',
    verification: 'Verification',
    match: 'Matches',
  }

  // ── Empty state ───────────────────────────────────────────────
  if (items.length === 0 && allDoneItems.length === 0) {
    return (
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
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Nav row: type chips + done toggle — single row, no duplication */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {feedTypes.map((type) => {
          const count = items.filter(i => i.feed_type === type).length
          const isActive = activeType === type
          return (
            <button
              key={type}
              onClick={() => {
                setActiveType(isActive ? null : type)
                setViewMode('pending')
              }}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {typeLabel[type] || type}
              <span className={cn(
                'ml-1 tabular-nums',
                isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/50'
              )}>
                {count}
              </span>
            </button>
          )
        })}

        {/* Matches chip */}
        {visibleMatches.length > 0 && (
          <button
            onClick={() => {
              setActiveType(activeType === 'match' as FeedType ? null : 'match' as FeedType)
              setViewMode('pending')
            }}
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              activeType === ('match' as FeedType)
                ? 'bg-chart-3 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            Matches
            <span className={cn(
              'ml-1 tabular-nums',
              activeType === ('match' as FeedType) ? 'text-white/70' : 'text-muted-foreground/50'
            )}>
              {visibleMatches.length}
            </span>
          </button>
        )}

        {/* Done chip -- navigate to answered cards */}
        {doneCount > 0 && (
          <>
            <div className="h-4 w-px bg-border shrink-0" aria-hidden />
            <button
              onClick={() => {
                setViewMode(viewMode === 'done' ? 'pending' : 'done')
                setActiveType(null)
              }}
              className={cn(
                'shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                viewMode === 'done'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              Done
              <span className={cn(
                'tabular-nums',
                viewMode === 'done' ? 'text-primary-foreground/70' : 'text-muted-foreground/50'
              )}>
                {doneCount}
              </span>
            </button>
          </>
        )}
      </div>

      {/* ── Done view ──────────────────────────────────────────── */}
      {viewMode === 'done' && (() => {
        const skippedItems = allDoneItems.filter(i => i._responseType === 'discard')
        const answeredItems = allDoneItems.filter(i => i._responseType !== 'discard')
        const hasBoth = skippedItems.length > 0 && answeredItems.length > 0

        // Only filter when both categories exist; otherwise just show all
        const effectiveFilter = hasBoth ? doneFilter : 'all'

        const filteredDone = effectiveFilter === 'answered'
          ? answeredItems
          : effectiveFilter === 'skipped'
            ? skippedItems
            : allDoneItems

        return (
          <div className="space-y-2">
            {/* Sub-filters only when both categories have items -- otherwise no point */}
            {hasBoth && (
              <div className="flex gap-1">
                <button
                  onClick={() => setDoneFilter(effectiveFilter === 'answered' ? 'all' : 'answered')}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                    effectiveFilter === 'answered'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  Answered
                  <span className={cn(
                    'ml-1 tabular-nums',
                    effectiveFilter === 'answered' ? 'text-primary-foreground/70' : 'opacity-50'
                  )}>
                    {answeredItems.length}
                  </span>
                </button>
                <button
                  onClick={() => setDoneFilter(effectiveFilter === 'skipped' ? 'all' : 'skipped')}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                    effectiveFilter === 'skipped'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  Skipped
                  <span className={cn(
                    'ml-1 tabular-nums',
                    effectiveFilter === 'skipped' ? 'text-primary-foreground/70' : 'opacity-50'
                  )}>
                    {skippedItems.length}
                  </span>
                </button>
              </div>
            )}

            {filteredDone.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No items yet.</p>
            ) : (
              filteredDone.map((item) => (
                <DoneScenarioCard
                  key={item.id}
                  item={item as DoneItem}
                  onEdit={handleEditDone}
                  currentUserId={userProfile?.id}
                />
              ))
            )}
          </div>
        )
      })()}

      {/* ── Pending view ───────────────────────────────────────── */}
      {viewMode === 'pending' && (
        <>
          {displayItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {activeType ? 'No items of this type.' : 'All done for now.'}
            </p>
          ) : (
            <>
              {visibleItems.map((item, idx) => (
                <div key={item.id}>
                  {renderFeedItem(item)}
                  {/* Inject match cards after the 1st item */}
                  {idx === 0 && visibleMatches.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {visibleMatches.slice(0, showAll ? visibleMatches.length : 1).map(m => (
                        <MatchCard
                          key={m.match_id}
                          match={m}
                          currentUserId={userProfile?.id}
                          onPropose={handleProposeOrder}
                          onDismiss={handleDismissMatch}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Counter row: tappable 1 / 12 + show all */}
              {displayItems.length > 1 && (
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <button
                      onClick={() => setShowAll(false)}
                      className={cn(
                        'font-medium tabular-nums transition-colors',
                        !showAll ? 'text-primary' : 'text-foreground hover:text-primary'
                      )}
                      title="Focus on current"
                    >
                      1
                    </button>
                    <span className="text-muted-foreground/50">/</span>
                    <button
                      onClick={handleExpand}
                      className={cn(
                        'font-medium tabular-nums transition-colors',
                        showAll ? 'text-primary' : 'text-foreground hover:text-primary'
                      )}
                      title="Show all"
                    >
                      {displayItems.length}
                    </button>
                    {pinned && <Pin className="h-3 w-3 ml-1 text-primary" />}
                  </div>

                  {!showAll && (
                    <button
                      onClick={handleExpand}
                      className="text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      Show all
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Pin prompt */}
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
        </>
      )}
    </div>
  )
}
