"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Clock,
  Truck,
  Package,
  Shield,
  ArrowRight,
  Loader2,
  GitFork,
} from "lucide-react";

interface RouteDriver {
  display_name: string | null;
  avatar_url: string | null;
  trust_points: number;
}

interface LogisticsRoute {
  id: string;
  user_id: string;
  route_name: string;
  start_hub: string;
  end_hub: string;
  waypoints: string[];
  schedule: string[];
  departure_time: string | null;
  max_cargo_size: string | null;
  willing_to_detour: boolean;
  is_active: boolean;
  created_at: string;
  driver: RouteDriver | null;
}

interface LogisticsListProps {
  routes: LogisticsRoute[];
  userId?: string;
}

export function LogisticsList({ routes, userId }: LogisticsListProps) {
  const [selectedRoute, setSelectedRoute] = useState<LogisticsRoute | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async () => {
    if (!userId || !selectedRoute) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/logistics/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: selectedRoute.id, notes }),
      });
      if (response.ok) {
        setSelectedRoute(null);
        setNotes("");
      }
    } catch {
      // Request failed - dialog stays open for retry
    } finally {
      setSubmitting(false);
    }
  };

  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Truck className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No active routes</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Be the first to share a route and help your neighbors!
        </p>
        {userId && <Button variant="outline">Offer a Route</Button>}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {routes.map((route) => (
          <Card
            key={route.id}
            className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-sm"
            onClick={() => setSelectedRoute(route)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Route info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary mb-1">{route.route_name}</p>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{route.start_hub}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{route.end_hub}</span>
                  </div>

                  {route.waypoints?.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <GitFork className="h-3 w-3 shrink-0" />
                      <span className="truncate">Via {route.waypoints.join(", ")}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    {route.departure_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {route.departure_time}
                      </span>
                    )}
                    {route.max_cargo_size && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {route.max_cargo_size}
                      </span>
                    )}
                    {route.willing_to_detour && (
                      <span className="text-primary text-[10px] font-medium">Will detour</span>
                    )}
                    {route.schedule?.length > 0 && (
                      <span className="text-[10px]">{route.schedule.join(", ")}</span>
                    )}
                  </div>
                </div>

                {/* Driver */}
                {route.driver && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={route.driver.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {route.driver.display_name?.charAt(0) || "D"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium">{route.driver.display_name || "Driver"}</p>
                      <div className="flex items-center gap-1 text-[10px] text-primary">
                        <Shield className="h-2.5 w-2.5" />
                        {route.driver.trust_points} trust
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pickup request dialog */}
      <Dialog open={!!selectedRoute} onOpenChange={() => setSelectedRoute(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Pickup</DialogTitle>
            <DialogDescription>
              Ask {selectedRoute?.driver?.display_name || "the driver"} to pick up items along their route
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium text-primary mb-1">{selectedRoute?.route_name}</p>
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {selectedRoute?.start_hub}
                <ArrowRight className="h-3.5 w-3.5" />
                {selectedRoute?.end_hub}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                {selectedRoute?.departure_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {selectedRoute.departure_time}
                  </span>
                )}
                {selectedRoute?.max_cargo_size && (
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {selectedRoute.max_cargo_size}
                  </span>
                )}
              </div>
            </div>

            {userId ? (
              <div className="space-y-2">
                <Label htmlFor="request-notes">What do you need picked up?</Label>
                <Textarea
                  id="request-notes"
                  placeholder="Describe items and any special handling..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">Sign in to request pickup services</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRoute(null)}>Cancel</Button>
            {userId && (
              <Button onClick={handleRequest} disabled={submitting || !notes.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Request"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
