import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST: Approve or reject a draft
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id: draftId } = await params
    const body = await request.json()
    const { approved, comment } = body

    if (typeof approved !== "boolean") {
      return NextResponse.json({ error: "approved (boolean) is required" }, { status: 400 })
    }

    // Get the draft to verify it's pending
    const { data: draft } = await supabase
      .from("feed_item_drafts")
      .select("id, agreement_id, proposed_by, status")
      .eq("id", draftId)
      .single()

    if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 })
    if (draft.status !== "pending") {
      return NextResponse.json({ error: `Draft is already ${draft.status}` }, { status: 400 })
    }

    // Proposer can't approve their own draft
    if (draft.proposed_by === user.id) {
      return NextResponse.json({ error: "Cannot approve your own draft" }, { status: 400 })
    }

    // Verify user is a collaborator on this agreement
    const { data: collab } = await supabase
      .from("agreement_collaborators")
      .select("id")
      .eq("agreement_id", draft.agreement_id)
      .eq("user_id", user.id)
      .single()

    if (!collab) {
      return NextResponse.json({ error: "Not a collaborator on this agreement" }, { status: 403 })
    }

    // Upsert approval (the DB trigger handles counting and auto-apply)
    const { data: approval, error } = await supabase
      .from("draft_approvals")
      .upsert(
        {
          draft_id: draftId,
          user_id: user.id,
          approved,
          comment: comment || null
        },
        { onConflict: "draft_id,user_id" }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Re-fetch the draft to get updated status
    const { data: updatedDraft } = await supabase
      .from("feed_item_drafts")
      .select("*")
      .eq("id", draftId)
      .single()

    return NextResponse.json({ approval, draft: updatedDraft })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
