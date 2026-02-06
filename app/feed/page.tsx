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

  // Fetch user's scenario responses with their answers
  let scenarioResponses: { feed_item_id: string; selected_option: string | null; response_type: string }[] = [];
  if (user) {
    const { data: responses } = await supabase
      .from("scenario_responses")
      .select("feed_item_id, selected_option, response_type")
      .eq("user_id", user.id);
    
    scenarioResponses = responses || [];
  }

  const respondedIds = new Set(scenarioResponses.map(r => r.feed_item_id));
  const responseMap = Object.fromEntries(
    scenarioResponses.map(r => [r.feed_item_id, { answer: r.selected_option, type: r.response_type }])
  );

  const allItems = (feedItems || []) as FeedItem[];

  // Split into pending and done
  const pendingItems = allItems.filter((item) => {
    if (item.feed_type === "scenario" && respondedIds.has(item.id)) return false;
    return true;
  });

  // Done items include the user's response
  const doneItems = allItems
    .filter((item) => item.feed_type === "scenario" && respondedIds.has(item.id))
    .map((item) => ({
      ...item,
      _userAnswer: responseMap[item.id]?.answer ?? null,
      _responseType: responseMap[item.id]?.type ?? 'like',
    }));

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
