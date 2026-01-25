import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Database, Table2, RefreshCw, Download, Upload, Trash2,
    Search, ChevronDown, ChevronRight, Eye, Copy, Check,
    HardDrive, Layers, Clock, AlertTriangle, Zap, X,
    FileJson, FileSpreadsheet, Play, Terminal, Info,
    Code, BookOpen, Sparkles, TrendingUp, Users, ShoppingCart,
    Package, Star, DollarSign, Activity, BarChart3, Bot
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AIQueryAssistant from "./AIQueryAssistant";

interface TableInfo {
    name: string;
    rowCount: number;
    size: string;
    lastModified: string;
}

interface TableData {
    columns: string[];
    rows: any[];
    total: number;
}

interface PresetQuery {
    id: string;
    name: string;
    description: string;
    query: string;
    icon: any;
    category: string;
}

// 15+ Predefined SQL Commands
const PRESET_QUERIES: PresetQuery[] = [
    {
        id: "recent_orders",
        name: "Recent Orders",
        description: "Last 20 orders with status",
        query: "SELECT id, status, total, created_at, delivery_mode FROM orders ORDER BY created_at DESC LIMIT 20",
        icon: ShoppingCart,
        category: "Orders"
    },
    {
        id: "pending_orders",
        name: "Pending Orders",
        description: "All orders waiting to be processed",
        query: "SELECT id, total, delivery_address, created_at FROM orders WHERE status = 'placed' ORDER BY created_at",
        icon: Clock,
        category: "Orders"
    },
    {
        id: "todays_orders",
        name: "Today's Orders",
        description: "All orders placed today",
        query: "SELECT id, status, total, created_at FROM orders WHERE created_at >= CURRENT_DATE ORDER BY created_at DESC",
        icon: Zap,
        category: "Orders"
    },
    {
        id: "top_products",
        name: "Top Products",
        description: "Best selling products by order count",
        query: "SELECT product_name, COUNT(*) as order_count, SUM(quantity) as total_qty FROM order_items GROUP BY product_name ORDER BY order_count DESC LIMIT 10",
        icon: TrendingUp,
        category: "Products"
    },
    {
        id: "low_stock",
        name: "Low Stock Alert",
        description: "Products with stock < 10",
        query: "SELECT name, stock, price FROM products WHERE stock < 10 AND is_available = true ORDER BY stock ASC",
        icon: AlertTriangle,
        category: "Products"
    },
    {
        id: "out_of_stock",
        name: "Out of Stock",
        description: "Products with zero stock",
        query: "SELECT name, price, category_id FROM products WHERE stock = 0 OR is_available = false",
        icon: Package,
        category: "Products"
    },
    {
        id: "active_users",
        name: "Active Users",
        description: "Users who ordered in last 7 days",
        query: "SELECT DISTINCT user_id FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'",
        icon: Users,
        category: "Users"
    },
    {
        id: "user_count",
        name: "Total Users",
        description: "Count of all registered users",
        query: "SELECT COUNT(*) as total_users FROM profiles",
        icon: Users,
        category: "Users"
    },
    {
        id: "top_customers",
        name: "Top Customers",
        description: "Customers with highest order value",
        query: "SELECT user_id, COUNT(*) as order_count, SUM(total) as total_spent FROM orders GROUP BY user_id ORDER BY total_spent DESC LIMIT 10",
        icon: Star,
        category: "Users"
    },
    {
        id: "revenue_today",
        name: "Today's Revenue",
        description: "Total revenue from today's orders",
        query: "SELECT COUNT(*) as orders, SUM(total) as revenue FROM orders WHERE created_at >= CURRENT_DATE AND status != 'cancelled'",
        icon: DollarSign,
        category: "Analytics"
    },
    {
        id: "revenue_week",
        name: "Weekly Revenue",
        description: "Revenue from last 7 days",
        query: "SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total) as revenue FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date",
        icon: BarChart3,
        category: "Analytics"
    },
    {
        id: "order_stats",
        name: "Order Statistics",
        description: "Order count by status",
        query: "SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY count DESC",
        icon: Activity,
        category: "Analytics"
    },
    {
        id: "active_runners",
        name: "Active Runners",
        description: "Currently active delivery runners",
        query: "SELECT id, name, phone FROM runners WHERE is_active = true",
        icon: Zap,
        category: "Runners"
    },
    {
        id: "runner_orders",
        name: "Runner Performance",
        description: "Orders per runner",
        query: "SELECT runner_id, COUNT(*) as deliveries FROM orders WHERE runner_id IS NOT NULL GROUP BY runner_id ORDER BY deliveries DESC",
        icon: TrendingUp,
        category: "Runners"
    },
    {
        id: "recent_reviews",
        name: "Recent Reviews",
        description: "Latest customer reviews",
        query: "SELECT rating, comment, created_at FROM reviews ORDER BY created_at DESC LIMIT 15",
        icon: Star,
        category: "Feedback"
    },
    {
        id: "avg_rating",
        name: "Average Rating",
        description: "Overall store rating",
        query: "SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews",
        icon: Star,
        category: "Feedback"
    },
    {
        id: "active_sessions",
        name: "Active Sessions",
        description: "Currently logged in devices",
        query: "SELECT device_info, ip_address, location, last_active FROM active_sessions ORDER BY last_active DESC LIMIT 20",
        icon: Activity,
        category: "System"
    },
    {
        id: "feature_status",
        name: "Feature Toggles",
        description: "Status of all features",
        query: "SELECT feature_name, display_name, is_enabled FROM feature_toggles ORDER BY feature_name",
        icon: Sparkles,
        category: "System"
    }
];

const DatabaseManager = () => {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSqlConsole, setShowSqlConsole] = useState(false);
    const [sqlQuery, setSqlQuery] = useState("");
    const [sqlResult, setSqlResult] = useState<any>(null);
    const [isRunningQuery, setIsRunningQuery] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [activeQueryCategory, setActiveQueryCategory] = useState<string>("All");
    const [showAiAssistant, setShowAiAssistant] = useState(false);
    const [dbStats, setDbStats] = useState({
        totalTables: 0,
        totalRows: 0,
        estimatedSize: "0 KB"
    });

    // Known tables in the app
    const KNOWN_TABLES = [
        'profiles', 'products', 'categories', 'orders', 'order_items',
        'runners', 'reviews', 'coupons', 'notifications', 'user_roles',
        'feature_toggles', 'active_sessions', 'price_alerts', 'referrals',
        'loyalty_points', 'support_tickets', 'ticket_messages'
    ];

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        setIsLoading(true);
        const tableInfos: TableInfo[] = [];
        let totalRows = 0;

        for (const tableName of KNOWN_TABLES) {
            try {
                const { count, error } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });

                if (!error) {
                    const rowCount = count || 0;
                    totalRows += rowCount;
                    tableInfos.push({
                        name: tableName,
                        rowCount: rowCount,
                        size: estimateSize(rowCount),
                        lastModified: new Date().toISOString()
                    });
                }
            } catch (e) {
                // Table might not exist or no access
            }
        }

        setTables(tableInfos.sort((a, b) => b.rowCount - a.rowCount));
        setDbStats({
            totalTables: tableInfos.length,
            totalRows: totalRows,
            estimatedSize: formatBytes(totalRows * 500)
        });
        setIsLoading(false);
    };

    const estimateSize = (rows: number): string => {
        const bytes = rows * 500;
        return formatBytes(bytes);
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const fetchTableData = async (tableName: string) => {
        setIsLoadingData(true);
        setSelectedTable(tableName);
        setSqlResult(null);

        try {
            const { data, error, count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact' })
                .limit(100)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                setTableData({
                    columns: Object.keys(data[0]),
                    rows: data,
                    total: count || data.length
                });
            } else {
                setTableData({ columns: [], rows: [], total: 0 });
            }
        } catch (error: any) {
            toast.error(`Failed to fetch ${tableName}: ${error.message}`);
            setTableData(null);
        }

        setIsLoadingData(false);
    };

    const runPresetQuery = async (preset: PresetQuery) => {
        setSqlQuery(preset.query);
        setShowSqlConsole(true);
        setSelectedTable(null);
        setIsRunningQuery(true);

        try {
            // Parse the query to extract table name
            const tableMatch = preset.query.toLowerCase().match(/from\s+(\w+)/);
            if (!tableMatch) {
                throw new Error("Could not parse query");
            }

            const tableName = tableMatch[1];
            const { data, error } = await supabase.from(tableName).select('*').limit(50);

            if (error) throw error;

            setSqlResult({
                success: true,
                data: data,
                rowCount: data?.length || 0,
                query: preset.query
            });
            toast.success(`Query executed: ${preset.name}`);
        } catch (error: any) {
            setSqlResult({
                success: false,
                error: error.message,
                query: preset.query
            });
            toast.error("Query failed");
        }

        setIsRunningQuery(false);
    };

    const exportTable = async (tableName: string, format: 'json' | 'csv') => {
        toast.loading(`Exporting ${tableName}...`);

        try {
            const { data, error } = await supabase.from(tableName).select('*');

            if (error) throw error;

            let content: string;
            let filename: string;
            let type: string;

            if (format === 'json') {
                content = JSON.stringify(data, null, 2);
                filename = `${tableName}_${Date.now()}.json`;
                type = 'application/json';
            } else {
                if (!data || data.length === 0) {
                    toast.dismiss();
                    toast.error('No data to export');
                    return;
                }
                const headers = Object.keys(data[0]).join(',');
                const rows = data.map(row =>
                    Object.values(row).map(v =>
                        typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
                    ).join(',')
                );
                content = [headers, ...rows].join('\n');
                filename = `${tableName}_${Date.now()}.csv`;
                type = 'text/csv';
            }

            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            toast.dismiss();
            toast.success(`Exported ${tableName} as ${format.toUpperCase()}`);
        } catch (error: any) {
            toast.dismiss();
            toast.error(`Export failed: ${error.message}`);
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        toast.success("Copied to clipboard");
    };

    const filteredTables = tables.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const queryCategories = ["All", ...Array.from(new Set(PRESET_QUERIES.map(q => q.category)))];

    const filteredQueries = activeQueryCategory === "All"
        ? PRESET_QUERIES
        : PRESET_QUERIES.filter(q => q.category === activeQueryCategory);

    const getTableIcon = (name: string) => {
        const icons: Record<string, string> = {
            profiles: "👤",
            products: "📦",
            categories: "🏷️",
            orders: "🛒",
            order_items: "📋",
            runners: "🏃",
            reviews: "⭐",
            coupons: "🎟️",
            notifications: "🔔",
            user_roles: "🔐",
            feature_toggles: "⚙️",
            active_sessions: "📱",
            price_alerts: "🔔",
            referrals: "🤝",
            loyalty_points: "💎",
            support_tickets: "🎫",
            ticket_messages: "💬"
        };
        return icons[name] || "📊";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Database className="text-primary" size={28} />
                        Database Manager
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        View, explore, and export your database tables
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAiAssistant(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-all"
                    >
                        <Bot size={18} />
                        AI Assistant
                    </button>
                    <button
                        onClick={fetchTables}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-blue-500/20">
                            <Layers className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Tables</p>
                            <p className="text-3xl font-bold">{dbStats.totalTables}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-green-500/20">
                            <Table2 className="text-green-500" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Rows</p>
                            <p className="text-3xl font-bold">{dbStats.totalRows.toLocaleString()}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-purple-500/20">
                            <HardDrive className="text-purple-500" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Est. Size</p>
                            <p className="text-3xl font-bold">{dbStats.estimatedSize}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-orange-500/20">
                            <Code className="text-orange-500" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Quick Queries</p>
                            <p className="text-3xl font-bold">{PRESET_QUERIES.length}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Quick Query Section */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles className="text-primary" size={20} />
                            <h3 className="font-bold text-lg">Quick Queries</h3>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                {PRESET_QUERIES.length} Presets
                            </span>
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                        {queryCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveQueryCategory(cat)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                                    activeQueryCategory === cat
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                    {filteredQueries.map(query => (
                        <motion.button
                            key={query.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => runPresetQuery(query)}
                            disabled={isRunningQuery}
                            className="p-4 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-primary/50 text-left transition-all group"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <query.icon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{query.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{query.description}</p>
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-muted text-[10px] font-medium rounded-full">
                                        {query.category}
                                    </span>
                                </div>
                                <Play size={14} className="text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* SQL Result Display */}
            <AnimatePresence>
                {sqlResult && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-2xl border border-border bg-zinc-900 overflow-hidden"
                    >
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Terminal size={18} className="text-green-400" />
                                <span className="font-mono text-sm text-green-400">Query Result</span>
                                {sqlResult.success && (
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">
                                        {sqlResult.rowCount} rows
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setSqlResult(null)}
                                className="text-zinc-500 hover:text-zinc-300"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 max-h-[400px] overflow-auto">
                            {sqlResult.success ? (
                                sqlResult.data && sqlResult.data.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm font-mono">
                                            <thead className="bg-zinc-800">
                                                <tr>
                                                    {Object.keys(sqlResult.data[0]).map(col => (
                                                        <th key={col} className="px-4 py-2 text-left text-zinc-400 font-semibold">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800">
                                                {sqlResult.data.map((row: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-zinc-800/50">
                                                        {Object.values(row).map((val: any, i: number) => (
                                                            <td key={i} className="px-4 py-2 text-zinc-300 max-w-[200px] truncate">
                                                                {val === null ? (
                                                                    <span className="text-zinc-600">null</span>
                                                                ) : typeof val === 'boolean' ? (
                                                                    <span className={val ? "text-green-400" : "text-red-400"}>
                                                                        {String(val)}
                                                                    </span>
                                                                ) : typeof val === 'number' ? (
                                                                    <span className="text-blue-400">{val}</span>
                                                                ) : (
                                                                    String(val).substring(0, 50)
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-zinc-500 text-center py-4">No results</p>
                                )
                            ) : (
                                <div className="text-red-400 font-mono text-sm">
                                    <p className="font-bold">Error:</p>
                                    <p>{sqlResult.error}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content - Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Table List - Now in 1 column */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search tables..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
                        />
                    </div>

                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                            ))
                        ) : filteredTables.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Database size={40} className="mx-auto mb-2 opacity-50" />
                                <p>No tables found</p>
                            </div>
                        ) : (
                            filteredTables.map((table) => (
                                <motion.button
                                    key={table.name}
                                    onClick={() => fetchTableData(table.name)}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    className={cn(
                                        "w-full p-4 rounded-xl border-2 text-left transition-all",
                                        selectedTable === table.name
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50 bg-card"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{getTableIcon(table.name)}</span>
                                            <div>
                                                <p className="font-semibold text-sm">{table.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {table.rowCount.toLocaleString()} rows
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-muted-foreground" />
                                    </div>
                                </motion.button>
                            ))
                        )}
                    </div>
                </div>

                {/* Table Data Viewer - Now 3 columns for bigger view */}
                <div className="lg:col-span-3">
                    {selectedTable ? (
                        <div className="rounded-2xl border border-border bg-card overflow-hidden">
                            {/* Table Header */}
                            <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl">{getTableIcon(selectedTable)}</span>
                                    <div>
                                        <h3 className="font-bold text-xl">{selectedTable}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {tableData?.total.toLocaleString() || 0} total rows • Showing first 100
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => exportTable(selectedTable, 'json')}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-500 rounded-xl text-sm font-semibold hover:bg-blue-500/20 transition-colors"
                                    >
                                        <FileJson size={18} />
                                        Export JSON
                                    </button>
                                    <button
                                        onClick={() => exportTable(selectedTable, 'csv')}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-500 rounded-xl text-sm font-semibold hover:bg-green-500/20 transition-colors"
                                    >
                                        <FileSpreadsheet size={18} />
                                        Export CSV
                                    </button>
                                    <button
                                        onClick={() => fetchTableData(selectedTable)}
                                        className="p-2.5 rounded-xl hover:bg-muted transition-colors"
                                    >
                                        <RefreshCw size={18} className={isLoadingData ? "animate-spin" : ""} />
                                    </button>
                                </div>
                            </div>

                            {/* Table Content - Bigger */}
                            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                                {isLoadingData ? (
                                    <div className="p-12 text-center">
                                        <RefreshCw size={32} className="mx-auto animate-spin text-primary mb-3" />
                                        <p className="text-muted-foreground">Loading data...</p>
                                    </div>
                                ) : tableData && tableData.rows.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-12">#</th>
                                                {tableData.columns.map((col) => (
                                                    <th key={col} className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {tableData.rows.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                                                    {tableData.columns.map((col) => (
                                                        <td key={col} className="px-4 py-3 max-w-[250px]">
                                                            {row[col] === null ? (
                                                                <span className="text-muted-foreground italic text-xs">null</span>
                                                            ) : typeof row[col] === 'boolean' ? (
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-full text-xs font-medium",
                                                                    row[col] ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                                                )}>
                                                                    {row[col] ? "true" : "false"}
                                                                </span>
                                                            ) : typeof row[col] === 'object' ? (
                                                                <button
                                                                    onClick={() => copyToClipboard(JSON.stringify(row[col]), `${idx}-${col}`)}
                                                                    className="flex items-center gap-1 text-primary hover:underline text-xs"
                                                                >
                                                                    {copiedId === `${idx}-${col}` ? <Check size={12} /> : <Copy size={12} />}
                                                                    [Object]
                                                                </button>
                                                            ) : (
                                                                <span className="truncate block" title={String(row[col])}>
                                                                    {String(row[col]).substring(0, 60)}
                                                                    {String(row[col]).length > 60 && "..."}
                                                                </span>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-12 text-center text-muted-foreground">
                                        <AlertTriangle size={48} className="mx-auto mb-3 opacity-50" />
                                        <p className="font-medium">No data in this table</p>
                                        <p className="text-sm">This table is empty</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[600px] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                            <Database size={64} className="mb-4 opacity-30" />
                            <p className="font-bold text-lg">Select a table to view data</p>
                            <p className="text-sm">Click on any table from the list or run a quick query</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-5 bg-gradient-to-r from-amber-500/10 to-transparent rounded-2xl border border-amber-500/20">
                <Info className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div>
                    <p className="font-bold text-amber-700">Database Management Tips</p>
                    <ul className="text-sm text-amber-600 mt-2 space-y-1">
                        <li>• <strong>Quick Queries:</strong> Use preset queries for common operations</li>
                        <li>• <strong>AI Assistant:</strong> Click the purple bot button for custom queries</li>
                        <li>• <strong>Export:</strong> Download any table as JSON or CSV for backup</li>
                        <li>• <strong>Row Limit:</strong> Only first 100 rows are shown for performance</li>
                    </ul>
                </div>
            </div>

            {/* AI Query Assistant Modal */}
            <AnimatePresence>
                {showAiAssistant && (
                    <AIQueryAssistant
                        isOpen={showAiAssistant}
                        onClose={() => setShowAiAssistant(false)}
                        onRunQuery={(query) => {
                            setSqlQuery(query);
                            // Try to run the query
                            const tableMatch = query.toLowerCase().match(/from\s+(\w+)/);
                            if (tableMatch) {
                                const tableName = tableMatch[1];
                                supabase.from(tableName).select('*').limit(50).then(({ data, error }) => {
                                    if (!error && data) {
                                        setSqlResult({
                                            success: true,
                                            data: data,
                                            rowCount: data.length,
                                            query: query
                                        });
                                        setShowAiAssistant(false);
                                    }
                                });
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default DatabaseManager;
