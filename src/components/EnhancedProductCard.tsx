import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Plus, Minus, Heart, ShoppingBag, Check, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  images: ProductImage[] | string[];
  stock: number;
  category?: string;
  averageRating?: number;
}

interface EnhancedProductCardProps {
  product: Product;
  variant?: "default" | "compact" | "horizontal";
  showQuickAdd?: boolean;
  onProductClick?: (id: string) => void;
}

export function EnhancedProductCard({
  product,
  variant = "default",
  showQuickAdd = true,
  onProductClick
}: EnhancedProductCardProps) {
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const quantity = getItemQuantity(product.id);
  const favorited = isFavorite(product.id);
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock <= 3 && product.stock > 0;

  // Get primary image
  const images = product.images.map(img =>
    typeof img === "string" ? img : img.image_url
  );
  const primaryImage = images[0] || "/placeholder.svg";

  // Swipe handling for mobile
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);
  const rotateZ = useTransform(x, [-100, 0, 100], [-5, 0, 5]);

  const handleSwipeEnd = (_: any, info: PanInfo) => {
    if (isOutOfStock) return;

    if (info.offset.x > 80 && info.velocity.x > 0) {
      // Swipe right - add to cart
      if (!user) {
        navigate("/auth?mode=signin");
        return;
      }
      handleQuickAdd();
    } else if (info.offset.x < -80 && info.velocity.x < 0) {
      // Swipe left - toggle favorite
      toggleFavorite(product.id);
    }
  };

  const handleQuickAdd = () => {
    if (!user) {
      navigate("/auth?mode=signin");
      return;
    }
    if (isOutOfStock || quantity >= product.stock) return;

    setIsAdding(true);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }

    if (quantity === 0) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: primaryImage,
        stock: product.stock
      });
    } else {
      updateQuantity(product.id, quantity + 1);
    }

    setShowAddedFeedback(true);
    setTimeout(() => {
      setIsAdding(false);
      setShowAddedFeedback(false);
    }, 1000);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 0 && newQuantity <= product.stock) {
      updateQuantity(product.id, newQuantity);
      if (navigator.vibrate) navigator.vibrate(5);
    }
  };

  const handleImageNav = (direction: "prev" | "next") => {
    if (images.length <= 1) return;
    setCurrentImageIndex(prev =>
      direction === "next"
        ? (prev + 1) % images.length
        : (prev - 1 + images.length) % images.length
    );
  };

  // Compact variant (for search results, lists)
  if (variant === "compact") {
    return (
      <motion.div
        ref={cardRef}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onProductClick?.(product.id)}
        className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/50 transition-all cursor-pointer"
      >
        <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
          <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="text-[10px] font-bold text-destructive">OUT</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{product.name}</h4>
          <p className="text-lg font-bold text-primary">₹{product.price}</p>
        </div>

        {showQuickAdd && !isOutOfStock && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              handleQuickAdd();
            }}
            className="p-2 bg-primary text-primary-foreground rounded-full"
          >
            {quantity > 0 ? <Check size={18} /> : <Plus size={18} />}
          </motion.button>
        )}
      </motion.div>
    );
  }

  // Horizontal variant (for featured, deals)
  if (variant === "horizontal") {
    return (
      <motion.div
        ref={cardRef}
        whileHover={{ y: -4 }}
        className="flex gap-4 p-4 bg-card rounded-2xl border border-border min-w-[300px]"
      >
        <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
          <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
          {product.originalPrice && (
            <div className="absolute top-1 left-1 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
              {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold line-clamp-2">{product.name}</h4>
            {product.averageRating && product.averageRating > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                <span className="text-xs">{product.averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-primary">₹{product.price}</span>
              {product.originalPrice && (
                <span className="ml-2 text-sm line-through text-muted-foreground">₹{product.originalPrice}</span>
              )}
            </div>

            {quantity > 0 ? (
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleQuantityChange(-1)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <Minus size={14} />
                </motion.button>
                <motion.span
                  key={quantity}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="w-6 text-center font-bold"
                >
                  {quantity}
                </motion.span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= product.stock}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                >
                  <Plus size={14} />
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleQuickAdd}
                disabled={isOutOfStock}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium disabled:opacity-50"
              >
                {isOutOfStock ? "Out" : "Add"}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant (grid card)
  return (
    <motion.div
      ref={cardRef}
      style={{ x, opacity, rotateZ }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      onDragEnd={handleSwipeEnd}
      className="relative glass-card overflow-hidden group"
    >
      {/* Image container with gallery */}
      <div
        className="relative h-40 bg-muted/50 overflow-hidden cursor-pointer"
        onClick={() => onProductClick?.(product.id)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImageIndex}
            src={images[currentImageIndex] || primaryImage}
            alt={product.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </AnimatePresence>

        {/* Image navigation dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(i);
                }}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === currentImageIndex ? "bg-white w-3" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}

        {/* Image nav buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleImageNav("prev");
              }}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleImageNav("next");
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Favorite button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          className={cn(
            "absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm transition-all",
            favorited ? "bg-destructive/90 text-white" : "bg-background/80 hover:bg-background"
          )}
        >
          <Heart size={18} className={favorited ? "fill-current" : ""} />
        </motion.button>

        {/* Stock badge */}
        {isLowStock && (
          <div className="absolute top-2 left-2 bg-destructive/90 text-white px-2 py-1 text-xs font-bold rounded-lg animate-pulse">
            Only {product.stock} left!
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-destructive text-white px-4 py-2 font-bold uppercase rounded-lg rotate-[-5deg]">
              Out of Stock
            </span>
          </div>
        )}

        {/* Discount badge */}
        {product.originalPrice && (
          <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
          </div>
        )}

        {/* Added feedback overlay */}
        <AnimatePresence>
          {showAddedFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 bg-green-500/90 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="text-center text-white">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Check size={40} />
                </motion.div>
                <p className="font-bold mt-2">Added to cart!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3
          onClick={() => onProductClick?.(product.id)}
          className="font-bold text-lg leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
        >
          {product.name}
        </h3>

        {/* Rating */}
        {product.averageRating && product.averageRating > 0 && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                className={star <= Math.round(product.averageRating!) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
              />
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">₹{product.price}</span>
          {product.originalPrice && (
            <span className="text-sm line-through text-muted-foreground">₹{product.originalPrice}</span>
          )}
        </div>

        {/* Quick add / quantity controls */}
        {showQuickAdd && (
          <div className="pt-2">
            {quantity > 0 ? (
              <div className="flex items-center justify-between bg-muted rounded-xl p-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleQuantityChange(-1)}
                  className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm"
                >
                  <Minus size={18} />
                </motion.button>
                <motion.span
                  key={quantity}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="text-lg font-bold"
                >
                  {quantity}
                </motion.span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= product.stock}
                  className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm disabled:opacity-50"
                >
                  <Plus size={18} />
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleQuickAdd}
                disabled={isOutOfStock || isAdding}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                  isOutOfStock
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isAdding ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                  >
                    <ShoppingBag size={18} />
                  </motion.div>
                ) : (
                  <>
                    <Plus size={18} />
                    {isOutOfStock ? "Out of Stock" : (!user ? "Sign in to Buy" : "Add to Cart")}
                  </>
                )}
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Swipe hints (mobile) */}
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-green-500/20 to-transparent opacity-0 group-active:opacity-100 transition-opacity pointer-events-none flex items-center justify-start pl-2">
        <ShoppingBag className="text-green-500" size={24} />
      </div>
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-red-500/20 to-transparent opacity-0 group-active:opacity-100 transition-opacity pointer-events-none flex items-center justify-end pr-2">
        <Heart className="text-red-500" size={24} />
      </div>
    </motion.div>
  );
}

// ============================================
// FLOATING CART SUMMARY
// ============================================

interface FloatingCartSummaryProps {
  onCheckout: () => void;
}

export function FloatingCartSummary({ onCheckout }: FloatingCartSummaryProps) {
  const { items, subtotal } = useCart();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  if (itemCount === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-20 md:bottom-6 left-4 right-4 z-40"
    >
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCheckout}
        className="w-full bg-primary text-primary-foreground rounded-2xl p-4 shadow-lg shadow-primary/30 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag size={24} />
            <motion.span
              key={itemCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-white text-primary text-xs font-bold rounded-full flex items-center justify-center"
            >
              {itemCount}
            </motion.span>
          </div>
          <div className="text-left">
            <div className="text-sm opacity-80">{itemCount} items</div>
            <div className="font-bold">View Cart</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-80">Total</div>
          <motion.div
            key={subtotal}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-xl font-bold"
          >
            ₹{subtotal}
          </motion.div>
        </div>
      </motion.button>
    </motion.div>
  );
}
