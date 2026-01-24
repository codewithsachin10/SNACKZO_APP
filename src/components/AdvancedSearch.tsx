import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, X, Filter, SlidersHorizontal, Clock, TrendingUp, 
  Star, ArrowUpDown, Check, ChevronDown, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { SearchResultSkeleton } from "./ui/Skeletons";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  stock: number;
  category_id: string | null;
  categories: { name: string } | null;
  average_rating: number;
}

interface Category {
  id: string;
  name: string;
  emoji: string | null;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  created_at: string;
}

interface AdvancedSearchProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function AdvancedSearch({ isOpen, onClose, initialQuery = "" }: AdvancedSearchProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const inputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"relevance" | "price_asc" | "price_desc" | "rating">("relevance");

  // History & suggestions
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Debounce timer
  const debounceRef = useRef<NodeJS.Timeout>();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      fetchCategories();
      fetchSearchHistory();
      fetchPopularSearches();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        performSearch();
        fetchSuggestions();
      }, 300);
    } else {
      setResults([]);
      setSuggestions([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, selectedCategory, priceRange, minRating, inStockOnly, sortBy]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");
    if (data) setCategories(data);
  };

  const fetchSearchHistory = async () => {
    if (!user) return;
    const { data } = await (supabase.from as any)("search_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setSearchHistory(data);
  };

  const fetchPopularSearches = async () => {
    // Mock popular searches (would come from materialized view)
    setPopularSearches(["Chips", "Chocolate", "Biscuits", "Cold Drinks", "Noodles"]);
  };

  const fetchSuggestions = async () => {
    if (query.length < 2) return;
    
    const { data } = await supabase
      .from("products")
      .select("name")
      .ilike("name", `%${query}%`)
      .limit(5);
    
    if (data) {
      setSuggestions(data.map(p => p.name));
    }
  };

  const performSearch = async () => {
    setIsLoading(true);

    let queryBuilder = supabase
      .from("products")
      .select("*, categories(name)")
      .ilike("name", `%${query}%`);

    // Apply filters
    if (selectedCategory) {
      queryBuilder = queryBuilder.eq("category_id", selectedCategory);
    }
    if (priceRange[0] > 0) {
      queryBuilder = queryBuilder.gte("price", priceRange[0]);
    }
    if (priceRange[1] < 500) {
      queryBuilder = queryBuilder.lte("price", priceRange[1]);
    }
    if (minRating > 0) {
      queryBuilder = queryBuilder.gte("average_rating", minRating);
    }
    if (inStockOnly) {
      queryBuilder = queryBuilder.gt("stock", 0);
    }

    // Apply sorting
    switch (sortBy) {
      case "price_asc":
        queryBuilder = queryBuilder.order("price", { ascending: true });
        break;
      case "price_desc":
        queryBuilder = queryBuilder.order("price", { ascending: false });
        break;
      case "rating":
        queryBuilder = queryBuilder.order("average_rating", { ascending: false });
        break;
      default:
        queryBuilder = queryBuilder.order("name");
    }

    const { data, error } = await queryBuilder.limit(20);

    if (!error && data) {
      setResults(data as unknown as Product[]);
    }
    setIsLoading(false);
  };

  const saveSearchHistory = async (searchQuery: string) => {
    if (!user || searchQuery.length < 2) return;
    
    await (supabase.from as any)("search_history").insert({
      user_id: user.id,
      query: searchQuery,
      result_count: results.length
    });
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    saveSearchHistory(searchQuery);
  };

  const handleProductClick = (productId: string) => {
    saveSearchHistory(query);
    onClose();
    navigate(`/products/${productId}`);
  };

  const handleQuickAdd = (product: Product) => {
    if (product.stock > 0) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url || "",
        stock: product.stock
      });
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    await (supabase.from as any)("search_history")
      .delete()
      .eq("user_id", user.id);
    setSearchHistory([]);
  };

  const activeFiltersCount = [
    selectedCategory,
    priceRange[0] > 0 || priceRange[1] < 500,
    minRating > 0,
    inStockOnly
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="container mx-auto px-4 py-3">
            {/* Search input */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-10 py-3 bg-muted rounded-xl border-none focus:ring-2 focus:ring-primary outline-none text-base"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "relative p-3 rounded-xl transition-colors",
                  showFilters ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                )}
              >
                <SlidersHorizontal size={20} />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="p-3 rounded-xl bg-muted hover:bg-muted/80"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filters panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="py-4 space-y-4">
                    {/* Categories */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm transition-colors",
                            !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          All
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm transition-colors",
                              selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                            )}
                          >
                            {cat.emoji} {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Price: ₹{priceRange[0]} - ₹{priceRange[1]}
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="500"
                          value={priceRange[0]}
                          onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                          className="flex-1 accent-primary"
                        />
                        <input
                          type="range"
                          min="0"
                          max="500"
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                          className="flex-1 accent-primary"
                        />
                      </div>
                    </div>

                    {/* Rating & Stock */}
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">Min Rating</label>
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => setMinRating(rating)}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                minRating === rating ? "bg-primary text-primary-foreground" : "bg-muted"
                              )}
                            >
                              <Star size={16} className={rating <= minRating ? "fill-current" : ""} />
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">Availability</label>
                        <button
                          onClick={() => setInStockOnly(!inStockOnly)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                            inStockOnly ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}
                        >
                          {inStockOnly && <Check size={16} />}
                          In Stock Only
                        </button>
                      </div>
                    </div>

                    {/* Sort */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "relevance", label: "Relevance" },
                          { value: "price_asc", label: "Price: Low to High" },
                          { value: "price_desc", label: "Price: High to Low" },
                          { value: "rating", label: "Rating" }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setSortBy(option.value as any)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm transition-colors",
                              sortBy === option.value ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-4 pb-24 overflow-y-auto" style={{ height: "calc(100vh - 140px)" }}>
          {/* No query - show history and popular */}
          {!query && (
            <div className="space-y-6">
              {/* Search history */}
              {searchHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Clock size={16} /> Recent Searches
                    </h3>
                    <button
                      onClick={clearHistory}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSearch(item.query)}
                        className="px-4 py-2 bg-muted rounded-full text-sm hover:bg-muted/80 transition-colors"
                      >
                        {item.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular searches */}
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <TrendingUp size={16} /> Popular Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearch(search)}
                      className="px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full text-sm hover:from-primary/20 hover:to-accent/20 transition-colors border border-primary/20"
                    >
                      <Sparkles size={12} className="inline mr-1" />
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {query && suggestions.length > 0 && results.length === 0 && !isLoading && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Suggestions</h3>
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(suggestion)}
                  className="block w-full text-left px-4 py-3 hover:bg-muted rounded-lg transition-colors"
                >
                  <Search size={16} className="inline mr-2 text-muted-foreground" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <SearchResultSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {results.length} results for "{query}"
              </p>
              <div className="space-y-2">
                {results.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => handleProductClick(product.id)}
                  >
                    <img
                      src={product.image_url || "/placeholder.svg"}
                      alt={product.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{product.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{product.categories?.name}</span>
                        {product.average_rating > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Star size={12} className="fill-yellow-400 text-yellow-400" />
                              {product.average_rating.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">₹{product.price}</div>
                      {product.stock > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(product);
                          }}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          Quick Add
                        </button>
                      ) : (
                        <span className="text-xs text-destructive">Out of stock</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {!isLoading && query && results.length === 0 && (
            <div className="text-center py-12">
              <Search size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// SEARCH TRIGGER BUTTON
// ============================================

interface SearchTriggerProps {
  onClick: () => void;
  className?: string;
}

export function SearchTrigger({ onClick, className = "" }: SearchTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 bg-muted rounded-xl text-muted-foreground hover:bg-muted/80 transition-colors w-full max-w-md",
        className
      )}
    >
      <Search size={18} />
      <span className="text-sm">Search products...</span>
      <kbd className="ml-auto hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  );
}
