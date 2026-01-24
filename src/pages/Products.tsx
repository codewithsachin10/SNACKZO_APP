import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import MarqueeAnnouncement from "@/components/MarqueeAnnouncement";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Search, Filter, ArrowUpDown, Users } from "lucide-react";

// Premium Components
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { ProductGridSkeleton } from "@/components/ui/Skeletons";
import { AdvancedSearch } from "@/components/AdvancedSearch";
// import { useFeatures } from "@/contexts/FeatureContext"; // Temporarily disabled

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
  average_rating: number;
  review_count: number;
  categories: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
  emoji: string | null;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "name">("name");
  const [showFilters, setShowFilters] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Feature flags - default to enabled since FeatureProvider is disabled
  const isFeatureEnabled = (feature: string) => true;

  // Group Order Context
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group");
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (groupId) fetchGroupName();
  }, [groupId]);

  const fetchGroupName = async () => {
    if (!groupId) return;
    const { data } = await supabase.from('group_orders' as any).select('name').eq('id', groupId).single() as any;
    if (data) setGroupName(data.name);
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .order("name");

    if (!error && data) {
      setProducts(data as unknown as Product[]);
      // Set max price for filter
      const maxP = Math.max(...data.map((p: any) => p.price), 100);
      setMaxPrice(maxP);
      setPriceRange([0, maxP]);
    }
    setIsLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");

    if (data) {
      setCategories(data);
    }
  };

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
      const matchesStock = showOutOfStock || product.stock > 0;
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      return matchesSearch && matchesCategory && matchesStock && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // Handle refresh for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchProducts(), fetchCategories()]);
  }, []);

  // Handle advanced search
  const handleAdvancedSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    if (filters.category) setSelectedCategory(filters.category);
    if (filters.priceRange) setPriceRange(filters.priceRange);
    if (filters.sortBy) setSortBy(filters.sortBy);
    setShowAdvancedSearch(false);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar />
        <MarqueeAnnouncement />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold uppercase mb-2">All Products</h1>
          <p className="text-muted-foreground font-medium">
            Browse our entire catalog of late-night goodies
          </p>

          {/* Group Order Mode Banner */}
          {groupId && (
            <div className="mt-4 bg-lime/20 border-2 border-lime p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <Users className="text-lime-700" size={24} />
                <div>
                  <p className="font-bold text-lime-900">Adding to: {groupName || 'Group Order'}</p>
                  <p className="text-xs text-lime-800">Tap any product to add it</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/group-order/${groupId}`)}
                className="bg-lime text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-lime/90"
              >
                Done Adding
              </button>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Advanced Search Toggle */}
          {isFeatureEnabled('advanced_search') && (
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              🔍 {showAdvancedSearch ? 'Simple Search' : 'Advanced Search'}
            </button>
          )}

          {/* Advanced Search Modal */}
          {showAdvancedSearch && isFeatureEnabled('advanced_search') && (
            <div className="mb-4">
              <AdvancedSearch
                onSearch={handleAdvancedSearch}
                categories={categories.map(c => ({ id: c.id, name: c.name }))}
              />
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for snacks, drinks, essentials..."
              className="w-full border-3 border-foreground bg-background p-4 pl-12 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`neu-btn px-4 py-2 flex items-center gap-2 ${showFilters ? "bg-primary text-primary-foreground" : "bg-background"}`}
            >
              <Filter size={18} />
              Filters
            </button>

            <div className="flex-1" />

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="neu-btn bg-background px-4 py-2 pr-10 appearance-none cursor-pointer"
              >
                <option value="name">Sort by Name</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Category Filters */}
          {showFilters && (
            <div className="neu-card bg-card p-4 space-y-4">
              <div>
                <h3 className="font-bold uppercase text-sm mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`neu-btn px-4 py-2 text-sm ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`neu-btn px-4 py-2 text-sm ${selectedCategory === category.id ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {category.emoji} {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-bold uppercase text-sm mb-3">Availability</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOutOfStock}
                    onChange={(e) => setShowOutOfStock(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-foreground checked:bg-primary"
                  />
                  <span className="text-sm font-medium">Show out of stock items</span>
                </label>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-bold uppercase text-sm mb-3">Price Range</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Min</label>
                      <input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="w-full glass-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        min={0}
                        max={priceRange[1]}
                      />
                    </div>
                    <span className="text-muted-foreground mt-4">-</span>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Max</label>
                      <input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full glass-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        min={priceRange[0]}
                        max={maxPrice}
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    ₹{priceRange[0]} - ₹{priceRange[1]}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm font-medium text-muted-foreground">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : filteredProducts.length === 0 ? (
          <div className="neu-card bg-card p-12 text-center">
            <span className="text-6xl mb-4 block">🔍</span>
            <h3 className="text-xl font-bold uppercase mb-2">No Products Found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                originalPrice={product.original_price || undefined}
                image={product.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"}
                stock={product.stock}
                category={product.categories?.name || "Uncategorized"}
                averageRating={product.average_rating || 0}
                reviewCount={product.review_count || 0}
                groupId={groupId}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <BottomNavigation />
      </div>
    </div>
    </PullToRefresh>
  );
};

export default Products;
