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
    const { feedItemId, selectedOptions, notes } = body;

    if (!feedItemId || !selectedOptions || !Array.isArray(selectedOptions)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Check if user already responded
    const { data: existing } = await supabase
      .from("scenario_responses")
      .select("id")
      .eq("user_id", user.id)
      .eq("feed_item_id", feedItemId)
      .single();

    if (existing) {
      // Update existing response
      const { error } = await supabase
        .from("scenario_responses")
        .update({
          selected_options: selectedOptions,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Create new response
      const { error } = await supabase
        .from("scenario_responses")
        .insert({
          user_id: user.id,
          feed_item_id: feedItemId,
          selected_options: selectedOptions,
          notes,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
