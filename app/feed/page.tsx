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

  // Fetch feed items - including system scenarios for onboarding
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
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Action Feed</h1>
          <p className="text-sm text-muted-foreground">
            Discover opportunities, answer scenarios, and connect with your local food community
          </p>
        </div>
        
        <FeedContainer 
          initialItems={filteredItems as FeedItem[]} 
          userProfile={userProfile}
        />
      </div>
    </main>
  );
}
