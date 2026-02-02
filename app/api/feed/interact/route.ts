import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { feedItemId, interactionType } = body;

    if (!feedItemId || !interactionType) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const validTypes = ["like", "save", "share", "dismiss", "interested"];
    if (!validTypes.includes(interactionType)) {
      return NextResponse.json({ error: "Invalid interaction type" }, { status: 400 });
    }

    // Check for existing interaction
    const { data: existing } = await supabase
      .from("feed_interactions")
      .select("id, interaction_type")
      .eq("user_id", user.id)
      .eq("feed_item_id", feedItemId)
      .eq("interaction_type", interactionType)
      .single();

    if (existing) {
      // Toggle off - remove the interaction
      const { error } = await supabase
        .from("feed_interactions")
        .delete()
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "removed" });
    }

    // Create new interaction
    const { error } = await supabase
      .from("feed_interactions")
      .insert({
        user_id: user.id,
        feed_item_id: feedItemId,
        interaction_type: interactionType,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: "added" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
