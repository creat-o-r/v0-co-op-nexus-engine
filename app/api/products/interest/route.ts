import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAuthContext, apiError } from '@/lib/api/helpers'

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthContext()
    if (!user) return apiError('Unauthorized', 401)

    const body = await request.json()
    const { productId, quantity, notes } = body

    if (!productId || !quantity || typeof quantity !== 'number' || quantity <= 0) {
      return apiError('productId and a positive quantity are required', 400)
    }

    // Look up the product to get its name and unit
    const { data: product } = await supabase
      .from('products')
      .select('id, name, unit')
      .eq('id', productId)
      .single()

    if (!product) {
      return apiError('Product not found', 404)
    }

    // Check for existing need for this product
    const { data: existing } = await supabase
      .from('user_needs')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .single()

    if (existing) {
      // Update existing need
      const { error } = await supabase
        .from('user_needs')
        .update({
          quantity,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) return apiError(error.message, 500)

      return NextResponse.json({ success: true, action: 'updated' })
    }

    // Create new user need
    const { error } = await supabase
      .from('user_needs')
      .insert({
        user_id: user.id,
        product_id: productId,
        product_name: product.name,
        quantity,
        unit: product.unit,
        notes: notes || null,
        priority: 'normal',
        frequency: 'once',
        is_active: true,
      })

    if (error) return apiError(error.message, 500)

    return NextResponse.json({ success: true, action: 'created' })
  } catch {
    return apiError('Internal server error', 500)
  }
}
