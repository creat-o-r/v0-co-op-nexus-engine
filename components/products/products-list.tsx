"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, ShoppingCart, Leaf, Loader2 } from "lucide-react";
import type { Product } from "@/lib/types/database";

interface ProductsListProps {
  products: Product[];
  demandMap: Map<string, number>;
  userId?: string;
}

const categoryIcons: Record<string, string> = {
  produce: "/images/produce.jpg",
  dairy: "/images/dairy.jpg",
  meat: "/images/meat.jpg",
  baked: "/images/baked.jpg",
  preserved: "/images/preserved.jpg",
  other: "/images/other.jpg",
};

export function ProductsList({ products, demandMap, userId }: ProductsListProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState([1]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleInterest = async () => {
    if (!userId || !selectedProduct) return;
    
    setSubmitting(true);
    try {
      const response = await fetch("/api/products/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: quantity[0],
          notes,
        }),
      });

      if (response.ok) {
        setSelectedProduct(null);
        setQuantity([1]);
        setNotes("");
      }
    } catch (error) {
      console.error("[v0] Error expressing interest:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Leaf className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No products found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or check back later
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const demand = demandMap.get(product.id) || 0;
          
          return (
            <Card 
              key={product.id} 
              className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
              onClick={() => setSelectedProduct(product)}
            >
              <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
                <Image
                  src={categoryIcons[product.category] || "/images/other.jpg"}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {product.product_type === "value_added" && (
                  <Badge className="absolute right-2 top-2" variant="secondary">
                    Value Added
                  </Badge>
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {product.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">
                    {product.category}
                  </Badge>
                  {demand > 0 && (
                    <div className="flex items-center gap-1 text-sm text-primary">
                      <Users className="h-4 w-4" />
                      <span>{demand} interested</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Product Detail / Interest Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">
                {selectedProduct?.category}
              </Badge>
              <Badge variant="outline">
                {selectedProduct?.unit}
              </Badge>
              {selectedProduct?.product_type === "value_added" && (
                <Badge variant="secondary">Value Added</Badge>
              )}
            </div>

            {demandMap.get(selectedProduct?.id || "") ? (
              <div className="rounded-lg border bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">
                    {demandMap.get(selectedProduct?.id || "")} people interested
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Join them to help reach the bulk order threshold!
                </p>
              </div>
            ) : null}

            {userId ? (
              <>
                <div className="space-y-2">
                  <Label>Quantity ({selectedProduct?.unit}s)</Label>
                  <Slider
                    value={quantity}
                    onValueChange={setQuantity}
                    min={1}
                    max={50}
                    step={1}
                  />
                  <div className="text-right text-sm text-muted-foreground">
                    {quantity[0]} {selectedProduct?.unit}
                    {quantity[0] > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special requests or preferences..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-lg border bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Sign in to express interest and join bulk orders
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>
              Cancel
            </Button>
            {userId && (
              <Button onClick={handleInterest} disabled={submitting} className="gap-2">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {"I'm Interested"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
