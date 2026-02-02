import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Mail, ArrowRight } from "lucide-react";

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription className="text-base">
            {"We've sent you a confirmation link"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Click the link in the email to verify your account and start exploring 
            your local food community.
          </p>
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Leaf className="h-4 w-4 text-primary" />
              <span className="font-medium">Pro tip:</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              While you wait, you can browse the feed and see what products are available.
            </p>
          </div>
          <Link href="/feed">
            <Button variant="outline" className="w-full gap-2 bg-transparent">
              Browse the Feed
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
