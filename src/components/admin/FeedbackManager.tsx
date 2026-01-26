import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Star, MessageSquare, CheckCircle2, User, Mail, Trash2,
    TrendingUp, ThumbsUp, AlertCircle, Loader2, RefreshCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FeedbackItem {
    id: string;
    user_id: string;
    rating: number;
    category: string;
    message: string;
    is_resolved: boolean;
    created_at: string;
    related_order_id?: string;
    profile?: {
        full_name: string;
        email: string;
    };
}

import { FormBuilder } from "./FormBuilder"; // Leaving this import if we decide to keep the component file here, but normally we'd remove unused imports. However, I will just remove the component usage.
// Actually, I'll remove the import if I'm moving it.

export default function FeedbackManager() {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
    const [replyMode, setReplyMode] = useState(false);
    const [replyMessage, setReplyMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    // showFormBuilder state removed

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        setIsLoading(true);
        try {
            const { data: items, error } = await supabase
                .from('app_feedback')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!items || items.length === 0) {
                setFeedback([]);
                return;
            }

            const userIds = [...new Set(items.map(i => i.user_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name, email')
                .in('user_id', userIds);

            const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

            const enriched = items.map(item => ({
                ...item,
                profile: profileMap.get(item.user_id)
            }));

            setFeedback(enriched);

        } catch (err) {
            console.error(err);
            toast.error("Failed to load feedback");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolve = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('app_feedback')
                .update({ is_resolved: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            setFeedback(prev => prev.map(item =>
                item.id === id ? { ...item, is_resolved: !currentStatus } : item
            ));

            if (selectedItem?.id === id) {
                setSelectedItem(prev => prev ? { ...prev, is_resolved: !currentStatus } : null);
            }

            toast.success(`Marked as ${!currentStatus ? 'Resolved' : 'Unresolved'}`);
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this feedback?")) return;
        try {
            const { error } = await supabase.from('app_feedback').delete().eq('id', id);
            if (error) throw error;
            setFeedback(prev => prev.filter(i => i.id !== id));
            setSelectedItem(null);
            toast.success("Feedback deleted");
        } catch (err) {
            toast.error("Failed to delete");
        }
    };

    const sendReply = async () => {
        if (!selectedItem?.profile?.email) {
            return toast.error("User email not found");
        }
        setIsSending(true);
        try {
            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: selectedItem.profile.email,
                    subject: `Response to your Snackzo Feedback`,
                    from: "Snackzo Team <admin@snackzo.tech>",
                    html: `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2 style="color: #7c3aed;">Hello ${selectedItem.profile.full_name},</h2>
                            <p>Thank you for your feedback regarding <strong>${selectedItem.category.replace('_', ' ')}</strong>.</p>
                            <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #7c3aed; margin: 20px 0;">
                                <i>"${selectedItem.message}"</i>
                            </div>
                            <p>${replyMessage}</p>
                            <br/>
                            <p>Best regards,<br/>Snackzo Admin Team</p>
                        </div>
                    `
                }
            });

            if (error) throw error;

            toast.success("Reply sent successfully!");
            setReplyMode(false);
            setReplyMessage("");
            if (!selectedItem.is_resolved) {
                handleResolve(selectedItem.id, false);
            }
        } catch (err) {
            toast.error("Failed to send email");
        } finally {
            setIsSending(false);
        }
    };

    // Stats Calculation
    const total = feedback.length;
    const avgRating = total > 0 ? (feedback.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(1) : "0.0";
    const promoters = feedback.filter(i => i.rating >= 5).length;
    const detractors = feedback.filter(i => i.rating <= 3).length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* FormBuilder removed from here */}

            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* ... (First 3 cards) ... */}
                <div className="glass-card p-5 border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Feedback</p>
                    <p className="text-3xl font-bold">{total}</p>
                </div>
                <div className="glass-card p-5 border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Avg. Rating</p>
                    <div className="flex items-center gap-2">
                        <p className="text-3xl font-bold">{avgRating}</p>
                        <Star className="text-yellow-400 fill-yellow-400" size={24} />
                    </div>
                </div>
                <div className="glass-card p-5 border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Net Promoter Score</p>
                    <div className="flex items-center gap-2">
                        <p className={cn("text-3xl font-bold", nps > 0 ? "text-lime" : "text-destructive")}>{nps}</p>
                        <TrendingUp size={24} className="text-muted-foreground" />
                    </div>
                </div>
                <div className="glass-card p-5 border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Pending</p>
                        <p className="text-3xl font-bold text-amber-500">{feedback.filter(i => !i.is_resolved).length}</p>
                    </div>
                    <button onClick={fetchFeedback} className="p-2.5 hover:bg-white/10 rounded-xl transition-colors">
                        <RefreshCcw size={20} className={cn("text-muted-foreground", isLoading && "animate-spin")} />
                    </button>
                    {/* Create Button removed */}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">

                {/* List View */}
                <div className="glass-card border-white/5 overflow-hidden flex flex-col lg:col-span-1">
                    <div className="p-4 border-b border-white/5 bg-white/5">
                        <h3 className="font-bold text-sm">Recent Feedback</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                        ) : feedback.length === 0 ? (
                            <div className="py-20 text-center text-muted-foreground text-sm">No feedback yet</div>
                        ) : (
                            feedback.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedItem(item)}
                                    className={cn(
                                        "p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/5",
                                        selectedItem?.id === item.id ? "border-primary bg-primary/10" : "border-white/5 bg-card/40"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={12} className={cn(i < item.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                                            ))}
                                        </div>
                                        {item.is_resolved ? <CheckCircle2 size={16} className="text-lime" /> : <div className="w-2 h-2 rounded-full bg-destructive" />}
                                    </div>
                                    <p className="text-sm font-medium line-clamp-2 mb-3 leading-relaxed">"{item.message}"</p>
                                    <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        <span>{item.category.replace('_', ' ')}</span>
                                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Detail View */}
                <div className="lg:col-span-2 glass-card border-white/5 overflow-hidden flex flex-col relative">
                    {selectedItem ? (
                        <div className="flex flex-col h-full">
                            <div className="p-6 border-b border-white/5 flex justify-between items-start bg-white/5">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        {selectedItem.profile?.full_name || 'Anonymous User'}
                                    </h2>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                        <Mail size={12} /> {selectedItem.profile?.email || 'No email provided'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleDelete(selectedItem.id)}
                                        className="p-2 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleResolve(selectedItem.id, selectedItem.is_resolved)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors",
                                            selectedItem.is_resolved ? "bg-lime/20 text-lime" : "bg-white/10 hover:bg-lime/20 hover:text-lime"
                                        )}
                                    >
                                        <CheckCircle2 size={16} />
                                        {selectedItem.is_resolved ? "Resolved" : "Mark Resolved"}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                        selectedItem.rating >= 4 ? "bg-lime/20 text-lime" :
                                            selectedItem.rating <= 2 ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-500"
                                    )}>
                                        {selectedItem.rating} Stars
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-white/10 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                        {selectedItem.category.replace('_', ' ')}
                                    </span>
                                    {selectedItem.related_order_id && (
                                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                            Order #{selectedItem.related_order_id.slice(0, 5)}
                                        </span>
                                    )}
                                </div>

                                <blockquote className="text-lg leading-relaxed italic border-l-4 border-primary pl-6 py-2 mb-8 bg-white/5 rounded-r-xl">
                                    "{selectedItem.message}"
                                </blockquote>

                                <div className="mt-8">
                                    {!replyMode ? (
                                        <button
                                            onClick={() => setReplyMode(true)}
                                            className="px-6 py-3 bg-white text-black rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-white/90 transition-colors"
                                        >
                                            <MessageSquare size={16} /> Reply to User
                                        </button>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-card/40 p-6 rounded-xl border border-white/10"
                                        >
                                            <h4 className="font-bold text-sm mb-3 flex items-center justify-between">
                                                Compose Reply
                                                <button onClick={() => setReplyMode(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                                            </h4>
                                            <textarea
                                                value={replyMessage}
                                                onChange={(e) => setReplyMessage(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[120px]"
                                                placeholder={`Hi ${selectedItem.profile?.full_name?.split(' ')[0] || 'there'}, thanks for reaching out...`}
                                            />
                                            <div className="flex justify-end mt-3">
                                                <button
                                                    onClick={sendReply}
                                                    disabled={isSending || !replyMessage.trim()}
                                                    className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                                                >
                                                    {isSending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                                                    Send Email
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30">
                            <ThumbsUp size={64} className="mb-4 opacity-50" />
                            <p className="text-lg font-bold">Feedback Analytics Center</p>
                            <p className="text-sm opacity-70">Select feedback to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
