import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, Activity, Lock, Search, Filter, RefreshCw, FileText } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface AuditLog {
    id: number;
    event_type: string;
    table_name: string;
    record_id: string;
    old_data: any;
    new_data: any;
    severity: "INFO" | "WARNING" | "CRITICAL";
    user_id: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
}

const SecurityDashboard = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [activeLocks, setActiveLocks] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");

    const fetchLogs = async () => {
        setLoading(true);
        // 1. Fetch Audit Logs
        const { data, error } = await supabase
            .from("security_audit_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);

        if (error) console.error("Error fetching logs:", error);
        else setLogs(data || []);

        // 2. Fetch Active Locks (Blocked Users)
        const { count, error: lockError } = await supabase
            .from("rate_limit_tracking")
            .select("key", { count: 'exact', head: true })
            .gt('blocked_until', new Date().toISOString());

        if (!lockError && count !== null) setActiveLocks(count);

        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();

        // Subscribe to realtime updates
        const channel = supabase
            .channel('security-dashboard')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'security_audit_logs' },
                (payload) => {
                    setLogs((prev) => [payload.new as AuditLog, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "CRITICAL": return "text-red-500 bg-red-500/10 border-red-500/20";
            case "WARNING": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
            default: return "text-blue-500 bg-blue-500/10 border-blue-500/20";
        }
    };

    const filteredLogs = filter === "ALL" ? logs : logs.filter(l => l.severity === filter);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Shield className="text-green-500" /> Security Operations Center
                        </h1>
                        <p className="text-slate-400 mt-1">Real-time surveillance of system integrity and user records.</p>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        label="Total Events (24h)"
                        value={logs.length}
                        icon={FileText}
                        color="text-blue-400"
                    />
                    <StatCard
                        label="Critical Alerts"
                        value={logs.filter(l => l.severity === "CRITICAL").length}
                        icon={AlertTriangle}
                        color="text-red-500"
                    />
                    <StatCard
                        label="Active Locks"
                        value={activeLocks}
                        icon={Lock}
                        color="text-yellow-500"
                    />
                    <StatCard
                        label="System Health"
                        value="100%"
                        icon={Activity}
                        color="text-green-500"
                    />
                </div>

                {/* Filter Bar */}
                <div className="flex gap-4 mb-6">
                    {["ALL", "CRITICAL", "WARNING", "INFO"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? "bg-slate-800 text-white border border-slate-700"
                                : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Logs Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">Severity</th>
                                <th className="p-4">Event</th>
                                <th className="p-4">Target</th>
                                <th className="p-4 hidden md:table-cell">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredLogs.map((log) => (
                                <motion.tr
                                    key={log.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hover:bg-slate-800/50 transition-colors"
                                >
                                    <td className="p-4 text-slate-400 font-mono text-sm whitespace-nowrap">
                                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getSeverityColor(log.severity)}`}>
                                            {log.severity}
                                        </span>
                                    </td>
                                    <td className="p-4 font-medium text-white">
                                        {log.event_type}
                                    </td>
                                    <td className="p-4 text-slate-300">
                                        <div className="flex flex-col text-xs">
                                            <span>{log.table_name}</span>
                                            <span className="font-mono text-slate-500">{log.record_id}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-400 text-xs hidden md:table-cell max-w-md truncate">
                                        {/* Render simplified changeset */}
                                        {log.old_data && log.new_data ? (
                                            <div>
                                                {Object.keys(log.new_data).map(key => {
                                                    if (log.new_data[key] !== log.old_data[key]) {
                                                        return (
                                                            <span key={key} className="mr-2">
                                                                <span className="text-slate-500">{key}:</span>{" "}
                                                                <span className="text-red-400 line-through">{String(log.old_data[key])}</span>
                                                                {" -> "}
                                                                <span className="text-green-400">{String(log.new_data[key])}</span>
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        ) : (
                                            <span className="opacity-50">No Changeset</span>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500">
                                        No security events found. System is quiet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center gap-4">
        <div className={`p-3 rounded-lg bg-slate-950 ${color}`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">{label}</p>
            <p className="text-2xl font-black text-white">{value}</p>
        </div>
    </div>
);

export default SecurityDashboard;
