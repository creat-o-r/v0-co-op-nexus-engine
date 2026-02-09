import { createClient } from "@/lib/supabase/server";
import { LogisticsList } from "@/components/logistics/logistics-list";
import { Button } from "@/components/ui/button";
import { Plus, Truck, MapPin, Package } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export const metadata = {
  title: "Routes | Co-Op Nexus",
  description: "Share routes, coordinate pickups, and organize deliveries with your community",
};

export default async function LogisticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch active logistics routes with driver profiles
  const { data: routes, error } = await supabase
    .from("logistics_routes")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[v0] Error fetching routes:", error);
  }

  // Fetch driver profiles separately
  const driverIds = [...new Set((routes || []).map(r => r.user_id))];
  let profilesMap: Record<string, { display_name: string | null; avatar_url: string | null; trust_points: number }> = {};
  
  if (driverIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, trust_points")
      .in("id", driverIds);
    
    profiles?.forEach(p => {
      profilesMap[p.id] = p;
    });
  }

  const enrichedRoutes = (routes || []).map(r => ({
    ...r,
    driver: profilesMap[r.user_id] || null,
  }));

  // Stats
  const { count: totalRoutes } = await supabase
    .from("logistics_routes")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: hubCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_distribution_hub", true);

  return (
    <main className="min-h-screen pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Routes</h1>
            <p className="text-sm text-muted-foreground">
              Share your route or find a ride for your goods
            </p>
          </div>
          {user && (
            <Link href="/logistics/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Offer a Route
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-3 grid-cols-3">
          <Card>
            <CardContent className="py-3 px-4">
              <CardDescription className="text-[10px]">Active Routes</CardDescription>
              <div className="flex items-center gap-2 mt-1">
                <Truck className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold">{totalRoutes || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4">
              <CardDescription className="text-[10px]">Distribution Hubs</CardDescription>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold">{hubCount || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4">
              <CardDescription className="text-[10px]">Avg Savings</CardDescription>
              <div className="flex items-center gap-2 mt-1">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold">40%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Routes List */}
        <LogisticsList routes={enrichedRoutes} userId={user?.id} />
      </div>
    </main>
  );
}
