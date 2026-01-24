import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingBag, Star, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SocialProofToast = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [event, setEvent] = useState<any>(null);

    useEffect(() => {
        const channel = supabase
            .channel('social-proof')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'social_events' },
                (payload) => {
                    setEvent(payload.new);
                    setIsVisible(true);
                    // Hide after 5 seconds
                    setTimeout(() => setIsVisible(false), 5000);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (!isVisible || !event) return null;

    const getIcon = () => {
        switch (event.event_type) {
            case 'order': return <ShoppingBag size={18} className="text-lime" />;
            case 'review': return <Star size={18} className="text-yellow-400 fill-yellow-400" />;
            case 'signup': return <UserPlus size={18} className="text-blue-400" />;
            default: return <ShoppingBag size={18} />;
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, x: -50 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-24 left-4 z-50 max-w-xs"
                >
                    <div className="glass-card bg-secondary/90 border-lime/30 p-3 rounded-full flex items-center gap-3 shadow-lg backdrop-blur-md">
                        <div className="bg-background/50 p-2 rounded-full">
                            {getIcon()}
                        </div>
                        <div className="pr-2">
                            <p className="text-xs font-bold text-foreground">
                                <span className="text-lime">{event.user_name}</span> {event.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground pt-0.5">Just now</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
