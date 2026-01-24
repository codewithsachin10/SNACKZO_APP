import { useState, useEffect } from "react";
import { RefreshCw, Plus, Sparkles, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ReorderSuggestion {
  product_id: string;
  product_name: string;
  product_price: number;
  product_image: string | null;
  times_ordered: number;
  days_since_last_order: number;
  suggestion_score: number;
}

interface ReorderSuggestionsProps {
  limit?: number;
  showTitle?: boolean;
  variant?: "horizontal" | "vertical" | "compact";
}

export const ReorderSuggestions = ({
  limit = 5,
  showTitle = true,
  variant = "horizontal"
}: ReorderSuggestionsProps) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  const fetchSuggestions = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase.rpc as any)('get_reorder_suggestions', {
        p_user_id: user.id,
        p_limit: limit
      });

      if (error) throw error;
      setSuggestions((data as ReorderSuggestion[]) || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // Fallback: fetch from recent orders
      await fetchFallbackSuggestions();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFallbackSuggestions = async () => {
    if (!user) return;

    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!orders || orders.length === 0) return;

    const orderIds = orders.map(o => o.id);
    
    const { data: items } = await supabase
      .from('order_items')
      .select(`
        product_id,
        product_name,
        price,
        products (
          id,
          name,
          price,
          image_url,
          is_available,
          stock
        )
      `)
      .in('order_id', orderIds);

    if (!items) return;

    // Count product occurrences
    const productCounts = new Map<string, {
      product: any;
      count: number;
    }>();

    items.forEach(item => {
      const product = item.products;
      if (product && product.is_available && product.stock > 0) {
        const existing = productCounts.get(product.id);
        if (existing) {
          existing.count++;
        } else {
          productCounts.set(product.id, { product, count: 1 });
        }
      }
    });

    // Convert to array and sort by count
    const sortedSuggestions = Array.from(productCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ product, count }) => ({
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_image: product.image_url,
        times_ordered: count,
        days_since_last_order: 0,
        suggestion_score: count * 10
      }));

    setSuggestions(sortedSuggestions);
  };

  const handleAddToCart = async (suggestion: ReorderSuggestion) => {
    setAddingId(suggestion.product_id);

    try {
      // Fetch fresh product data
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', suggestion.product_id)
        .single();

      if (error || !product) {
        toast.error('Product not found');
        return;
      }

      if (!product.is_available || product.stock === 0) {
        toast.error('Product is currently unavailable');
        return;
      }

      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url || '',
        stock: product.stock
      });

      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-48 mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-32 h-40 bg-muted rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null; // Don't show anything if no suggestions
  }

  // Compact variant for sidebar or small spaces
  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {showTitle && (
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            Order Again
          </h3>
        )}
        {suggestions.slice(0, 3).map((suggestion) => (
          <button
            key={suggestion.product_id}
            onClick={() => handleAddToCart(suggestion)}
            disabled={addingId === suggestion.product_id}
            className="w-full flex items-center gap-2 p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            {suggestion.product_image && (
              <img
                src={suggestion.product_image}
                alt={suggestion.product_name}
                className="w-8 h-8 rounded object-cover"
              />
            )}
            <div className="flex-1 text-left">
              <p className="text-sm font-medium truncate">{suggestion.product_name}</p>
              <p className="text-xs text-muted-foreground">₹{suggestion.product_price}</p>
            </div>
            {addingId === suggestion.product_id ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
          </button>
        ))}
      </div>
    );
  }

  // Vertical variant for dedicated section
  if (variant === "vertical") {
    return (
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles size={20} className="text-amber-400" />
              Order Again
            </h3>
            <span className="text-sm text-muted-foreground">
              Based on your history
            </span>
          </div>
        )}
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.product_id}
              className="neu-card bg-card p-3 flex items-center gap-4"
            >
              {suggestion.product_image ? (
                <img
                  src={suggestion.product_image}
                  alt={suggestion.product_name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                  <RefreshCw size={24} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-bold">{suggestion.product_name}</h4>
                <p className="text-lg font-bold text-secondary">
                  ₹{suggestion.product_price}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    Ordered {suggestion.times_ordered}x
                  </span>
                  {suggestion.days_since_last_order > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {suggestion.days_since_last_order}d ago
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleAddToCart(suggestion)}
                disabled={addingId === suggestion.product_id}
                className="neu-btn bg-secondary text-secondary-foreground p-3 disabled:opacity-50"
              >
                {addingId === suggestion.product_id ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <Plus size={20} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default horizontal scrolling variant
  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" />
            Order Again
          </h3>
          <span className="text-sm text-muted-foreground">
            Your favorites
          </span>
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.product_id}
            className="neu-card bg-card p-3 min-w-[140px] max-w-[140px] flex-shrink-0"
          >
            {suggestion.product_image ? (
              <img
                src={suggestion.product_image}
                alt={suggestion.product_name}
                className="w-full h-24 rounded-lg object-cover mb-2"
              />
            ) : (
              <div className="w-full h-24 rounded-lg bg-muted flex items-center justify-center mb-2">
                <RefreshCw size={32} className="text-muted-foreground" />
              </div>
            )}
            <h4 className="font-bold text-sm truncate">{suggestion.product_name}</h4>
            <div className="flex items-center justify-between mt-1">
              <span className="font-bold text-secondary">₹{suggestion.product_price}</span>
              <span className="text-xs text-muted-foreground">
                {suggestion.times_ordered}x
              </span>
            </div>
            <button
              onClick={() => handleAddToCart(suggestion)}
              disabled={addingId === suggestion.product_id}
              className="w-full mt-2 neu-btn bg-secondary text-secondary-foreground py-2 text-sm flex items-center justify-center gap-1 disabled:opacity-50"
            >
              {addingId === suggestion.product_id ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <>
                  <Plus size={14} />
                  Add
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Quick reorder widget for homepage
export const QuickReorderWidget = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="neu-card bg-gradient-to-r from-secondary/20 to-lime/20 p-4">
      <ReorderSuggestions limit={4} variant="horizontal" />
    </div>
  );
};
