'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Hammer, Users, FileText, Shield, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

/* ── Status config ─────────────────────────────────────── */

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

  const status = statusConfig[data.status] || statusConfig.proposed

  return (
    <div className={cn(
      'rounded-lg border transition-all overflow-hidden',
      'bg-warning/5 border-warning/20',
    )}>
      {/* Collapsed header -- always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-warning/10 transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background shrink-0 text-warning">
          <Hammer className="h-4 w-4" />
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
            {data.collaborators.length} collaborator{data.collaborators.length !== 1 ? 's' : ''}
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
        <div className="px-3 pb-3 space-y-3 border-t border-warning/10">
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
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
              <FileText className="h-2.5 w-2.5" />
              {data.agreement_type.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Collaborators */}
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
        </div>
      )}
    </div>
  )
}
