import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import CategoryCard from "./CategoryCard";

interface Category {
  id: string;
  name: string;
  emoji: string | null;
  product_count?: number;
}

const colorMap: Record<string, "primary" | "secondary" | "accent" | "cyan" | "lime"> = {
  "Late Night Munchies": "secondary",
  "Exam Fuel": "accent",
  "Essentials": "cyan",
  "Stationery": "lime",
};

const CategorySection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    // Fetch categories
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");

    if (categoriesData) {
      // Fetch product counts for each category
      const categoriesWithCounts = await Promise.all(
        categoriesData.map(async (cat) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id)
            .eq("is_available", true);

          return { ...cat, product_count: count || 0 };
        })
      );

      setCategories(categoriesWithCounts);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <section className="py-12 bg-background border-b-3 border-foreground">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold uppercase mb-8">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="neu-card bg-card p-6 animate-pulse">
                <div className="w-12 h-12 bg-muted mb-3 rounded" />
                <div className="h-5 bg-muted mb-2" />
                <div className="h-4 bg-muted w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="categories-section" className="py-12 bg-background border-b-3 border-foreground">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold uppercase mb-8">
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              title={category.name}
              emoji={category.emoji || "📦"}
              count={category.product_count || 0}
              color={colorMap[category.name] || "primary"}
              onClick={() => window.location.href = `/products?category=${category.id}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
