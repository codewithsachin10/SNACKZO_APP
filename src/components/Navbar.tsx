import { ShoppingCart, Menu, User, LogOut, LayoutDashboard, Package, ChevronDown, Truck, UserPlus, Wallet, Heart, Users, Repeat, Trophy, MessageCircle, Settings, Gift, HelpCircle, MapPin, Zap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import StoreStatus from "./StoreStatus";
import CartDrawer from "./CartDrawer";
import AddressSelectorModal from "./AddressSelectorModal";
import { NotificationCenter } from "./NotificationCenter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Navbar = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleLoginOption = (type: "user" | "runner", mode: "signin" | "signup") => {
    setIsLoginDropdownOpen(false);
    if (type === "user") {
      navigate(`/auth?mode=${mode}`);
    } else {
      navigate(`/runner?mode=${mode}`);
    }
  };

  const handleAddressClick = () => {
    if (!user) {
      // If not logged in, prompt login
      handleLoginOption("user", "signin");
    } else {
      setIsAddressModalOpen(true);
    }
  };

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* Brand & Location Selector */}
          <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
            <div
              id="nav-brand"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 cursor-pointer shrink-0"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap size={20} className="text-white fill-current" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-black leading-none tracking-tighter italic">SNACKZO</h1>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest text-primary">INSTANT DELIVERY</p>
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="h-8 w-[1px] bg-border mx-2 hidden md:block"></div>

            {/* Quick Commerce Address Selector */}
            <div
              id="nav-address"
              onClick={handleAddressClick}
              className="flex flex-col justify-center cursor-pointer hover:bg-muted/50 p-1.5 rounded-lg transition-colors max-w-[160px] md:max-w-xs"
            >
              <div className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-primary uppercase tracking-wider">
                <MapPin size={10} className="fill-primary" />
                Delivering to
                <ChevronDown size={12} />
              </div>
              <div className="text-xs md:text-sm font-semibold truncate text-foreground pr-2">
                {profile?.hostel_block ? `${profile.hostel_block}${profile.room_number ? `, ${profile.room_number}` : ''}` : "Select Location"}
              </div>
            </div>
          </div>

          {/* Store Status */}
          <div className="hidden md:block">
            <StoreStatus />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <button
              id="nav-cart"
              disabled={!user}
              onClick={() => setIsCartOpen(true)}
              className={`neon-btn bg-secondary/20 hover:bg-secondary/30 text-secondary px-4 py-2 rounded-xl flex items-center gap-2 relative border border-secondary/30 ${!user ? "opacity-50 cursor-not-allowed grayscale" : ""}`}
            >
              <ShoppingCart size={20} />
              <span className="hidden sm:inline font-medium">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full glow-accent">
                  {itemCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="glass-card px-3 py-2 flex items-center gap-2 hover:border-primary/50 transition-colors"
                >
                  <User size={20} className="text-primary" />
                  <span className="hidden md:inline text-sm font-medium max-w-[100px] truncate">
                    {profile?.full_name || "Account"}
                  </span>
                </button>

                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-52 glass-card overflow-hidden z-50">
                      <div className="p-3 border-b border-border bg-muted/30">
                        <p className="font-bold text-sm truncate">{profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile?.hostel_block}{profile?.room_number ? `, ${profile.room_number}` : ''}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Wallet size={12} className="text-lime" />
                          <span className="text-xs font-bold text-lime">₹{profile?.wallet_balance || 0}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/wallet");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <Wallet size={16} className="text-lime" />
                        My Wallet
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/profile");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <User size={16} className="text-primary" />
                        My Profile
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/settings");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <Settings size={16} className="text-muted-foreground" />
                        Settings
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/orders");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <Package size={16} className="text-secondary" />
                        My Orders
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/favorites");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <Heart size={16} className="text-destructive" />
                        Favorites
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/group-order");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <Users size={16} className="text-cyan" />
                        Group Orders
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/subscriptions");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <Repeat size={16} className="text-purple-500" />
                        Subscriptions
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/achievements");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <Trophy size={16} className="text-yellow-500" />
                        Achievements
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          // Simple toast for demo
                          import("sonner").then(m => m.toast.success("Referral Link Copied! Share with friends to earn ₹50."));
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <Gift size={16} className="text-pink-500" />
                        Refer & Earn
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/support");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <HelpCircle size={16} className="text-orange-500" />
                        Help & Support
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/messages");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                      >
                        <MessageCircle size={16} className="text-blue-500" />
                        Messages
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            navigate("/admin");
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors"
                        >
                          <LayoutDashboard size={16} className="text-accent" />
                          Admin Dashboard
                        </button>
                      )}

                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-3 hover:bg-destructive/20 flex items-center gap-3 font-medium text-destructive border-t border-border transition-colors"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="relative">
                <button
                  id="nav-login-btn"
                  onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
                  className="neon-btn bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-xl flex items-center gap-2"
                >
                  Login
                  <ChevronDown size={16} className={`transition-transform ${isLoginDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLoginDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsLoginDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 glass-card overflow-hidden z-50">
                      {/* User Section */}
                      <div className="p-2 border-b border-border">
                        <p className="text-xs font-bold text-muted-foreground uppercase px-2 py-1">Customer</p>
                        <button
                          onClick={() => handleLoginOption("user", "signin")}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors rounded-lg"
                        >
                          <User size={16} className="text-primary" />
                          Sign In
                        </button>
                        <button
                          id="nav-signup-btn"
                          onClick={() => handleLoginOption("user", "signup")}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors rounded-lg"
                        >
                          <UserPlus size={16} className="text-secondary" />
                          Sign Up
                        </button>
                      </div>

                      {/* Runner Section */}
                      <div className="p-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase px-2 py-1">Runner</p>
                        <button
                          onClick={() => handleLoginOption("runner", "signin")}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors rounded-lg"
                        >
                          <Truck size={16} className="text-cyan" />
                          Sign In
                        </button>
                        <button
                          onClick={() => handleLoginOption("runner", "signup")}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/50 flex items-center gap-3 font-medium transition-colors rounded-lg"
                        >
                          <UserPlus size={16} className="text-accent" />
                          Become a Runner
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => navigate("/products")}
              className="glass-card p-2 md:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Store Status - Keeping it simple for now or hidden */}
        <div className="md:hidden pb-3 text-center text-xs text-muted-foreground">
          <StoreStatus />
        </div>
      </nav>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <AddressSelectorModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
    </>
  );
};

export default Navbar;
