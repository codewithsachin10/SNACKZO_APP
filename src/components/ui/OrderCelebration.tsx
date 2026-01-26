import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OrderCelebrationProps {
    show: boolean;
    type: 'placed' | 'delivered';
    email?: string | null;
    onComplete: () => void;
}

const OrderCelebration = ({ show, type, email, onComplete }: OrderCelebrationProps) => {
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        if (show) {
            // Play Sound
            playSound(type);

            // Trigger Confetti
            const duration = type === 'placed' ? 3000 : 5000;
            const end = Date.now() + duration;

            const colors = type === 'placed' ? ['#84cc16', '#ffffff'] : ['#3b82f6', '#ffffff'];

            (function frame() {
                confetti({
                    particleCount: type === 'placed' ? 3 : 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors
                });
                confetti({
                    particleCount: type === 'placed' ? 3 : 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());

            // Auto close after 6s (increased for reading email notice)
            const timer = setTimeout(onComplete, 6000);
            return () => clearTimeout(timer);
        }
    }, [show, type, onComplete]);

    // Synthesize Sound
    const playSound = (type: 'placed' | 'delivered') => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'placed') {
                // Success Chime (High Pitch Ascending)
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // C6
                gain.gain.setValueAtTime(0.5, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
            } else {
                // Didgeridoo-like Low Hum for Delivery or Fanfare
                // Let's do a cheerful major triad arpeggio
                const now = ctx.currentTime;

                // Note 1
                const osc1 = ctx.createOscillator();
                const g1 = ctx.createGain();
                osc1.connect(g1); g1.connect(ctx.destination);
                osc1.type = 'triangle';
                osc1.frequency.value = 440; // A4
                g1.gain.setValueAtTime(0.3, now);
                g1.gain.exponentialRampToValueAtTime(0.01, now + 1);
                osc1.start(now); osc1.stop(now + 1);

                // Note 2
                const osc2 = ctx.createOscillator();
                const g2 = ctx.createGain();
                osc2.connect(g2); g2.connect(ctx.destination);
                osc2.type = 'triangle';
                osc2.frequency.value = 554.37; // C#5
                g2.gain.setValueAtTime(0.3, now + 0.1);
                g2.gain.exponentialRampToValueAtTime(0.01, now + 1.1);
                osc2.start(now + 0.1); osc2.stop(now + 1.1);

                // Note 3
                const osc3 = ctx.createOscillator();
                const g3 = ctx.createGain();
                osc3.connect(g3); g3.connect(ctx.destination);
                osc3.type = 'triangle';
                osc3.frequency.value = 659.25; // E5
                g3.gain.setValueAtTime(0.3, now + 0.2);
                g3.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
                osc3.start(now + 0.2); osc3.stop(now + 1.2);
            }
        } catch (e) {
            console.error("Audio Context Error", e);
        }
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.8, y: 50, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className="neu-card bg-background p-6 md:p-8 text-center max-w-sm mx-4 border-2 border-lime shadow-[0_0_50px_rgba(132,204,22,0.3)] relative overflow-hidden"
                    >
                        {/* Background Decorations */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-lime/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                        <div className="relative mb-6 mx-auto w-24 h-24">
                            {/* Pulse Effect */}
                            <motion.div
                                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-0 bg-lime/20 rounded-full"
                            />

                            {/* Animated Circle Background */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-full h-full bg-lime rounded-full flex items-center justify-center relative z-10 shadow-xl shadow-lime/30"
                            >
                                {type === 'placed' ? (
                                    <svg className="w-12 h-12 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <motion.path
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                                            d="M20 6L9 17l-5-5"
                                        />
                                    </svg>
                                ) : (
                                    <PartyPopper className="text-black w-12 h-12 animate-bounce" />
                                )}
                            </motion.div>

                            {/* Floating Envelope for placed orders */}
                            {type === 'placed' && email && (
                                <motion.div
                                    initial={{ scale: 0, x: 20, y: 20 }}
                                    animate={{ scale: 1, x: 0, y: 0 }}
                                    transition={{ delay: 0.5, type: "spring" }}
                                    className="absolute -bottom-2 -right-2 bg-white text-lime p-2 rounded-full shadow-lg border-2 border-lime z-20"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                </motion.div>
                            )}
                        </div>

                        <h2 className="text-3xl font-black uppercase mb-2 tracking-tight">
                            {type === 'placed' ? 'Order Placed!' : 'Delivered!'}
                        </h2>

                        {type === 'placed' && email ? (
                            <div className="mb-6">
                                <p className="text-sm font-medium mb-4">
                                    Confirmation email sent to<br />
                                    <span className="text-lime font-bold">{email}</span>
                                </p>

                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-left">
                                    <div className="flex gap-3">
                                        <div className="text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            <span className="font-bold text-yellow-600 dark:text-yellow-500">Note:</span> If not received, please check your <b>Spam/Junk</b> folder.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
                                {type === 'placed'
                                    ? 'Sit back and relax. Your snacks are on the way!'
                                    : 'Your order has arrived. Enjoy!'}
                            </p>
                        )}

                        <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm mt-4">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 6, ease: "linear" }}
                                className="h-full bg-gradient-to-r from-lime to-green-400"
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OrderCelebration;
