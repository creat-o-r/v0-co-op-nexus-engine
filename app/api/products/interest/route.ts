import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, quantity, notes } = body;

    if (!productId || !quantity) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Check for existing interest
    const { data: existing } = await supabase
      .from("user_needs")
      .select("id, quantity_needed")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .single();

    if (existing) {
      // Update existing need
      const { error } = await supabase
        .from("user_needs")
        .update({
          quantity_needed: quantity,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "updated" });
    }

    // Create new user need
    const { error } = await supabase
      .from("user_needs")
      .insert({
        user_id: user.id,
        product_id: productId,
        quantity_needed: quantity,
        notes,
        status: "seeking",
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: "created" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
