import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Returns a nested tree: categories -> product_types -> products
// Used by the ProductSelector for hierarchical selection
export async function GET() {
  const supabase = await createClient()

  // Fetch all product types and products in parallel
  const [typesRes, productsRes] = await Promise.all([
    supabase.from('product_types').select('id, name, category, created_at').order('name'),
    supabase.from('products').select('id, name, description, category, product_type, product_type_id, unit, image_url, created_at').order('name'),
  ])

  if (typesRes.error) return NextResponse.json({ error: typesRes.error.message }, { status: 500 })
  if (productsRes.error) return NextResponse.json({ error: productsRes.error.message }, { status: 500 })

  const types = typesRes.data || []
  const products = productsRes.data || []

  // Build a nested structure: category -> product_types -> products
  const categoryMap: Record<string, {
    category: string
    types: {
      id: string
      name: string
      products: typeof products
    }[]
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

  // Also include uncategorized products (no product_type_id)
  const uncategorized = products.filter(p => !p.product_type_id)

  return NextResponse.json({
    tree: Object.values(categoryMap).sort((a, b) => a.category.localeCompare(b.category)),
    uncategorized,
    allTypes: types,
    allProducts: products,
  })
}
