import { createClient } from "@/lib/supabase/server";
import { FeedContainer } from "@/components/feed/feed-container";
import type { FeedItem, FeedType, Profile } from "@/lib/types/database";

export const metadata = {
  title: "Action Feed | Co-Op Nexus",
  description: "Your personalized action feed - scenarios, products, logistics, and community tasks",
};

// Feed type labels for the filter chips
const FEED_FILTERS: { type: FeedType | "all"; label: string }[] = [
  { type: "all", label: "All" },
  { type: "scenario", label: "Scenarios" },
  { type: "product", label: "Products" },
  { type: "build", label: "Tasks" },
  { type: "logistics", label: "Logistics" },
  { type: "discussion", label: "Discussion" },
];

export default async function FeedPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch user profile for talent-based features
  let userProfile: Profile | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    userProfile = profile as Profile | null;
  }

  // Fetch feed items
  const { data: feedItems, error } = await supabase
    .from("feed_items")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[v0] Error fetching feed items:", error);
  }

  // Fetch user's scenario responses if logged in
  let respondedScenarios: string[] = [];
  if (user) {
    const { data: responses } = await supabase
      .from("scenario_responses")
      .select("feed_item_id")
      .eq("user_id", user.id);
    
    respondedScenarios = responses?.map(r => r.feed_item_id) || [];
  }

  // Filter out scenarios the user has already responded to
  const filteredItems = (feedItems || []).filter((item: FeedItem) => {
    if (item.feed_type === "scenario" && respondedScenarios.includes(item.id)) {
      return false;
    }
    return true;
  });

  return (
    <main className="min-h-screen pb-20 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 pt-3 pb-6">
        <FeedContainer 
          initialItems={filteredItems as FeedItem[]} 
          userProfile={userProfile}
          feedFilters={FEED_FILTERS}
        />
      </div>
    </main>
  );
}
