import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerSuccessCelebration, sendNotification } from "@/utils/notificationService";
import {
    Mail, Send, Users, Search, Smartphone, Globe,
    Zap, History as HistoryIcon, Plus, X,
    Terminal, Library, Flame, Utensils, Check, Loader2,
    Cpu, User, Sparkles, MoreHorizontal, Settings, ShieldCheck,
    Activity, Radio, MessageSquare, Info, Filter, Paperclip, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const MOCK_USERS = [
    { id: 'm1', full_name: 'Aditya Sharma', email: 'aditya.s@hostel.edu', phone: '+91 98765 43210' },
    { id: 'm2', full_name: 'Priya Verma', email: 'priya.v@hostel.edu', phone: '+91 87654 32109' },
    { id: 'm3', full_name: 'Rahul Khanna', email: 'rahul.k@hostel.edu', phone: '+91 76543 21098' },
    { id: 'm4', full_name: 'Sneha Reddy', email: 'sneha.r@hostel.edu', phone: '+91 65432 10987' },
];

const TEMPLATES = [
    { id: 't1', category: 'Promo', title: 'Midnight Biryani', icon: <Flame className="text-orange-500" />, content: "Late night study session? 📚 Order 'Midnight Masala' Biryani! Extra spicy, delivered in 15 mins. Use code STUDY20 for 20% OFF." },
    { id: 't2', category: 'Promo', title: 'Free Burger Drink', icon: <Utensils className="text-amber-500" />, content: "Burger Binge! 🍔 Order any Monster Burger and get a FREE Cold Coffee. Valid tonight for {name}!" },
    { id: 't3', category: 'Status', title: 'Out for Delivery', icon: <Smartphone className="text-blue-500" />, content: "On the Move! 🛵 Your runner is heading to your block. ETA: 8 minutes. Keep your phone ready, {name}!" },
];

interface ChatLog {
    role: 'user' | 'ai';
    content: string;
}

export default function NotificationCenter() {
    const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'ai'>('compose');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState("");
    const [subject, setSubject] = useState("");
    const [sendType, setSendType] = useState<'email' | 'sms'>('email');

    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<ChatLog[]>([
        { role: 'ai', content: "Hello! I'm your AI assistant. How can I help you draft your broadcast message today?" }
    ]);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    const syncDatabase = useCallback(async () => {
        try {
            setIsLoading(true);

            // 1. Try View (Most descriptive data)
            const { data: viewData } = await supabase
                .from('admin_users_view' as any)
                .select('id:user_id, full_name, phone, email')
                .limit(200);

            if (viewData && viewData.length > 0) {
                setUsers(viewData);
                return;
            }

            // 2. Fallback to Profiles
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id:user_id, full_name, phone, email' as any) // Type cast in case schema is being synced
                .limit(200);

            if (profileError) throw profileError;

            if (profileData && profileData.length > 0) {
                setUsers(profileData);
            } else {
                setUsers(MOCK_USERS);
            }
        } catch (err) {
            setUsers(MOCK_USERS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { syncDatabase(); }, [syncDatabase]);

    const handleSend = async () => {
        if (selectedUserIds.length === 0) {
            toast.error("Please select recipients.");
            return;
        }

        if (!message.trim()) {
            toast.error("Message content cannot be empty.");
            return;
        }

        setIsSending(true);
        const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
        let successCount = 0;

        try {
            for (const user of selectedUsers) {
                const target = sendType === 'email' ? user.email : user.phone;
                if (!target) continue;

                try {
                    await sendNotification(sendType, {
                        to: target,
                        subject: subject || "Update from Snackzo",
                        message: message.replace(/{name}/g, user.full_name || 'Student')
                    });
                    successCount++;
                } catch (e) {
                    console.error("Single Node Failure:", e);
                }
            }

            if (successCount > 0) {
                triggerSuccessCelebration();
                toast.success(`Message sent to ${successCount} recipients.`);
                setMessage("");
                setSubject("");
                setSelectedUserIds([]);
            } else {
                toast.error("Failed to send message. Please check your credentials.");
            }
        } finally {
            setIsSending(false);
        }
    };

    const sendMessage = async () => {
        if (!chatInput.trim()) return;
        const input = chatInput;
        const gKey = import.meta.env.VITE_GEMINI_API_KEY;

        setChatInput("");
        setChatHistory(prev => [...prev, { role: 'user', content: input }]);
        setIsAiTyping(true);

        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${gKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: `Draft a professional notification for: ${input}` }] }] })
            });
            const data = await res.json();
            const finalResponse = data.candidates ? data.candidates[0].content.parts[0].text : "I couldn't generate a draft. Please try again.";
            setChatHistory(prev => [...prev, { role: 'ai', content: finalResponse }]);
        } catch (e) {
            setChatHistory(prev => [...prev, { role: 'ai', content: "AI service temporarily unavailable. Please draft manually." }]);
        }
        setIsAiTyping(false);
    };

    const selectedUsers = useMemo(() => {
        return users.filter(u => selectedUserIds.includes(u.id));
    }, [users, selectedUserIds]);

    return (
        <div className="bg-zinc-50 text-zinc-900 min-h-[600px] flex flex-col font-sans overflow-hidden rounded-2xl border border-zinc-200 shadow-sm relative">

            {/* Simple Navigation Header */}
            <div className="h-14 border-b border-zinc-200 flex items-center justify-between px-6 bg-white">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <Send size={16} className="text-zinc-400" />
                        <h1 className="text-sm font-semibold text-zinc-700">Notifications</h1>
                    </div>

                    <nav className="flex items-center gap-1">
                        {[
                            { id: 'compose', label: 'Compose' },
                            { id: 'templates', label: 'Templates' },
                            { id: 'ai', label: 'AI Assistant' }
                        ].map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                                className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                                    activeTab === t.id ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50")}>
                                {t.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-medium text-emerald-700">Online</span>
                    </div>
                    <Settings size={16} className="text-zinc-400 cursor-pointer hover:text-zinc-600" />
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">

                {/* User Sidebar - Simple & Clean */}
                <div className="w-72 border-r border-zinc-200 bg-white flex flex-col">
                    <div className="p-4 border-b border-zinc-200">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg h-9 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all placeholder:text-zinc-400"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-0.5">
                            {users.map(u => {
                                const isSelected = selectedUserIds.includes(u.id);
                                return (
                                    <div key={u.id} onClick={() => setSelectedUserIds(prev => isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                        className={cn("group px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all",
                                            isSelected ? "bg-zinc-100" : "hover:bg-zinc-50")}>

                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                isSelected ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500")}>
                                                {u.full_name?.[0].toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-medium text-zinc-700 truncate">{u.full_name || 'Anonymous'}</p>
                                                <p className="text-[10px] text-zinc-400 truncate">
                                                    {sendType === 'email' ? (u.email || 'No email') : (u.phone || 'No phone')}
                                                </p>
                                            </div>
                                        </div>
                                        {isSelected && <Check size={14} className="text-zinc-900" />}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t border-zinc-200 bg-zinc-50">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-zinc-500">Selected</span>
                            <span className="text-[10px] font-bold text-zinc-900">{selectedUserIds.length} users</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-white flex flex-col relative">
                    <AnimatePresence mode="wait">
                        {activeTab === 'compose' && (
                            <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">

                                {/* Header Fields - Minimalist */}
                                <div className="divide-y divide-zinc-100">
                                    <div className="py-3 px-8 flex items-center gap-6">
                                        <span className="text-xs font-medium text-zinc-400 w-16">To</span>
                                        <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                                            {selectedUsers.length === 0 && <span className="text-xs text-zinc-300 italic">Select recipients from the list</span>}
                                            {selectedUsers.map(u => (
                                                <Badge key={u.id} variant="secondary" className="bg-zinc-100 text-zinc-600 font-medium px-2 py-1 border-transparent hover:bg-zinc-200 transition-all flex items-center gap-2">
                                                    <span className="max-w-[100px] truncate">{u.full_name?.split(' ')[0]}</span>
                                                    <span className="text-[10px] opacity-50 font-normal bg-zinc-200/50 px-1.5 rounded-sm">
                                                        {sendType === 'email' ? u.email : u.phone}
                                                    </span>
                                                    <X size={10} className="opacity-40 hover:opacity-100 cursor-pointer" onClick={() => setSelectedUserIds(p => p.filter(id => id !== u.id))} />
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="py-3 px-8 flex items-center gap-6">
                                        <span className="text-xs font-medium text-zinc-400 w-16">Platform</span>
                                        <div className="flex bg-zinc-50 p-1 rounded-lg border border-zinc-200">
                                            <button onClick={() => setSendType('email')} className={cn("px-4 py-1 rounded-md text-[11px] font-medium transition-all", sendType === 'email' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>Email</button>
                                            <button onClick={() => setSendType('sms')} className={cn("px-4 py-1 rounded-md text-[11px] font-medium transition-all", sendType === 'sms' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>SMS</button>
                                        </div>
                                    </div>

                                    {sendType === 'email' && (
                                        <div className="py-3 px-8 flex items-center gap-6">
                                            <span className="text-xs font-medium text-zinc-400 w-16">Subject</span>
                                            <input className="flex-1 bg-transparent border-none text-sm font-medium text-zinc-800 focus:outline-none placeholder:text-zinc-200" placeholder="Message subject..." value={subject} onChange={e => setSubject(e.target.value)} />
                                        </div>
                                    )}
                                </div>

                                {/* Text Area - Clean Page Style */}
                                <div className="flex-1 p-10 flex flex-col relative group">
                                    <div className="flex gap-2 absolute top-6 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {['name', 'block', 'order'].map(tag => (
                                            <button key={tag} onClick={() => setMessage(p => p + `{${tag}}`)}
                                                className="px-2 py-1 rounded border border-zinc-200 text-[10px] font-medium text-zinc-500 hover:bg-zinc-50 transition-all">+{tag}</button>
                                        ))}
                                    </div>
                                    <Textarea
                                        className="flex-1 bg-transparent border-none p-0 text-base leading-relaxed font-medium resize-none focus-visible:ring-0 shadow-none placeholder:text-zinc-200 text-zinc-700"
                                        placeholder="Start typing your message here..."
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                    />

                                    {sendType === 'sms' && (
                                        <div className="mt-4 flex items-center gap-4 py-2 px-4 bg-zinc-50 border border-zinc-200 rounded-lg w-fit">
                                            <div className="text-[10px] font-medium text-zinc-500">
                                                Chars: <span className={cn("font-bold", message.length > 160 ? "text-red-500" : "text-zinc-900")}>{message.length} / 160</span>
                                            </div>
                                            <div className="w-px h-3 bg-zinc-200" />
                                            <div className="text-[10px] font-medium text-zinc-500">
                                                Segments: <span className="font-bold text-zinc-900">{Math.ceil(message.length / 160) || 1}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Bar */}
                                <div className="h-20 border-t border-zinc-100 px-8 flex items-center justify-between bg-zinc-50/50">
                                    <div className="flex items-center gap-4">
                                        <Paperclip size={18} className="text-zinc-300 hover:text-zinc-600 cursor-pointer" />
                                        <MoreHorizontal size={18} className="text-zinc-300 hover:text-zinc-600 cursor-pointer" />
                                    </div>

                                    <Button
                                        onClick={handleSend}
                                        disabled={isSending}
                                        className="h-10 px-6 bg-zinc-900 text-white font-medium text-xs rounded-lg hover:bg-zinc-800 transition-all flex items-center gap-2"
                                    >
                                        {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        {isSending ? "Sending..." : "Send Dispatch"}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'ai' && (
                            <motion.div key="ai" className="flex flex-col h-full bg-white">
                                <ScrollArea ref={chatScrollRef} className="flex-1 p-8">
                                    <div className="max-w-2xl mx-auto space-y-8">
                                        <div className="text-center py-6">
                                            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                                                <Sparkles size={20} className="text-white" />
                                            </div>
                                            <h2 className="text-sm font-bold text-zinc-900">AI Drafting Assistant</h2>
                                            <p className="text-xs text-zinc-400">Describe what you want to send, and I'll draft it for you.</p>
                                        </div>

                                        {chatHistory.map((m, i) => (
                                            <div key={i} className={cn("flex gap-4", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                                <div className={cn("px-4 py-3 rounded-2xl text-xs leading-relaxed",
                                                    m.role === 'user' ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700")}>
                                                    {m.content}
                                                    {m.role === 'ai' && i > 0 && (
                                                        <button onClick={() => { setMessage(m.content); setActiveTab('compose'); }}
                                                            className="mt-3 text-[10px] font-bold text-zinc-900 border-b border-zinc-900 hover:opacity-60 transition-all block w-fit">
                                                            USE THIS DRAFT
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <div className="p-6 border-t border-zinc-100">
                                    <div className="max-w-2xl mx-auto relative">
                                        <input
                                            className="w-full h-11 bg-zinc-50 border border-zinc-200 rounded-full px-6 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all"
                                            placeholder="Ask AI for a draft..."
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                        />
                                        <button onClick={sendMessage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:scale-105 transition-all">
                                            <ArrowUpRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'templates' && (
                            <motion.div key="templates" className="p-8 h-full overflow-y-auto bg-zinc-50">
                                <div className="grid grid-cols-2 gap-4">
                                    {TEMPLATES.map(t => (
                                        <div key={t.id} onClick={() => { setMessage(t.content); setActiveTab('compose'); }}
                                            className="p-5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-400 transition-all cursor-pointer group">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                                                    {t.icon}
                                                </div>
                                                <span className="text-[10px] font-bold text-zinc-300 group-hover:text-zinc-500 uppercase tracking-wider">{t.category}</span>
                                            </div>
                                            <h4 className="text-xs font-bold text-zinc-900 mb-2">{t.title}</h4>
                                            <p className="text-[11px] leading-relaxed text-zinc-500 line-clamp-3">"{t.content}"</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Minimal Footer Info */}
            <div className="h-8 border-t border-zinc-200 flex items-center justify-between px-6 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-zinc-300">Region: Asia-Pacific</span>
                    <span className="text-[10px] text-zinc-300">v1.2.0</span>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={10} className="text-zinc-300" />
                    <span className="text-[10px] text-zinc-300">Authenticated Secure Connection</span>
                </div>
            </div>
        </div>
    );
}
