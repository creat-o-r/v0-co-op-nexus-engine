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

    // Fetch comments
    const { data: interactions, error } = await supabase
      .from("feed_interactions")
      .select("id, user_id, feed_item_id, interaction_type, comment_text, created_at")
      .eq("feed_item_id", feedItemId)
      .eq("interaction_type", "comment")
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!interactions || interactions.length === 0) {
      return NextResponse.json({ comments: [] })
    }

    // Batch-fetch profiles for all comment authors
    const userIds = [...new Set(interactions.map(i => i.user_id))]
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, neighborhood_hub, avatar_url")
      .in("id", userIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const comments = interactions.map(i => ({
      ...i,
      profile: profileMap.get(i.user_id) || null,
    }))

    return NextResponse.json({ comments })
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
    const { data: interaction, error: insertError } = await supabase
      .from("feed_interactions")
      .insert({
        user_id: user.id,
        feed_item_id: feedItemId,
        interaction_type: "comment",
        comment_text: trimmed,
      })
      .select("id, user_id, feed_item_id, interaction_type, comment_text, created_at")
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Fetch the author's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, neighborhood_hub, avatar_url")
      .eq("id", user.id)
      .single()

    const comment = { ...interaction, profile: profile || null }

    return NextResponse.json({ comment })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
