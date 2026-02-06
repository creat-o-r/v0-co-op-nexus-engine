"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Loader2 
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/date";
import type { LogisticsRoute } from "@/lib/types/database";

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
        body: JSON.stringify({
          routeId: selectedRoute.id,
          notes,
        }),
      });

      if (response.ok) {
        setSelectedRoute(null);
        setNotes("");
      }
    } catch (error) {
      console.error("[v0] Error requesting route:", error);
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
        <h3 className="text-lg font-semibold">No routes scheduled</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Be the first to share a route and help your neighbors!
        </p>
        {userId && (
          <Button variant="outline">Offer a Route</Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {routes.map((route) => (
          <Card 
            key={route.id} 
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => setSelectedRoute(route)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Route Info */}
                <div className="flex-1">
                  <div className="mb-1 text-sm font-medium text-muted-foreground">{route.route_name}</div>
                  <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{route.start_hub}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span>{route.end_hub}</span>
                  </div>
                  
                  {route.waypoints && route.waypoints.length > 0 && (
                    <p className="mb-2 text-sm text-muted-foreground">
                      Via: {route.waypoints.join(" → ")}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {route.schedule && route.schedule.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {route.schedule.join(", ")}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {route.max_cargo_size}
                    </div>
                    {route.willing_to_detour && (
                      <Badge variant="outline">Willing to detour</Badge>
                    )}
                  </div>
                </div>

                {/* Driver Info */}
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={route.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {route.profile?.display_name?.charAt(0) || "D"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{route.profile?.display_name || "Driver"}</p>
                    <div className="flex items-center gap-1 text-sm text-primary">
                      <Shield className="h-3 w-3" />
                      Trust: {route.profile?.trust_points || 0}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Route Detail / Request Dialog */}
      <Dialog open={!!selectedRoute} onOpenChange={() => setSelectedRoute(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Pickup</DialogTitle>
            <DialogDescription>
              Ask {selectedRoute?.profile?.display_name} to pick up items along their route
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-primary" />
                {selectedRoute?.start_hub}
                <ArrowRight className="h-4 w-4" />
                {selectedRoute?.end_hub}
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                {selectedRoute?.schedule && selectedRoute.schedule.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {selectedRoute.schedule.join(", ")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {selectedRoute?.max_cargo_size}
                </span>
              </div>
            </div>

            {userId ? (
              <div className="space-y-2">
                <Label htmlFor="request-notes">What do you need picked up?</Label>
                <Textarea
                  id="request-notes"
                  placeholder="Describe what you need transported and any special handling requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Sign in to request pickup services
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRoute(null)}>
              Cancel
            </Button>
            {userId && (
              <Button onClick={handleRequest} disabled={submitting || !notes.trim()}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send Request"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
