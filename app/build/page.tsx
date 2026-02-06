import { createClient } from "@/lib/supabase/server";
import { BuildTasksList } from "@/components/build/build-tasks-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Hammer, Users, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Build Board | Co-Op Nexus",
  description: "Contribute your skills and help build the community infrastructure",
};

export default async function BuildPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch build tasks from feed with related agreement data
  const { data: buildTasks, error } = await supabase
    .from("feed_items")
    .select("*, agreement:agreements!feed_items_related_agreement_id_fkey(*)")
    .eq("feed_type", "build")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[v0] Error fetching build tasks:", error);
  }

  // Get user's claimed tasks
  let claimedTasks: string[] = [];
  if (user) {
    const { data: claims } = await supabase
      .from("feed_interactions")
      .select("feed_item_id")
      .eq("user_id", user.id)
      .eq("interaction_type", "interested");
    
    claimedTasks = claims?.map(c => c.feed_item_id) || [];
  }

  const skillCategories = [
    { value: "all", label: "All Tasks" },
    { value: "tech", label: "Tech" },
    { value: "design", label: "Design" },
    { value: "outreach", label: "Outreach" },
    { value: "admin", label: "Admin" },
    { value: "logistics", label: "Logistics" },
  ];

  return (
    <main className="min-h-screen pb-20 md:pb-8">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Build Board</h1>
            <p className="text-sm text-muted-foreground">
              Contribute your skills and earn trust by completing community tasks
            </p>
          </div>
          {user && (
            <Link href="/build/propose">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Propose Task
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Hammer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{buildTasks?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Open Tasks</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{claimedTasks.length}</p>
                <p className="text-xs text-muted-foreground">Your Claims</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-xs text-muted-foreground">Avg Trust Points</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-xs text-muted-foreground">Completed This Month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skill Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {skillCategories.map((cat) => (
            <Badge
              key={cat.value}
              variant={cat.value === "all" ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap px-3 py-1"
            >
              {cat.label}
            </Badge>
          ))}
        </div>

        {/* Contribution Guide */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hammer className="h-5 w-5 text-primary" />
              How Build Tasks Work
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="grid gap-2 sm:grid-cols-2">
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground">1.</span>
                Browse tasks that match your skills
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground">2.</span>
                Claim a task to start working on it
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground">3.</span>
                Submit your work for peer review
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground">4.</span>
                Earn trust points upon completion
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <BuildTasksList 
          tasks={buildTasks || []} 
          userId={user?.id} 
          claimedTasks={claimedTasks}
        />
      </div>
    </main>
  );
}
