import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send, User, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Ticket {
    id: string;
    user_id: string;
    subject: string;
    status: string;
    created_at: string;
    user_email?: string;
}

interface Message {
    id: string;
    ticket_id: string;
    message: string;
    created_at: string;
    is_admin_reply: boolean;
}

const LiveSupport = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [reply, setReply] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch active tickets
    useEffect(() => {
        fetchTickets();

        const channel = supabase
            .channel('admin-tickets')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'support_tickets' },
                () => fetchTickets()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch messages for selected ticket
    useEffect(() => {
        if (!selectedTicketId) return;

        fetchMessages(selectedTicketId);

        const channel = supabase
            .channel(`admin-chat:${selectedTicketId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${selectedTicketId}` },
                (payload) => {
                    setMessages(prev => [...prev, payload.new as Message]);
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedTicketId]);

    const fetchTickets = async () => {
        const { data } = await supabase
            .from("support_tickets")
            .select("*")
            .neq("status", "closed")
            .order("created_at", { ascending: false });

        if (data) setTickets(data);
    };

    const fetchMessages = async (ticketId: string) => {
        const { data } = await supabase
            .from("support_messages")
            .select("*")
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true });

        if (data) {
            setMessages(data);
            scrollToBottom();
        }
    };

    const sendReply = async () => {
        if (!reply.trim() || !selectedTicketId) return;

        const msg = reply.trim();
        setReply("");

        const { error } = await supabase.from("support_messages").insert({
            ticket_id: selectedTicketId,
            sender_id: user?.id, // Admin ID
            message: msg,
            is_admin_reply: true
        });

        if (error) toast.error("Failed to send");
        else scrollToBottom();
    };

    const closeTicket = async () => {
        if (!selectedTicketId) return;

        const { error } = await supabase
            .from("support_tickets")
            .update({ status: 'closed' })
            .eq("id", selectedTicketId);

        if (!error) {
            toast.success("Ticket closed");
            setSelectedTicketId(null);
            fetchTickets();
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
            {/* Ticket List */}
            <div className="glass-card md:col-span-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20">
                    <h3 className="font-bold flex items-center gap-2">
                        <MessageSquare size={18} />
                        Active Chats ({tickets.length})
                    </h3>
                </div>
                <ScrollArea className="flex-1">
                    <div className="divide-y divide-border">
                        {tickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicketId(ticket.id)}
                                className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedTicketId === ticket.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-bold text-sm truncate">User #{ticket.user_id.slice(0, 4)}</p>
                                    <span className="text-[10px] text-muted-foreground">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">{ticket.subject || "No subject"}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${ticket.status === 'open' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                    <span className="text-[10px] uppercase">{ticket.status}</span>
                                </div>
                            </div>
                        ))}
                        {tickets.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                No active chats
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="glass-card md:col-span-2 flex flex-col overflow-hidden bg-background/50">
                {selectedTicketId ? (
                    <>
                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                            <div>
                                <h3 className="font-bold">Chat #{selectedTicketId.slice(0, 8)}</h3>
                                <p className="text-xs text-muted-foreground">Live Support</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={closeTicket} className="gap-2">
                                <CheckCircle size={14} />
                                Close Ticket
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.is_admin_reply ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.is_admin_reply
                                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                                            : 'bg-muted text-foreground rounded-tl-none'
                                        }`}>
                                        <p>{msg.message}</p>
                                        <p className="text-[9px] opacity-70 text-right mt-1">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-border bg-background">
                            <form
                                onSubmit={(e) => { e.preventDefault(); sendReply(); }}
                                className="flex gap-2"
                            >
                                <input
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    placeholder="Type a reply..."
                                    className="flex-1 bg-muted rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <Button size="icon" type="submit" className="rounded-full">
                                    <Send size={16} />
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <MessageSquare size={48} className="mb-4 opacity-20" />
                        <p>Select a ticket to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveSupport;
