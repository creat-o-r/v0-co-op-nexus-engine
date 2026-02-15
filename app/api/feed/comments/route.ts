import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, apiError, fetchProfileMap, sanitizeText } from '@/lib/api/helpers'
import { COMMENT_MAX_LENGTH } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const feedItemId = request.nextUrl.searchParams.get('feedItemId')
    if (!feedItemId) return apiError('feedItemId is required', 400)

    const { data: interactions, error } = await supabase
      .from('feed_interactions')
      .select('id, user_id, feed_item_id, interaction_type, comment_text, created_at')
      .eq('feed_item_id', feedItemId)
      .eq('interaction_type', 'comment')
      .order('created_at', { ascending: true })

    if (error) return apiError(error.message, 500)
    if (!interactions || interactions.length === 0) {
      return NextResponse.json({ comments: [] })
    }

    const userIds = [...new Set(interactions.map(i => i.user_id))]
    const profileMap = await fetchProfileMap(supabase, userIds)

    const comments = interactions.map(i => ({
      ...i,
      profile: profileMap.get(i.user_id) || null,
    }))

    return NextResponse.json({ comments })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return apiError(message, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const { feedItemId, commentText } = body

    if (!feedItemId || !commentText?.trim()) {
      return apiError('feedItemId and commentText are required', 400)
    }

    const trimmed = sanitizeText(commentText, COMMENT_MAX_LENGTH)
    if (trimmed.length === 0) {
      return apiError('Comment cannot be empty', 400)
    }

    const { data: interaction, error: insertError } = await supabase
      .from('feed_interactions')
      .insert({
        user_id: user.id,
        feed_item_id: feedItemId,
        interaction_type: 'comment',
        comment_text: trimmed,
      })
      .select('id, user_id, feed_item_id, interaction_type, comment_text, created_at')
      .single()

    if (insertError) return apiError(insertError.message, 500)

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, neighborhood_hub, avatar_url')
      .eq('id', user.id)
      .single()

    return NextResponse.json({ comment: { ...interaction, profile: profile || null } })
  } catch {
    return apiError('Internal server error', 500)
  }
}
