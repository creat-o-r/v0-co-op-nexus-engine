import { createClient } from "@/lib/supabase/server"
import { BuildPageClient } from "@/components/build/build-page-client"

export const metadata = {
  title: "Build & Agreements | Co-Op Nexus",
  description: "Manage agreements, community standards, and build tasks",
}

export default async function BuildPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch agreements
  const { data: agreements } = await supabase
    .from("agreements")
    .select("*")
    .order("created_at", { ascending: false })

  // Fetch build tasks from feed
  const { data: buildTasks } = await supabase
    .from("feed_items")
    .select("*")
    .eq("feed_type", "build")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })

  // Get user's claimed tasks
  let claimedTasks: string[] = []
  if (user) {
    const { data: claims } = await supabase
      .from("feed_interactions")
      .select("feed_item_id")
      .eq("user_id", user.id)
      .eq("interaction_type", "interested")
    claimedTasks = claims?.map(c => c.feed_item_id) || []
  }

  return (
    <main className="min-h-screen pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <BuildPageClient
          agreements={agreements || []}
          buildTasks={buildTasks || []}
          userId={user?.id}
          claimedTasks={claimedTasks}
        />
      </div>
    </main>
  )
}
