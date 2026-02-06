import { createClient } from "@/lib/supabase/server";
import { FeedContainer } from "@/components/feed/feed-container";
import type { FeedItem, Profile } from "@/lib/types/database";

export const metadata = {
  title: "Action Feed | Co-Op Nexus",
  description: "Your personalized action feed - scenarios, products, logistics, and community tasks",
};

export default async function FeedPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch user profile
  let userProfile: Profile | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    userProfile = profile as Profile | null;
  }

  // Fetch all feed items
  const { data: feedItems, error } = await supabase
    .from("feed_items")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[v0] Error fetching feed items:", error);
  }

  // Fetch user's scenario responses
  let respondedScenarioIds: string[] = [];
  if (user) {
    const { data: responses } = await supabase
      .from("scenario_responses")
      .select("feed_item_id")
      .eq("user_id", user.id);
    
    respondedScenarioIds = responses?.map(r => r.feed_item_id) || [];
  }

  const allItems = (feedItems || []) as FeedItem[];

  // Split into pending and done
  const pendingItems = allItems.filter((item) => {
    if (item.feed_type === "scenario" && respondedScenarioIds.includes(item.id)) {
      return false;
    }
    return true;
  });

  const doneItems = allItems.filter((item) =>
    item.feed_type === "scenario" && respondedScenarioIds.includes(item.id)
  );

  return (
    <main className="min-h-screen pb-20 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 pt-3 pb-6">
        <FeedContainer 
          initialItems={pendingItems}
          doneItems={doneItems}
          userProfile={userProfile}
        />
      </div>
    </main>
  );
}
