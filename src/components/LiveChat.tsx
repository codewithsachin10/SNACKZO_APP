import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, X, Send, Loader2, User, HeadphoneOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Message {
    id: string;
    sender_id: string | null;
    message: string;
    created_at: string;
    is_admin_reply: boolean;
}

export const LiveChat = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [ticketId, setTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch or create active ticket
    useEffect(() => {
        if (user && isOpen) {
            checkActiveTicket();
        }
    }, [user, isOpen]);

    // Subscribe to messages when ticket is active
    useEffect(() => {
        if (!ticketId) return;

        fetchMessages();

        const channel = supabase
            .channel(`chat:${ticketId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [ticketId]);

    const checkActiveTicket = async () => {
        setIsLoading(true);
        // Find latest open ticket
        const { data } = await supabase
            .from("support_tickets")
            .select("id")
            .eq("user_id", user?.id)
            .eq("status", "open")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (data) {
            setTicketId(data.id);
        }
        setIsLoading(false);
    };

    const startChat = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("support_tickets")
                .insert({ user_id: user?.id, subject: "Live Chat Request", status: "open" })
                .select()
                .single();

            if (error) throw error;
            setTicketId(data.id);

            // Send initial welcome message
            await supabase.from("support_messages").insert({
                ticket_id: data.id,
                message: "Hi there! How can we help you today?",
                is_admin_reply: true // System message
            });
        } catch (err) {
            toast.error("Failed to start chat");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMessages = async () => {
        const { data } = await supabase
            .from("support_messages")
            .select("*")
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true });

        if (data) {
            setMessages(data as Message[]);
            scrollToBottom();
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || !ticketId) return;

        const msg = input.trim();
        setInput("");

        // Optimistic UI
        const tempId = Math.random().toString();
        const tempMsg = { id: tempId, sender_id: user?.id || "", message: msg, created_at: new Date().toISOString(), is_admin_reply: false };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        const { error } = await supabase.from("support_messages").insert({
            ticket_id: ticketId,
            sender_id: user?.id,
            message: msg
        });

        if (error) {
            toast.error("Failed to send");
            setMessages(prev => prev.filter(m => m.id !== tempId)); // Revert
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    if (!user) return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-24 right-4 z-50 w-80 sm:w-96 h-[500px] glass-card flex flex-col shadow-2xl border-primary/20 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-primary/10 p-4 border-b border-primary/10 flex items-center justify-between backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <div className="w-2 h-2 rounded-full bg-green-500 absolute bottom-0 right-0 animate-pulse" />
                                    <HeadphoneOff className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Support Chat</h3>
                                    <p className="text-[10px] text-muted-foreground">Typically replies in 5m</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="hover:bg-primary/20 p-1 rounded transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-background/40 relative flex flex-col min-h-0">
                            {!ticketId ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                                        <MessageCircle size={32} className="text-primary" />
                                    </div>
                                    <h4 className="font-bold">Need help?</h4>
                                    <p className="text-sm text-muted-foreground">Start a conversation with our support team.</p>
                                    <Button onClick={startChat} disabled={isLoading} className="w-full">
                                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <MessageCircle className="mr-2" size={16} />}
                                        Start Chat
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                                        {messages.map((msg) => {
                                            const isMe = !msg.is_admin_reply;
                                            return (
                                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe
                                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                        : 'bg-secondary text-secondary-foreground rounded-tl-none'
                                                        }`}>
                                                        {msg.message}
                                                        <p className={`text-[9px] mt-1 opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {messages.length === 0 && (
                                            <p className="text-center text-xs text-muted-foreground mt-4">No messages yet.</p>
                                        )}
                                    </div>

                                    <div className="p-3 border-t border-border bg-background/50 backdrop-blur-sm">
                                        <form
                                            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                                            className="flex gap-2"
                                        >
                                            <input
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder="Type a message..."
                                                className="flex-1 bg-secondary/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                            <Button size="icon" type="submit" className="rounded-full w-9 h-9 shrink-0">
                                                <Send size={14} />
                                            </Button>
                                        </form>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-6 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:shadow-primary/50 transition-shadow"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
            </motion.button>
        </>
    );
};
