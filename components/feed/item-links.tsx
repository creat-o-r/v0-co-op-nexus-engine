'use client'

import Link from 'next/link'
import { MapPin, Package, Hammer, Truck, HelpCircle } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'

/**
 * Shared navigable links for any card type.
 *
 * `exclude` removes items already displayed elsewhere on the card
 * (e.g. tagged_products[0] shown as a pill in the badge row).
 *
 * `activeOption` narrows product links to those matching a selection.
 */

interface ItemLinksProps {
  item: FeedItem
  /** Product names already shown elsewhere -- skip them here */
  exclude?: string[]
  /** If set, only show product links matching this option */
  activeOption?: string | null
}

export function ItemLinks({ item, exclude = [], activeOption }: ItemLinksProps) {
  const products = (item.tagged_products || []).filter(p => !exclude.includes(p))
  const hubs = item.tagged_hubs || []
  const hasAgreement = !!item.related_agreement_id
  const hasRoute = !!item.related_route_id

  // Filter products by active option when set
  const filteredProducts = activeOption
    ? products.filter(p =>
        p.toLowerCase().includes(activeOption.toLowerCase()) ||
        activeOption.toLowerCase().includes(p.toLowerCase())
      )
    : products
  const displayProducts = activeOption && filteredProducts.length === 0 ? products : filteredProducts

  const hasLinks = displayProducts.length > 0 || hasAgreement || hasRoute || hubs.length > 0
  if (!hasLinks) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayProducts.map((product) => (
        <Link
          key={product}
          href={`/products?search=${encodeURIComponent(product)}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          <Package className="h-3 w-3" />
          {product}
        </Link>
      ))}
      {hasAgreement && (
        <Link
          href={`/build?highlight=${item.related_agreement_id}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-warning/10 text-warning-foreground hover:bg-warning/20 transition-colors"
        >
          <Hammer className="h-3 w-3" />
          Build Task
        </Link>
      )}
      {hasRoute && (
        <Link
          href={`/logistics?highlight=${item.related_route_id}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-info/10 text-info-foreground hover:bg-info/20 transition-colors"
        >
          <Truck className="h-3 w-3" />
          Route
        </Link>
      )}
      {hubs.map((hub) => (
        <Link
          key={hub}
          href={`/community?hub=${encodeURIComponent(hub)}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-border text-foreground hover:bg-muted transition-colors"
        >
          <MapPin className="h-3 w-3" />
          {hub}
        </Link>
      ))}
    </div>
  )
}

/**
 * Navigable tagged-product pill for badge rows.
 * Use instead of a static <span> so the product is clickable.
 */
export function ProductPill({ name }: { name: string }) {
  return (
    <Link
      href={`/products?search=${encodeURIComponent(name)}`}
      className="px-2 py-0.5 bg-accent/30 text-accent-foreground rounded-full text-xs hover:bg-accent/50 transition-colors"
    >
      {name}
    </Link>
  )
}

/** Navigable hub pill */
export function HubPill({ name }: { name: string }) {
  return (
    <Link
      href={`/community?hub=${encodeURIComponent(name)}`}
      className="px-2 py-0.5 border border-border text-foreground rounded-full text-xs hover:bg-muted transition-colors inline-flex items-center gap-1"
    >
      <MapPin className="h-2.5 w-2.5" />
      {name}
    </Link>
  )
}
