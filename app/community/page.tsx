import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Shield, 
  MapPin, 
  MessageCircle, 
  CheckCircle,
  Star,
  Leaf
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Community | Co-Op Nexus",
  description: "Connect with members, verify producers, and participate in discussions",
};

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch top members by trust points
  const { data: topMembers } = await supabase
    .from("profiles")
    .select("*")
    .order("trust_points", { ascending: false })
    .limit(10);

  // Fetch distribution hubs
  const { data: pickupPoints } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_distribution_hub", true)
    .limit(6);

  // Fetch discussions
  const { data: discussions } = await supabase
    .from("feed_items")
    .select("*")
    .eq("feed_type", "discussion")
    .order("created_at", { ascending: false })
    .limit(5);

  // Get stats
  const { count: totalMembers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: verifications } = await supabase
    .from("peer_verifications")
    .select("*", { count: "exact", head: true });

  return (
    <main className="min-h-screen pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Community</h1>
          <p className="text-sm text-muted-foreground">
            Connect with neighbors, verify producers, and build trust together
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{totalMembers || 0}</p>
                <p className="text-sm text-muted-foreground">Community Members</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{pickupPoints?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Pickup Hubs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{verifications || 0}</p>
                <p className="text-sm text-muted-foreground">Peer Verifications</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
            <TabsTrigger value="members">Top Members</TabsTrigger>
            <TabsTrigger value="hubs">Pickup Hubs</TabsTrigger>
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
          </TabsList>

          {/* Top Members */}
          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Trust Leaderboard
                </CardTitle>
                <CardDescription>
                  Members who have contributed the most to our community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topMembers?.map((member, index) => (
                    <div 
                      key={member.id} 
                      className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground">
                        {index + 1}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.display_name?.charAt(0) || "M"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.display_name || "Member"}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {member.is_distribution_hub && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <MapPin className="h-3 w-3" />
                              Hub
                            </Badge>
                          )}
                          {member.neighborhood_hub && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <MapPin className="h-3 w-3" />
                              {member.neighborhood_hub}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        <Star className="h-4 w-4 fill-primary" />
                        <span className="font-bold">{member.trust_points}</span>
                      </div>
                    </div>
                  ))}
                  {(!topMembers || topMembers.length === 0) && (
                    <div className="py-8 text-center text-muted-foreground">
                      No members yet. Be the first to join!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pickup Hubs */}
          <TabsContent value="hubs" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {pickupPoints?.map((hub) => (
                <Card key={hub.id}>
                  <CardContent className="flex items-center gap-4 pt-6">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={hub.avatar_url || undefined} />
                      <AvatarFallback>
                        {hub.display_name?.charAt(0) || "H"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{hub.display_name || "Pickup Hub"}</p>
                      {hub.neighborhood_hub && (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {hub.neighborhood_hub}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1 text-sm text-primary">
                        <Shield className="h-3 w-3" />
                        Trust: {hub.trust_points}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {(!pickupPoints || pickupPoints.length === 0) && (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center">
                    <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="font-semibold">No pickup hubs yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Become a hub and help your neighbors!
                    </p>
                    {user && (
                      <Button className="mt-4">Become a Hub</Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Discussions */}
          <TabsContent value="discussions" className="space-y-4">
            {discussions?.map((discussion) => (
              <Card key={discussion.id} className="cursor-pointer transition-colors hover:border-primary/50">
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{discussion.title}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {discussion.content}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {discussion.comments_count || 0} replies
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!discussions || discussions.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="font-semibold">No discussions yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a conversation with your community!
                  </p>
                  {user && (
                    <Link href="/community/new-discussion">
                      <Button className="mt-4">Start Discussion</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
