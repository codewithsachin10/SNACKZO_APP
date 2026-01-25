import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    CreditCard, Zap, Copy, ExternalLink, CheckCircle, XCircle, Clock,
    TrendingUp, DollarSign, ShoppingBag, Users, ArrowUpRight,
    RefreshCw, Search, Filter, Calendar, Download, Eye, ShieldCheck,
    Smartphone, Globe, Award
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock transaction data
const mockTransactions = [
    { id: "pay_ABC123456789XY", amount: 499, status: "success", method: "UPI - PhonePe", customer: "Rahul S.", date: "2026-01-25T13:30:00", orderId: "ORD-2501", avatar: "R" },
    { id: "pay_DEF987654321ZW", amount: 299, status: "success", method: "UPI - Google Pay", customer: "Priya M.", date: "2026-01-25T13:15:00", orderId: "ORD-2500", avatar: "P" },
    { id: "pay_GHI456789123AB", amount: 749, status: "failed", method: "Card - HDFC", customer: "Amit K.", date: "2026-01-25T12:45:00", orderId: "ORD-2499", avatar: "A" },
    { id: "pay_JKL321654987CD", amount: 199, status: "success", method: "Wallet", customer: "Sneha R.", date: "2026-01-25T12:30:00", orderId: "ORD-2498", avatar: "S" },
    { id: "pay_MNO654321789EF", amount: 599, status: "pending", method: "UPI - Paytm", customer: "Vikram T.", date: "2026-01-25T12:00:00", orderId: "ORD-2497", avatar: "V" },
    { id: "pay_PQR789123456GH", amount: 399, status: "success", method: "UPI - BHIM", customer: "Neha P.", date: "2026-01-25T11:30:00", orderId: "ORD-2496", avatar: "N" },
    { id: "pay_STU123789456IJ", amount: 899, status: "success", method: "Net Banking - SBI", customer: "Suresh L.", date: "2026-01-25T11:00:00", orderId: "ORD-2495", avatar: "S" },
    { id: "pay_VWX456123789KL", amount: 159, status: "failed", method: "Card - ICICI", customer: "Meena J.", date: "2026-01-25T10:30:00", orderId: "ORD-2494", avatar: "M" },
];

const SnackzoPayManagement = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed" | "pending">("all");
    const [showTestLink, setShowTestLink] = useState(false);

    // Stats
    const stats = useMemo(() => {
        const total = mockTransactions.filter(t => t.status === "success").reduce((sum, t) => sum + t.amount, 0);
        const successful = mockTransactions.filter(t => t.status === "success").length;
        const failed = mockTransactions.filter(t => t.status === "failed").length;
        const pending = mockTransactions.filter(t => t.status === "pending").length;
        const successRate = Math.round((successful / mockTransactions.filter(t => t.status !== "pending").length) * 100) || 0;
        return { total, successful, failed, pending, count: mockTransactions.length, successRate };
    }, []);

    // Filtered transactions
    const filteredTransactions = useMemo(() => {
        return mockTransactions.filter(t => {
            const matchesSearch = t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.orderId.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || t.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [searchQuery, statusFilter]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const testPaymentUrl = `${window.location.origin}/pay?amount=499&orderId=TEST001&merchant=Hostel%20Mart`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Zap size={24} className="text-white" />
                        </div>
                        SnackzoPay
                        <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-green-500" />
                            <span className="text-xs font-semibold text-green-500 uppercase tracking-wide">Verified Business</span>
                        </div>
                    </h1>
                    <p className="text-muted-foreground mt-2 ml-1">Seamless payment gateway management & analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowTestLink(!showTestLink)}
                        className="px-5 py-2.5 bg-background border border-border hover:bg-muted text-foreground rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-sm"
                    >
                        <ExternalLink size={16} />
                        Test Payment
                    </button>
                    <button className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all">
                        <Download size={16} />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Test Payment Link Modal */}
            {showTestLink && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                >
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5 mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-yellow-500 flex items-center gap-2">
                                    <Smartphone size={18} />
                                    Test Payment Gateway
                                </h3>
                                <p className="text-sm text-yellow-500/80 mt-1">Use this URL to verify the payment flow works correctly.</p>
                            </div>
                            <button onClick={() => setShowTestLink(false)} className="text-yellow-500 hover:bg-yellow-500/20 p-2 rounded-lg transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <code className="flex-1 px-4 py-3 bg-background border border-yellow-500/20 rounded-lg text-sm font-mono overflow-x-auto text-yellow-500">
                                {testPaymentUrl}
                            </code>
                            <button
                                onClick={() => copyToClipboard(testPaymentUrl)}
                                className="p-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition-all"
                                title="Copy"
                            >
                                <Copy size={18} />
                            </button>
                            <a
                                href={testPaymentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition-all"
                                title="Open"
                            >
                                <ExternalLink size={18} />
                            </a>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                    { label: "Total Revenue", value: `₹${stats.total.toLocaleString()}`, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20", trend: "+12.5%" },
                    { label: "Success Rate", value: `${stats.successRate}%`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", trend: "+2.1%" },
                    { label: "Pending Orders", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", trend: "-5" },
                    { label: "Failed Transactions", value: stats.failed, icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", trend: "-1" },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn("bg-card border rounded-xl p-5 relative overflow-hidden group hover:border-primary/30 transition-all", stat.border)}
                    >
                        <div className={cn("absolute top-0 right-0 p-3 opacity-20", stat.color)}>
                            <stat.icon size={60} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                                    <stat.icon size={20} className={stat.color} />
                                </div>
                                <span className={cn("text-xs font-semibold px-2 py-1 rounded-full bg-background border", stat.color.replace('text-', 'border-').replace('500', '200'))}>
                                    {stat.trend}
                                </span>
                            </div>
                            <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
                            <p className="text-muted-foreground text-sm font-medium mt-1">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Transactions Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {/* Table Header */}
                <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Filter size={18} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-lg">Transaction History</h2>
                            <p className="text-xs text-muted-foreground">Manage your payment records</p>
                        </div>
                        <span className="px-2.5 py-0.5 bg-muted text-muted-foreground text-xs font-bold rounded-full border border-border">
                            {filteredTransactions.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search ID, customer..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none w-full sm:w-64 transition-all focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="px-4 py-2 bg-background border border-border rounded-xl text-sm focus:border-primary focus:outline-none cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                            <option value="all">All Status</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction ID</th>
                                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
                                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Ref</th>
                                <th className="text-right px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTransactions.map((txn, i) => (
                                <motion.tr
                                    key={txn.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="hover:bg-muted/30 transition-colors group"
                                >
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 group/id">
                                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 rotate-3 group-hover/id:rotate-0 transition-transform">
                                                <DollarSign size={14} />
                                            </div>
                                            <div>
                                                <code className="text-xs font-bold font-mono text-foreground block">{txn.id.slice(0, 14)}...</code>
                                                <span className="text-[10px] text-muted-foreground">{new Date(txn.date).toLocaleDateString()}</span>
                                            </div>
                                            <button onClick={() => copyToClipboard(txn.id)} className="opacity-0 group-hover/id:opacity-100 p-1 hover:bg-muted rounded transition-opacity">
                                                <Copy size={12} className="text-muted-foreground" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-xs font-bold border border-indigo-500/20">
                                                {txn.avatar}
                                            </div>
                                            <span className="text-sm font-medium">{txn.customer}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-sm font-bold tracking-tight">₹{txn.amount}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 w-fit",
                                            txn.status === "success" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                                            txn.status === "failed" && "bg-red-500/10 text-red-600 border-red-500/20",
                                            txn.status === "pending" && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                        )}>
                                            {txn.status === "success" && <CheckCircle size={10} />}
                                            {txn.status === "failed" && <XCircle size={10} />}
                                            {txn.status === "pending" && <Clock size={10} />}
                                            {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CreditCard size={14} />
                                            {txn.method}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-xs font-mono bg-muted/50 px-2 py-1 rounded border border-border">{txn.orderId}</span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 hover:bg-muted rounded-lg border border-transparent hover:border-border transition-all">
                                                <Eye size={16} className="text-muted-foreground" />
                                            </button>
                                            <button className="p-2 hover:bg-muted rounded-lg border border-transparent hover:border-border transition-all">
                                                <Download size={16} className="text-muted-foreground" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredTransactions.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground bg-muted/20">
                        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                            <Search size={24} className="opacity-50" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">No transactions found</h3>
                        <p>Try adjusting your filters or search query</p>
                    </div>
                )}
            </div>

            {/* Integration Guide */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Zap size={200} />
                </div>

                <h3 className="text-xl font-bold mb-6 flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur">
                        <CreditCard size={20} className="text-purple-400" />
                    </div>
                    Developer Integration Guide
                </h3>

                <div className="grid md:grid-cols-2 gap-8 relative z-10">
                    <div>
                        <h4 className="text-sm font-medium mb-3 text-slate-400 uppercase tracking-wider">Required Parameters</h4>
                        <div className="space-y-3">
                            {[
                                { name: "amount", desc: "Transaction amount in INR", req: true },
                                { name: "orderId", desc: "Unique order identifier", req: true },
                                { name: "returnUrl", desc: "Redirect URL after completion", req: true },
                                { name: "merchant", desc: "Business display name", req: false },
                            ].map(param => (
                                <div key={param.name} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                                    <code className="text-purple-400 font-mono text-sm min-w-[80px]">{param.name}</code>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-300">{param.desc}</p>
                                    </div>
                                    {param.req && <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded uppercase font-bold">Req</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium mb-3 text-slate-400 uppercase tracking-wider">Quick Implementation</h4>
                        <div className="bg-black/50 rounded-xl border border-white/10 p-5 font-mono text-sm overflow-x-auto custom-scrollbar">
                            <div className="flex gap-2 mb-3 border-b border-white/10 pb-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <pre className="text-green-400">
                                {`// 1. Construct Payment URL
const params = new URLSearchParams({
  amount: "499",
  orderId: "ORD-001",
  returnUrl: "/success"
});

const paymentUrl = \`/pay?\${params.toString()}\`;

// 2. Redirect User
window.location.href = paymentUrl;`}
                            </pre>
                        </div>
                        <div className="mt-4 flex gap-3">
                            <button className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                                View Full API Docs
                            </button>
                            <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors">
                                Generate API Key
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SnackzoPayManagement;
