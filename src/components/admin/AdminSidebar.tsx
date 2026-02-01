import {
    LayoutDashboard, ShoppingBag, Package, List, Truck,
    BarChart3, LineChart, Users, TrendingUp, Zap, Mail,
    Bell, Wallet, AlertTriangle, Settings, LogOut, ToggleRight, Activity, HelpCircle, Database, CreditCard, Shield, Folder, QrCode
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export type AdminTab =
    | "orders"
    | "inventory"
    | "products"
    | "categories"
    | "runners"
    | "analytics"
    | "advanced-analytics"
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
}

const menuItems: { id: AdminTab; label: string; icon: any; badge?: string }[] = [
    { id: "orders", label: "Orders", icon: LayoutDashboard },
    { id: "inventory", label: "Inventory", icon: ShoppingBag },
    { id: "products", label: "Products", icon: Package },
    { id: "categories", label: "Categories", icon: List },
    { id: "banners", label: "Banners", icon: Zap, badge: "NEW" },
    { id: "storage", label: "Media Library", icon: Folder, badge: "NEW" },
    { id: "runners", label: "Runners", icon: Truck },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "advanced-analytics", label: "Advanced", icon: LineChart },
    { id: "users", label: "Users", icon: Users },
    { id: "customer-insights", label: "Insights", icon: TrendingUp },
    { id: "qr_code", label: "QR Studio", icon: QrCode, badge: "NEW" },
    { id: "promotions", label: "Promos", icon: Zap },
    { id: "announcements", label: "Notify", icon: Bell },
    { id: "live-chat", label: "Live Chat", icon: HelpCircle, badge: "NEW" },
    { id: "notifications", label: "Mail & SMS", icon: Mail, badge: "NEW" },
    { id: "feedback", label: "Feedback", icon: HelpCircle, badge: "HOT" },
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "snackzopay", label: "SnackzoPay", icon: CreditCard, badge: "NEW" },
    { id: "security", label: "Security", icon: Shield, badge: "PRO" },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "features", label: "Features", icon: ToggleRight },
    { id: "database", label: "Database", icon: Database },
    { id: "system-health", label: "System Health", icon: Activity },
    { id: "support", label: "Support", icon: HelpCircle },
    { id: "settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ activeTab, setActiveTab, stats }: AdminSidebarProps) {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate("/auth");
    };

    return (
        <div className="w-64 h-screen bg-card/80 backdrop-blur-xl border-r border-border flex flex-col fixed left-0 top-0 z-50">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <span className="font-bold text-white">H</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight">Hostel Mart</h1>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Admin Panel</p>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                {menuItems.map((item) => {
                    let badgeValue = 0;
                    if (item.id === "orders" && stats?.activeOrders) badgeValue = stats.activeOrders;
                    if (item.id === "alerts" && stats) badgeValue = stats.lowStockCount + stats.outOfStockCount;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                                activeTab === item.id
                                    ? "bg-primary text-primary-foreground shadow-md shadow-orange-500/20"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={18} className={cn(
                                    "transition-colors",
                                    activeTab === item.id ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                                )} />
                                {item.label}
                            </div>

                            {badgeValue > 0 && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                    activeTab === item.id
                                        ? "bg-white/20 text-white"
                                        : "bg-primary/20 text-primary"
                                )}>
                                    {badgeValue}
                                </span>
                            )}

                            {/* Active Indicator */}
                            {activeTab === item.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-white rounded-r-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
                    onClick={handleSignOut}
                >
                    <LogOut size={18} />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
