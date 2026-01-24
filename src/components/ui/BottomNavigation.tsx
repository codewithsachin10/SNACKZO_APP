import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Search, ShoppingBag, User, Heart, Grid3X3 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  requiresAuth?: boolean;
  badge?: number | null;
}

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useCart();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const navItems: NavItem[] = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "search", label: "Search", icon: Search, path: "/products" },
    { id: "categories", label: "Browse", icon: Grid3X3, path: "/products?view=categories" },
    { id: "orders", label: "Orders", icon: ShoppingBag, path: "/orders", requiresAuth: true, badge: null },
    { id: "profile", label: "Profile", icon: User, path: user ? "/profile" : "/auth" },
  ];

  // Determine active tab based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path === "/") setActiveTab("home");
    else if (path === "/products") setActiveTab("search");
    else if (path === "/orders") setActiveTab("orders");
    else if (path === "/profile" || path === "/auth") setActiveTab("profile");
    else if (path === "/favorites") setActiveTab("favorites");
  }, [location.pathname]);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleNavClick = (item: NavItem) => {
    if (item.requiresAuth && !user) {
      navigate("/auth");
      return;
    }
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(5);
    }
    
    setActiveTab(item.id);
    navigate(item.path);
  };

  // Don't show on certain pages
  const hiddenPaths = ["/checkout", "/auth", "/complete-profile", "/admin", "/runner"];
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        >
          {/* Gradient fade effect */}
          <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          
          {/* Navigation bar */}
          <div className="bg-background/90 backdrop-blur-xl border-t border-border/50 px-2 pb-safe">
            <div className="flex items-center justify-around h-16">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-2xl transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    whileTap={{ scale: 0.9 }}
                  >
                    {/* Active background */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-primary/10 rounded-2xl"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    
                    {/* Icon with badge */}
                    <div className="relative">
                      <Icon 
                        size={22} 
                        className={cn(
                          "transition-all",
                          isActive && "scale-110"
                        )}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      
                      {/* Cart badge */}
                      {item.id === "orders" && cartCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
                        >
                          {cartCount > 9 ? "9+" : cartCount}
                        </motion.div>
                      )}
                    </div>
                    
                    {/* Label */}
                    <span className={cn(
                      "text-[10px] font-medium transition-all",
                      isActive ? "opacity-100" : "opacity-70"
                    )}>
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

// ============================================
// FLOATING ACTION BUTTON (Optional Cart Button)
// ============================================

export function FloatingCartButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, subtotal } = useCart();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Hide on scroll down
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY <= lastScrollY || currentScrollY < 100);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Don't show on certain pages or if cart is empty
  const hiddenPaths = ["/checkout", "/auth", "/admin", "/runner", "/orders"];
  if (hiddenPaths.some(p => location.pathname.startsWith(p)) || cartCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ y: 100, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/checkout")}
          className="fixed bottom-20 md:bottom-6 right-4 z-40 flex items-center gap-3 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-lg shadow-primary/30"
        >
          <div className="relative">
            <ShoppingBag size={20} />
            <motion.div
              key={cartCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 h-5 w-5 bg-background text-foreground text-xs font-bold rounded-full flex items-center justify-center"
            >
              {cartCount}
            </motion.div>
          </div>
          <div className="text-left">
            <div className="text-[10px] opacity-80">View Cart</div>
            <div className="text-sm font-bold">₹{subtotal}</div>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
