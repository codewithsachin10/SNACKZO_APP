import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
// import { useFeatures } from "@/contexts/FeatureContext"; // Temporarily disabled
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductReviews from "@/components/ProductReviews";
import { SmartRecommendations } from "@/components/SmartRecommendations";
import { ArrowLeft, Heart, Plus, Minus, Star, ShoppingCart, Users, Bell, Share2 } from "lucide-react";
import { toast } from "sonner";

// Premium Components
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { PriceAlertButton, PriceDropBadge, PriceHistoryChart } from "@/components/PriceAlerts";
import { ShareProductButton } from "@/components/SocialSharing";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { ProductCardSkeleton } from "@/components/ui/Skeletons";

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
  categories: { name: string; emoji: string } | null;
}

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group");

  const { user } = useAuth();
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  // Feature flags - default to enabled since FeatureProvider is disabled
  const isFeatureEnabled = (feature: string) => true;

  const [product, setProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToGroup, setIsAddingToGroup] = useState(false);
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchProductImages();
    }
  }, [productId]);

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId]);

  const fetchGroupDetails = async () => {
    const { data } = await supabase
      .from("group_orders" as any)
      .select("name")
      .eq("id", groupId)
      .single();
    if (data) setGroupName((data as any).name);
  };

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name, emoji)")
      .eq("id", productId)
      .single();

    if (!error && data) {
      setProduct(data as unknown as Product);
    }
    setIsLoading(false);
  };

  const fetchProductImages = async () => {
    try {
      const { data } = await (supabase.from as any)('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (data && data.length > 0) {
        setProductImages(data);
      }
    } catch (err) {
      // Table might not exist yet, use single image fallback
      console.log('Product images table not available');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <ProductCardSkeleton />
            <div className="space-y-4">
              <div className="h-8 bg-muted animate-pulse rounded w-1/4" />
              <div className="h-12 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <button
            onClick={() => navigate("/products")}
            className="neu-btn bg-primary text-primary-foreground px-6 py-3"
          >
            Browse Products
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const quantity = getItemQuantity(product.id);
  const favorited = isFavorite(product.id);
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock <= 3 && product.stock > 0;
  const discount = product.original_price && product.price < product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const handleAdd = () => {
    if (!user) {
      navigate("/auth?mode=signin");
      return;
    }
    if (!isOutOfStock && quantity < product.stock) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url || "",
        stock: product.stock
      });
    }
  };

  const handleAddToGroup = async () => {
    if (!user || !groupId) return;
    setIsAddingToGroup(true);

    try {
      // 1. Get Member ID
      const { data: memberData, error: memberError } = await supabase
        .from("group_order_members" as any)
        .select("id")
        .eq("group_order_id", groupId)
        .eq("user_id", user.id)
        .single();

      if (memberError || !memberData) {
        toast.error("You are not a member of this group");
        return;
      }

      // 2. Add Item
      const { error: insertError } = await supabase
        .from("group_order_items" as any)
        .insert({
          group_order_id: groupId,
          member_id: (memberData as any).id,
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          price: product.price
        });

      if (insertError) throw insertError;

      toast.success(`Added ${product.name} to ${groupName}`);
      navigate(`/group-order/${groupId}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to add to group order");
    } finally {
      setIsAddingToGroup(false);
    }
  };

  const handleRemove = () => {
    if (quantity > 0) {
      updateQuantity(product.id, quantity - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image Gallery */}
          {isFeatureEnabled('product_gallery') && productImages.length > 0 ? (
            <div className="relative">
              <ProductImageGallery
                images={productImages.map(img => img.image_url)}
                productName={product.name}
              />

              {/* Favorite Button Overlay */}
              <button
                onClick={() => toggleFavorite(product.id)}
                className={`absolute top-4 right-4 z-10 p-3 rounded-full backdrop-blur-sm transition-all ${favorited
                  ? "bg-destructive/90 text-destructive-foreground"
                  : "bg-background/80 hover:bg-background"
                  }`}
              >
                <Heart size={24} className={favorited ? "fill-current" : ""} />
              </button>

              {/* Discount Badge */}
              {discount > 0 && (
                <div className="absolute top-4 left-4 z-10 bg-destructive text-destructive-foreground px-3 py-1 font-bold rounded-lg">
                  {discount}% OFF
                </div>
              )}

              {/* Price Drop Badge */}
              {isFeatureEnabled('price_alerts') && discount > 0 && (
                <div className="absolute bottom-4 left-4 z-10">
                  <PriceDropBadge productId={product.id} currentPrice={product.price} />
                </div>
              )}
            </div>
          ) : (
            // Fallback to single image
            <div className="relative hover-inner-glow rounded-2xl overflow-hidden">
              <img
                src={product.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop"}
                alt={product.name}
                className="w-full h-[400px] object-cover rounded-2xl border-3 border-foreground"
              />

              {/* Favorite Button */}
              <button
                onClick={() => toggleFavorite(product.id)}
                className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-sm transition-all ${favorited
                  ? "bg-destructive/90 text-destructive-foreground"
                  : "bg-background/80 hover:bg-background"
                  }`}
              >
                <Heart size={24} className={favorited ? "fill-current" : ""} />
              </button>

              {/* Discount Badge */}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-3 py-1 font-bold rounded-lg">
                  {discount}% OFF
                </div>
              )}

              {/* Price Drop Badge */}
              {isFeatureEnabled('price_alerts') && discount > 0 && (
                <div className="absolute bottom-4 left-4">
                  <PriceDropBadge productId={product.id} currentPrice={product.price} />
                </div>
              )}

              {/* Out of Stock Overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                  <span className="bg-destructive text-destructive-foreground px-6 py-3 font-bold uppercase text-xl rounded-lg rotate-[-5deg]">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category */}
            {product.categories && (
              <span className="inline-block bg-secondary text-secondary-foreground px-3 py-1 text-sm font-medium rounded-lg">
                {product.categories.emoji} {product.categories.name}
              </span>
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    className={star <= Math.round(product.average_rating || 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"}
                  />
                ))}
              </div>
              <span className="text-muted-foreground">
                {product.average_rating || 0} ({product.review_count || 0} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold text-primary">₹{product.price}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-xl line-through text-muted-foreground">
                  ₹{product.original_price}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground">{product.description}</p>
            )}

            {/* Price Alert & Share Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {isFeatureEnabled('price_alerts') && (
                <PriceAlertButton productId={product.id} currentPrice={product.price} />
              )}
              {isFeatureEnabled('social_sharing') && (
                <ShareProductButton
                  productUrl={`${window.location.origin}/products/${product.id}`}
                  productName={product.name}
                  productImage={product.image_url || undefined}
                />
              )}
              {isFeatureEnabled('price_alerts') && (
                <button
                  onClick={() => {
                    if (!user) {
                      navigate("/auth?mode=signin");
                      return;
                    }
                    setShowPriceHistory(!showPriceHistory);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 rounded-lg transition-colors flex items-center gap-2"
                >
                  📊 {showPriceHistory ? 'Hide' : 'View'} Price History
                </button>
              )}
            </div>

            {/* Price History Chart */}
            {showPriceHistory && isFeatureEnabled('price_alerts') && (
              <div className="animate-in fade-in slide-in-from-top-4">
                <PriceHistoryChart productId={product.id} />
              </div>
            )}

            {/* Stock Status */}
            {isLowStock && (
              <div className="bg-destructive/20 text-destructive px-4 py-2 rounded-lg font-medium">
                ⚠️ Only {product.stock} left in stock!
              </div>
            )}

            {/* Group Order Banner */}
            {groupId && groupName && (
              <div className="bg-lime/20 border-2 border-lime p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <Users className="text-lime-700" size={24} />
                <div>
                  <p className="font-bold text-lime-900">Adding to Group Order</p>
                  <p className="text-sm text-lime-800">{groupName}</p>
                </div>
              </div>
            )}

            {/* Add to Cart / Group */}
            <div className="flex items-center gap-4">
              {groupId ? (
                <button
                  onClick={handleAddToGroup}
                  disabled={isOutOfStock || isAddingToGroup}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 ${isOutOfStock || isAddingToGroup
                    ? "bg-muted cursor-not-allowed opacity-50"
                    : "neu-btn bg-lime hover:bg-lime/90 text-lime-foreground"
                    }`}
                >
                  <Users size={24} />
                  {isAddingToGroup ? "Adding..." : "Add to Group Order"}
                </button>
              ) : (
                <>
                  {quantity === 0 ? (
                    <button
                      onClick={handleAdd}
                      disabled={isOutOfStock}
                      className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 ${isOutOfStock
                        ? "bg-muted cursor-not-allowed opacity-50"
                        : "neon-btn bg-primary hover:bg-primary/90 text-primary-foreground"
                        }`}
                    >
                      <ShoppingCart size={24} />
                      {isOutOfStock ? "Sold Out" : (!user ? "Sign in to Buy" : "Add to Cart")}
                    </button>
                  ) : (
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={handleRemove}
                        className="glass-card p-4 hover:bg-muted/50 transition-colors"
                      >
                        <Minus size={24} />
                      </button>
                      <div className="flex-1 bg-primary/20 border-3 border-primary py-3 text-center font-bold text-2xl rounded-xl text-primary">
                        {quantity}
                      </div>
                      <button
                        onClick={handleAdd}
                        disabled={quantity >= product.stock}
                        className={`p-4 rounded-xl transition-all ${quantity >= product.stock
                          ? "bg-muted cursor-not-allowed opacity-50"
                          : "neon-btn bg-primary hover:bg-primary/90 text-primary-foreground"
                          }`}
                      >
                        <Plus size={24} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {!groupId && quantity > 0 && (
              <button
                onClick={() => navigate("/checkout")}
                className="w-full neu-btn bg-lime text-lime-foreground py-4 font-bold text-lg"
              >
                Proceed to Checkout • ₹{product.price * quantity}
              </button>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <ProductReviews productId={product.id} productName={product.name} />
        </div>

        {/* Smart Recommendations */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
          <SmartRecommendations
            currentProductId={product.id}
            currentCategory={product.categories?.name}
          />
        </div>
      </main>

      <Footer />


    </div>
  );
};

export default ProductDetail;
