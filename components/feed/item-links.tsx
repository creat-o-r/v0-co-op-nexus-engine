'use client'

import Link from 'next/link'
import { MapPin, Package, Hammer, Truck, HelpCircle, ExternalLink, Loader2 } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

/* ── Types ─────────────────────────────────────────────────── */

interface PreviewData {
  type: string
  id: string
  title: string
  subtitle: string | null
  description: string | null
  image: string | null
  href: string
  meta: Record<string, unknown>
}

const previewFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  return json.preview as PreviewData | null
}

/* ── Link preview card ─────────────────────────────────────── */

const typeConfig: Record<string, { icon: typeof Package; color: string; bg: string }> = {
  product: { icon: Package, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
  agreement: { icon: Hammer, color: 'text-warning', bg: 'bg-warning/5 border-warning/20' },
  route: { icon: Truck, color: 'text-info', bg: 'bg-info/5 border-info/20' },
  scenario: { icon: HelpCircle, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
}

function LinkPreviewCard({ url }: { url: string }) {
  const { data: preview, isLoading } = useSWR(url, previewFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 animate-pulse">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading preview...</span>
      </div>
    )
  }

  if (!preview) return null

  const config = typeConfig[preview.type] || typeConfig.product
  const Icon = config.icon

  return (
    <Link
      href={preview.href}
      className={cn(
        'group flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all',
        'hover:shadow-sm hover:scale-[1.01]',
        config.bg
      )}
    >
      {/* Image or icon */}
      {preview.image ? (
        <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
          <img src={preview.image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={cn('flex items-center justify-center w-8 h-8 rounded-md bg-background shrink-0', config.color)}>
          <Icon className="h-4 w-4" />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {preview.title}
          </span>
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {preview.subtitle && (
          <p className="text-[10px] text-muted-foreground truncate">{preview.subtitle}</p>
        )}
        {preview.description && (
          <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{preview.description}</p>
        )}
      </div>
    </Link>
  )
}

/* ── ItemLinks: renders link previews for all related entities ── */

interface ItemLinksProps {
  item: FeedItem
  exclude?: string[]
  activeOption?: string | null
}

export function ItemLinks({ item, exclude = [], activeOption }: ItemLinksProps) {
  const products = (item.tagged_products || []).filter(p => !exclude.includes(p))
  const hubs = item.tagged_hubs || []
  const hasAgreement = !!item.related_agreement_id
  const hasRoute = !!item.related_route_id

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
    <div className="space-y-1.5">
      {/* Rich link previews */}
      {displayProducts.map((product) => (
        <LinkPreviewCard
          key={`product-${product}`}
          url={`/api/feed/preview?type=product&name=${encodeURIComponent(product)}`}
        />
      ))}

      {hasAgreement && (
        <LinkPreviewCard
          url={`/api/feed/preview?type=agreement&id=${item.related_agreement_id}`}
        />
      )}

      {hasRoute && (
        <LinkPreviewCard
          url={`/api/feed/preview?type=route&id=${item.related_route_id}`}
        />
      )}

      {/* Hubs stay as compact pills (no rich preview needed) */}
      {hubs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hubs.map((hub) => (
            <HubPill key={hub} name={hub} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Simple navigable pills (for badge rows) ───────────────── */

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
