import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FavoritesContextType {
  favorites: Set<string>;
  isLoading: boolean;
  toggleFavorite: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavorites(new Set());
      setIsLoading(false);
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("favorites" as any)
      .select("product_id")
      .eq("user_id", user.id) as any;

    if (error) {
      // Silently fail if table doesn't exist yet (migration not run)
      console.log("Favorites not available:", error.message);
    } else if (data) {
      setFavorites(new Set(data.map((fav: any) => fav.product_id)));
    }
    setIsLoading(false);
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login Required",
        description: "Please login to save favorites.",
      });
      return;
    }

    const isFav = favorites.has(productId);

    // Optimistic update
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (isFav) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      return newFavorites;
    });

    if (isFav) {
      // Remove from favorites
      const { error } = await supabase
        .from("favorites" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) {
        console.error("Error removing favorite:", error);
        // Revert optimistic update
        setFavorites((prev) => {
          const newFavorites = new Set(prev);
          newFavorites.add(productId);
          return newFavorites;
        });
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not remove from favorites.",
        });
      } else {
        toast({
          title: "Removed from favorites",
          description: "Product removed from your favorites.",
        });
      }
    } else {
      // Add to favorites
      const { error } = await supabase
        .from("favorites" as any)
        .insert({ user_id: user.id, product_id: productId });

      if (error) {
        console.error("Error adding favorite:", error);
        // Revert optimistic update
        setFavorites((prev) => {
          const newFavorites = new Set(prev);
          newFavorites.delete(productId);
          return newFavorites;
        });
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not add to favorites.",
        });
      } else {
        toast({
          title: "Added to favorites",
          description: "Product saved to your favorites.",
        });
      }
    }
  };

  const isFavorite = (productId: string): boolean => {
    return favorites.has(productId);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, isLoading, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
