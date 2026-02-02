import { createClient } from "@/lib/supabase/server";
import { ProductsList } from "@/components/products/products-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Products | Co-Op Nexus",
  description: "Browse local products and request items for bulk matching",
};

const categories = [
  { value: "all", label: "All" },
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy & Eggs" },
  { value: "meat", label: "Meat" },
  { value: "baked", label: "Baked Goods" },
  { value: "preserved", label: "Preserved" },
  { value: "other", label: "Other" },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const category = params.category || "all";
  const searchQuery = params.q || "";

  let query = supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (category !== "all") {
    query = query.eq("category", category);
  }

  if (searchQuery) {
    query = query.ilike("name", `%${searchQuery}%`);
  }

  const { data: products, error } = await query;

  if (error) {
    console.error("[v0] Error fetching products:", error);
  }

  // Get demand counts for products
  const { data: demandCounts } = await supabase
    .from("user_needs")
    .select("product_id")
    .not("product_id", "is", null);

  const demandMap = new Map<string, number>();
  demandCounts?.forEach((d) => {
    if (d.product_id) {
      demandMap.set(d.product_id, (demandMap.get(d.product_id) || 0) + 1);
    }
  });

  return (
    <main className="min-h-screen pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Products</h1>
            <p className="text-sm text-muted-foreground">
              Browse available products or request items for bulk matching
            </p>
          </div>
          {user && (
            <Link href="/products/request">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Request Product
              </Button>
            </Link>
          )}
        </div>

        {/* Search & Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <form className="relative flex-1" action="/products" method="GET">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Search products..."
              className="pl-10"
              defaultValue={searchQuery}
            />
            {category !== "all" && (
              <input type="hidden" name="category" value={category} />
            )}
          </form>
          <Button variant="outline" className="gap-2 sm:w-auto bg-transparent">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Link
              key={cat.value}
              href={`/products${cat.value !== "all" ? `?category=${cat.value}` : ""}${searchQuery ? `&q=${searchQuery}` : ""}`}
            >
              <Badge
                variant={category === cat.value ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap px-3 py-1"
              >
                {cat.label}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Products Grid */}
        <ProductsList 
          products={products || []} 
          demandMap={demandMap}
          userId={user?.id}
        />
      </div>
    </main>
  );
}
