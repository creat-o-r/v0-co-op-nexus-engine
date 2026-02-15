import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, apiError, parsePositiveInt } from '@/lib/api/helpers'
import { FEED_PAGE_SIZE } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parsePositiveInt(searchParams.get('limit'), FEED_PAGE_SIZE, 50)
    const type = searchParams.get('type')

    const { supabase } = await getAuthContext()

    let query = supabase
      .from('feed_items')
      .select('*')
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq('feed_type', type)
    }

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) return apiError(error.message, 500)

    return NextResponse.json({
      items: data || [],
      nextCursor: data && data.length === limit ? data[data.length - 1]?.created_at : null,
    })
  } catch {
    return apiError('Internal server error', 500)
  }
}
