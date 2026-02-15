import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAuthContext, apiError, sanitizeText } from '@/lib/api/helpers'

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const { feedItemId, selectedOptions, notes } = body

    if (!feedItemId || !selectedOptions || !Array.isArray(selectedOptions) || selectedOptions.length === 0) {
      return apiError('feedItemId and selectedOptions (non-empty array) are required', 400)
    }

    // Store as comma-separated string in selected_option (singular) to match DB schema
    const selectedOption = selectedOptions
      .map((o: string) => sanitizeText(String(o), 200))
      .join(', ')

    // Check if user already responded
    const { data: existing } = await supabase
      .from('scenario_responses')
      .select('id')
      .eq('user_id', user.id)
      .eq('feed_item_id', feedItemId)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('scenario_responses')
        .update({
          selected_option: selectedOption,
          response_type: 'like',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) return apiError(error.message, 500)
    } else {
      const { error } = await supabase
        .from('scenario_responses')
        .insert({
          user_id: user.id,
          feed_item_id: feedItemId,
          selected_option: selectedOption,
          response_type: 'like',
        })

      if (error) return apiError(error.message, 500)
    }

    // Update like interaction to track 'done' state
    await supabase
      .from('feed_interactions')
      .upsert({
        user_id: user.id,
        feed_item_id: feedItemId,
        interaction_type: 'like',
      }, { onConflict: 'user_id,feed_item_id,interaction_type' })

    return NextResponse.json({
      success: true,
      notes: notes ? sanitizeText(notes, 500) : undefined,
    })
  } catch {
    return apiError('Internal server error', 500)
  }
}
