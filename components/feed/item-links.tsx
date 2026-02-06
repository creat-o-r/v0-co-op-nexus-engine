'use client'

import { Badge } from '@/components/ui/badge'
import { Link2, MapPin, Package, Hammer, Truck, HelpCircle } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'

/**
 * Shared component for rendering linked items on any card type.
 *
 * Link sources (from FeedItem):
 *   - tagged_products[]   -> product name links
 *   - related_product_id  -> FK product link
 *   - related_agreement_id -> FK build task link
 *   - related_route_id    -> FK logistics route link
 *   - tagged_hubs[]       -> hub location links
 *
 * `activeOption` narrows display to links relevant to a specific
 * scenario option selection (matched via tagged_products containing
 * the option text). When null, all links are shown.
 */

interface ItemLinksProps {
  item: FeedItem
  /** If set, only show links relevant to this selected option */
  activeOption?: string | null
  /** Compact inline mode vs block mode */
  inline?: boolean
}

export function ItemLinks({ item, activeOption, inline = false }: ItemLinksProps) {
  const products = item.tagged_products || []
  const hubs = item.tagged_hubs || []
  const hasProduct = !!item.related_product_id || products.length > 0
  const hasAgreement = !!item.related_agreement_id
  const hasRoute = !!item.related_route_id
  const hasLinks = hasProduct || hasAgreement || hasRoute || hubs.length > 0

  if (!hasLinks) return null

  // When activeOption is set, filter tagged_products to those matching
  // the option text (case-insensitive partial match). This supports
  // the pattern where specific scenario options link to specific products.
  const filteredProducts = activeOption
    ? products.filter(
        (p) =>
          p.toLowerCase().includes(activeOption.toLowerCase()) ||
          activeOption.toLowerCase().includes(p.toLowerCase())
      )
    : products

  // If filtering is active and nothing matched, show all (fallback)
  const displayProducts = activeOption && filteredProducts.length === 0
    ? products
    : filteredProducts

  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {displayProducts.map((product) => (
          <Badge
            key={product}
            variant="secondary"
            className="gap-1 text-[10px] py-0 px-1.5 text-secondary-foreground"
          >
            <Package className="h-2.5 w-2.5" />
            {product}
          </Badge>
        ))}
        {hasAgreement && (
          <Badge variant="secondary" className="gap-1 text-[10px] py-0 px-1.5 text-secondary-foreground">
            <Hammer className="h-2.5 w-2.5" />
            Build
          </Badge>
        )}
        {hasRoute && (
          <Badge variant="secondary" className="gap-1 text-[10px] py-0 px-1.5 text-secondary-foreground">
            <Truck className="h-2.5 w-2.5" />
            Route
          </Badge>
        )}
        {hubs.map((hub) => (
          <Badge
            key={hub}
            variant="outline"
            className="gap-1 text-[10px] py-0 px-1.5 text-foreground border-border"
          >
            <MapPin className="h-2.5 w-2.5" />
            {hub}
          </Badge>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link2 className="h-3 w-3" />
        <span className="font-medium">Linked</span>
        {activeOption && (
          <span className="text-[10px] text-primary/70">
            for &ldquo;{activeOption}&rdquo;
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayProducts.map((product) => (
          <Badge
            key={product}
            variant="secondary"
            className="gap-1 text-xs text-secondary-foreground"
          >
            <Package className="h-3 w-3" />
            {product}
          </Badge>
        ))}
        {hasAgreement && (
          <Badge variant="secondary" className="gap-1 text-xs text-secondary-foreground">
            <Hammer className="h-3 w-3" />
            Build Task
          </Badge>
        )}
        {hasRoute && (
          <Badge variant="secondary" className="gap-1 text-xs text-secondary-foreground">
            <Truck className="h-3 w-3" />
            Route
          </Badge>
        )}
        {hubs.map((hub) => (
          <Badge
            key={hub}
            variant="outline"
            className="gap-1 text-xs text-foreground border-border"
          >
            <MapPin className="h-3 w-3" />
            {hub}
          </Badge>
        ))}
      </div>
    </div>
  )
}
