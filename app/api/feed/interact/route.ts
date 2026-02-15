import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'

const VALID_INTERACTION_TYPES = ['like', 'save', 'share', 'dismiss', 'interested'] as const

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const { feedItemId, interactionType } = body

    if (!feedItemId || !interactionType) {
      return apiError('feedItemId and interactionType are required', 400)
    }

    if (!VALID_INTERACTION_TYPES.includes(interactionType)) {
      return apiError('Invalid interaction type', 400)
    }

    // Check for existing interaction (toggle pattern)
    const { data: existing } = await supabase
      .from('feed_interactions')
      .select('id, interaction_type')
      .eq('user_id', user.id)
      .eq('feed_item_id', feedItemId)
      .eq('interaction_type', interactionType)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('feed_interactions')
        .delete()
        .eq('id', existing.id)

      if (error) return apiError(error.message, 500)
      return NextResponse.json({ success: true, action: 'removed' })
    }

    const { error } = await supabase
      .from('feed_interactions')
      .insert({
        user_id: user.id,
        feed_item_id: feedItemId,
        interaction_type: interactionType,
      })

    if (error) return apiError(error.message, 500)
    return NextResponse.json({ success: true, action: 'added' })
  } catch {
    return apiError('Internal server error', 500)
  }
}
