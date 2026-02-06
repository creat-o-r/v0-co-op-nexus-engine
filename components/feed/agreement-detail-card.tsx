'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, Hammer, Users, FileText,
  Shield, Clock, Handshake, ArrowUpRight, Truck, ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import useSWR from 'swr'

/* ── Types ─────────────────────────────────────────────── */

interface AgreementDetailData {
  id: string
  title: string
  description: string | null
  status: string
  agreement_type: string
  required_talent: string | null
  deadline: string | null
  reward_trust_points: number
  collaborators: {
    id: string
    user_id: string
    role: string
    profile: {
      display_name: string | null
      neighborhood_hub: string | null
      avatar_url: string | null
    } | null
  }[]
  scenario_count: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json() as Promise<AgreementDetailData>
}

/* ── Config by agreement type ──────────────────────────── */

const typeConfig: Record<string, {
  icon: typeof Hammer
  label: string
  accent: string
  accentBg: string
  href: (id: string) => string
  linkLabel: string
}> = {
  build_task: {
    icon: Hammer,
    label: 'Build Task',
    accent: 'text-warning',
    accentBg: 'bg-warning/5 border-warning/20',
    href: (id) => `/build?highlight=${id}`,
    linkLabel: 'Open in Build Board',
  },
  community_standard: {
    icon: Handshake,
    label: 'Community Agreement',
    accent: 'text-primary',
    accentBg: 'bg-primary/5 border-primary/20',
    href: (id) => `/build?agreement=${id}`,
    linkLabel: 'View Agreement',
  },
  trade_agreement: {
    icon: Truck,
    label: 'Trade Agreement',
    accent: 'text-info',
    accentBg: 'bg-info/5 border-info/20',
    href: (id) => `/build?agreement=${id}`,
    linkLabel: 'View Agreement',
  },
  verification_report: {
    icon: ClipboardCheck,
    label: 'Verification Report',
    accent: 'text-emerald-600',
    accentBg: 'bg-emerald-500/5 border-emerald-500/20',
    href: (id) => `/build?agreement=${id}`,
    linkLabel: 'View Report',
  },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  proposed: { label: 'Proposed', color: 'bg-amber-500/15 text-amber-700' },
  active:   { label: 'Active', color: 'bg-emerald-500/15 text-emerald-700' },
  completed: { label: 'Completed', color: 'bg-blue-500/15 text-blue-700' },
  archived: { label: 'Archived', color: 'bg-muted text-muted-foreground' },
}

/* ── Component ─────────────────────────────────────────── */

interface AgreementDetailCardProps {
  agreementId: string
}

export function AgreementDetailCard({ agreementId }: AgreementDetailCardProps) {
  const [expanded, setExpanded] = useState(false)

  const { data, isLoading } = useSWR<AgreementDetailData | null>(
    `/api/agreements/${agreementId}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20 animate-pulse">
        <div className="w-8 h-8 rounded-md bg-muted shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="h-3 bg-muted rounded w-28" />
          <div className="h-2 bg-muted rounded w-16" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const type = typeConfig[data.agreement_type] || typeConfig.community_standard
  const status = statusConfig[data.status] || statusConfig.proposed
  const Icon = type.icon

  return (
    <div className={cn('rounded-lg border transition-all overflow-hidden', type.accentBg)}>
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-md bg-background shrink-0',
          type.accent,
        )}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground truncate">
              {data.title}
            </span>
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0', status.color)}>
              {status.label}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {type.label}
            {data.collaborators.length > 0 && ` · ${data.collaborators.length} collaborator${data.collaborators.length !== 1 ? 's' : ''}`}
            {data.scenario_count > 0 && ` · ${data.scenario_count} scenario${data.scenario_count !== 1 ? 's' : ''}`}
          </p>
        </div>

        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/30">
          {/* Description */}
          {data.description && (
            <p className="text-xs text-muted-foreground leading-relaxed pt-2">
              {data.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap gap-2 pt-1">
            {data.required_talent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
                <Shield className="h-2.5 w-2.5" />
                {data.required_talent}
              </span>
            )}
            {data.deadline && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {new Date(data.deadline).toLocaleDateString()}
              </span>
            )}
            {data.reward_trust_points > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary">
                +{data.reward_trust_points} TP
              </span>
            )}
          </div>

          {/* Collaborators */}
          {data.collaborators.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <Users className="h-3 w-3" />
                Collaborators
              </div>
              <div className="space-y-1">
                {data.collaborators.map((collab) => {
                  const name = collab.profile?.display_name || 'Member'
                  const initials = name.slice(0, 2).toUpperCase()
                  return (
                    <div key={collab.id} className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[8px] bg-muted">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-foreground">{name}</span>
                      {collab.role === 'owner' && (
                        <span className="px-1 py-0.5 rounded text-[9px] bg-primary/10 text-primary">
                          owner
                        </span>
                      )}
                      {collab.profile?.neighborhood_hub && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {collab.profile.neighborhood_hub}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Navigation button */}
          <Link href={type.href(data.id)}>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs mt-1"
            >
              <Icon className="h-3.5 w-3.5" />
              {type.linkLabel}
              <ArrowUpRight className="h-3 w-3 ml-auto" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
