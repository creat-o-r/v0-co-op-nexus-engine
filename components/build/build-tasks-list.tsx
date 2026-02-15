"use client";

import React from "react"

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Hammer, 
  Clock, 
  Star, 
  Users, 
  CheckCircle,
  Loader2
} from "lucide-react";
import type { FeedItem } from "@/lib/types/database";

interface BuildTasksListProps {
  tasks: FeedItem[];
  userId?: string;
  claimedTasks: string[];
}

const skillIcons: Record<string, React.ReactNode> = {
  tech: <span className="text-blue-500">{"</>"}</span>,
  design: <span className="text-pink-500">{"✦"}</span>,
  outreach: <span className="text-green-500">{"◎"}</span>,
  admin: <span className="text-orange-500">{"≡"}</span>,
  logistics: <span className="text-purple-500">{"⚙"}</span>,
};

export function BuildTasksList({ tasks, userId, claimedTasks }: BuildTasksListProps) {
  const [claiming, setClaiming] = useState<string | null>(null);
  const [localClaimed, setLocalClaimed] = useState<string[]>(claimedTasks);

  const handleClaim = async (taskId: string) => {
    if (!userId) return;
    
    setClaiming(taskId);
    try {
      const response = await fetch("/api/feed/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedItemId: taskId,
          interactionType: "interested",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.action === "added") {
          setLocalClaimed([...localClaimed, taskId]);
        } else {
          setLocalClaimed(localClaimed.filter(id => id !== taskId));
        }
      }
    } catch (error) {
      console.error("[v0] Error claiming task:", error);
    } finally {
      setClaiming(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Hammer className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No build tasks available</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Check back soon or propose a new task!
        </p>
        {userId && (
          <Button variant="outline">Propose a Task</Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tasks.map((task) => {
        const isClaimed = localClaimed.includes(task.id);
        const metadata = task.build_metadata || {};
        const currentVol = Number(metadata.current_volunteers) || 0;
        const neededVol = Number(metadata.volunteers_needed) || 1;
        const progress = currentVol > 0 ? (currentVol / neededVol) * 100 : 0;
        
        return (
          <Card key={task.id} className="transition-all hover:border-primary/50 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-lg">
                    {skillIcons[String(metadata.skill_required || "tech")] || skillIcons.tech}
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {String(metadata.skill_required || "general")}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-primary">
                  <Star className="h-4 w-4 fill-primary" />
                  +{metadata.trust_reward || 5}
                </div>
              </div>
              <CardTitle className="mt-2 text-lg">{task.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {task.content}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Progress */}
              {metadata.volunteers_needed && (
                <div className="mb-4">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Volunteers
                    </span>
                    <span className="font-medium">
                      {metadata.current_volunteers || 0} / {metadata.volunteers_needed}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Time estimate */}
              {metadata.time_estimate && (
                <div className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Estimated: {metadata.time_estimate}
                </div>
              )}

              {/* Action */}
              <div className="flex gap-2">
                {userId ? (
                  <Button 
                    className="flex-1 gap-2"
                    variant={isClaimed ? "secondary" : "default"}
                    onClick={() => handleClaim(task.id)}
                    disabled={claiming === task.id}
                  >
                    {claiming === task.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isClaimed ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Claimed
                      </>
                    ) : (
                      <>
                        <Hammer className="h-4 w-4" />
                        Claim Task
                      </>
                    )}
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1 bg-transparent" disabled>
                    Sign in to claim
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
