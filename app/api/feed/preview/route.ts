import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'

/**
 * GET /api/feed/preview?type=product_type&name=Flour
 * Returns a compact preview of a linked entity.
 * Supports: product_type, product, agreement, route, scenario
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const type = searchParams.get('type')
    const id = searchParams.get('id')
    const name = searchParams.get('name')

    if (!type) return apiError('type is required', 400)

    const { supabase } = await getAuthContext()

    switch (type) {
      case 'product_type': {
        let ptQuery = supabase
          .from('product_types')
          .select('id, name, category')

        if (id) {
          ptQuery = ptQuery.eq('id', id)
        } else if (name) {
          ptQuery = ptQuery.ilike('name', `%${name}%`)
        } else {
          return apiError('id or name required', 400)
        }

        const { data: pt } = await ptQuery.limit(1).single()
        if (!pt) return productFallback(supabase, id, name)

        const { data: children } = await supabase
          .from('products')
          .select('id, name, description, image_url')
          .eq('product_type_id', pt.id)
          .order('created_at', { ascending: true })
          .limit(5)

        const firstImage = children?.find(c => c.image_url)?.image_url || null
        const firstDesc = children?.find(c => c.description)?.description || null
        const count = children?.length || 0

        return NextResponse.json({
          preview: {
            type: 'product_type',
            id: pt.id,
            title: pt.name,
            subtitle: pt.category,
            description: firstDesc?.slice(0, 100) || null,
            image: firstImage,
            href: `/products?search=${encodeURIComponent(pt.name)}`,
            meta: { product_count: count, variances: children?.map(c => c.name) || [] },
          },
        })
      }

      case 'product':
        return productFallback(supabase, id, name)

      case 'agreement': {
        if (!id) return apiError('id required', 400)
        const { data } = await supabase
          .from('agreements')
          .select('id, title, description, status, required_talent, deadline, reward_trust_points')
          .eq('id', id)
          .single()
        if (!data) return NextResponse.json({ preview: null })
        return NextResponse.json({
          preview: {
            type: 'agreement',
            id: data.id,
            title: data.title,
            subtitle: data.required_talent ? `Needs ${data.required_talent}` : 'Build Task',
            description: data.description?.slice(0, 100) || null,
            image: null,
            href: `/build?highlight=${data.id}`,
            meta: { status: data.status, deadline: data.deadline, reward: data.reward_trust_points },
          },
        })
      }

      case 'route': {
        if (!id) return apiError('id required', 400)
        const { data } = await supabase
          .from('logistics_routes')
          .select('id, route_name, start_hub, end_hub, schedule, max_cargo_size')
          .eq('id', id)
          .single()
        if (!data) return NextResponse.json({ preview: null })
        return NextResponse.json({
          preview: {
            type: 'route',
            id: data.id,
            title: data.route_name || `${data.start_hub} → ${data.end_hub}`,
            subtitle: `${data.start_hub} → ${data.end_hub}`,
            description: data.schedule?.length ? data.schedule.join(', ') : null,
            image: null,
            href: `/logistics?highlight=${data.id}`,
            meta: { cargo: data.max_cargo_size },
          },
        })
      }

      case 'scenario': {
        if (!id) return apiError('id required', 400)
        const { data } = await supabase
          .from('feed_items')
          .select('id, title, scenario_question, likes_count, comments_count, feed_type')
          .eq('id', id)
          .single()
        if (!data) return NextResponse.json({ preview: null })
        return NextResponse.json({
          preview: {
            type: 'scenario',
            id: data.id,
            title: data.title,
            subtitle: `${data.likes_count} votes · ${data.comments_count} comments`,
            description: data.scenario_question?.slice(0, 100) || null,
            image: null,
            href: `/feed?item=${data.id}`,
            meta: { feed_type: data.feed_type },
          },
        })
      }

      default:
        return apiError(`Unknown type: ${type}`, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return apiError(message, 500)
  }
}

async function productFallback(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  id: string | null,
  name: string | null
) {
  let query = supabase
    .from('products')
    .select('id, name, description, category, product_type, image_url')

  if (id) {
    query = query.eq('id', id)
  } else if (name) {
    query = query.ilike('name', `%${name}%`)
  } else {
    return apiError('id or name required for product', 400)
  }

  const { data } = await query.limit(1).single()
  if (!data) return NextResponse.json({ preview: null })

  return NextResponse.json({
    preview: {
      type: 'product',
      id: data.id,
      title: data.name,
      subtitle: data.category,
      description: data.description?.slice(0, 100) || null,
      image: data.image_url,
      href: `/products?search=${encodeURIComponent(data.name)}`,
      meta: { product_type: data.product_type },
    },
  })
}
