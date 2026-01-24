import { useState, useEffect, useCallback } from 'react';
import { Timer, Zap, Flame, Percent, ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';

interface FlashSale {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  products: FlashSaleProduct[];
}

interface FlashSaleProduct {
  id: string;
  name: string;
  price: number;
  discounted_price: number;
  image_url: string | null;
  stock: number;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endDate).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (timeLeft.total <= 0) {
    return (
      <div className="text-red-500 font-bold animate-pulse">
        Sale Ended!
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Timer className="h-5 w-5 text-red-500 animate-pulse" />
      <div className="flex items-center gap-1 font-mono text-lg font-bold">
        <span className="bg-red-500/10 text-red-600 px-2 py-1 rounded">
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="text-red-500">:</span>
        <span className="bg-red-500/10 text-red-600 px-2 py-1 rounded">
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="text-red-500">:</span>
        <span className="bg-red-500/10 text-red-600 px-2 py-1 rounded">
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

export function FlashSalesTimer() {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();

  const fetchFlashSales = useCallback(async () => {
    try {
      const now = new Date().toISOString();

      // Get active flash sales from discounts table
      const { data: discounts } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .lte('valid_from', now)
        .gte('valid_until', now)
        .order('valid_until', { ascending: true });

      if (discounts && discounts.length > 0) {
        // For each discount, get associated products
        const salesWithProducts = await Promise.all(
          discounts.map(async (discount) => {
            // Get products that might be on flash sale
            const { data: products } = await supabase
              .from('products')
              .select('id, name, price, image_url, stock')
              .eq('is_available', true)
              .limit(4);

            const discountedProducts: FlashSaleProduct[] = (products || []).map((product) => ({
              id: product.id,
              name: product.name,
              price: product.price,
              image_url: product.image_url,
              stock: product.stock,
              discounted_price: discount.discount_type === 'percentage'
                ? product.price * (1 - discount.discount_value / 100)
                : Math.max(0, product.price - discount.discount_value),
            }));

            return {
              id: discount.id,
              name: discount.code || 'Flash Sale',
              discount_type: discount.discount_type as 'percentage' | 'fixed',
              discount_value: discount.discount_value,
              valid_from: discount.valid_from,
              valid_until: discount.valid_until,
              products: discountedProducts,
            };
          })
        );

        setFlashSales(salesWithProducts);
      } else {
        // If no active discounts, show demo flash sale
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price, image_url, stock')
          .eq('is_available', true)
          .limit(4);

        if (products && products.length > 0) {
          const demoSale: FlashSale = {
            id: 'demo',
            name: 'FLASH20',
            discount_type: 'percentage',
            discount_value: 20,
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
            products: products.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              image_url: p.image_url,
              stock: p.stock,
              discounted_price: p.price * 0.8,
            })),
          };
          setFlashSales([demoSale]);
        }
      }
    } catch (error) {
      console.error('Error fetching flash sales:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlashSales();
  }, [fetchFlashSales]);

  const handleAddToCart = (product: FlashSaleProduct) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.discounted_price,
      image: product.image_url || '',
      stock: product.stock,
    });
    toast({
      title: 'Added to cart! 🎉',
      description: `${product.name} at flash sale price!`,
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-red-500 to-orange-500 border-0">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </CardContent>
      </Card>
    );
  }

  if (flashSales.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {flashSales.map((sale) => (
        <Card key={sale.id} className="bg-gradient-to-r from-red-500 to-orange-500 border-0 overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Flame className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Flash Sale
                  </h3>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    <Percent className="h-3 w-3 mr-1" />
                    {sale.discount_value}% OFF
                  </Badge>
                </div>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <p className="text-white/70 text-xs mb-1">Ends in</p>
                <CountdownTimer endDate={sale.valid_until} />
              </div>
            </div>

            {/* Products */}
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sale.products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg p-3 shadow-lg transform transition-transform hover:scale-105"
                  >
                    {product.image_url && (
                      <div className="aspect-square mb-2 relative">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                        <Badge className="absolute top-1 left-1 bg-red-500">
                          -{sale.discount_value}%
                        </Badge>
                      </div>
                    )}
                    <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-red-500 font-bold">₹{product.discounted_price.toFixed(0)}</span>
                      <span className="text-muted-foreground line-through text-sm">₹{product.price}</span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2 bg-red-500 hover:bg-red-600"
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock <= 0}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      {product.stock <= 0 ? 'Sold Out' : 'Add'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
