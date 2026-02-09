"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Handshake, Hammer, Truck, ClipboardCheck, LayoutGrid } from "lucide-react"
import { AgreementsList } from "./agreements-list"
import { BuildTasksList } from "./build-tasks-list"
import type { FeedItem } from "@/lib/types/database"

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

interface Props {
  agreements: AgreementRow[]
  buildTasks: FeedItem[]
  userId?: string
  claimedTasks: string[]
}

const tabs = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "community_standard", label: "Agreements", icon: Handshake },
  { key: "build_task", label: "Build Tasks", icon: Hammer },
  { key: "trade_agreement", label: "Trade", icon: Truck },
  { key: "verification_report", label: "Verification", icon: ClipboardCheck },
] as const

type TabKey = (typeof tabs)[number]["key"]

export function BuildPageClient({ agreements, buildTasks, userId, claimedTasks }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("all")

  // Count per type
  const counts: Record<string, number> = { all: agreements.length }
  for (const a of agreements) {
    counts[a.agreement_type] = (counts[a.agreement_type] || 0) + 1
  }

  const showBuildTasks = activeTab === "all" || activeTab === "build_task"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Build & Agreements</h1>
        <p className="text-sm text-muted-foreground">
          Community standards, build tasks, and trade agreements
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => {
          const count = counts[tab.key] || 0
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  "ml-0.5 rounded-full px-1.5 text-[10px]",
                  isActive ? "bg-primary-foreground/20" : "bg-background"
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Agreements */}
      <AgreementsList agreements={agreements} userId={userId} filter={activeTab} />

      {/* Build tasks section (shown on All tab or Build Tasks tab) */}
      {showBuildTasks && buildTasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Hammer className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Open Build Tasks</h2>
          </div>
          <BuildTasksList tasks={buildTasks} userId={userId} claimedTasks={claimedTasks} />
        </div>
      )}
    </div>
  )
}
