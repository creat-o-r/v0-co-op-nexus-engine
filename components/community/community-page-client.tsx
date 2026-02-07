"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users, Shield, MapPin, MessageCircle, CheckCircle,
  Star, Leaf, Hammer, Handshake, LayoutGrid, Truck, ClipboardCheck,
  Package, ChevronRight, ShoppingCart,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AgreementsList } from "@/components/build/agreements-list"
import { BuildTasksList } from "@/components/build/build-tasks-list"
import type { FeedItem } from "@/lib/types/database"

/* ── Types ─────────────────────────────────────────── */

interface ProfileRow {
  id: string
  display_name: string | null
  avatar_url: string | null
  trust_score: number
  neighborhood_hub: string | null
  is_pickup_point: boolean
  is_producer: boolean
  location: string | null
}

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
  userId?: string
  topMembers: ProfileRow[]
  pickupPoints: ProfileRow[]
  discussions: FeedItem[]
  agreements: AgreementRow[]
  buildTasks: FeedItem[]
  claimedTasks: string[]
  totalMembers: number
  verifications: number
}

/* ── Main tabs ─────────────────────────────────────── */

const mainTabs = [
  { key: "members", label: "Members", icon: Users },
  { key: "hubs", label: "Hubs", icon: MapPin },
  { key: "build", label: "Build", icon: Hammer },
  { key: "discussions", label: "Discuss", icon: MessageCircle },
] as const

type MainTab = (typeof mainTabs)[number]["key"]

/* ── Build sub-tabs ────────────────────────────────── */

const buildTabs = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "community_standard", label: "Agreements", icon: Handshake },
  { key: "build_task", label: "Tasks", icon: Hammer },
  { key: "trade_agreement", label: "Trade", icon: Truck },
  { key: "verification_report", label: "Verify", icon: ClipboardCheck },
] as const

type BuildTab = (typeof buildTabs)[number]["key"]

/* ── Component ─────────────────────────────────────── */

export function CommunityPageClient({
  userId, topMembers, pickupPoints, discussions,
  agreements, buildTasks, claimedTasks, totalMembers, verifications,
}: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Derive initial tab from URL
  const urlTab = searchParams.get("tab") as MainTab | null
  const urlAgreement = searchParams.get("agreement")

  const [activeTab, setActiveTab] = useState<MainTab>(urlTab && mainTabs.some(t => t.key === urlTab) ? urlTab : "members")
  const [buildFilter, setBuildFilter] = useState<BuildTab>("all")

  // If ?tab=build&agreement=ID, jump to build tab and highlight
  useEffect(() => {
    if (urlTab === "build") {
      setActiveTab("build")
    }
  }, [urlTab])

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab)
    // Update URL without full reload
    const params = new URLSearchParams()
    if (tab !== "members") params.set("tab", tab)
    router.replace(`/community${params.toString() ? `?${params}` : ""}`, { scroll: false })
  }

  // Count agreements per type
  const agreementCounts: Record<string, number> = { all: agreements.length }
  for (const a of agreements) {
    agreementCounts[a.agreement_type] = (agreementCounts[a.agreement_type] || 0) + 1
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hub</h1>
        <p className="text-sm text-muted-foreground">
          Community, agreements, and coordination
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-2.5 py-3 px-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <Users className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{totalMembers}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2.5 py-3 px-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <MapPin className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{pickupPoints.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Hubs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2.5 py-3 px-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <CheckCircle className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{verifications}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Verified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {mainTabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Members tab ──────────────────────────── */}
      {activeTab === "members" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Trust Leaderboard
            </CardTitle>
            <CardDescription>
              Top contributors in the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMembers.map((member, index) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                    {index + 1}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.display_name?.charAt(0) || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.display_name || "Member"}</p>
                    <div className="flex items-center gap-1.5">
                      {member.is_producer && (
                        <Badge variant="secondary" className="gap-0.5 text-[10px] px-1.5 py-0">
                          <Leaf className="h-2.5 w-2.5" />
                          Producer
                        </Badge>
                      )}
                      {member.is_pickup_point && (
                        <Badge variant="secondary" className="gap-0.5 text-[10px] px-1.5 py-0">
                          <MapPin className="h-2.5 w-2.5" />
                          Hub
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-primary shrink-0">
                    <Star className="h-3.5 w-3.5 fill-primary" />
                    <span className="text-sm font-bold">{member.trust_score}</span>
                  </div>
                </div>
              ))}
              {topMembers.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No members yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Hubs tab ─────────────────────────────── */}
      {activeTab === "hubs" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {pickupPoints.map((hub) => (
            <Card key={hub.id}>
              <CardContent className="flex items-center gap-3 py-4 px-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={hub.avatar_url || undefined} />
                  <AvatarFallback>{hub.display_name?.charAt(0) || "H"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{hub.display_name || "Hub"}</p>
                  {hub.location && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {hub.location}
                    </p>
                  )}
                  <p className="flex items-center gap-1 text-xs text-primary mt-0.5">
                    <Shield className="h-3 w-3" />
                    Trust: {hub.trust_score}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {pickupPoints.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">No pickup hubs yet</p>
                <p className="text-sm text-muted-foreground">Become a hub and help your neighbors!</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Build tab ────────────────────────────── */}
      {activeTab === "build" && (
        <div className="space-y-6">
          {/* Build sub-tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {buildTabs.map((tab) => {
              const count = agreementCounts[tab.key] || 0
              const isActive = buildFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setBuildFilter(tab.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      "ml-0.5 rounded-full px-1.5 text-[9px]",
                      isActive ? "bg-primary-foreground/20" : "bg-background"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Agreements list */}
          <AgreementsList
            agreements={agreements}
            userId={userId}
            filter={buildFilter}
            highlightId={urlAgreement || undefined}
          />

          {/* Build tasks (on All or Tasks sub-tab) */}
          {(buildFilter === "all" || buildFilter === "build_task") && buildTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Open Build Tasks</h2>
              </div>
              <BuildTasksList tasks={buildTasks} userId={userId} claimedTasks={claimedTasks} />
            </div>
          )}
        </div>
      )}

      {/* ── Discussions tab ──────────────────────── */}
      {activeTab === "discussions" && (
        <div className="space-y-3">
          {discussions.map((d) => (
            <Card key={d.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="flex items-start gap-3 py-3 px-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{d.title}</h3>
                  {d.content && d.content !== d.title && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{d.content}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {d.comments_count} comment{d.comments_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {discussions.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">No discussions yet</p>
                <p className="text-sm text-muted-foreground">Start a conversation!</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Footer: entities without primary nav ─── */}
      <footer className="mt-8 border-t pt-5 pb-20">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
          More
        </p>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
          {[
            { href: "/products", label: "Products", desc: "Browse catalog & types", icon: Package },
            { href: "/community?tab=build&filter=verification_report", label: "Verifications", desc: "Peer reviews", icon: ClipboardCheck },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-muted/40 transition-colors group"
            >
              <item.icon className="h-4 w-4 shrink-0 text-muted-foreground/60 group-hover:text-primary transition-colors" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
