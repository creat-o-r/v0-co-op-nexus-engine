import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const feedItemId = request.nextUrl.searchParams.get("feedItemId")
    if (!feedItemId) {
      return NextResponse.json({ error: "feedItemId is required" }, { status: 400 })
    }

    // Fetch all responses for this scenario
    const { data: responses, error } = await supabase
      .from("scenario_responses")
      .select("response_type, selected_option")
      .eq("feed_item_id", feedItemId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Aggregate
    const likeCount = responses?.filter(r => r.response_type === "like").length || 0
    const discardCount = responses?.filter(r => r.response_type === "discard").length || 0
    const totalCount = likeCount + discardCount

    // Count per selected_option (for multi-option scenarios)
    const optionCounts: Record<string, number> = {}
    for (const r of responses || []) {
      if (r.selected_option) {
        // Handle comma-separated multi-select
        const options = r.selected_option.split(", ")
        for (const opt of options) {
          optionCounts[opt] = (optionCounts[opt] || 0) + 1
        }
      }
    }

    return NextResponse.json({
      likeCount,
      discardCount,
      totalCount,
      optionCounts,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
