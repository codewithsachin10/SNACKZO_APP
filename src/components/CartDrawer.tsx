import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartDrawer = ({ isOpen, onClose }: CartDrawerProps) => {
  const { items, subtotal, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  
  const deliveryFee = 10;
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    onClose();
    navigate("/checkout");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="text-xl font-bold">Your Cart ({items.length})</h2>
          <button
            onClick={onClose}
            className="glass-card p-2 hover:bg-muted/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <span className="text-6xl mb-4 block">🛒</span>
              <h3 className="font-bold text-lg mb-2">Cart is Empty</h3>
              <p className="text-muted-foreground text-sm mb-4">Add some snacks to get started!</p>
              <button
                onClick={() => {
                  onClose();
                  navigate("/products");
                }}
                className="neon-btn bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-xl"
              >
                Browse Products
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="glass-card p-3 flex gap-3"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-sm line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="font-bold text-primary">₹{item.price}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="glass-card p-1 hover:bg-muted/50 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="glass-card p-1 hover:bg-muted/50 transition-colors disabled:opacity-50"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="ml-auto p-1 text-destructive hover:bg-destructive/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="p-4 border-t border-border bg-muted/30 space-y-3">
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Delivery (Room)</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between font-bold text-xl border-t border-border pt-3">
                <span>Total</span>
                <span className="text-primary">₹{total}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="neon-btn bg-lime hover:bg-lime/90 text-lime-foreground w-full py-4 text-lg rounded-xl mt-3"
              >
                Checkout →
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
