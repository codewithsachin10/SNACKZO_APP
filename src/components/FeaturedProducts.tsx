import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "./ProductCard";

interface Product {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  stock: number;
  categories: { name: string } | null;
}

const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("is_available", true)
      .order("created_at", { ascending: false })
      .limit(8);

    if (!error && data) {
      setProducts(data);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <section className="py-12 bg-muted border-b-3 border-foreground">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold uppercase mb-8">
            Tonight's Picks
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="neu-card bg-card p-4 animate-pulse">
                <div className="aspect-[4/3] bg-background mb-4 rounded-md" />
                <div className="h-4 bg-background mb-2 w-3/4 rounded" />
                <div className="h-6 bg-background w-1/2 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="featured-products" className="py-12 bg-muted border-b-3 border-foreground">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold uppercase">
              Tonight's Picks
            </h2>
            <p className="text-muted-foreground font-medium mt-1">
              Popular items flying off the shelves
            </p>
          </div>
          <a
            href="/products"
            className="neu-btn bg-background px-6 py-3"
          >
            View All →
          </a>
        </div>

        {products.length === 0 ? (
          <div className="neu-card bg-card p-12 text-center">
            <span className="text-6xl mb-4 block">📦</span>
            <h3 className="text-xl font-bold uppercase mb-2">Coming Soon</h3>
            <p className="text-muted-foreground">
              Products will be available shortly!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                originalPrice={product.original_price || undefined}
                image={product.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"}
                stock={product.stock}
                category={product.categories?.name || "Uncategorized"}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
