import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const { id } = await params

    // Only allow deleting own comments
    const { data: comment } = await supabase
      .from('feed_interactions')
      .select('id, user_id, feed_item_id')
      .eq('id', id)
      .eq('interaction_type', 'comment')
      .single()

    if (!comment) return apiError('Comment not found', 404)
    if (comment.user_id !== user.id) return apiError('Not authorized to delete this comment', 403)

    const { error } = await supabase
      .from('feed_interactions')
      .delete()
      .eq('id', id)

    if (error) return apiError(error.message, 500)

    return NextResponse.json({ success: true, deletedId: id })
  } catch {
    return apiError('Internal server error', 500)
  }
}
