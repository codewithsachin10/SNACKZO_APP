import { useState, useEffect, useCallback } from "react";
import {
    LayoutDashboard, ShoppingBag, Package, List, Truck,
    BarChart3, Users, TrendingUp, Mail, Bell, Wallet, AlertTriangle,
    Settings, LogOut, ToggleRight, Activity, Database, CreditCard,
    Shield, Folder, QrCode, ChevronDown, ChevronLeft, ChevronRight, Image, MessageSquare,
    Send, Star, Megaphone, HeartHandshake, Wrench, Gauge, Search, Command, X, Pin, Moon, Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export type AdminTab =
    | "orders"
    | "inventory"
    | "products"
    | "categories"
    | "runners"
    | "analytics"
    | "users"
    | "customer-insights"
    | "promotions"
    | "announcements"
    | "live-chat"
    | "notifications"
    | "wallet"
    | "snackzopay"
    | "alerts"
    | "features"
    | "database"
    | "system-health"
    | "support"
    | "settings"
    | "feedback"
    | "banners"
    | "security"
    | "storage"
    | "qr_code";

interface AdminSidebarProps {
    activeTab: AdminTab;
    setActiveTab: (tab: AdminTab) => void;
    stats?: {
        lowStockCount: number;
        outOfStockCount: number;
        activeOrders: number;
    };
    liveNotifications?: {
        newMessages?: number;
        newFeedback?: number;
        pendingOrders?: number;
    };
    onCollapsedChange?: (collapsed: boolean) => void;
}

interface MenuItem {
    id: AdminTab;
    label: string;
    icon: any;
    badge?: string;
    shortcut?: string;
}

interface MenuSection {
    id: string;
    title: string;
    icon: any;
    color: string;
    items: MenuItem[];
}

const menuSections: MenuSection[] = [
    {
        id: "store",
        title: "Store",
        icon: ShoppingBag,
        color: "text-primary",
        items: [
            { id: "orders", label: "Orders", icon: LayoutDashboard, shortcut: "G O" },
            { id: "inventory", label: "Inventory", icon: ShoppingBag, shortcut: "G I" },
            { id: "products", label: "Products", icon: Package, shortcut: "G P" },
            { id: "categories", label: "Categories", icon: List },
            { id: "runners", label: "Runners", icon: Truck },
        ]
    },
    {
        id: "content",
        title: "Content",
        icon: Image,
        color: "text-accent",
        items: [
            { id: "banners", label: "Banners", icon: Image },
            { id: "storage", label: "Media Library", icon: Folder },
            { id: "qr_code", label: "QR Studio", icon: QrCode },
        ]
    },
    {
        id: "customers",
        title: "Customers",
        icon: Users,
        color: "text-secondary",
        items: [
            { id: "users", label: "Users", icon: Users, shortcut: "G U" },
            { id: "customer-insights", label: "Insights", icon: TrendingUp },
            { id: "feedback", label: "Feedback", icon: Star, badge: "HOT" },
            { id: "live-chat", label: "Live Chat", icon: MessageSquare },
        ]
    },
    {
        id: "marketing",
        title: "Marketing",
        icon: Megaphone,
        color: "text-lime",
        items: [
            { id: "promotions", label: "Promos", icon: Megaphone },
            { id: "announcements", label: "Announcements", icon: Bell },
            { id: "notifications", label: "Mail & SMS", icon: Send },
        ]
    },
    {
        id: "payments",
        title: "Payments",
        icon: Wallet,
        color: "text-emerald-400",
        items: [
            { id: "wallet", label: "Wallet", icon: Wallet },
            { id: "snackzopay", label: "SnackzoPay", icon: CreditCard },
        ]
    },
    {
        id: "system",
        title: "System",
        icon: Wrench,
        color: "text-orange-400",
        items: [
            { id: "analytics", label: "Analytics", icon: BarChart3, shortcut: "G A" },
            { id: "alerts", label: "Alerts", icon: AlertTriangle },
            { id: "features", label: "Feature Toggles", icon: ToggleRight },
            { id: "database", label: "Database", icon: Database },
            { id: "system-health", label: "System Health", icon: Gauge },
            { id: "security", label: "Security", icon: Shield, badge: "PRO" },
            { id: "support", label: "Support", icon: HeartHandshake },
            { id: "settings", label: "Settings", icon: Settings, shortcut: "G S" },
        ]
    },
];

// Get all menu items flat
const allMenuItems = menuSections.flatMap(s => s.items);

// Helpers
const findSectionForTab = (tabId: AdminTab): string | null => {
    for (const section of menuSections) {
        if (section.items.some(item => item.id === tabId)) {
            return section.id;
        }
    }
    return null;
};

// LocalStorage keys
const FAVORITES_KEY = "snackzo_admin_favorites";
const COLLAPSED_KEY = "snackzo_admin_collapsed";
const THEME_KEY = "snackzo_theme";

const getFavorites = (): AdminTab[] => {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    } catch { return []; }
};

const saveFavorites = (favorites: AdminTab[]) => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

export function AdminSidebar({ activeTab, setActiveTab, stats, liveNotifications, onCollapsedChange }: AdminSidebarProps) {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    // State
    const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
        const activeSection = findSectionForTab(activeTab);
        return new Set(activeSection ? [activeSection] : ["store"]);
    });
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem(COLLAPSED_KEY) === "true";
    });
    const [favorites, setFavorites] = useState<AdminTab[]>(getFavorites);
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [commandSearch, setCommandSearch] = useState("");
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem(THEME_KEY) !== "light";
    });

    // Notify parent of collapse state changes
    useEffect(() => {
        onCollapsedChange?.(isCollapsed);
    }, [isCollapsed, onCollapsedChange]);
    const [pendingShortcut, setPendingShortcut] = useState<string | null>(null);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Command palette: Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setShowCommandPalette(true);
                return;
            }

            // Escape closes command palette
            if (e.key === "Escape") {
                setShowCommandPalette(false);
                setPendingShortcut(null);
                return;
            }

            // G + letter shortcuts
            if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const target = e.target as HTMLElement;
                if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
                setPendingShortcut("G");
                setTimeout(() => setPendingShortcut(null), 1000);
                return;
            }

            if (pendingShortcut === "G") {
                const key = e.key.toUpperCase();
                const shortcuts: Record<string, AdminTab> = {
                    "O": "orders",
                    "I": "inventory",
                    "P": "products",
                    "U": "users",
                    "A": "analytics",
                    "S": "settings",
                };
                if (shortcuts[key]) {
                    e.preventDefault();
                    setActiveTab(shortcuts[key]);
                    expandSectionFor(shortcuts[key]);
                }
                setPendingShortcut(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pendingShortcut, setActiveTab]);

    // Theme effect
    useEffect(() => {
        document.documentElement.classList.toggle("light", !isDarkMode);
        localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
    }, [isDarkMode]);

    // Collapse effect
    useEffect(() => {
        localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
    }, [isCollapsed]);

    const toggleSection = (sectionId: string) => {
        if (isCollapsed) return;
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    const expandSectionFor = (tabId: AdminTab) => {
        const section = findSectionForTab(tabId);
        if (section && !expandedSections.has(section)) {
            setExpandedSections(prev => new Set([...prev, section]));
        }
    };

    const handleTabClick = (tabId: AdminTab) => {
        setActiveTab(tabId);
        expandSectionFor(tabId);
    };

    const toggleFavorite = (tabId: AdminTab, e: React.MouseEvent) => {
        e.stopPropagation();
        const newFavs = favorites.includes(tabId)
            ? favorites.filter(f => f !== tabId)
            : [...favorites, tabId].slice(0, 5);
        setFavorites(newFavs);
        saveFavorites(newFavs);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate("/auth");
    };

    // Command palette filtered items
    const filteredItems = commandSearch
        ? allMenuItems.filter(item =>
            item.label.toLowerCase().includes(commandSearch.toLowerCase()) ||
            item.id.toLowerCase().includes(commandSearch.toLowerCase())
        )
        : allMenuItems;

    const handleCommandSelect = (tabId: AdminTab) => {
        setActiveTab(tabId);
        expandSectionFor(tabId);
        setShowCommandPalette(false);
        setCommandSearch("");
    };

    // Get notification count for an item
    const getNotificationCount = (itemId: AdminTab): number => {
        if (itemId === "orders" && stats?.activeOrders) return stats.activeOrders;
        if (itemId === "alerts" && stats) return stats.lowStockCount + stats.outOfStockCount;
        if (itemId === "live-chat" && liveNotifications?.newMessages) return liveNotifications.newMessages;
        if (itemId === "feedback" && liveNotifications?.newFeedback) return liveNotifications.newFeedback;
        return 0;
    };

    const renderMenuItem = (item: MenuItem, showFavoriteBtn = true) => {
        const notificationCount = getNotificationCount(item.id);
        const isFavorite = favorites.includes(item.id);
        const hasNotification = notificationCount > 0;

        return (
            <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    activeTab === item.id
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <item.icon size={16} className={cn(
                            "transition-colors",
                            activeTab === item.id ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                        )} />
                        {/* Live notification dot */}
                        {hasNotification && activeTab !== item.id && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        )}
                    </div>
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && (
                    <div className="flex items-center gap-1">
                        {/* Favorite button */}
                        {showFavoriteBtn && (
                            <button
                                onClick={(e) => toggleFavorite(item.id, e)}
                                className={cn(
                                    "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                                    isFavorite ? "text-yellow-400" : "text-muted-foreground hover:text-yellow-400"
                                )}
                            >
                                <Pin size={12} className={isFavorite ? "fill-current" : ""} />
                            </button>
                        )}

                        {/* Notification count */}
                        {notificationCount > 0 && (
                            <span className={cn(
                                "px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center animate-pulse",
                                activeTab === item.id
                                    ? "bg-white/20 text-white"
                                    : "bg-red-500/20 text-red-400"
                            )}>
                                {notificationCount}
                            </span>
                        )}

                        {/* Static badge */}
                        {item.badge && notificationCount === 0 && (
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider",
                                item.badge === "HOT" && "bg-orange-500/20 text-orange-400",
                                item.badge === "PRO" && "bg-violet-500/20 text-violet-400",
                                item.badge === "NEW" && "bg-lime/20 text-lime"
                            )}>
                                {item.badge}
                            </span>
                        )}
                    </div>
                )}

                {/* Active Indicator */}
                {activeTab === item.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-white rounded-r-full" />
                )}
            </button>
        );
    };

    return (
        <>
            {/* Command Palette Modal */}
            <AnimatePresence>
                {showCommandPalette && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh]"
                        onClick={() => setShowCommandPalette(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center gap-3 p-4 border-b border-white/10">
                                <Search size={20} className="text-muted-foreground" />
                                <input
                                    autoFocus
                                    value={commandSearch}
                                    onChange={(e) => setCommandSearch(e.target.value)}
                                    placeholder="Search pages..."
                                    className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                                />
                                <kbd className="px-2 py-1 bg-white/10 rounded text-[10px] font-mono text-muted-foreground">ESC</kbd>
                            </div>
                            <div className="max-h-[50vh] overflow-y-auto p-2">
                                {filteredItems.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No results found
                                    </div>
                                ) : (
                                    filteredItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleCommandSelect(item.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors text-left",
                                                activeTab === item.id && "bg-primary/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon size={18} className="text-muted-foreground" />
                                                <span className="font-medium">{item.label}</span>
                                            </div>
                                            {item.shortcut && (
                                                <kbd className="px-2 py-1 bg-white/10 rounded text-[10px] font-mono text-muted-foreground">
                                                    {item.shortcut}
                                                </kbd>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Shortcut indicator */}
            <AnimatePresence>
                {pendingShortcut && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-card border border-white/20 rounded-xl px-4 py-2 shadow-xl"
                    >
                        <span className="text-sm font-mono">
                            <span className="text-primary">{pendingShortcut}</span>
                            <span className="text-muted-foreground"> + ?</span>
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.div
                animate={{ width: isCollapsed ? 72 : 256 }}
                transition={{ duration: 0.2 }}
                className="h-screen bg-card/80 backdrop-blur-xl border-r border-border flex flex-col fixed left-0 top-0 z-50"
            >
                {/* Header */}
                <div className={cn("p-4 border-b border-white/10", isCollapsed && "px-3")}>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                            <span className="font-bold text-white text-sm">S</span>
                        </div>
                        {!isCollapsed && (
                            <div className="min-w-0">
                                <h1 className="font-bold text-lg tracking-tight truncate">Snackzo</h1>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Admin</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search Button */}
                {!isCollapsed && (
                    <div className="px-3 py-2">
                        <button
                            onClick={() => setShowCommandPalette(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-muted-foreground transition-colors"
                        >
                            <Search size={16} />
                            <span className="flex-1 text-left">Search...</span>
                            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">⌘K</kbd>
                        </button>
                    </div>
                )}

                {/* Favorites Section */}
                {favorites.length > 0 && !isCollapsed && (
                    <div className="px-3 py-2 border-b border-white/5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">Favorites</p>
                        <div className="space-y-0.5">
                            {favorites.map(favId => {
                                const item = allMenuItems.find(i => i.id === favId);
                                if (!item) return null;
                                return renderMenuItem(item, false);
                            })}
                        </div>
                    </div>
                )}

                {/* Menu with Sections */}
                <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1 custom-scrollbar">
                    {menuSections.map((section) => {
                        const isExpanded = expandedSections.has(section.id);
                        const hasActiveItem = section.items.some(item => item.id === activeTab);

                        return (
                            <div key={section.id} className="mb-1">
                                {/* Section Header */}
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    title={isCollapsed ? section.title : undefined}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200",
                                        hasActiveItem
                                            ? "text-foreground bg-white/5"
                                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <section.icon size={14} className={section.color} />
                                        {!isCollapsed && <span>{section.title}</span>}
                                    </div>
                                    {!isCollapsed && (
                                        <motion.div
                                            animate={{ rotate: isExpanded ? 0 : -90 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ChevronDown size={14} className="text-muted-foreground" />
                                        </motion.div>
                                    )}
                                </button>

                                {/* Section Items */}
                                <AnimatePresence initial={false}>
                                    {(isExpanded || isCollapsed) && (
                                        <motion.div
                                            initial={isCollapsed ? false : { height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={isCollapsed ? undefined : { height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            <div className={cn("pt-1 space-y-0.5", !isCollapsed && "pl-2")}>
                                                {section.items.map((item) => renderMenuItem(item))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className={cn("p-3 border-t border-white/10 bg-black/20 space-y-2", isCollapsed && "px-2")}>
                    {/* Theme Toggle */}
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-white/5 transition-colors",
                            isCollapsed && "justify-center px-2"
                        )}
                    >
                        {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                        {!isCollapsed && <span>{isDarkMode ? "Dark Mode" : "Light Mode"}</span>}
                    </button>

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-white/5 transition-colors",
                            isCollapsed && "justify-center px-2"
                        )}
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        {!isCollapsed && <span>Collapse</span>}
                    </button>

                    {/* Sign Out */}
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start gap-3 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground",
                            isCollapsed && "justify-center px-2"
                        )}
                        onClick={handleSignOut}
                    >
                        <LogOut size={18} />
                        {!isCollapsed && "Sign Out"}
                    </Button>
                </div>
            </motion.div>
        </>
    );
}
