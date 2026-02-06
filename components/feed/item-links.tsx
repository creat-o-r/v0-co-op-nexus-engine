'use client'

import Link from 'next/link'
import { MapPin, Package, Hammer, Truck, HelpCircle, ExternalLink, Loader2 } from 'lucide-react'
import type { FeedItem } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

/* ── Shared types & fetcher ────────────────────────────────── */

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

const typeConfig: Record<string, { icon: typeof Package; color: string; bg: string }> = {
  product_type: { icon: Package, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
  product:      { icon: Package, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
  agreement:    { icon: Hammer,  color: 'text-warning', bg: 'bg-warning/5 border-warning/20' },
  route:        { icon: Truck,   color: 'text-info',    bg: 'bg-info/5 border-info/20' },
  scenario:     { icon: HelpCircle, color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
}

/* ── 1. LabelPreview ───────────────────────────────────────── */
/*    Larger preview card shown on the FRONT of scenario cards  */
/*    when a product type is tagged. Shows image, title,        */
/*    category, description, and variance count.                */

export function LabelPreview({ name, id }: { name?: string; id?: string }) {
  const param = id ? `id=${id}` : `name=${encodeURIComponent(name || '')}`
  const url = `/api/feed/preview?type=product_type&${param}`

  const { data: preview, isLoading } = useSWR(
    name || id ? url : null,
    previewFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 rounded-lg border border-border bg-muted/20 animate-pulse">
        <div className="w-12 h-12 rounded-md bg-muted shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-2 bg-muted rounded w-16" />
        </div>
      </div>
    )
  }

  if (!preview) return null

  const config = typeConfig[preview.type] || typeConfig.product
  const Icon = config.icon
  const variances = (preview.meta?.variances as string[]) || []
  const count = (preview.meta?.product_count as number) || 0

  return (
    <Link
      href={preview.href}
      className={cn(
        'group flex items-start gap-3 px-3 py-3 rounded-lg border transition-all',
        'hover:shadow-sm hover:scale-[1.005]',
        config.bg
      )}
    >
      {preview.image ? (
        <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
          <img src={preview.image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-md bg-background shrink-0', config.color)}>
          <Icon className="h-5 w-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {preview.title}
          </span>
          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-muted-foreground">{preview.subtitle}</p>
        {preview.description && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{preview.description}</p>
        )}
        {count > 0 && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {count} {count === 1 ? 'variance' : 'variances'}
            {variances.length > 0 && ` · ${variances.slice(0, 3).join(', ')}${variances.length > 3 ? '...' : ''}`}
          </p>
        )}
      </div>
    </Link>
  )
}


/* ── 2. AnswerPreview ──────────────────────────────────────── */
/*    Smaller inline preview nested under a selected answer     */
/*    chip. Compact single-line with icon + title.              */

export function AnswerPreview({ name }: { name: string }) {
  const url = `/api/feed/preview?type=product_type&name=${encodeURIComponent(name)}`

  const { data: preview, isLoading } = useSWR(url, previewFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Loading...</span>
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
        'group inline-flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all text-[11px]',
        'hover:shadow-sm',
        config.bg
      )}
    >
      {preview.image ? (
        <div className="w-5 h-5 rounded-sm overflow-hidden bg-muted shrink-0">
          <img src={preview.image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <Icon className={cn('h-3 w-3 shrink-0', config.color)} />
      )}
      <span className="text-foreground truncate max-w-[120px] group-hover:text-primary transition-colors">
        {preview.title}
      </span>
      {preview.subtitle && (
        <span className="text-muted-foreground/60 truncate max-w-[60px] hidden sm:inline">
          {preview.subtitle}
        </span>
      )}
    </Link>
  )
}


/* ── 3. Generic LinkPreviewCard (for back view links) ──────── */
/*    Used in ItemLinks for agreement, route, etc.              */

function LinkPreviewCard({ url }: { url: string }) {
  const { data: preview, isLoading } = useSWR(url, previewFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 animate-pulse">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
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
      {preview.image ? (
        <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
          <img src={preview.image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={cn('flex items-center justify-center w-8 h-8 rounded-md bg-background shrink-0', config.color)}>
          <Icon className="h-4 w-4" />
        </div>
      )}

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


/* ── 4. ItemLinks: renders link previews for back view ─────── */
/*    Used on scenario card back for non-product links          */
/*    (agreements, routes). Products use LabelPreview instead.  */

interface ItemLinksProps {
  item: FeedItem
  exclude?: string[]
}

export function ItemLinks({ item, exclude = [] }: ItemLinksProps) {
  const products = (item.tagged_products || []).filter(p => !exclude.includes(p))
  const hubs = item.tagged_hubs || []
  const hasAgreement = !!item.related_agreement_id
  const hasRoute = !!item.related_route_id

  // Skip first product (shown as LabelPreview on front already)
  const extraProducts = products.slice(1)

  const hasLinks = extraProducts.length > 0 || hasAgreement || hasRoute || hubs.length > 0
  if (!hasLinks) return null

  return (
    <div className="space-y-1.5">
      {extraProducts.map((product) => (
        <LinkPreviewCard
          key={`pt-${product}`}
          url={`/api/feed/preview?type=product_type&name=${encodeURIComponent(product)}`}
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


/* ── 5. Simple navigable pills (for badge rows) ───────────── */

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
