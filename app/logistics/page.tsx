import { createClient } from "@/lib/supabase/server";
import { LogisticsList } from "@/components/logistics/logistics-list";
import { Button } from "@/components/ui/button";
import { Plus, Truck, MapPin, Package } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Logistics | Co-Op Nexus",
  description: "Share routes, coordinate pickups, and organize deliveries with your community",
};

export default async function LogisticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch active logistics routes with driver profile
  const { data: routes, error } = await supabase
    .from("logistics_routes")
    .select(`
      *,
      profile:profiles!logistics_routes_user_id_fkey(id, display_name, avatar_url, trust_points, neighborhood_hub)
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[v0] Error fetching routes:", error);
  }

  // Get stats
  const { count: totalRoutes } = await supabase
    .from("logistics_routes")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: activeHubs } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_distribution_hub", true);

  return (
    <main className="min-h-screen pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logistics Bridge</h1>
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

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Scheduled Routes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{totalRoutes || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Pickup Hubs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{activeHubs || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Savings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">40%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mb-8 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">How the Logistics Bridge Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  1
                </div>
                <div>
                  <p className="font-medium">Share Your Route</p>
                  <p className="text-sm text-muted-foreground">
                    Driving past a farm? Post your route and available capacity.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  2
                </div>
                <div>
                  <p className="font-medium">Match with Orders</p>
                  <p className="text-sm text-muted-foreground">
                    {"We'll match your route with pending orders that need delivery."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  3
                </div>
                <div>
                  <p className="font-medium">Earn Trust</p>
                  <p className="text-sm text-muted-foreground">
                    Complete deliveries to build your trust score and help the community.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Routes List */}
        <LogisticsList routes={routes || []} userId={user?.id} />
      </div>
    </main>
  );
}
