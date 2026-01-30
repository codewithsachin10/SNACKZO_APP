
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronRight, ArrowRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface QuickCartProps {
    hasBottomNav?: boolean;
}

export function QuickCart({ hasBottomNav = true }: QuickCartProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { items, subtotal } = useCart();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

    // Hide on scroll down, show on scroll up (optional, currently enabled for consistency)
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            // Show if scrolling up or near top
            setIsVisible(currentScrollY <= lastScrollY || currentScrollY < 100);
            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    // Don't show on checkout, auth, admin pages or if cart is empty
    const hiddenPaths = ["/checkout", "/auth", "/admin", "/runner"];
    if (hiddenPaths.some(p => location.pathname.startsWith(p)) || cartCount === 0) {
        return null;
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={cn(
                        "fixed left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50 transition-all duration-300",
                        hasBottomNav ? "bottom-[80px] md:bottom-6" : "bottom-6"
                    )}
                >
                    <div
                        onClick={() => navigate("/checkout")}
                        className="group cursor-pointer relative overflow-hidden bg-primary text-primary-foreground backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl shadow-primary/20 p-4"
                    >
                        {/* Background effects */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-500" />

                        <div className="relative flex items-center justify-between">
                            {/* Left Side: Count & Total */}
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="bg-white/20 p-2 rounded-xl">
                                        <ShoppingBag size={20} className="text-white" />
                                    </div>
                                    <motion.div
                                        key={cartCount}
                                        initial={{ scale: 1.5 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-black text-xs font-bold rounded-full flex items-center justify-center border-2 border-primary"
                                    >
                                        {cartCount}
                                    </motion.div>
                                </div>

                                <div className="flex flex-col">
                                    <span className="text-xs text-white/80 font-medium tracking-wide uppercase">
                                        Total
                                    </span>
                                    <span className="text-lg font-bold">
                                        ₹{subtotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Right Side: CTA */}
                            <div className="flex items-center gap-2 pr-2">
                                <span className="text-sm font-semibold">
                                    View Cart
                                </span>
                                <div className="bg-white/20 rounded-full p-1 group-hover:bg-white text-primary transition-colors duration-300">
                                    <ArrowRight size={16} className="text-white group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        </div>

                        {/* Progress bar indication (optional, e.g. for free delivery) could go here */}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
