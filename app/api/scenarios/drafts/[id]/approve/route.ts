import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const { id: draftId } = await params
    const body = await request.json()
    const { approved, comment } = body

    if (typeof approved !== 'boolean') {
      return apiError('approved (boolean) is required', 400)
    }

    const { data: draft } = await supabase
      .from('feed_item_drafts')
      .select('id, agreement_id, proposed_by, status')
      .eq('id', draftId)
      .single()

    if (!draft) return apiError('Draft not found', 404)
    if (draft.status !== 'pending') {
      return apiError(`Draft is already ${draft.status}`, 400)
    }

    if (draft.proposed_by === user.id) {
      return apiError('Cannot approve your own draft', 400)
    }

    const { data: collab } = await supabase
      .from('agreement_collaborators')
      .select('id')
      .eq('agreement_id', draft.agreement_id)
      .eq('user_id', user.id)
      .single()

    if (!collab) return apiError('Not a collaborator on this agreement', 403)

    const { data: approval, error } = await supabase
      .from('draft_approvals')
      .upsert(
        {
          draft_id: draftId,
          user_id: user.id,
          approved,
          comment: comment || null,
        },
        { onConflict: 'draft_id,user_id' }
      )
      .select()
      .single()

    if (error) return apiError(error.message, 500)

    const { data: updatedDraft } = await supabase
      .from('feed_item_drafts')
      .select('*')
      .eq('id', draftId)
      .single()

    return NextResponse.json({ approval, draft: updatedDraft })
  } catch {
    return apiError('Internal server error', 500)
  }
}
