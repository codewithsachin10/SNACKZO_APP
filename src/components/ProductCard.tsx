import { Plus, Minus, Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { ExpressDeliveryBadge } from "@/components/ExpressDeliveryBadge";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  stock: number;
  category: string;
  averageRating?: number;
  reviewCount?: number;
  groupId?: string | null;
}

const ProductCard = ({
  id,
  name,
  price,
  originalPrice,
  image,
  stock,
  category,
  averageRating = 0,
  reviewCount = 0,
  groupId
}: ProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const quantity = getItemQuantity(id);
  const favorited = isFavorite(id);

  const isLowStock = stock <= 3 && stock > 0;
  const isOutOfStock = stock === 0;

  const handleClick = () => {
    if (groupId) {
      navigate(`/products/${id}?group=${groupId}`);
    } else {
      navigate(`/products/${id}`);
    }
  };

  const handleAdd = () => {
    // If inside group mode, clicking + button should ideally open detail or handle add directly
    // Ideally user reviews item details before adding to group, so redirect to detail is safer
    if (groupId) {
      navigate(`/products/${id}?group=${groupId}`);
    } else {
      if (!user) {
        navigate("/auth?mode=signin");
        return;
      }
      if (!isOutOfStock && quantity < stock) {
        addToCart({ id, name, price, image, stock });
      }
    }
  };

  const handleRemove = () => {
    if (quantity > 0) {
      updateQuantity(id, quantity - 1);
    }
  };

  return (
    <div className="glass-card overflow-hidden group">
      {/* Image Container */}
      <div
        className="relative h-40 bg-muted/50 overflow-hidden cursor-pointer hover-inner-glow"
        onClick={handleClick}
      >
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(id);
          }}
          className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm transition-all ${favorited
            ? "bg-destructive/90 text-destructive-foreground"
            : "bg-background/80 hover:bg-background"
            }`}
        >
          <Heart
            size={18}
            className={favorited ? "fill-current" : ""}
          />
        </button>

        {/* Stock Badge */}
        {isLowStock && (
          <div className="absolute top-2 left-2 bg-destructive/90 text-destructive-foreground px-2 py-1 text-xs font-bold uppercase rounded-lg animate-pulse-soft">
            Only {stock} left!
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-4 py-2 font-bold uppercase rounded-lg rotate-[-5deg]">
              Out of Stock
            </span>
          </div>
        )}

        {/* Category Tag */}
        <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 text-xs font-medium uppercase rounded-lg border border-border">
          {category}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3
          onClick={handleClick}
          className="font-bold text-lg leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
        >
          {name}
        </h3>

        {/* Rating */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={12}
                  className={star <= Math.round(averageRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl font-bold text-primary">₹{price}</span>
          {originalPrice && (
            <span className="text-sm line-through text-muted-foreground">
              ₹{originalPrice}
            </span>
          )}
          {originalPrice && (
            <span className="bg-lime/20 text-lime border border-lime/30 px-2 py-0.5 text-xs font-bold rounded-full">
              {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
            </span>
          )}
          {/* Express Delivery Badge - Show for products above ₹100 */}
          {price >= 100 && !isOutOfStock && (
            <div className="w-full mt-1">
              <ExpressDeliveryBadge variant="compact" />
            </div>
          )}
        </div>

        {/* Add to Cart */}
        <div className="flex items-center gap-2">
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={`w-full py-3 rounded-xl font-bold transition-all ${isOutOfStock
                ? "bg-muted cursor-not-allowed opacity-50"
                : "neon-btn bg-primary hover:bg-primary/90 text-primary-foreground"
                }`}
            >
              {isOutOfStock ? "Sold Out" : (!user ? "Sign in to Buy" : "Add to Cart")}
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={handleRemove}
                className="glass-card p-3 hover:bg-muted/50 transition-colors"
              >
                <Minus size={18} />
              </button>
              <div className="flex-1 bg-primary/20 border border-primary/30 py-2 text-center font-bold text-lg rounded-xl text-primary">
                {quantity}
              </div>
              <button
                onClick={handleAdd}
                disabled={quantity >= stock}
                className={`p-3 rounded-xl transition-all ${quantity >= stock
                  ? "bg-muted cursor-not-allowed opacity-50"
                  : "neon-btn bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
