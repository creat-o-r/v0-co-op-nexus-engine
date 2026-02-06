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

    const { data, error } = await supabase
      .from("feed_interactions")
      .select(`
        id,
        user_id,
        feed_item_id,
        interaction_type,
        comment_text,
        created_at,
        profile:profiles!feed_interactions_user_id_fkey(
          id,
          display_name,
          neighborhood_hub,
          avatar_url
        )
      `)
      .eq("feed_item_id", feedItemId)
      .eq("interaction_type", "comment")
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comments: data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { feedItemId, commentText } = body

    if (!feedItemId || !commentText?.trim()) {
      return NextResponse.json({ error: "feedItemId and commentText are required" }, { status: 400 })
    }

    const trimmed = commentText.trim()
    if (trimmed.length > 2000) {
      return NextResponse.json({ error: "Comment too long (max 2000 characters)" }, { status: 400 })
    }

    // Insert the comment
    const { data: comment, error: insertError } = await supabase
      .from("feed_interactions")
      .insert({
        user_id: user.id,
        feed_item_id: feedItemId,
        interaction_type: "comment",
        comment_text: trimmed,
      })
      .select(`
        id,
        user_id,
        feed_item_id,
        interaction_type,
        comment_text,
        created_at,
        profile:profiles!feed_interactions_user_id_fkey(
          id,
          display_name,
          neighborhood_hub,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ comment })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
