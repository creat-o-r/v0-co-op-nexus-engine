import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const feedItemId = request.nextUrl.searchParams.get('feedItemId')
    if (!feedItemId) return apiError('feedItemId is required', 400)

    const { data: responses, error } = await supabase
      .from('scenario_responses')
      .select('response_type, selected_option')
      .eq('feed_item_id', feedItemId)

    if (error) return apiError(error.message, 500)

    const likeCount = responses?.filter(r => r.response_type === 'like').length || 0
    const discardCount = responses?.filter(r => r.response_type === 'discard').length || 0
    const totalCount = likeCount + discardCount

    // Count per selected_option (handles comma-separated multi-select)
    const optionCounts: Record<string, number> = {}
    for (const r of responses || []) {
      if (r.selected_option) {
        const options = r.selected_option.split(', ')
        for (const opt of options) {
          const trimmed = opt.trim()
          if (trimmed) {
            optionCounts[trimmed] = (optionCounts[trimmed] || 0) + 1
          }
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
    return apiError('Internal server error', 500)
  }
}
