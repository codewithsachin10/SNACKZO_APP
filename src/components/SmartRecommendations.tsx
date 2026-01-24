import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Heart, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_id: string | null;
}

interface RecommendationSection {
  title: string;
  icon: React.ReactNode;
  products: Product[];
  type: 'personalized' | 'trending' | 'recent' | 'category';
}

export function SmartRecommendations({ 
  currentProductId,
  currentCategory,
  limit = 4 
}: { 
  currentProductId?: string;
  currentCategory?: string;
  limit?: number;
}) {
  const { user } = useAuth();
  const [sections, setSections] = useState<RecommendationSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecommendations = useCallback(async () => {
    try {
      const recommendationSections: RecommendationSection[] = [];

      // Get all categories for mapping
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name');
      
      const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

      // 1. Similar products in the same category (by category_id)
      if (currentCategory) {
        // Find category id by name
        const categoryId = categories?.find(c => c.name === currentCategory)?.id;
        
        if (categoryId) {
          const { data: categoryProducts } = await supabase
            .from('products')
            .select('id, name, price, image_url, category_id')
            .eq('category_id', categoryId)
            .eq('is_available', true)
            .neq('id', currentProductId || '')
            .limit(limit);

          if (categoryProducts && categoryProducts.length > 0) {
            recommendationSections.push({
              title: 'Similar Items',
              icon: <Sparkles className="h-5 w-5 text-purple-500" />,
              products: categoryProducts,
              type: 'category',
            });
          }
        }
      }

      // 2. Trending products (most recently added)
      const { data: trendingProducts } = await supabase
        .from('products')
        .select('id, name, price, image_url, category_id')
        .eq('is_available', true)
        .neq('id', currentProductId || '')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (trendingProducts && trendingProducts.length > 0) {
        recommendationSections.push({
          title: 'Trending Now',
          icon: <TrendingUp className="h-5 w-5 text-green-500" />,
          products: trendingProducts,
          type: 'trending',
        });
      }

      // 3. Personalized recommendations based on order history
      if (user) {
        // Get products from past orders
        const { data: orders } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (orders && orders.length > 0) {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id')
            .in('order_id', orders.map((o) => o.id))
            .limit(10);

          if (orderItems && orderItems.length > 0) {
            // Get the products from order items to find their categories
            const productIds = orderItems.map(item => item.product_id);
            const { data: orderedProducts } = await supabase
              .from('products')
              .select('category_id')
              .in('id', productIds);

            if (orderedProducts && orderedProducts.length > 0) {
              const orderCategories = [...new Set(orderedProducts.map(p => p.category_id).filter(Boolean))];

              if (orderCategories.length > 0) {
                const { data: historyProducts } = await supabase
                  .from('products')
                  .select('id, name, price, image_url, category_id')
                  .in('category_id', orderCategories as string[])
                  .eq('is_available', true)
                  .neq('id', currentProductId || '')
                  .limit(limit);

                if (historyProducts && historyProducts.length > 0) {
                  recommendationSections.push({
                    title: 'Based on Your Orders',
                    icon: <Clock className="h-5 w-5 text-blue-500" />,
                    products: historyProducts,
                    type: 'recent',
                  });
                }
              }
            }
          }
        }
      }

      setSections(recommendationSections);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentProductId, currentCategory, limit]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {sections.map((section, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {section.icon}
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {section.products.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="group"
                >
                  <div className="bg-muted/30 rounded-lg p-3 transition-all group-hover:shadow-md group-hover:bg-muted/50">
                    {product.image_url ? (
                      <div className="aspect-square mb-2 overflow-hidden rounded-md">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square mb-2 bg-muted rounded-md flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <h4 className="font-medium text-sm truncate group-hover:text-primary">
                      {product.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-primary">₹{product.price}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
