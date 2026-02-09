"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Handshake,
  Hammer,
  Truck,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Users,
  FileText,
  Clock,
  Star,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import useSWR from "swr"

interface AgreementRow {
  id: string
  title: string
  description: string | null
  agreement_type: string
  status: string
  required_talent: string | null
  trust_requirement: number
  deadline: string | null
  created_at: string
}

interface CollaboratorRow {
  id: string
  agreement_id: string
  user_id: string
  role: string
  profile?: {
    id: string
    display_name: string | null
    neighborhood_hub: string | null
    avatar_url: string | null
  } | null
}

interface Props {
  agreements: AgreementRow[]
  userId?: string
  filter: string
  highlightId?: string
}

const typeConfig: Record<string, { icon: typeof Handshake; label: string; color: string }> = {
  community_standard: { icon: Handshake, label: "Agreement", color: "text-blue-600 bg-blue-50" },
  build_task: { icon: Hammer, label: "Build Task", color: "text-amber-600 bg-amber-50" },
  trade_agreement: { icon: Truck, label: "Trade", color: "text-emerald-600 bg-emerald-50" },
  verification_report: { icon: ClipboardCheck, label: "Verification", color: "text-violet-600 bg-violet-50" },
}

const statusStyles: Record<string, string> = {
  proposed: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  expired: "bg-muted text-muted-foreground",
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

function AgreementCard({ agreement, userId, autoExpand }: { agreement: AgreementRow; userId?: string; autoExpand?: boolean }) {
  const [expanded, setExpanded] = useState(!!autoExpand)
  const config = typeConfig[agreement.agreement_type] || typeConfig.community_standard
  const Icon = config.icon

  // Fetch collaborators + scenario count only when expanded
  const { data, isLoading } = useSWR(
    expanded ? `/api/agreements/${agreement.id}` : null,
    fetcher
  )

  const collaborators: CollaboratorRow[] = data?.collaborators || []
  const scenarioCount: number = data?.scenarioCount || 0

  return (
    <Card className={cn("transition-all", expanded && "ring-1 ring-primary/20")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.color)}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-snug">{agreement.title}</CardTitle>
              {agreement.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{agreement.description}</p>
              )}
            </div>
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", statusStyles[agreement.status] || statusStyles.proposed)}>
            {agreement.status}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", config.color)}>
            {config.label}
          </span>
          {agreement.required_talent && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {agreement.required_talent}
            </span>
          )}
          {agreement.trust_requirement > 0 && (
            <span className="flex items-center gap-1">
              Trust {agreement.trust_requirement}+
            </span>
          )}
          {agreement.deadline && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(agreement.deadline).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Expand/collapse */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-between text-xs text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          <span>{expanded ? "Less" : "Collaborators & Scenarios"}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        {expanded && (
          <div className="mt-3 space-y-4 border-t pt-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Collaborators */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Collaborators ({collaborators.length})
                  </p>
                  <div className="space-y-1.5">
                    {collaborators.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {c.profile?.display_name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-foreground">{c.profile?.display_name || "Member"}</span>
                        <span className="text-[10px] text-muted-foreground capitalize">({c.role})</span>
                        {c.profile?.neighborhood_hub && (
                          <span className="text-[10px] text-muted-foreground">- {c.profile.neighborhood_hub}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Linked scenarios */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{scenarioCount} linked scenario{scenarioCount !== 1 ? "s" : ""}</span>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AgreementsList({ agreements, userId, filter, highlightId }: Props) {
  const filtered = filter === "all"
    ? agreements
    : agreements.filter((a) => a.agreement_type === filter)

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Handshake className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No agreements found</h3>
        <p className="text-sm text-muted-foreground">
          {filter === "all" ? "No agreements yet." : `No ${typeConfig[filter]?.label || filter} agreements.`}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {filtered.map((agreement) => (
        <AgreementCard key={agreement.id} agreement={agreement} userId={userId} autoExpand={agreement.id === highlightId} />
      ))}
    </div>
  )
}
