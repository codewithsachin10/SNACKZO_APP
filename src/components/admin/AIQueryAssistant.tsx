import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot, Send, X, Sparkles, Copy, Check, Play, Terminal,
    Lightbulb, Zap, Database, ArrowLeft, RefreshCw,
    GripVertical, ThumbsUp, ThumbsDown, Clock, Trash2, Download,
    History, FileCode, Wand2, Code2, Table2, BarChart3,
    AlertCircle, CheckCircle2, XCircle, Command
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    query?: string;
    timestamp: Date;
    feedback?: "positive" | "negative";
}

interface QueryHistory {
    id: string;
    query: string;
    timestamp: Date;
    rowCount: number;
    success: boolean;
}

interface AIQueryAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onRunQuery: (query: string) => void;
}

// MEGA Enhanced Query Generator - 50+ patterns
const generateQuery = (input: string): { response: string; query: string | null; confidence: number } => {
    const lower = input.toLowerCase().trim();
    const words = lower.split(/\s+/);

    // Detect table from input
    const tableMap: Record<string, string> = {
        'order': 'orders', 'orders': 'orders',
        'product': 'products', 'products': 'products', 'item': 'products', 'items': 'products',
        'user': 'profiles', 'users': 'profiles', 'customer': 'profiles', 'customers': 'profiles',
        'profile': 'profiles', 'profiles': 'profiles', 'member': 'profiles',
        'category': 'categories', 'categories': 'categories',
        'runner': 'runners', 'runners': 'runners', 'delivery': 'runners', 'driver': 'runners',
        'review': 'reviews', 'reviews': 'reviews', 'rating': 'reviews', 'ratings': 'reviews', 'feedback': 'reviews',
        'coupon': 'coupons', 'coupons': 'coupons', 'discount': 'coupons', 'promo': 'coupons',
        'notification': 'notifications', 'notifications': 'notifications', 'alert': 'notifications',
        'session': 'active_sessions', 'sessions': 'active_sessions', 'device': 'active_sessions',
        'feature': 'feature_toggles', 'features': 'feature_toggles', 'toggle': 'feature_toggles',
        'ticket': 'support_tickets', 'tickets': 'support_tickets', 'support': 'support_tickets',
        'loyalty': 'loyalty_points', 'points': 'loyalty_points'
    };

    let table = 'profiles';
    for (const [key, val] of Object.entries(tableMap)) {
        if (lower.includes(key)) { table = val; break; }
    }

    // Extract numbers
    const numMatch = lower.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0]) : 10;

    // FIELD SEARCHES (email, phone, name, id, etc.)
    if (/email|mail|e-mail/.test(lower)) {
        if (/where|find|search|get|show|with/.test(lower)) {
            const emailMatch = lower.match(/[\w.-]+@[\w.-]+\.\w+/);
            if (emailMatch) {
                return { response: `📧 **Finding user by email**`, query: `SELECT * FROM profiles WHERE email = '${emailMatch[0]}'`, confidence: 98 };
            }
            return { response: `📧 **All emails in database**`, query: `SELECT id, full_name, email, phone, created_at FROM profiles WHERE email IS NOT NULL ORDER BY created_at DESC LIMIT 50`, confidence: 95 };
        }
        return { response: `📧 **Email addresses**`, query: `SELECT id, full_name, email FROM profiles ORDER BY created_at DESC LIMIT 50`, confidence: 94 };
    }

    if (/phone|mobile|contact|number/.test(lower)) {
        if (/where|find|search|get|with/.test(lower)) {
            const phoneMatch = lower.match(/\d{10,}/);
            if (phoneMatch) {
                return { response: `📱 **Finding user by phone**`, query: `SELECT * FROM profiles WHERE phone LIKE '%${phoneMatch[0]}%'`, confidence: 97 };
            }
        }
        return { response: `📱 **Phone numbers**`, query: `SELECT id, full_name, phone, email FROM profiles WHERE phone IS NOT NULL ORDER BY created_at DESC LIMIT 50`, confidence: 94 };
    }

    if (/name|full_name|fullname/.test(lower)) {
        const nameMatch = lower.match(/(?:named?|called?|name is|name =)\s+['"]?(\w+)['"]?/i);
        if (nameMatch) {
            return { response: `👤 **Finding user by name**`, query: `SELECT * FROM profiles WHERE full_name ILIKE '%${nameMatch[1]}%'`, confidence: 96 };
        }
        return { response: `👤 **User names**`, query: `SELECT id, full_name, email, phone FROM profiles ORDER BY full_name LIMIT 50`, confidence: 93 };
    }

    // ID searches
    if (/\b(id|uuid)\b/.test(lower)) {
        const idMatch = lower.match(/[a-f0-9-]{36}|[a-f0-9]{32}/i);
        if (idMatch) {
            return { response: `🔍 **Finding by ID**`, query: `SELECT * FROM ${table} WHERE id = '${idMatch[0]}'`, confidence: 99 };
        }
    }

    // COUNT queries
    if (/how many|count|total|number of/.test(lower)) {
        return { response: `📊 **Counting ${table}**`, query: `SELECT COUNT(*) as total FROM ${table}`, confidence: 96 };
    }

    // SHOW/LIST/GET ALL
    if (/show all|list all|get all|fetch all|display all|select \*|all records|everything/.test(lower)) {
        return { response: `📋 **All ${table}**`, query: `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 50`, confidence: 95 };
    }

    // RECENT/LATEST/LAST
    if (/recent|latest|newest|last|first/.test(lower)) {
        const order = /first|oldest/.test(lower) ? 'ASC' : 'DESC';
        return { response: `🕐 **Recent ${table}**`, query: `SELECT * FROM ${table} ORDER BY created_at ${order} LIMIT ${num}`, confidence: 94 };
    }

    // TIME-BASED
    if (/today|today's/.test(lower)) {
        return { response: `📅 **Today's ${table}**`, query: `SELECT * FROM ${table} WHERE created_at >= CURRENT_DATE ORDER BY created_at DESC`, confidence: 96 };
    }
    if (/yesterday/.test(lower)) {
        return { response: `📅 **Yesterday's ${table}**`, query: `SELECT * FROM ${table} WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE ORDER BY created_at`, confidence: 95 };
    }
    if (/this week|weekly|last 7|past week/.test(lower)) {
        return { response: `📆 **This week's ${table}**`, query: `SELECT * FROM ${table} WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' ORDER BY created_at DESC`, confidence: 94 };
    }
    if (/this month|monthly|last 30/.test(lower)) {
        return { response: `📆 **This month's ${table}**`, query: `SELECT * FROM ${table} WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' ORDER BY created_at DESC`, confidence: 93 };
    }
    if (/this year|yearly/.test(lower)) {
        return { response: `📆 **This year's ${table}**`, query: `SELECT * FROM ${table} WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE) ORDER BY created_at DESC`, confidence: 92 };
    }

    // ORDER STATUS
    if (/pending|placed|packing|packed|delivering|delivered|cancelled|completed|processing/.test(lower)) {
        const status = lower.match(/pending|placed|packing|packed|delivering|delivered|cancelled|completed|processing/)?.[0] || 'placed';
        return { response: `🏷️ **${status} orders**`, query: `SELECT * FROM orders WHERE status = '${status}' ORDER BY created_at DESC`, confidence: 97 };
    }

    // REVENUE/MONEY
    if (/revenue|sales|earnings|income|money|profit/.test(lower)) {
        if (/today/.test(lower)) {
            return { response: `💰 **Today's revenue**`, query: `SELECT SUM(total) as revenue, COUNT(*) as orders FROM orders WHERE created_at >= CURRENT_DATE AND status != 'cancelled'`, confidence: 96 };
        }
        if (/week/.test(lower)) {
            return { response: `💵 **Weekly revenue**`, query: `SELECT DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as orders FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date`, confidence: 95 };
        }
        return { response: `💰 **Total revenue**`, query: `SELECT SUM(total) as total_revenue, COUNT(*) as total_orders, AVG(total) as avg_order FROM orders WHERE status != 'cancelled'`, confidence: 94 };
    }

    // TOP/BEST/POPULAR
    if (/top|best|popular|most|highest|maximum/.test(lower)) {
        if (/product|selling|ordered/.test(lower)) {
            return { response: `🏆 **Top products**`, query: `SELECT product_name, COUNT(*) as orders, SUM(quantity) as qty FROM order_items GROUP BY product_name ORDER BY orders DESC LIMIT ${num}`, confidence: 94 };
        }
        if (/customer|user|buyer/.test(lower)) {
            return { response: `🏆 **Top customers**`, query: `SELECT user_id, COUNT(*) as orders, SUM(total) as spent FROM orders GROUP BY user_id ORDER BY spent DESC LIMIT ${num}`, confidence: 93 };
        }
    }

    // LOW/OUT OF STOCK
    if (/low stock|running low|almost out|stock alert/.test(lower)) {
        return { response: `⚠️ **Low stock alert**`, query: `SELECT name, stock, price FROM products WHERE stock < 10 AND is_available = true ORDER BY stock ASC`, confidence: 96 };
    }
    if (/out of stock|no stock|zero stock|unavailable/.test(lower)) {
        return { response: `🚫 **Out of stock**`, query: `SELECT name, price FROM products WHERE stock = 0 OR is_available = false`, confidence: 97 };
    }

    // ACTIVE/ONLINE
    if (/active|online|logged in|current/.test(lower)) {
        if (/user|session|device/.test(lower)) {
            return { response: `👥 **Active sessions**`, query: `SELECT device_info, ip_address, location, last_active FROM active_sessions WHERE last_active >= NOW() - INTERVAL '30 minutes' ORDER BY last_active DESC`, confidence: 93 };
        }
        if (/runner/.test(lower)) {
            return { response: `🏃 **Active runners**`, query: `SELECT id, name, phone FROM runners WHERE is_active = true`, confidence: 95 };
        }
    }

    // AVERAGE
    if (/average|avg|mean/.test(lower)) {
        if (/rating|review/.test(lower)) {
            return { response: `⭐ **Average rating**`, query: `SELECT ROUND(AVG(rating)::numeric, 2) as avg_rating, COUNT(*) as reviews FROM reviews`, confidence: 94 };
        }
        if (/order|price|value/.test(lower)) {
            return { response: `📈 **Average order**`, query: `SELECT ROUND(AVG(total)::numeric, 2) as avg_order FROM orders WHERE status != 'cancelled'`, confidence: 93 };
        }
    }

    // GROUP BY / BREAKDOWN
    if (/group|breakdown|by status|by category|distribution|statistics|stats/.test(lower)) {
        if (/status/.test(lower) || table === 'orders') {
            return { response: `📊 **Status breakdown**`, query: `SELECT status, COUNT(*) as count, SUM(total) as value FROM orders GROUP BY status ORDER BY count DESC`, confidence: 95 };
        }
        if (/category/.test(lower)) {
            return { response: `🏷️ **Category breakdown**`, query: `SELECT category_id, COUNT(*) as products FROM products GROUP BY category_id ORDER BY products DESC`, confidence: 93 };
        }
    }

    // SEARCH / FIND / WHERE
    if (/search|find|where|look for|locate/.test(lower)) {
        return { response: `🔍 **Search ${table}**\n\nModify the query with your search term:`, query: `SELECT * FROM ${table} WHERE id IS NOT NULL ORDER BY created_at DESC LIMIT 20`, confidence: 80 };
    }

    // RUNNER queries
    if (/runner|delivery|driver/.test(lower)) {
        if (/performance|stats/.test(lower)) {
            return { response: `📊 **Runner stats**`, query: `SELECT r.name, r.phone, COUNT(o.id) as deliveries FROM runners r LEFT JOIN orders o ON r.id = o.runner_id GROUP BY r.id ORDER BY deliveries DESC`, confidence: 93 };
        }
        return { response: `👥 **All runners**`, query: `SELECT id, name, phone, is_active FROM runners ORDER BY is_active DESC, name`, confidence: 92 };
    }

    // REVIEWS
    if (/review|feedback|rating/.test(lower)) {
        if (/bad|low|negative|poor|1|2/.test(lower)) {
            return { response: `😟 **Low ratings**`, query: `SELECT rating, comment, created_at FROM reviews WHERE rating <= 2 ORDER BY created_at DESC`, confidence: 94 };
        }
        if (/good|high|positive|great|5|4/.test(lower)) {
            return { response: `😊 **Good reviews**`, query: `SELECT rating, comment, created_at FROM reviews WHERE rating >= 4 ORDER BY created_at DESC`, confidence: 94 };
        }
        return { response: `⭐ **All reviews**`, query: `SELECT rating, comment, created_at FROM reviews ORDER BY created_at DESC LIMIT 20`, confidence: 92 };
    }

    // FEATURES/CONFIG
    if (/feature|toggle|setting|config|enabled|disabled/.test(lower)) {
        if (/enabled|on|active/.test(lower)) {
            return { response: `✅ **Enabled features**`, query: `SELECT feature_name, display_name FROM feature_toggles WHERE is_enabled = true`, confidence: 95 };
        }
        if (/disabled|off/.test(lower)) {
            return { response: `❌ **Disabled features**`, query: `SELECT feature_name, display_name FROM feature_toggles WHERE is_enabled = false`, confidence: 95 };
        }
        return { response: `⚙️ **All features**`, query: `SELECT feature_name, display_name, is_enabled FROM feature_toggles ORDER BY feature_name`, confidence: 94 };
    }

    // SIMPLE TABLE ACCESS
    if (words.length <= 3 && Object.keys(tableMap).some(k => lower.includes(k))) {
        return { response: `📋 **${table} data**`, query: `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 50`, confidence: 88 };
    }

    // DEFAULT - Smart suggestions
    return {
        response: `🤔 **I need more context**\n\nTry:\n• "Show all emails"\n• "Find user with phone 9876543210"\n• "Today's orders"\n• "Low stock products"\n• "Count total users"\n• "Revenue this week"`,
        query: null,
        confidence: 0
    };
};

// Templates
const TEMPLATES = [
    { name: "All Emails", query: "Show all emails", icon: Clock },
    { name: "Today's Orders", query: "Today's orders", icon: AlertCircle },
    { name: "Low Stock", query: "Low stock products", icon: AlertCircle },
    { name: "Revenue", query: "Today's revenue", icon: BarChart3 },
    { name: "Top Products", query: "Top selling products", icon: Table2 },
    { name: "User Count", query: "Count total users", icon: BarChart3 },
];

const AIQueryAssistant = ({ isOpen, onClose, onRunQuery }: AIQueryAssistantProps) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: "w", role: "assistant", content: `👋 **AI Query Assistant**\n\nAsk me anything! Examples:\n• "Show all user emails"\n• "Find orders from today"\n• "Low stock products"`, timestamp: new Date() }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [currentQuery, setCurrentQuery] = useState<string | null>(null);
    const [queryResult, setQueryResult] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [leftWidth, setLeftWidth] = useState(45);
    const [isDragging, setIsDragging] = useState(false);
    const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setLeftWidth(Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 30), 70));
    }, [isDragging]);
    const handleMouseUp = useCallback(() => setIsDragging(false), []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
        }
        return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleSend = async (text?: string) => {
        const msg = text || input;
        if (!msg.trim()) return;
        setMessages(p => [...p, { id: Date.now().toString(), role: "user", content: msg.trim(), timestamp: new Date() }]);
        setInput(""); setIsTyping(true);
        await new Promise(r => setTimeout(r, 600));
        const { response, query, confidence } = generateQuery(msg);
        setMessages(p => [...p, { id: (Date.now() + 1).toString(), role: "assistant", content: response + (confidence > 0 ? `\n\n_Confidence: ${confidence}%_` : ''), query: query || undefined, timestamp: new Date() }]);
        setIsTyping(false);
        if (query) setCurrentQuery(query);
    };

    const runQuery = async (query: string) => {
        setCurrentQuery(query); setIsRunning(true); setQueryResult(null);
        const start = Date.now();
        try {
            const match = query.toLowerCase().match(/from\s+(\w+)/);
            if (!match) { setQueryResult({ error: "Could not parse table" }); setIsRunning(false); return; }
            const { data, error } = await supabase.from(match[1]).select('*').limit(50);
            if (error) { setQueryResult({ error: error.message }); }
            else { setQueryResult({ success: true, data, rowCount: data?.length || 0, time: Date.now() - start }); toast.success(`${data?.length} rows in ${Date.now() - start}ms`); }
            setQueryHistory(p => [{ id: Date.now().toString(), query, timestamp: new Date(), rowCount: data?.length || 0, success: !error }, ...p.slice(0, 9)]);
        } catch (e: any) { setQueryResult({ error: e.message }); }
        setIsRunning(false);
    };

    const exportData = (f: 'json' | 'csv') => {
        if (!queryResult?.data) return;
        const content = f === 'json' ? JSON.stringify(queryResult.data, null, 2) : [Object.keys(queryResult.data[0]).join(','), ...queryResult.data.map((r: any) => Object.values(r).join(','))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content])); a.download = `export.${f}`; a.click(); toast.success(`Exported ${f.toUpperCase()}`);
    };

    if (!isOpen) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative h-14 border-b border-white/10 px-4 flex items-center justify-between bg-black/20 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-white/80"><ArrowLeft size={18} /></button>
                    <div className="flex items-center gap-3">
                        <motion.div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500" animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                            <Bot className="text-white" size={20} />
                        </motion.div>
                        <div><h2 className="font-bold text-white flex items-center gap-2">AI Query Assistant <span className="px-1.5 py-0.5 text-[9px] bg-gradient-to-r from-purple-500 to-pink-500 rounded text-white">PRO</span></h2></div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowHistory(!showHistory)} className={cn("p-2 rounded-lg", showHistory ? "bg-white/20 text-white" : "text-white/60")}><History size={18} /></button>
                    <button onClick={() => setMessages([{ id: "n", role: "assistant", content: "💬 Chat cleared!", timestamp: new Date() }])} className="p-2 rounded-lg text-white/60 hover:text-red-400"><Trash2 size={18} /></button>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] text-green-400">Connected</span></div>
                </div>
            </div>

            <div ref={containerRef} className="relative flex h-[calc(100vh-3.5rem)]">
                <div className="flex flex-col" style={{ width: `${leftWidth}%` }}>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map(m => (
                            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", m.role === "user" ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gradient-to-br from-purple-500 to-pink-500")}>
                                    {m.role === "user" ? <span className="text-white text-sm font-bold">U</span> : <Bot size={18} className="text-white" />}
                                </div>
                                <div className={cn("max-w-[80%]", m.role === "user" && "text-right")}>
                                    <div className={cn("inline-block p-4 rounded-2xl text-sm", m.role === "user" ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-tr-sm" : "bg-white/10 text-white/90 rounded-tl-sm border border-white/10")}>
                                        <p className="whitespace-pre-wrap">{m.content.split('**').map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</p>
                                    </div>
                                    {m.query && (
                                        <div className="mt-2 p-3 bg-zinc-900/80 rounded-xl border border-zinc-700/50 text-left">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-mono text-zinc-400"><Code2 size={12} className="inline mr-1" />SQL</span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => { navigator.clipboard.writeText(m.query!); toast.success("Copied!"); }} className="p-1 hover:bg-zinc-800 rounded text-zinc-400"><Copy size={14} /></button>
                                                    <button onClick={() => runQuery(m.query!)} className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded"><Play size={10} /> Run</button>
                                                </div>
                                            </div>
                                            <pre className="text-xs font-mono text-green-400 bg-black/30 p-2 rounded overflow-x-auto">{m.query}</pre>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"><Bot size={18} className="text-white animate-pulse" /></div>
                                <div className="bg-white/10 rounded-2xl p-4 border border-white/10"><div className="flex gap-1">{[0, 1, 2].map(i => <motion.span key={i} className="w-2 h-2 bg-purple-400 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />)}</div></div>
                            </div>
                        )}
                        <div className="pt-4 grid grid-cols-3 gap-2">
                            {TEMPLATES.map((t, i) => <button key={i} onClick={() => handleSend(t.query)} className="flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/70"><t.icon size={14} className="text-purple-400" />{t.name}</button>)}
                        </div>
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-white/10 bg-black/20">
                        <div className="flex gap-2">
                            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Ask about emails, orders, users..." className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 focus:border-purple-500/50 outline-none text-sm text-white placeholder-white/40" />
                            <button onClick={() => handleSend()} disabled={!input.trim()} className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-50"><Send size={18} /></button>
                        </div>
                    </div>
                </div>

                <div onMouseDown={handleMouseDown} className={cn("w-1 bg-white/10 hover:bg-purple-500/50 cursor-col-resize flex items-center justify-center", isDragging && "bg-purple-500")}><GripVertical size={14} className="text-white/20" /></div>

                <div className="flex flex-col bg-zinc-950" style={{ width: `${100 - leftWidth}%` }}>
                    <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                        <div className="flex items-center gap-3"><div className="flex gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /><span className="w-3 h-3 rounded-full bg-yellow-500" /><span className="w-3 h-3 rounded-full bg-green-500" /></div><Terminal size={14} className="text-green-400" /><span className="font-mono text-sm text-green-400">Terminal</span></div>
                        {queryResult?.success && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-mono rounded">{queryResult.rowCount} rows • {queryResult.time}ms</span>}
                    </div>
                    {currentQuery && (
                        <div className="p-3 border-b border-zinc-800 bg-zinc-900/80">
                            <div className="flex items-center justify-between mb-2"><span className="text-xs font-mono text-zinc-500">QUERY</span><button onClick={() => runQuery(currentQuery)} disabled={isRunning} className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs font-bold rounded">{isRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}{isRunning ? "..." : "Execute"}</button></div>
                            <pre className="text-sm font-mono text-green-400 bg-black/50 p-2 rounded overflow-x-auto">{currentQuery}</pre>
                        </div>
                    )}
                    <div className="flex-1 overflow-auto p-3">
                        {!currentQuery && <div className="h-full flex flex-col items-center justify-center text-zinc-600"><Terminal size={48} className="mb-3 opacity-20" /><p className="font-mono text-sm">No query yet</p></div>}
                        {isRunning && <div className="h-full flex items-center justify-center"><RefreshCw size={32} className="text-green-400 animate-spin" /></div>}
                        {queryResult && !isRunning && (queryResult.error ? <div className="p-4 bg-red-500/10 border border-red-500/30 rounded"><XCircle size={16} className="text-red-400 inline mr-2" /><span className="text-red-300 text-sm">{queryResult.error}</span></div> : queryResult.data?.length > 0 ? (
                            <div>
                                <div className="flex justify-end gap-2 mb-2"><button onClick={() => exportData('json')} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400"><Download size={12} className="inline mr-1" />JSON</button><button onClick={() => exportData('csv')} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400"><Download size={12} className="inline mr-1" />CSV</button></div>
                                <div className="overflow-x-auto rounded border border-zinc-800">
                                    <table className="w-full font-mono text-xs">
                                        <thead className="bg-zinc-800/80"><tr><th className="px-3 py-2 text-left text-zinc-400">#</th>{Object.keys(queryResult.data[0]).map(c => <th key={c} className="px-3 py-2 text-left text-zinc-400 whitespace-nowrap">{c}</th>)}</tr></thead>
                                        <tbody className="divide-y divide-zinc-800/50">{queryResult.data.map((r: any, i: number) => <tr key={i} className="hover:bg-zinc-800/30"><td className="px-3 py-2 text-zinc-600">{i + 1}</td>{Object.values(r).map((v: any, j: number) => <td key={j} className="px-3 py-2 text-zinc-300 max-w-[150px] truncate">{v === null ? <span className="text-zinc-600">null</span> : typeof v === 'boolean' ? <span className={v ? "text-green-400" : "text-red-400"}>{String(v)}</span> : String(v).substring(0, 40)}</td>)}</tr>)}</tbody>
                                    </table>
                                </div>
                            </div>
                        ) : <div className="text-center text-zinc-500 p-8"><CheckCircle2 size={32} className="mx-auto mb-2 text-green-500/50" />No results</div>)}
                    </div>
                    {showHistory && queryHistory.length > 0 && <div className="border-t border-zinc-800 bg-zinc-900/80 p-2 max-h-32 overflow-y-auto"><div className="text-xs text-zinc-500 mb-1"><History size={12} className="inline mr-1" />History</div>{queryHistory.map(h => <button key={h.id} onClick={() => runQuery(h.query)} className="w-full flex items-center justify-between p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded text-left mb-1"><span className="text-xs font-mono text-zinc-400 truncate flex-1">{h.query.substring(0, 40)}...</span><span className={cn("text-[10px]", h.success ? "text-green-400" : "text-red-400")}>{h.rowCount}r</span></button>)}</div>}
                    <div className="p-2 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between"><span className="text-[10px] font-mono text-zinc-600">{queryResult?.success ? `✓ ${queryResult.rowCount} rows` : "Ready"}</span><span className="text-[10px] font-mono text-zinc-500"><Database size={10} className="inline mr-1" />Supabase</span></div>
                </div>
            </div>
        </motion.div>
    );
};

export default AIQueryAssistant;
