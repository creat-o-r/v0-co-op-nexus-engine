import { NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'

// Returns a nested tree: categories -> product_types -> products
export async function GET() {
  try {
    const { supabase } = await getAuthContext()

    const [typesRes, productsRes] = await Promise.all([
      supabase.from('product_types').select('id, name, category, created_at').order('name'),
      supabase.from('products').select('id, name, description, category, product_type, product_type_id, unit, image_url, created_at').order('name'),
    ])

    if (typesRes.error) return apiError(typesRes.error.message, 500)
    if (productsRes.error) return apiError(productsRes.error.message, 500)

    const types = typesRes.data || []
    const products = productsRes.data || []

    const categoryMap: Record<string, {
      category: string
      types: { id: string; name: string; products: typeof products }[]
    }> = {}

    for (const pt of types) {
      if (!categoryMap[pt.category]) {
        categoryMap[pt.category] = { category: pt.category, types: [] }
      }
      const typeProducts = products.filter(p => p.product_type_id === pt.id)
      categoryMap[pt.category].types.push({
        id: pt.id,
        name: pt.name,
        products: typeProducts,
      })
    }

    const uncategorized = products.filter(p => !p.product_type_id)

    return NextResponse.json({
      tree: Object.values(categoryMap).sort((a, b) => a.category.localeCompare(b.category)),
      uncategorized,
      allTypes: types,
      allProducts: products,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return apiError(message, 500)
  }
}
