import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Leaf, 
  Users, 
  Package, 
  Truck, 
  Hammer, 
  ArrowRight,
  CheckCircle,
  Shield,
  Heart
} from "lucide-react";

export default async function HomePage() {
  let user = null;
  let productCount = 0;
  let memberCount = 0;

  try {
    const supabase = await createClient();
    const { data: { user: u } } = await supabase.auth.getUser();
    user = u;

    const { count: pc } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    productCount = pc || 0;

    const { count: mc } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    memberCount = mc || 0;
  } catch (err) {
    console.error("[v0] HomePage error fetching data:", err);
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary/5 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">
            Peer-to-Peer Circular Economy
          </Badge>
          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Your Local Food Network,
            <span className="text-primary"> Reimagined</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-pretty text-lg text-muted-foreground">
            Connect directly with local producers, coordinate bulk purchases with neighbors, 
            and build a resilient community food system together.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href={user ? "/feed" : "/auth/sign-up"}>
              <Button size="lg" className="gap-2">
                {user ? "Go to Feed" : "Join the Network"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/feed">
              <Button variant="outline" size="lg">
                Explore the Feed
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -top-24 left-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      </section>

      {/* How It Works */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">How Co-Op Nexus Works</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              A simple, transparent system that puts community first
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-2 border-transparent transition-colors hover:border-primary/20">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Share Your Needs</CardTitle>
                <CardDescription>
                  Tell us what products you want and what you can offer. Our scenario cards 
                  help us understand your preferences.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-transparent transition-colors hover:border-primary/20">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Get Matched</CardTitle>
                <CardDescription>
                  Our bulk-matching engine groups you with neighbors who want similar things, 
                  unlocking wholesale prices.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-transparent transition-colors hover:border-primary/20">
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Coordinate Delivery</CardTitle>
                <CardDescription>
                  Members volunteer routes, become pickup hubs, or arrange deliveries. 
                  Everyone contributes, everyone benefits.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-secondary/30 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">The Five Pillars</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Everything you need to participate in your local food economy
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: Leaf, title: "Scenarios", desc: "Shape the network" },
              { icon: Package, title: "Products", desc: "Browse & request" },
              { icon: Truck, title: "Logistics", desc: "Share rides" },
              { icon: Hammer, title: "Build", desc: "Contribute tasks" },
              { icon: Users, title: "Community", desc: "Connect & verify" },
            ].map((item) => (
              <Card key={item.title} className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Transparency */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <Badge variant="outline" className="mb-4">Trust System</Badge>
              <h2 className="mb-4 text-3xl font-bold text-foreground">
                Built on Community Trust
              </h2>
              <p className="mb-6 text-muted-foreground">
                Every member earns trust through participation. Verify producers, 
                complete deliveries, and contribute to build your reputation.
              </p>
              <ul className="space-y-3">
                {[
                  "Peer verification of farms and producers",
                  "Transparent pricing with no hidden fees",
                  "Community-governed dispute resolution",
                  "Progressive trust unlocks more features",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-primary/5">
                <CardContent className="pt-6">
                  <Shield className="mb-2 h-8 w-8 text-primary" />
                  <div className="text-3xl font-bold text-foreground">
                    {memberCount || 0}+
                  </div>
                  <p className="text-sm text-muted-foreground">Community Members</p>
                </CardContent>
              </Card>
              <Card className="bg-accent/10">
                <CardContent className="pt-6">
                  <Package className="mb-2 h-8 w-8 text-accent-foreground" />
                  <div className="text-3xl font-bold text-foreground">
                    {productCount || 0}+
                  </div>
                  <p className="text-sm text-muted-foreground">Local Products</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary px-4 py-16 text-primary-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Join?</h2>
          <p className="mb-8 text-primary-foreground/80">
            Start by answering a few scenarios to help us understand your needs. 
            It only takes a minute.
          </p>
          <Link href={user ? "/feed" : "/auth/sign-up"}>
            <Button size="lg" variant="secondary" className="gap-2">
              {user ? "Continue to Feed" : "Get Started Now"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">Co-Op Nexus</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Building resilient local food systems, together.
          </p>
        </div>

        {/* Temporary dev nav -- all pages */}
        <div className="mx-auto mt-6 max-w-5xl border-t border-dashed border-muted-foreground/30 pt-4">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Dev Nav</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { href: "/", label: "Home" },
              { href: "/feed", label: "Feed" },
              { href: "/products", label: "Products" },
              { href: "/logistics", label: "Logistics" },
              { href: "/build", label: "Build" },
              { href: "/community", label: "Community" },
              { href: "/auth/login", label: "Login" },
              { href: "/auth/sign-up", label: "Sign Up" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-dashed border-muted-foreground/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
