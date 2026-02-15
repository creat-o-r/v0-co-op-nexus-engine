import { createClient } from "@/lib/supabase/server"
import { CommunityPageClient } from "@/components/community/community-page-client"

export const metadata = {
  title: "Hub | Co-Op Nexus",
  description: "Community, agreements, build tasks, and more",
}

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch top members by trust_points (correct field name)
  const { data: topMembers } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, trust_points, neighborhood_hub, is_distribution_hub")
    .order("trust_points", { ascending: false })
    .limit(10)

  // Fetch distribution hubs (correct field name)
  const { data: distributionHubs } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, trust_points, neighborhood_hub, is_distribution_hub")
    .eq("is_distribution_hub", true)
    .limit(6)

  // Fetch discussions
  const { data: discussions } = await supabase
    .from("feed_items")
    .select("*")
    .eq("feed_type", "discussion")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5)

  // Fetch agreements
  const { data: agreements } = await supabase
    .from("agreements")
    .select("*")
    .order("created_at", { ascending: false })

  // Fetch build tasks
  const { data: buildTasks } = await supabase
    .from("feed_items")
    .select("*")
    .eq("feed_type", "build")
    .eq("is_active", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })

  // Claimed tasks
  let claimedTasks: string[] = []
  if (user) {
    const { data: claims } = await supabase
      .from("feed_interactions")
      .select("feed_item_id")
      .eq("user_id", user.id)
      .eq("interaction_type", "interested")
    claimedTasks = claims?.map(c => c.feed_item_id) || []
  }

  // Stats
  const { count: totalMembers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  const { count: verifications } = await supabase
    .from("peer_verifications")
    .select("*", { count: "exact", head: true })

  return (
    <main className="min-h-screen pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <CommunityPageClient
          userId={user?.id}
          topMembers={topMembers || []}
          distributionHubs={distributionHubs || []}
          discussions={discussions || []}
          agreements={agreements || []}
          buildTasks={buildTasks || []}
          claimedTasks={claimedTasks}
          totalMembers={totalMembers || 0}
          verifications={verifications || 0}
        />
      </div>
    </main>
  )
}
