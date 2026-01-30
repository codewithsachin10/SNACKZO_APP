
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, Cpu } from "lucide-react";
import { useLocation } from "react-router-dom";

export function AuthTransition() {
    const { user, profile, isLoading } = useAuth();
    const location = useLocation();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const getInitials = () => {
        if (profile?.full_name) {
            return profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
        }
        return user?.email?.slice(0, 2).toUpperCase() || "ID";
    };

    // Track previous auth state to detect changes
    const [prevUser, setPrevUser] = useState<boolean | null>(null);
    const [transitionState, setTransitionState] = useState<"none" | "signing_in" | "signing_out">("none");
    const [showOverlay, setShowOverlay] = useState(false);

    // Initialize previous user state on mount
    useEffect(() => {
        if (isLoading) return;
        if (prevUser === null) {
            setPrevUser(!!user);
        }
    }, [user, prevUser, isLoading]);

    useEffect(() => {
        // Skip if initial load (prevUser is null)
        if (isLoading || prevUser === null) return;

        const isNowAuthenticated = !!user;
        const wasAuthenticated = prevUser;

        // LOGIN DETECTED
        if (!wasAuthenticated && isNowAuthenticated) {
            setTransitionState("signing_in");
            setShowOverlay(true);

            // Hide after animation completes
            const timer = setTimeout(() => {
                setShowOverlay(false);
                setTransitionState("none");
            }, 4000); // 4s for full holographic sequence
            return () => clearTimeout(timer);
        }

        // LOGOUT DETECTED
        if (wasAuthenticated && !isNowAuthenticated) {
            setTransitionState("signing_out");
            setShowOverlay(true);

            const timer = setTimeout(() => {
                setShowOverlay(false);
                setTransitionState("none");
            }, 3000);
            return () => clearTimeout(timer);
        }

        // Update tracker
        setPrevUser(isNowAuthenticated);

    }, [user, prevUser, isLoading]);

    // Grid particles for hologram effect
    const particles = Array.from({ length: 25 }, (_, i) => i);

    return (
        <AnimatePresence>
            {showOverlay && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none perspective-1000 overflow-hidden"
                >
                    {/* Dark Matter Background */}
                    <motion.div
                        initial={{ backgroundColor: "rgba(0,0,0,0)" }}
                        animate={{ backgroundColor: "rgba(0,0,0,0.95)" }}
                        exit={{ backgroundColor: "rgba(0,0,0,0)" }}
                        className="absolute inset-0 z-0 bg-black/95 backdrop-blur-[100px]"
                    />

                    {/* Matrix Grid Background (Subtle) */}
                    <div className="absolute inset-0 z-0 opacity-20 bg-[linear-gradient(rgba(0,255,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />

                    {/* SIGN IN ANIMATION CONTENT: "THE CONSTRUCT" */}
                    {transitionState === "signing_in" && (
                        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">

                            {/* Scanning Laser Line */}
                            <motion.div
                                initial={{ top: "-10%", opacity: 0 }}
                                animate={{ top: "110%", opacity: [0, 1, 1, 0] }}
                                transition={{ duration: 2.5, ease: "easeInOut" }}
                                className="absolute left-0 right-0 h-1 bg-cyan-400/80 shadow-[0_0_50px_rgba(34,211,238,0.8)] z-20"
                            />

                            {/* Center Hologram Assembly */}
                            <div className="relative w-64 h-64 flex items-center justify-center">
                                {/* Rotating HUD Rings */}
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border border-cyan-500/30 rounded-full border-t-transparent border-l-transparent w-64 h-64"
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-4 border border-blue-500/40 rounded-full border-b-transparent w-56 h-56"
                                />

                                {/* Particle Assembly - Reconstructing the Identity */}
                                <div className="absolute inset-0 flex flex-wrap items-center justify-center w-32 h-32 m-auto">
                                    {particles.map((i) => (
                                        <motion.div
                                            key={i}
                                            initial={{
                                                x: Math.random() * 500 - 250,
                                                y: Math.random() * 500 - 250,
                                                opacity: 0,
                                                scale: 0
                                            }}
                                            animate={{
                                                x: 0,
                                                y: 0,
                                                opacity: 1,
                                                scale: 1
                                            }}
                                            transition={{
                                                delay: 0.5 + Math.random() * 0.5,
                                                duration: 0.8,
                                                type: "spring"
                                            }}
                                            className="w-1.5 h-1.5 bg-cyan-400 shadow-[0_0_10px_cyan] rounded-full m-1"
                                        />
                                    ))}

                                    {/* Final Avatar Reveal */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1.5, duration: 0.5 }}
                                        className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(34,211,238,0.6)] z-30"
                                    >
                                        <span className="text-4xl font-black text-white">{getInitials()}</span>
                                    </motion.div>

                                    {/* Success Shield Icon Overlay */}
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 2.2, type: "spring" }}
                                        className="absolute -bottom-4 -right-4 bg-green-500 text-white p-2 rounded-full shadow-lg z-40"
                                    >
                                        <ShieldCheck size={20} />
                                    </motion.div>
                                </div>
                            </div>

                            {/* Futuristic Text Reveal */}
                            <motion.div
                                className="mt-12 text-center space-y-2 z-30"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.5 }}
                            >
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "200px" }}
                                    transition={{ delay: 1.5, duration: 0.5 }}
                                    className="h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto mb-4"
                                />
                                <h1 className="text-3xl font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                    Identity Verified
                                </h1>
                                <motion.p
                                    className="text-cyan-200/70 font-mono text-sm tracking-widest"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    INITIALIZING SYSTEM...
                                </motion.p>
                            </motion.div>
                        </div>
                    )}

                    {/* SIGN OUT ANIMATION CONTENT: "THE DECONSTRUCT" */}
                    {transitionState === "signing_out" && (
                        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">

                            {/* Central Card Deconstructing */}
                            <motion.div
                                initial={{ scale: 1, filter: "blur(0px)" }}
                                animate={{ scale: [1, 1.1, 0], filter: ["blur(0px)", "blur(0px)", "blur(20px)"] }}
                                transition={{ duration: 1.5, ease: "anticipate" }}
                                className="relative bg-white/5 border border-white/10 p-12 rounded-3xl backdrop-blur-xl flex flex-col items-center gap-6 overflow-hidden"
                            >
                                {/* Glitch Effect Layer */}
                                <motion.div
                                    className="absolute inset-0 bg-red-500/20 mix-blend-overlay"
                                    animate={{ opacity: [0, 0.5, 0, 0.3, 0] }}
                                    transition={{ duration: 0.5, times: [0, 0.2, 0.4, 0.6, 1], repeat: 3 }}
                                />

                                <div className="p-4 bg-white/10 rounded-full">
                                    <Cpu size={48} className="text-white/80" />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-white tracking-widest">DISCONNECTING</h2>
                                    <p className="text-white/40 font-mono text-xs mt-2">TERMINATING SESSION ID: {Math.floor(Math.random() * 999999)}</p>
                                </div>
                            </motion.div>

                            {/* Particles flying UPWARDS (Deconstruction) */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ y: 0, opacity: 0 }}
                                        animate={{
                                            y: -500 - Math.random() * 500,
                                            opacity: [0, 1, 0],
                                            x: (Math.random() - 0.5) * 500
                                        }}
                                        transition={{
                                            delay: 0.8,
                                            duration: 1.5,
                                            ease: "easeIn"
                                        }}
                                        className="absolute w-2 h-8 bg-gradient-to-t from-white/50 to-transparent w-px"
                                        style={{ height: Math.random() * 50 + 20 }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
