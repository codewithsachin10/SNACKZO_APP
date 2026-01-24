import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageCircle, X, Send, Bot, User, Sparkles, Package,
    CreditCard, MapPin, Clock, ChevronRight, Loader2,
    ThumbsUp, ThumbsDown, RefreshCw, Mic, MicOff, Volume2, VolumeX,
    ShoppingBag, HelpCircle, Star, Zap, Gift, Heart, Coffee,
    Minimize2, Maximize2, Trash2, Download, Share2, Copy,
    ChevronDown, Search, TrendingUp, Award, Flame, PartyPopper,
    CheckCircle2, XCircle, AlertCircle, Info, ArrowRight, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// ============================================
// TYPES & INTERFACES
// ============================================

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
    suggestions?: string[];
    actions?: ChatAction[];
    rating?: 'up' | 'down' | null;
    images?: string[];
    emoji?: string;
    isImportant?: boolean;
    metadata?: {
        orderId?: string;
        productId?: string;
        amount?: number;
    };
}

interface ChatAction {
    label: string;
    icon: React.ReactNode;
    action: 'navigate' | 'copy' | 'call' | 'order' | 'track' | 'refund';
    data?: any;
    variant?: 'default' | 'success' | 'danger';
}

interface OrderInfo {
    id: string;
    status: string;
    total: number;
    created_at: string;
    items_count?: number;
}

interface ProductInfo {
    id: string;
    name: string;
    price: number;
    image_url?: string;
}

interface UserContext {
    userName?: string;
    recentOrders?: OrderInfo[];
    walletBalance?: number;
    favoriteProducts?: ProductInfo[];
    totalOrders?: number;
    memberSince?: string;
    loyaltyPoints?: number;
}

// ============================================
// KNOWLEDGE BASE
// ============================================

const KNOWLEDGE_BASE = {
    faqs: [
        { q: 'What are your delivery hours?', a: 'We deliver from 8 AM to 11 PM, 7 days a week!' },
        { q: 'How long does delivery take?', a: 'Most orders arrive in 15-25 minutes!' },
        { q: 'What payment methods do you accept?', a: 'UPI, Wallet balance, and Cash on Delivery!' },
        { q: 'How do refunds work?', a: 'Refunds are processed within 24-48 hours to your wallet.' },
        { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 2 minutes of placing.' },
    ],
    promos: [
        { code: 'FIRST50', desc: '50% off on first order', active: true },
        { code: 'WEEKEND20', desc: '20% off on weekends', active: true },
        { code: 'REFER100', desc: '₹100 for each referral', active: true },
    ],
    quickCategories: [
        { name: 'Snacks', emoji: '🍿', query: 'Show me snacks' },
        { name: 'Beverages', emoji: '🥤', query: 'Show beverages' },
        { name: 'Maggi', emoji: '🍜', query: 'I want Maggi' },
        { name: 'Combos', emoji: '🍱', query: 'Best combo deals' },
    ]
};

// ============================================
// ENHANCED AI RESPONSE GENERATOR
// ============================================

const generateEnhancedAIResponse = async (
    userMessage: string,
    context: UserContext,
    conversationHistory: Message[]
): Promise<{
    content: string;
    suggestions?: string[];
    actions?: ChatAction[];
    images?: string[];
    emoji?: string;
    isImportant?: boolean;
}> => {
    const msg = userMessage.toLowerCase().trim();
    const { userName, recentOrders, walletBalance, totalOrders, loyaltyPoints } = context;
    const firstName = userName?.split(' ')[0] || 'there';

    // Sentiment detection
    const isAngry = msg.match(/angry|bad|terrible|worst|hate|stupid|useless|ridiculous/);
    const isHappy = msg.match(/great|awesome|amazing|love|perfect|excellent|wonderful|best/);
    const isConfused = msg.match(/confused|don't understand|what|how|why|explain/);

    // ======= GREETING =======
    if (msg.match(/^(hi|hello|hey|hola|yo|sup|good morning|good afternoon|good evening|start)$/i)) {
        const timeOfDay = new Date().getHours();
        let greeting = '';
        let timeEmoji = '';

        if (timeOfDay < 12) {
            greeting = 'Good morning';
            timeEmoji = '🌅';
        } else if (timeOfDay < 17) {
            greeting = 'Good afternoon';
            timeEmoji = '☀️';
        } else {
            greeting = 'Good evening';
            timeEmoji = '🌙';
        }

        const stats = totalOrders ? `\n\n📊 **Your Stats:**\n• Orders placed: ${totalOrders}\n• Loyalty points: ${loyaltyPoints || 0} ⭐` : '';

        return {
            content: `${greeting}, ${firstName}! ${timeEmoji}\n\nWelcome to **SNACKZO AI** – your personal food assistant! I'm here to help you with:\n\n🍔 **Browse & Order** – Find your cravings\n📦 **Track Orders** – Real-time updates\n💳 **Payments** – Wallet, refunds & more\n🎁 **Rewards** – Offers & loyalty points\n❓ **Support** – Any issues? I'm here!${stats}\n\nWhat would you like to do today?`,
            suggestions: ['🛒 Order food', '📦 Track order', '💰 Check balance', '🔥 Today\'s deals'],
            emoji: '👋',
            actions: [{
                label: 'Quick Order',
                icon: <ShoppingBag size={14} />,
                action: 'navigate',
                data: '/'
            }]
        };
    }

    // ======= ORDER TRACKING =======
    if (msg.match(/track|where.*order|order status|status|delivery status|when.*arrive|eta|how long/)) {
        if (recentOrders && recentOrders.length > 0) {
            const latest = recentOrders[0];
            const statusConfig: Record<string, { emoji: string; color: string; message: string }> = {
                'pending': { emoji: '⏳', color: 'amber', message: 'Waiting for confirmation...' },
                'confirmed': { emoji: '✅', color: 'green', message: 'Order confirmed! Preparing soon.' },
                'preparing': { emoji: '👨‍🍳', color: 'blue', message: 'Your food is being prepared!' },
                'ready': { emoji: '📦', color: 'purple', message: 'Ready! Waiting for pickup.' },
                'out_for_delivery': { emoji: '🛵', color: 'orange', message: 'On the way to you!' },
                'delivered': { emoji: '🎉', color: 'green', message: 'Delivered! Enjoy your meal!' },
                'cancelled': { emoji: '❌', color: 'red', message: 'This order was cancelled.' }
            };

            const config = statusConfig[latest.status] || { emoji: '📋', color: 'gray', message: 'Processing...' };

            return {
                content: `${config.emoji} **Order #${latest.id.slice(0, 8).toUpperCase()}**\n\n**Status:** ${latest.status.replace(/_/g, ' ').toUpperCase()}\n${config.message}\n\n💰 **Total:** ₹${latest.total}\n🕐 **Placed:** ${new Date(latest.created_at).toLocaleString()}\n\n${latest.status === 'out_for_delivery' ? '🗺️ **Live tracking available!** Tap below to see your runner\'s location.' : ''}`,
                suggestions: ['🔄 Refresh status', '📞 Call runner', '❓ Report issue', '📜 Order history'],
                emoji: config.emoji,
                isImportant: latest.status === 'out_for_delivery',
                actions: [
                    {
                        label: 'Track Live',
                        icon: <MapPin size={14} />,
                        action: 'navigate',
                        data: `/orders/${latest.id}`,
                        variant: 'success'
                    },
                    {
                        label: 'View Receipt',
                        icon: <ExternalLink size={14} />,
                        action: 'navigate',
                        data: `/receipt/${latest.id}`
                    }
                ]
            };
        }

        return {
            content: `📭 I couldn't find any recent orders for your account.\n\nWould you like to explore our menu and place your first order? We have some amazing deals going on!`,
            suggestions: ['🍔 Browse menu', '🔥 Today\'s deals', '💬 I just ordered'],
            emoji: '🤔'
        };
    }

    // ======= WALLET & BALANCE =======
    if (msg.match(/wallet|balance|money|credit|refund|payment failed|add money|top.?up/)) {
        const balance = walletBalance || 0;
        const balanceEmoji = balance > 500 ? '💎' : balance > 100 ? '💰' : '💳';

        return {
            content: `${balanceEmoji} **Your Wallet**\n\n📊 **Current Balance:** ₹${balance.toFixed(2)}\n\n**Quick Actions:**\n• 💳 Add money for instant checkout\n• 🔄 Refunds credited within 24-48 hrs\n• 🎁 Earn wallet cashback on orders!\n\n${balance < 50 ? '⚠️ *Low balance! Add money to enjoy seamless ordering.*' : '✅ *You\'re all set for your next order!*'}`,
            suggestions: ['➕ Add ₹100', '➕ Add ₹500', '📜 Transaction history', '❓ Refund help'],
            emoji: balanceEmoji,
            actions: [
                {
                    label: 'Add Money',
                    icon: <CreditCard size={14} />,
                    action: 'navigate',
                    data: '/wallet',
                    variant: 'success'
                }
            ]
        };
    }

    // ======= MENU & RECOMMENDATIONS =======
    if (msg.match(/menu|food|hungry|eat|recommend|suggest|popular|trending|best seller|what.*order/)) {
        return {
            content: `🔥 **Today's Hot Picks!**\n\n1. 🍜 **Maggi Special** – ₹40\n   *Student favorite! Extra cheese + veggies*\n   ⭐ 4.9 (2.3k ratings)\n\n2. 🧀 **Cheese Burst Sandwich** – ₹60\n   *Loaded with mozzarella goodness*\n   ⭐ 4.8 (1.8k ratings)\n\n3. ☕ **Cold Coffee** – ₹45\n   *Creamy & refreshing*\n   ⭐ 4.7 (3.1k ratings)\n\n4. 🍱 **Mega Combo** – ₹99\n   *Sandwich + Maggi + Drink – BEST VALUE!*\n   ⭐ 4.9 (890 ratings)\n\n💡 *Psst! Use code **FIRST50** for 50% off!*`,
            suggestions: ['🍜 Order Maggi', '🧀 Cheese Sandwich', '🍱 Mega Combo', '📋 Full menu'],
            emoji: '😋',
            actions: [
                {
                    label: 'Browse Full Menu',
                    icon: <ShoppingBag size={14} />,
                    action: 'navigate',
                    data: '/',
                    variant: 'success'
                }
            ]
        };
    }

    // ======= SPECIFIC FOOD ITEMS =======
    if (msg.match(/maggi|noodles/)) {
        return {
            content: `🍜 **Maggi Menu**\n\n• **Classic Maggi** – ₹30\n• **Cheese Maggi** – ₹45\n• **Veggie Loaded Maggi** – ₹50\n• **Spicy Schezwan Maggi** – ₹55\n• **Paneer Butter Maggi** – ₹65\n\n⏱️ *Ready in 8-10 minutes!*\n🔥 *#1 most ordered item this week!*`,
            suggestions: ['Order Cheese Maggi', 'Full menu', 'Combo deals'],
            emoji: '🍜'
        };
    }

    if (msg.match(/coffee|tea|drink|beverage|cold|chai/)) {
        return {
            content: `☕ **Beverages**\n\n**Hot:**\n• Masala Chai – ₹20\n• Filter Coffee – ₹35\n• Hot Chocolate – ₹50\n\n**Cold:**\n• Cold Coffee – ₹45\n• Iced Tea – ₹40\n• Mango Shake – ₹55\n• Oreo Shake – ₹60\n\n🧊 *All cold drinks served chilled!*`,
            suggestions: ['Cold Coffee please', 'Masala Chai', 'See full menu'],
            emoji: '🥤'
        };
    }

    // ======= OFFERS & DISCOUNTS =======
    if (msg.match(/offer|discount|coupon|promo|code|deal|sale|cheap|save/)) {
        return {
            content: `🎁 **Active Offers**\n\n🏆 **FIRST50** – *50% off first order*\n   Max discount: ₹100\n\n🎉 **WEEKEND20** – *20% off on weekends*\n   Min order: ₹150\n\n👥 **REFER100** – *₹100 per referral*\n   Share your code & earn!\n\n⚡ **FLASH20** – *₹20 off on ₹99+*\n   Limited time only!\n\n💡 *Tip: Offers are auto-applied at checkout!*`,
            suggestions: ['Copy FIRST50', 'My referral code', 'How to apply?'],
            emoji: '🎁',
            actions: [
                {
                    label: 'Copy FIRST50',
                    icon: <Copy size={14} />,
                    action: 'copy',
                    data: 'FIRST50'
                }
            ]
        };
    }

    // ======= COMPLAINTS & ISSUES =======
    if (msg.match(/problem|issue|wrong|missing|late|cold|complaint|bad|refund|damaged|not received/)) {
        const empathyPrefix = isAngry
            ? `I'm really sorry you're facing this, ${firstName}. I understand how frustrating this must be. 😔`
            : `Oh no! I'm sorry to hear about this issue. Let me help you fix this right away! 🙏`;

        return {
            content: `${empathyPrefix}\n\n**What happened?**\n\n🍔 **Wrong item received**\n   → Free replacement + ₹50 coupon\n\n📦 **Item missing from order**\n   → Instant refund to wallet\n\n⏰ **Order arrived late**\n   → 20% discount on next order\n\n🥶 **Food arrived cold**\n   → Free replacement\n\n❌ **Order not received**\n   → Full refund + compensation\n\n*Select your issue below for instant resolution:*`,
            suggestions: ['Wrong item', 'Missing item', 'Late delivery', 'Cold food', 'Not received'],
            emoji: '🛠️',
            isImportant: true,
            actions: [
                {
                    label: 'Raise Ticket',
                    icon: <HelpCircle size={14} />,
                    action: 'navigate',
                    data: '/support',
                    variant: 'danger'
                }
            ]
        };
    }

    // ======= PAYMENT =======
    if (msg.match(/pay|payment|upi|gpay|phonepe|paytm|cash|cod|card|failed/)) {
        if (msg.match(/failed|not working|error|stuck/)) {
            return {
                content: `⚠️ **Payment Troubleshooting**\n\n**Common fixes:**\n1. Check internet connection\n2. Ensure sufficient bank balance\n3. Try a different UPI app\n4. Clear app cache & retry\n\n**Still failing?**\n• Use COD (Cash on Delivery)\n• Pay from SNACKZO wallet\n\n*If money was debited but order failed, it will be auto-refunded in 5-7 working days.*`,
                suggestions: ['Try wallet payment', 'Use COD', 'Check refund status', 'Contact bank'],
                emoji: '🔧'
            };
        }

        return {
            content: `💳 **Payment Options**\n\n**UPI (Instant):**\n• Google Pay\n• PhonePe\n• Paytm\n• Any UPI app\n\n**Wallet:**\n• Use SNACKZO balance\n• Instant checkout!\n\n**Cash:**\n• Pay on delivery\n• No extra charges\n\n🔒 *All payments are 100% secure with bank-grade encryption!*`,
            suggestions: ['Add money to wallet', 'Payment issues', 'UPI not working'],
            emoji: '💳'
        };
    }

    // ======= OPERATING HOURS =======
    if (msg.match(/open|close|timing|hours|available|when|schedule/)) {
        const now = new Date();
        const hour = now.getHours();
        const isOpen = hour >= 8 && hour < 23;

        return {
            content: `🕐 **SNACKZO Hours**\n\n📅 **Monday - Sunday**\n⏰ **8:00 AM - 11:00 PM**\n\n${isOpen
                ? '🟢 **We\'re OPEN now!** Order anytime!'
                : '🔴 **Closed now.** We open at 8 AM!'}\n\n📊 **Peak Hours (longer wait times):**\n• Lunch: 12 PM - 2 PM\n• Dinner: 7 PM - 9 PM\n\n💡 *Pro tip: Order during off-peak for fastest delivery!*`,
            suggestions: ['Order now', 'Set reminder', 'Contact us'],
            emoji: isOpen ? '✅' : '😴'
        };
    }

    // ======= ACCOUNT & PROFILE =======
    if (msg.match(/account|profile|settings|update|change phone|edit/)) {
        return {
            content: `👤 **Your Profile**\n\n📝 **Update your details:**\n• Name & phone number\n• Delivery address\n• Notification preferences\n\n🔐 **Security:**\n• Change password\n• Enable 2FA\n• Linked accounts\n\n📍 **Addresses:**\n• Add/edit delivery locations\n• Set default address`,
            suggestions: ['Edit profile', 'Add address', 'Change password', 'Notification settings'],
            emoji: '⚙️',
            actions: [{
                label: 'Go to Settings',
                icon: <ExternalLink size={14} />,
                action: 'navigate',
                data: '/settings'
            }]
        };
    }

    // ======= LOYALTY & REWARDS =======
    if (msg.match(/points|reward|loyalty|earn|redeem|level|tier/)) {
        const points = loyaltyPoints || 0;
        const level = points > 1000 ? 'Gold 🥇' : points > 500 ? 'Silver 🥈' : 'Bronze 🥉';

        return {
            content: `⭐ **Your Rewards**\n\n🎖️ **Level:** ${level}\n💫 **Points:** ${points}\n\n**Earn Points:**\n• 1 point per ₹10 spent\n• 50 bonus on referral\n• 10 points for reviews\n\n**Redeem:**\n• 100 pts = ₹10 off\n• 500 pts = ₹60 off\n• 1000 pts = ₹150 off\n\n${points >= 100 ? '✨ *You can redeem now!*' : `*Need ${100 - points} more points to redeem.*`}`,
            suggestions: ['Redeem points', 'How to earn more', 'Refer a friend'],
            emoji: '🏆'
        };
    }

    // ======= THANKS =======
    if (msg.match(/thank|thanks|thx|ty|appreciate|helpful|great job|good bot/)) {
        const responses = [
            `You're welcome, ${firstName}! 😊 Always happy to help!`,
            `Anytime, ${firstName}! 🙌 That's what I'm here for!`,
            `My pleasure! 💜 Enjoy your SNACKZO experience!`,
            `Glad I could help, ${firstName}! 🌟 Need anything else?`
        ];

        return {
            content: responses[Math.floor(Math.random() * responses.length)],
            suggestions: ['Order food', 'More questions', 'Rate SNACKZO ⭐'],
            emoji: '💜'
        };
    }

    // ======= GOODBYE =======
    if (msg.match(/bye|goodbye|see you|later|exit|close|done/)) {
        return {
            content: `Bye, ${firstName}! 👋\n\nIt was great chatting with you! Remember, I'm always here 24/7 if you need anything.\n\n🍔 Happy snacking! See you soon!`,
            suggestions: ['Actually, one more thing...', 'Close chat'],
            emoji: '👋'
        };
    }

    // ======= EASTER EGGS =======
    if (msg.match(/joke|tell me a joke|funny/)) {
        const jokes = [
            "Why did the cookie go to the doctor? Because it was feeling crummy! 🍪",
            "What do you call a fake noodle? An impasta! 🍝",
            "Why don't eggs tell jokes? They'd crack up! 🥚",
            "What's a computer's favorite snack? Microchips! 💻"
        ];
        return {
            content: jokes[Math.floor(Math.random() * jokes.length)],
            suggestions: ['Another joke!', 'Order food please', 'You\'re funny 😂'],
            emoji: '😂'
        };
    }

    if (msg.match(/love you|i love snackzo|best app/)) {
        return {
            content: `Aww, ${firstName}! 💜💜💜\n\nWe love you too! You're the reason we do what we do! 🙏\n\n✨ *You just earned 10 bonus loyalty points!* ✨`,
            suggestions: ['Order now!', 'My rewards', 'Share with friends'],
            emoji: '💜'
        };
    }

    // ======= FALLBACK =======
    return {
        content: `I'd love to help you with that, ${firstName}! 🤔\n\nHere's what I can assist with:\n\n🍔 **Order** – Browse menu, recommendations\n📦 **Track** – Real-time order status\n💰 **Wallet** – Balance, refunds, payments\n🎁 **Offers** – Discounts & promo codes\n🛠️ **Support** – Issues & complaints\n\nTry asking something like:\n• *"Track my order"*\n• *"What's trending today?"*\n• *"My item is missing"*`,
        suggestions: ['Order food', 'Track order', 'Today\'s offers', 'I need help'],
        emoji: '💡'
    };
};

// ============================================
// MAIN COMPONENT
// ============================================

const SnackzoAI = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [userContext, setUserContext] = useState<UserContext>({});
    const [unreadCount, setUnreadCount] = useState(0);
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(true);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    // ======= LOAD USER CONTEXT =======
    useEffect(() => {
        const loadContext = async () => {
            if (!user) return;

            let userName = undefined;
            let memberSince = undefined;
            let recentOrders: OrderInfo[] = [];
            let walletBalance = 0;

            // Load profile (required)
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, created_at')
                    .eq('user_id', user.id)
                    .single();
                userName = profile?.full_name;
                memberSince = profile?.created_at;
            } catch (err) {
                // Profile might not exist yet
            }

            // Load orders (optional)
            try {
                const { data: orders } = await supabase
                    .from('orders')
                    .select('id, status, total, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                recentOrders = (orders as OrderInfo[]) || [];
            } catch (err) {
                // Orders table might not exist
            }

            // Load wallet balance (optional - table may not exist)
            // Load wallet balance from profiles (Table of Truth)
            try {
                const { data: profileWallet } = await supabase
                    .from('profiles')
                    .select('wallet_balance')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (profileWallet) {
                    walletBalance = profileWallet.wallet_balance || 0;
                }
            } catch (err) {
                console.error("Wallet fetch error", err);
            }

            setUserContext({
                userName,
                memberSince,
                recentOrders,
                totalOrders: recentOrders.length,
                walletBalance,
                loyaltyPoints: Math.floor(recentOrders.length * 15)
            });
        };

        loadContext();
    }, [user]);

    // ======= INIT WELCOME MESSAGE =======
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            const welcome: Message = {
                id: 'welcome',
                role: 'assistant',
                content: userContext.userName
                    ? `Hey ${userContext.userName.split(' ')[0]}! 👋\n\nWelcome back to SNACKZO! I'm your AI assistant.\n\nHow can I help you today?`
                    : `Hey there! 👋\n\nI'm your SNACKZO AI assistant. I can help you order food, track deliveries, and more!\n\nWhat would you like to do?`,
                timestamp: new Date(),
                suggestions: ['🛒 Order food', '📦 Track order', '🎁 View offers', '❓ Get help'],
                emoji: '✨'
            };
            setMessages([welcome]);
        }
    }, [isOpen, userContext.userName, messages.length]);

    // ======= AUTO SCROLL =======
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ======= FOCUS INPUT =======
    useEffect(() => {
        if (isOpen && !isMinimized) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, isMinimized]);

    // ======= SPEECH RECOGNITION =======
    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-IN';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputValue(transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = () => {
                setIsListening(false);
                toast.error('Voice recognition failed');
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const startListening = () => {
        if (recognitionRef.current) {
            setIsListening(true);
            recognitionRef.current.start();
        } else {
            toast.error('Voice not supported in this browser');
        }
    };

    // ======= SEND MESSAGE =======
    const handleSend = useCallback(async (text?: string) => {
        const messageText = text || inputValue.trim();
        if (!messageText) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: messageText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);
        setShowQuickActions(false);

        // Typing delay
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 800));

        // Generate response
        const response = await generateEnhancedAIResponse(messageText, userContext, messages);

        const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: response.content,
            timestamp: new Date(),
            suggestions: response.suggestions,
            actions: response.actions,
            emoji: response.emoji,
            isImportant: response.isImportant
        };

        setIsTyping(false);
        setMessages(prev => [...prev, aiMessage]);

        // Play sound
        if (isSoundEnabled) {
            // Sound effect would go here
        }
    }, [inputValue, userContext, messages, isSoundEnabled]);

    // ======= HANDLE ACTIONS =======
    const handleAction = (action: ChatAction) => {
        switch (action.action) {
            case 'navigate':
                navigate(action.data);
                setIsOpen(false);
                break;
            case 'copy':
                navigator.clipboard.writeText(action.data);
                toast.success(`Copied: ${action.data}`);
                break;
            default:
                break;
        }
    };

    // ======= RATING =======
    const handleRating = (messageId: string, rating: 'up' | 'down') => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, rating } : msg
        ));
        toast.success(rating === 'up' ? 'Thanks for the feedback! 💜' : 'Sorry! We\'ll improve.');
    };

    // ======= CLEAR CHAT =======
    const clearChat = () => {
        setMessages([]);
        setShowQuickActions(true);
        toast.success('Chat cleared');
    };

    // ======= RENDER CONTENT =======
    const renderContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            let html = line
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em class="text-white/70">$1</em>');
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} className="block" />;
        });
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="fixed bottom-24 right-6 z-50"
                    >
                        <motion.button
                            onClick={() => { setIsOpen(true); setUnreadCount(0); }}
                            className="relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center bg-gradient-to-br from-primary via-purple-600 to-secondary hover:shadow-primary/40 transition-shadow"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Bot size={28} className="text-white" />

                            {/* Pulse */}
                            <motion.div
                                className="absolute inset-0 rounded-full bg-primary/30"
                                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            />

                            {/* Online indicator */}
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-lime rounded-full border-2 border-white flex items-center justify-center">
                                <Sparkles size={10} className="text-black" />
                            </div>

                            {/* Unread */}
                            {unreadCount > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center"
                                >
                                    {unreadCount}
                                </motion.div>
                            )}
                        </motion.button>

                        {/* Floating tooltip */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 2 }}
                            className="absolute right-20 top-1/2 -translate-y-1/2 bg-card border border-white/10 px-4 py-2 rounded-xl shadow-xl whitespace-nowrap"
                        >
                            <p className="text-sm font-medium">Need help? Ask me! 💬</p>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-card" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            height: isMinimized ? 70 : 600
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-48px)] bg-card border border-white/10 rounded-[2rem] shadow-2xl shadow-black/40 overflow-hidden flex flex-col"
                        style={{ maxHeight: isMinimized ? 70 : 'calc(100vh-200px)' }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary via-purple-600 to-secondary p-4 relative overflow-hidden flex-shrink-0">
                            <div className="absolute inset-0 opacity-30">
                                <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/20 rounded-full blur-3xl" />
                                <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-lime/30 rounded-full blur-2xl" />
                            </div>

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <Bot size={22} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                                            SNACKZO AI
                                            <Badge className="bg-lime/20 text-lime border-0 text-[9px] px-2 py-0">
                                                BETA
                                            </Badge>
                                        </h3>
                                        <p className="text-white/60 text-[10px] font-medium">
                                            {isTyping ? '✨ Thinking...' : '🟢 Online • Instant responses'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                                        className="text-white/60 hover:text-white hover:bg-white/10 w-8 h-8"
                                    >
                                        {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsMinimized(!isMinimized)}
                                        className="text-white/60 hover:text-white hover:bg-white/10 w-8 h-8"
                                    >
                                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsOpen(false)}
                                        className="text-white/60 hover:text-white hover:bg-white/10 w-8 h-8"
                                    >
                                        <X size={18} />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        {!isMinimized && (
                            <>
                                {/* Messages */}
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-4">
                                        {messages.map((message) => (
                                            <motion.div
                                                key={message.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={cn(
                                                    "flex gap-2",
                                                    message.role === 'user' ? "justify-end" : "justify-start"
                                                )}
                                            >
                                                {message.role === 'assistant' && (
                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                                                        {message.emoji || <Bot size={14} className="text-white" />}
                                                    </div>
                                                )}

                                                <div className={cn(
                                                    "max-w-[85%] rounded-2xl p-4 shadow-lg",
                                                    message.role === 'user'
                                                        ? "bg-gradient-to-br from-primary to-purple-600 text-white rounded-tr-sm"
                                                        : message.isImportant
                                                            ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-tl-sm"
                                                            : "bg-white/5 border border-white/10 rounded-tl-sm"
                                                )}>
                                                    <div className="text-sm leading-relaxed">
                                                        {renderContent(message.content)}
                                                    </div>

                                                    {/* Suggestions */}
                                                    {message.suggestions && message.suggestions.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                                                            {message.suggestions.map((suggestion, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => handleSend(suggestion)}
                                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] font-medium transition-all hover:border-primary/50 hover:scale-105"
                                                                >
                                                                    {suggestion}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    {message.actions && message.actions.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            {message.actions.map((action, i) => (
                                                                <Button
                                                                    key={i}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleAction(action)}
                                                                    className={cn(
                                                                        "gap-2 text-xs",
                                                                        action.variant === 'success' && "border-lime/40 text-lime hover:bg-lime/10",
                                                                        action.variant === 'danger' && "border-red-500/40 text-red-500 hover:bg-red-500/10",
                                                                        !action.variant && "border-primary/30 text-primary hover:bg-primary/10"
                                                                    )}
                                                                >
                                                                    {action.icon}
                                                                    {action.label}
                                                                    <ChevronRight size={12} />
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Rating */}
                                                    {message.role === 'assistant' && message.id !== 'welcome' && (
                                                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                                                            <span className="text-[10px] text-muted-foreground">Helpful?</span>
                                                            <button
                                                                onClick={() => handleRating(message.id, 'up')}
                                                                className={cn(
                                                                    "p-1 rounded hover:bg-white/10 transition-all",
                                                                    message.rating === 'up' && "text-lime bg-lime/10"
                                                                )}
                                                            >
                                                                <ThumbsUp size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRating(message.id, 'down')}
                                                                className={cn(
                                                                    "p-1 rounded hover:bg-white/10 transition-all",
                                                                    message.rating === 'down' && "text-red-500 bg-red-500/10"
                                                                )}
                                                            >
                                                                <ThumbsDown size={12} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <p className="text-[9px] text-muted-foreground mt-2 opacity-60">
                                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>

                                                {message.role === 'user' && (
                                                    <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-lg">
                                                        <User size={14} className="text-white" />
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}

                                        {/* Typing Indicator */}
                                        {isTyping && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="flex gap-2"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                                                    <Bot size={14} className="text-white" />
                                                </div>
                                                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                                                    <div className="flex gap-1.5">
                                                        {[0, 1, 2].map((i) => (
                                                            <motion.div
                                                                key={i}
                                                                className="w-2 h-2 bg-primary rounded-full"
                                                                animate={{ y: [0, -8, 0] }}
                                                                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>

                                {/* Input Area */}
                                <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-sm flex-shrink-0">
                                    {/* Quick Categories */}
                                    {showQuickActions && messages.length <= 1 && (
                                        <div className="grid grid-cols-4 gap-2 mb-3">
                                            {KNOWLEDGE_BASE.quickCategories.map((cat, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSend(cat.query)}
                                                    className="flex flex-col items-center gap-1 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:scale-105"
                                                >
                                                    <span className="text-lg">{cat.emoji}</span>
                                                    <span className="text-[10px] font-medium text-muted-foreground">{cat.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                placeholder="Ask me anything..."
                                                className="w-full bg-white/5 border border-white/10 rounded-full pl-4 pr-12 py-3 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={startListening}
                                                className={cn(
                                                    "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full",
                                                    isListening && "bg-red-500 text-white animate-pulse"
                                                )}
                                            >
                                                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                                            </Button>
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={!inputValue.trim() || isTyping}
                                            className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/20"
                                        >
                                            {isTyping ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <Send size={18} />
                                            )}
                                        </Button>
                                    </form>

                                    <div className="flex items-center justify-between mt-3">
                                        <button
                                            onClick={clearChat}
                                            className="text-[10px] text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                                        >
                                            <Trash2 size={12} />
                                            Clear chat
                                        </button>
                                        <p className="text-[10px] text-center text-muted-foreground">
                                            Powered by <span className="text-primary font-semibold">SNACKZO AI</span> ✨
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SnackzoAI;
