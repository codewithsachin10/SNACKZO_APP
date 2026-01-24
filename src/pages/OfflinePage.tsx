import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    WifiOff, RefreshCw, Zap, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================
// ANIMATED PARTICLES
// ============================================

const Particle = ({ delay }: { delay: number }) => {
    const x = useMemo(() => Math.random() * 100, []);
    const size = useMemo(() => 2 + Math.random() * 4, []);
    const duration = useMemo(() => 3 + Math.random() * 4, []);

    return (
        <motion.div
            className="absolute rounded-full bg-white/20"
            style={{ left: `${x}%`, width: size, height: size }}
            initial={{ y: '100vh', opacity: 0 }}
            animate={{
                y: '-10vh',
                opacity: [0, 1, 1, 0],
                x: [0, 20, -20, 0]
            }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: "linear"
            }}
        />
    );
};

// ============================================
// GLITCH TEXT EFFECT
// ============================================

const GlitchText = ({ text, className }: { text: string; className?: string }) => (
    <div className={cn("relative", className)}>
        <span className="relative z-10">{text}</span>
        <motion.span
            className="absolute inset-0 text-cyan-400 z-0"
            animate={{ x: [-2, 2, -2], opacity: [0.7, 0.5, 0.7] }}
            transition={{ duration: 0.3, repeat: Infinity }}
            style={{ clipPath: "inset(0 0 50% 0)" }}
        >
            {text}
        </motion.span>
        <motion.span
            className="absolute inset-0 text-pink-400 z-0"
            animate={{ x: [2, -2, 2], opacity: [0.7, 0.5, 0.7] }}
            transition={{ duration: 0.3, repeat: Infinity }}
            style={{ clipPath: "inset(50% 0 0 0)" }}
        >
            {text}
        </motion.span>
    </div>
);

// ============================================
// BROKEN CABLE ANIMATION
// ============================================

const BrokenCable = () => (
    <div className="relative w-48 h-20 mx-auto mb-6">
        {/* Left cable part */}
        <motion.div
            className="absolute left-0 top-1/2 w-20 h-3 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full origin-right"
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity }}
        >
            <div className="absolute right-0 w-4 h-4 bg-yellow-400 rounded-full -top-0.5 animate-pulse" />
            <motion.div
                className="absolute right-0 w-8 h-8 -top-2.5"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            >
                <Zap className="text-yellow-400 w-full h-full" />
            </motion.div>
        </motion.div>

        {/* Right cable part */}
        <motion.div
            className="absolute right-0 top-1/2 w-20 h-3 bg-gradient-to-l from-gray-600 to-gray-500 rounded-full origin-left"
            animate={{ rotate: [5, -5, 5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        >
            <div className="absolute left-0 w-4 h-4 bg-yellow-400 rounded-full -top-0.5 animate-pulse" />
        </motion.div>

        {/* Sparks */}
        {[...Array(5)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 w-1 h-1 bg-yellow-300 rounded-full"
                animate={{
                    x: [0, (Math.random() - 0.5) * 60],
                    y: [0, (Math.random() - 0.5) * 40],
                    opacity: [1, 0],
                    scale: [1, 0]
                }}
                transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.3,
                    repeatDelay: 1
                }}
            />
        ))}
    </div>
);

// ============================================
// SIGNAL WAVES
// ============================================

const SignalWaves = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
            <motion.div
                key={i}
                className="absolute border-2 border-red-500/20 rounded-full"
                style={{ width: 80 * i, height: 80 * i }}
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.1, 0.3, 0.1]
                }}
                transition={{
                    duration: 3,
                    delay: i * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        ))}
    </div>
);

// ============================================
// FLOATING WIFI ICONS
// ============================================

const FloatingIcons = () => {
    const icons = useMemo(() =>
        [...Array(8)].map((_, i) => ({
            id: i,
            x: 10 + (i * 12),
            delay: i * 0.5,
            duration: 4 + Math.random() * 2,
            icon: ['📡', '📶', '🔌', '💫', '⚡', '🛜', '📱', '💔'][i]
        })), []
    );

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {icons.map(({ id, x, delay, duration, icon }) => (
                <motion.div
                    key={id}
                    className="absolute text-3xl opacity-20"
                    style={{ left: `${x}%` }}
                    animate={{
                        y: ['100vh', '-10vh'],
                        rotate: [0, 360],
                        opacity: [0, 0.3, 0.3, 0]
                    }}
                    transition={{
                        duration,
                        delay,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                >
                    {icon}
                </motion.div>
            ))}
        </div>
    );
};

// ============================================
// MINI GAME
// ============================================

interface Signal {
    id: number;
    x: number;
    y: number;
    icon: string;
    speed: number;
}

const OfflineGame = () => {
    const [playing, setPlaying] = useState(false);
    const [score, setScore] = useState(0);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [timeLeft, setTimeLeft] = useState(20);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(() => {
        try { return parseInt(localStorage.getItem('offline_high') || '0'); } catch { return 0; }
    });

    const idRef = useRef(0);
    const spawnRef = useRef<NodeJS.Timeout>();
    const timerRef = useRef<NodeJS.Timeout>();
    const moveRef = useRef<NodeJS.Timeout>();

    const startGame = useCallback(() => {
        setScore(0);
        setTimeLeft(20);
        setSignals([]);
        setGameOver(false);
        setPlaying(true);
        idRef.current = 0;

        const icons = ['📡', '📶', '⚡', '🛜', '💫', '🌐', '📱'];

        spawnRef.current = setInterval(() => {
            setSignals(prev => [...prev, {
                id: idRef.current++,
                x: 5 + Math.random() * 85,
                y: 100 + Math.random() * 10,
                icon: icons[Math.floor(Math.random() * icons.length)],
                speed: 0.6 + Math.random() * 0.4
            }]);
        }, 500);

        moveRef.current = setInterval(() => {
            setSignals(prev => prev.map(s => ({ ...s, y: s.y - s.speed })).filter(s => s.y > -10));
        }, 30);

        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(spawnRef.current);
                    clearInterval(moveRef.current);
                    clearInterval(timerRef.current);
                    setPlaying(false);
                    setGameOver(true);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
    }, []);

    const tapSignal = useCallback((id: number) => {
        setSignals(prev => prev.filter(s => s.id !== id));
        setScore(s => {
            const newScore = s + 10;
            if (newScore > highScore) {
                setHighScore(newScore);
                try { localStorage.setItem('offline_high', newScore.toString()); } catch { }
            }
            return newScore;
        });
    }, [highScore]);

    useEffect(() => () => {
        clearInterval(spawnRef.current);
        clearInterval(moveRef.current);
        clearInterval(timerRef.current);
    }, []);

    if (!playing && !gameOver) {
        return (
            <motion.div
                className="text-center mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
            >
                <p className="text-white/60 text-sm mb-3">Bored? Play a quick game!</p>
                <Button
                    onClick={startGame}
                    variant="outline"
                    className="h-11 px-8 rounded-2xl border-white/20 gap-2 bg-white/5 hover:bg-white/10"
                >
                    <Zap size={18} className="text-yellow-400" />
                    Catch the Signals!
                </Button>
                {highScore > 0 && (
                    <p className="text-amber-400 text-xs mt-2">🏆 Best: {highScore}</p>
                )}
            </motion.div>
        );
    }

    if (gameOver) {
        return (
            <motion.div
                className="text-center mt-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-1">
                    {score} pts
                </p>
                {score >= highScore && score > 0 && (
                    <p className="text-lime-400 text-sm mb-2">🏆 New Record!</p>
                )}
                <Button
                    onClick={startGame}
                    variant="outline"
                    className="h-9 px-5 rounded-xl border-white/20 gap-2"
                >
                    <RefreshCw size={14} />
                    Play Again
                </Button>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-white font-bold text-lg">{score}</span>
                <span className={cn(
                    "font-bold text-lg px-3 py-1 rounded-full",
                    timeLeft <= 5 ? "text-red-400 bg-red-500/20 animate-pulse" : "text-white"
                )}>{timeLeft}s</span>
            </div>
            <div className="relative w-full h-56 bg-gradient-to-b from-white/5 to-transparent rounded-3xl overflow-hidden border border-white/10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent)]" />
                {signals.map(signal => (
                    <motion.button
                        key={signal.id}
                        onClick={() => tapSignal(signal.id)}
                        className="absolute text-4xl cursor-pointer transition-transform active:scale-75"
                        style={{ left: `${signal.x}%`, top: `${signal.y}%`, transform: 'translate(-50%, -50%)' }}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.8 }}
                    >
                        {signal.icon}
                    </motion.button>
                ))}
                {signals.length === 0 && (
                    <p className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                        Tap the signals! 📡
                    </p>
                )}
            </div>
        </motion.div>
    );
};

// ============================================
// MAIN OFFLINE PAGE
// ============================================

const OfflinePage = () => {
    const [isRetrying, setIsRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const particles = useMemo(() => [...Array(20)].map((_, i) => i * 0.5), []);

    const handleRetry = useCallback(async () => {
        setIsRetrying(true);
        setRetryCount(c => c + 1);

        try {
            await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-cache' });
            window.location.reload();
            return;
        } catch { }

        setTimeout(() => setIsRetrying(false), 2000);
    }, []);

    useEffect(() => {
        const handleOnline = () => window.location.reload();
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/50 to-slate-950 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0">
                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }}
                />

                {/* Floating particles */}
                {particles.map((delay, i) => (
                    <Particle key={i} delay={delay} />
                ))}

                {/* Floating icons */}
                <FloatingIcons />

                {/* Signal waves */}
                <SignalWaves />

                {/* Gradient orbs */}
                <motion.div
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[100px]"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px]"
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 5, repeat: Infinity }}
                />
                <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-[60px]"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
            </div>

            {/* Scan lines */}
            <div
                className="absolute inset-0 pointer-events-none opacity-5"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
                }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center max-w-md"
                >
                    {/* Broken Cable Animation */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <BrokenCable />
                    </motion.div>

                    {/* Main Icon */}
                    <motion.div
                        className="relative inline-block mb-6"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.3 }}
                    >
                        {/* Glow */}
                        <motion.div
                            className="absolute inset-0 bg-red-500/40 blur-3xl rounded-full scale-150"
                            animate={{ opacity: [0.4, 0.7, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />

                        {/* Icon container */}
                        <motion.div
                            className="relative w-32 h-32 bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-[2rem] flex items-center justify-center border border-white/10 shadow-2xl"
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <WifiOff size={56} className="text-red-400" />

                            {/* Alert badge */}
                            <motion.div
                                className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                <span className="text-white text-xl font-black">!</span>
                            </motion.div>

                            {/* Orbiting dots */}
                            {[0, 1, 2].map(i => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 bg-red-400 rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 1 }}
                                    style={{
                                        transformOrigin: '80px 80px',
                                        left: 'calc(50% - 4px)',
                                        top: 'calc(50% - 4px)'
                                    }}
                                />
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* Title with Glitch Effect */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <GlitchText
                            text="Connection Lost"
                            className="text-4xl md:text-5xl font-black text-white mb-3"
                        />
                    </motion.div>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-white/60 mb-6 text-lg leading-relaxed"
                    >
                        Oops! The internet went on a snack break 🍔
                    </motion.p>

                    {/* Status */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 }}
                        className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-full border border-white/10 mb-8"
                    >
                        <motion.div
                            className="w-3 h-3 rounded-full bg-red-500"
                            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-white/70 font-medium">No network detected</span>
                    </motion.div>

                    {/* Retry Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        <Button
                            onClick={handleRetry}
                            disabled={isRetrying}
                            className="h-16 px-12 text-lg font-bold rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:opacity-90 shadow-xl shadow-purple-500/30 gap-3 relative overflow-hidden group"
                        >
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                            />
                            {isRetrying ? (
                                <>
                                    <RefreshCw size={24} className="animate-spin" />
                                    Reconnecting...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-500" />
                                    Try Again
                                </>
                            )}
                        </Button>
                    </motion.div>

                    {retryCount > 0 && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-white/40 text-sm mt-4"
                        >
                            Attempted {retryCount} time{retryCount > 1 ? 's' : ''}
                        </motion.p>
                    )}

                    {/* Tips */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="mt-10 p-5 bg-white/5 rounded-3xl border border-white/10 text-left backdrop-blur-sm"
                    >
                        <p className="text-white/80 text-sm font-semibold mb-4 flex items-center gap-2">
                            <span className="text-xl">💡</span>
                            Quick fixes:
                        </p>
                        <ul className="space-y-3 text-sm text-white/60">
                            {[
                                "Check if WiFi or mobile data is enabled",
                                "Move closer to your router",
                                "Try toggling airplane mode",
                                "Restart your device"
                            ].map((tip, i) => (
                                <motion.li
                                    key={i}
                                    className="flex items-start gap-2"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.1 + i * 0.1 }}
                                >
                                    <ArrowRight size={14} className="mt-0.5 text-purple-400" />
                                    {tip}
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Mini Game */}
                    <OfflineGame />

                    {/* Brand */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                        className="mt-12 flex items-center justify-center gap-3"
                    >
                        <motion.span
                            className="text-3xl"
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            🍔
                        </motion.span>
                        <span className="text-white/30 font-black text-xl tracking-wider">SNACKZO</span>
                    </motion.div>
                </motion.div>
            </div>

            {/* Bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
    );
};

export default OfflinePage;
