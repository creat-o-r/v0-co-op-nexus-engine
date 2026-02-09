import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Only allow deleting own comments
    const { data: comment } = await supabase
      .from("feed_interactions")
      .select("id, user_id, feed_item_id")
      .eq("id", id)
      .eq("interaction_type", "comment")
      .single()

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: "Not authorized to delete this comment" }, { status: 403 })
    }

    const { error } = await supabase
      .from("feed_interactions")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
