import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Heart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  stock: number;
  is_available: boolean;
  category_id: string | null;
  categories: { name: string } | null;
}

const Favorites = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user && favorites.size > 0) {
      fetchFavoriteProducts();
    } else {
      setProducts([]);
      setIsLoading(false);
    }
  }, [user, authLoading, navigate, favorites]);

  const fetchFavoriteProducts = async () => {
    setIsLoading(true);
    const favoriteIds = Array.from(favorites);
    
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .in("id", favoriteIds);

    if (!error && data) {
      setProducts(data);
    }
    setIsLoading(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-xl font-bold">Loading favorites...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold uppercase mb-2 flex items-center gap-3">
            <Heart className="fill-destructive text-destructive" size={36} />
            My Favorites
          </h1>
          <p className="text-muted-foreground font-medium">
            Your favorite products all in one place
          </p>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="neu-card bg-card p-12 text-center">
            <Heart size={64} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold uppercase mb-2">No Favorites Yet</h2>
            <p className="text-muted-foreground mb-6">
              Start adding products to your favorites by clicking the heart icon!
            </p>
            <button
              onClick={() => navigate("/products")}
              className="neu-btn bg-primary text-primary-foreground px-8 py-3"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground">
                {products.length} favorite product{products.length !== 1 ? "s" : ""}
              </p>
            </div>
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
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Favorites;
