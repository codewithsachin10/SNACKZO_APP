import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Send, ArrowLeft, Phone, MoreVertical,
  Image, MapPin, Clock, Check, CheckCheck, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'runner' | 'system';
  sender_id: string;
  message: string;
  message_type: 'text' | 'image' | 'location' | 'system';
  image_url?: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  order_id?: string;
  user_id: string;
  runner_id?: string;
  conversation_type: 'order_support' | 'runner_chat' | 'general_support';
  subject?: string;
  is_active: boolean;
  last_message_at?: string;
  user_unread_count: number;
  created_at: string;
}

interface QuickReply {
  id: string;
  message: string;
  category: string;
}

export interface ChatProps {
  orderId?: string;
  conversationId?: string;
  runnerName?: string;
  onClose?: () => void;
  isModal?: boolean;
  role?: 'user' | 'runner';
  currentUserId?: string;
  targetUserId?: string; // ID of the user the runner is chatting with
}

export function Chat({
  orderId,
  conversationId: propConversationId,
  runnerName,
  onClose,
  isModal = false,
  role = 'user',
  currentUserId,
  targetUserId
}: ChatProps) {
  const { user: authUser } = useAuth();
  const activeUserId = role === 'user' ? authUser?.id : currentUserId;

  const scrollRef = useRef<HTMLDivElement>(null);

  const [conversationId, setConversationId] = useState<string | null>(propConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchOrCreateConversation = useCallback(async () => {
    if (!orderId || !activeUserId) return;

    try {
      if (role === 'runner') {
        const { data } = await (supabase
          .from('chat_conversations' as any)
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle() as any);

        if (data) {
          setConversationId((data as any).id);
        } else if (targetUserId) {
          // Runner initiating chat: Create conversation
          const { data: newConv, error } = await supabase
            .from('chat_conversations' as any)
            .insert({
              order_id: orderId,
              user_id: targetUserId,
              runner_id: activeUserId,
              conversation_type: 'order_support',
              subject: `Order Support`
            })
            .select()
            .single();

          if (!error && newConv) {
            setConversationId((newConv as any).id);
            // Insert system message
            await supabase.from('chat_messages' as any).insert({
              conversation_id: (newConv as any).id,
              sender_type: 'system',
              sender_id: '00000000-0000-0000-0000-000000000000',
              message: 'Chat started by Delivery Partner',
              message_type: 'system'
            });
          }
        }
      } else {
        const { data, error } = await supabase.rpc('get_or_create_order_conversation' as any, {
          p_order_id: orderId,
          p_user_id: activeUserId,
        });

        if (!error && data) {
          setConversationId(data as string);
        }
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    }
  }, [activeUserId, orderId, role, targetUserId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await (supabase
        .from('chat_messages' as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }) as any);

      if (!error && data) {
        setMessages(data as Message[]);
        // Mark messages as read (exclude own messages)
        await (supabase
          .from('chat_messages' as any)
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_type', role) as any);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, role]);

  const fetchQuickReplies = useCallback(async () => {
    try {
      const targetRole = role === 'user' ? 'user' : 'runner';
      const { data } = await (supabase
        .from('quick_replies' as any)
        .select('*')
        .or(`for_role.eq.${targetRole},for_role.eq.both`)
        .eq('is_active', true)
        .order('display_order') as any);

      if (data) {
        setQuickReplies(data as QuickReply[]);
      }
    } catch (err) {
      console.error('Error fetching quick replies:', err);
    }
  }, [role]);

  useEffect(() => {
    if (!activeUserId) return;

    if (propConversationId) {
      setConversationId(propConversationId);
    } else if (orderId) {
      fetchOrCreateConversation();
    }

    fetchQuickReplies();
  }, [activeUserId, orderId, propConversationId, fetchOrCreateConversation, fetchQuickReplies]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();

      const channel = supabase
        .channel(`chat-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => [...prev, newMsg]);

            if (newMsg.sender_type !== role) {
              try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => { });
              } catch { }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, fetchMessages, role]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!activeUserId || !conversationId || !text.trim()) return;

    setIsSending(true);

    try {
      const { error } = await (supabase
        .from('chat_messages' as any)
        .insert({
          conversation_id: conversationId,
          sender_type: role,
          sender_id: activeUserId,
          message: text.trim(),
          message_type: 'text',
        }) as any);

      if (error) throw error;

      await (supabase
        .from('chat_conversations' as any)
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId) as any);

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(newMessage);
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    msgs.forEach((msg) => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d');
  };

  const messageGroups = groupMessagesByDate(messages);

  if (!activeUserId) return null;

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-cyan text-white shadow-md z-10">
        <div className="flex items-center gap-3">
          {isModal && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 hover:text-white">
              <ArrowLeft size={24} />
            </Button>
          )}
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarFallback className="bg-lime-500 text-white font-bold">
              {runnerName?.[0]?.toUpperCase() || '🏃'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-lg leading-none">{runnerName || 'Delivery Partner'}</p>
            <p className="text-xs text-white/80 flex items-center gap-1 font-medium mt-1">
              <span className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              Online
            </p>
          </div>
        </div>

        <a href={`tel:${"9999999999"}`} className="p-2 rounded-full hover:bg-white/20 transition-colors">
          <Phone size={24} className="text-white" />
        </a>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-lime border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
            <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mb-4">
              <MessageCircle className="text-muted-foreground/50" size={48} strokeWidth={1} />
            </div>
            <div>
              <p className="text-muted-foreground font-medium text-lg">No messages yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Say hi to your delivery partner!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messageGroups.map((group) => (
              <div key={group.date}>
                {/* Date Header */}
                <div className="flex justify-center mb-4">
                  <Badge variant="outline" className="bg-muted">
                    {formatDateHeader(group.date)}
                  </Badge>
                </div>

                {/* Messages */}
                {group.messages.map((msg) => {
                  const isMe = msg.sender_type === role;
                  const isSystem = msg.sender_type === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {msg.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${isMe
                          ? 'bg-lime text-background rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                          }`}
                      >
                        {msg.message_type === 'image' && msg.image_url && (
                          <img
                            src={msg.image_url}
                            alt="Shared image"
                            className="rounded-lg max-w-full mb-2"
                          />
                        )}
                        <p className="text-sm">{msg.message}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-background/70' : 'text-muted-foreground'
                            }`}
                        >
                          <span className="text-[10px]">
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </span>
                          {isMe && (
                            msg.is_read ? (
                              <CheckCheck size={12} />
                            ) : (
                              <Check size={12} />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Quick Replies */}
      {quickReplies.length > 0 && (
        <div className="px-4 py-2 border-t overflow-x-auto">
          <div className="flex gap-2">
            {quickReplies.slice(0, 5).map((reply) => (
              <Button
                key={reply.id}
                variant="outline"
                size="sm"
                className="whitespace-nowrap text-xs"
                onClick={() => sendMessage(reply.message)}
              >
                {reply.message}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background/50 backdrop-blur-md pb-8 sm:pb-4">
        <div className="flex gap-3 items-end">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-muted/30 border-white/10 h-12 rounded-xl focus-visible:ring-emerald-500/50"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            className="h-12 w-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all active:scale-95"
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <span className="animate-spin text-lg">⏳</span>
            ) : (
              <Send size={20} className="ml-0.5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {content}
      </div>
    );
  }

  return <div className="h-[500px] flex flex-col border rounded-lg overflow-hidden">{content}</div>;
}

// Conversation List Component
export function ConversationList({ onSelectConversation }: { onSelectConversation: (id: string) => void }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase
        .from('chat_conversations' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false }) as any);

      if (!error && data) {
        setConversations(data as Conversation[]);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-lime border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="mx-auto mb-4 text-muted-foreground" size={48} />
        <p className="text-muted-foreground">No conversations yet</p>
        <p className="text-sm text-muted-foreground">
          Start a chat from your order tracking page
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <Card
          key={conv.id}
          className="neu-card cursor-pointer hover:border-lime transition-colors"
          onClick={() => onSelectConversation(conv.id)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-lime text-background">
                🏃
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-bold truncate">{conv.subject || 'Order Chat'}</p>
                {conv.user_unread_count > 0 && (
                  <Badge className="bg-lime text-background">
                    {conv.user_unread_count}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {conv.last_message_at
                  ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                  : 'No messages'}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default Chat;
