import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageSquare, ShoppingBag, Send, ArrowLeft, Bug, Utensils, Truck, Lightbulb, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

const CATEGORIES = [
    { id: 'food_quality', label: 'Food Quality', icon: <Utensils size={18} />, color: 'bg-orange-100 text-orange-600 border-orange-200' },
    { id: 'delivery', label: 'Delivery', icon: <Truck size={18} />, color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { id: 'app_issue', label: 'App Issue', icon: <Bug size={18} />, color: 'bg-red-100 text-red-600 border-red-200' },
    { id: 'feature_request', label: 'New Feature', icon: <Lightbulb size={18} />, color: 'bg-yellow-100 text-yellow-600 border-yellow-200' },
    { id: 'other', label: 'Other', icon: <MessageSquare size={18} />, color: 'bg-gray-100 text-gray-600 border-gray-200' },
];

export default function Feedback() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [category, setCategory] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [searchParams] = useSearchParams();
    const orderIdFromUrl = searchParams.get("orderId");

    // Restore missing state
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (user) fetchRecentOrders();
    }, [user]);

    // Pre-select order from URL
    useEffect(() => {
        if (orderIdFromUrl) {
            setSelectedOrderId(orderIdFromUrl);
        }
    }, [orderIdFromUrl]);

    const fetchRecentOrders = async () => {
        // Fetch last 5 delivered orders (increased from 3 to catch the linked one more likely)
        const { data } = await supabase
            .from('orders')
            .select('id, created_at, total_amount, status')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (data) setRecentOrders(data);
    };

    const handleSubmit = async () => {
        if (rating === 0) return toast.error("Please select a rating!");
        if (!category) return toast.error("Please select a category!");
        if (!message.trim()) return toast.error("Please tell us what happened!");

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('app_feedback').insert({
                user_id: user?.id,
                rating,
                category,
                message,
                related_order_id: selectedOrderId
            });

            if (error) throw error;

            // Success
            setIsSuccess(true);
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#7c3aed', '#ec4899', '#ffffff']
            });

            setTimeout(() => navigate('/'), 2500);

        } catch (err: any) {
            toast.error(err.message || "Failed to submit feedback");
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
                >
                    <ThumbsUp size={40} className="text-green-600" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
                <p className="text-gray-500 max-w-xs mx-auto">Your feedback helps us make Snackzo better for everyone.</p>
                <p className="text-sm text-gray-400 mt-8">Redirecting home...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
            {/* Header */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10 px-4 py-3 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-bold">Feedback</h1>
            </header>

            <main className="max-w-xl mx-auto p-6 space-y-8">

                {/* Rating Section */}
                <section className="text-center space-y-4">
                    <h2 className="text-xl font-bold">How was your experience?</h2>
                    <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                                className="transition-transform hover:scale-110 focus:outline-none"
                            >
                                <Star
                                    size={36}
                                    className={cn(
                                        "transition-all",
                                        (hoverRating || rating) >= star ? "fill-yellow-400 text-yellow-400" : "fill-gray-100 text-gray-300"
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                    <p className="text-sm font-medium text-purple-600 h-5">
                        {rating === 5 ? "Absolutely loved it! 😍" :
                            rating === 4 ? "Pretty good! 🙂" :
                                rating === 3 ? "It was okay. 😐" :
                                    rating === 2 ? "Could be better. 😕" :
                                        rating === 1 ? "Disappointed. 😞" : ""}
                    </p>
                </section>

                {/* Category Section */}
                <section className="space-y-3">
                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">What's this about?</label>
                    <div className="grid grid-cols-2 gap-3">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                className={cn(
                                    "p-4 rounded-xl border flex items-center gap-3 transition-all text-left group",
                                    category === cat.id
                                        ? "bg-purple-50 border-purple-500 ring-1 ring-purple-500"
                                        : "bg-white border-gray-200 hover:border-purple-200"
                                )}
                            >
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cat.color, category !== cat.id && "bg-gray-100 text-gray-500 group-hover:bg-purple-50 group-hover:text-purple-500")}>
                                    {cat.icon}
                                </div>
                                <span className={cn("text-sm font-semibold", category === cat.id ? "text-purple-900" : "text-gray-600")}>
                                    {cat.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Order Linking (Optional) */}
                {recentOrders.length > 0 && (
                    <section className="space-y-3">
                        <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Related to an order? (Optional)</label>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {recentOrders.map(order => (
                                <button
                                    key={order.id}
                                    onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
                                    className={cn(
                                        "flex-shrink-0 p-3 rounded-lg border min-w-[140px] text-left transition-all",
                                        selectedOrderId === order.id
                                            ? "bg-purple-50 border-purple-500"
                                            : "bg-white border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <ShoppingBag size={10} /> Order #{order.id.slice(0, 5)}
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">₹{order.total_amount}</p>
                                    <p className="text-[10px] text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Message Input */}
                <section className="space-y-3">
                    <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Tell us more</label>
                    <div className="relative">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full h-32 p-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm leading-relaxed"
                            placeholder="Start typing..."
                        />
                        <div className="absolute right-3 bottom-3 text-[10px] text-gray-400">
                            {message.length} chars
                        </div>
                    </div>
                </section>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? "Sending..." : "Submit Feedback"}
                    {!isSubmitting && <Send size={18} />}
                </button>

            </main>
        </div>
    );
}
