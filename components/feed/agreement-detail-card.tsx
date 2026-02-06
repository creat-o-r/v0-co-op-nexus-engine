'use client'

import Link from 'next/link'
import {
  Hammer, Handshake, Truck, ClipboardCheck, ArrowUpRight, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useSWR from 'swr'

/* ── Types ─────────────────────────────────────────── */

interface AgreementPreview {
  id: string
  title: string
  status: string
  agreement_type: string
  scenario_count: number
  collaborators: { id: string }[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json() as Promise<AgreementPreview>
}

const typeConfig: Record<string, {
  icon: typeof Hammer
  label: string
  accent: string
  bg: string
}> = {
  build_task:          { icon: Hammer,         label: 'Build Task',      accent: 'text-amber-600',   bg: 'bg-amber-500/8 border-amber-500/20' },
  community_standard:  { icon: Handshake,      label: 'Agreement',       accent: 'text-primary',     bg: 'bg-primary/5 border-primary/20' },
  trade_agreement:     { icon: Truck,          label: 'Trade',           accent: 'text-emerald-600', bg: 'bg-emerald-500/8 border-emerald-500/20' },
  verification_report: { icon: ClipboardCheck, label: 'Verification',    accent: 'text-blue-600',    bg: 'bg-blue-500/8 border-blue-500/20' },
}

const statusLabel: Record<string, string> = {
  proposed: 'Proposed', active: 'Active', completed: 'Done', archived: 'Archived',
}

/* ── Component: Compact navigable card ─────────────── */

export function AgreementDetailCard({ agreementId }: { agreementId: string }) {
  const { data, isLoading } = useSWR<AgreementPreview | null>(
    `/api/agreements/${agreementId}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20 animate-pulse">
        <div className="w-7 h-7 rounded-md bg-muted shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-muted rounded w-24" />
          <div className="h-2 bg-muted rounded w-14" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const type = typeConfig[data.agreement_type] || typeConfig.community_standard
  const Icon = type.icon

  return (
    <Link
      href={`/community?tab=build&agreement=${data.id}`}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors hover:bg-muted/40',
        type.bg,
      )}
    >
      <div className={cn('flex items-center justify-center w-7 h-7 rounded-md bg-background shrink-0', type.accent)}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate">{data.title}</p>
        <p className="text-[10px] text-muted-foreground">
          {type.label} · {statusLabel[data.status] || data.status}
          {data.collaborators.length > 0 && ` · ${data.collaborators.length} people`}
        </p>
      </div>

      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </Link>
  )
}
