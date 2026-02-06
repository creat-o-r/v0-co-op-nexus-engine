import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/feed/preview?type=product&id=xxx
 * Returns a compact preview of a linked entity.
 * Supports: product, agreement, route, scenario (feed_item)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get("type")
  const id = searchParams.get("id")
  const name = searchParams.get("name") // for product lookup by name

  if (!type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 })
  }

  const supabase = await createClient()

  switch (type) {
    case "product": {
      // Lookup by id or by name
      let query = supabase
        .from("products")
        .select("id, name, description, category, product_type, image_url")

      if (id) {
        query = query.eq("id", id)
      } else if (name) {
        query = query.ilike("name", `%${name}%`)
      } else {
        return NextResponse.json({ error: "id or name required for product" }, { status: 400 })
      }

      const { data, error } = await query.limit(1).single()
      if (error || !data) {
        return NextResponse.json({ preview: null })
      }
      return NextResponse.json({
        preview: {
          type: "product",
          id: data.id,
          title: data.name,
          subtitle: data.category,
          description: data.description?.slice(0, 80) || null,
          image: data.image_url,
          href: `/products?search=${encodeURIComponent(data.name)}`,
          meta: { product_type: data.product_type },
        },
      })
    }

    case "agreement": {
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
      const { data, error } = await supabase
        .from("agreements")
        .select("id, title, description, status, required_talent, deadline, reward_trust_points")
        .eq("id", id)
        .single()
      if (error || !data) {
        return NextResponse.json({ preview: null })
      }
      return NextResponse.json({
        preview: {
          type: "agreement",
          id: data.id,
          title: data.title,
          subtitle: data.required_talent ? `Needs ${data.required_talent}` : "Build Task",
          description: data.description?.slice(0, 80) || null,
          image: null,
          href: `/build?highlight=${data.id}`,
          meta: { status: data.status, deadline: data.deadline, reward: data.reward_trust_points },
        },
      })
    }

    case "route": {
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
      const { data, error } = await supabase
        .from("logistics_routes")
        .select("id, route_name, start_hub, end_hub, schedule, max_cargo_size")
        .eq("id", id)
        .single()
      if (error || !data) {
        return NextResponse.json({ preview: null })
      }
      return NextResponse.json({
        preview: {
          type: "route",
          id: data.id,
          title: data.route_name || `${data.start_hub} → ${data.end_hub}`,
          subtitle: `${data.start_hub} → ${data.end_hub}`,
          description: data.schedule?.length ? data.schedule.join(", ") : null,
          image: null,
          href: `/logistics?highlight=${data.id}`,
          meta: { cargo: data.max_cargo_size },
        },
      })
    }

    case "scenario": {
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
      const { data, error } = await supabase
        .from("feed_items")
        .select("id, title, scenario_question, likes_count, comments_count, feed_type")
        .eq("id", id)
        .single()
      if (error || !data) {
        return NextResponse.json({ preview: null })
      }
      return NextResponse.json({
        preview: {
          type: "scenario",
          id: data.id,
          title: data.title,
          subtitle: `${data.likes_count} votes · ${data.comments_count} comments`,
          description: data.scenario_question?.slice(0, 80) || null,
          image: null,
          href: `/feed?item=${data.id}`,
          meta: { feed_type: data.feed_type },
        },
      })
    }

    default:
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
  }
}
