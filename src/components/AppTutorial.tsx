import { useState, useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, Sparkles, MonitorSmartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AppTutorial = () => {
    const { user } = useAuth();
    // Stages: idle -> envelope -> letter_intro -> letter_about -> tour
    const [stage, setStage] = useState<'idle' | 'envelope' | 'letter_intro' | 'letter_about'>('idle');

    useEffect(() => {
        // Check if we've seen the intro
        const hasSeenIntro = localStorage.getItem("snackzo_intro_seen_v2");

        // Show for EVERYONE who hasn't seen it (Logged in OR Guest)
        if (!hasSeenIntro) {
            const timer = setTimeout(() => {
                setStage('envelope');
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []); // Run once on mount

    const handleOpenEnvelope = () => {
        setStage('letter_intro');
    };

    const handleNextLetter = () => {
        setStage('letter_about');
    }

    const startTour = () => {
        setStage('idle');
        localStorage.setItem("snackzo_intro_seen_v2", "true");

        // GUEST STEPS (Login/Signup Focus)
        const guestSteps = [
            {
                element: "#nav-brand",
                popover: {
                    title: "Welcome to Snackzo! ⚡️",
                    description: "We deliver your late-night cravings and hostel essentials in minutes.",
                    side: "bottom",
                    align: "start"
                }
            },
            {
                element: "#categories-section",
                popover: {
                    title: "Everything You Need 🍔",
                    description: "From 'Exam Fuel' to 'Late Night Munchies', we've curated everything for hostel life.",
                    side: "top",
                    align: "center"
                }
            },
            {
                element: "#nav-login-btn",
                popover: {
                    title: "Get Started 🚀",
                    description: "Click the **Login** button to see your options.",
                    side: "bottom",
                    align: "end",
                    showButtons: [], // Hide buttons to force interaction
                },
                onHighlightStarted: (element: Element) => {
                    if (!element) return;
                    const clickHandler = () => {
                        setTimeout(() => { driverObj.moveNext(); }, 300);
                        element.removeEventListener('click', clickHandler);
                    };
                    element.addEventListener('click', clickHandler);
                }
            },
            {
                element: "#nav-signup-btn",
                popover: {
                    title: "Create Account ✨",
                    description: "Click here to **Sign Up**! You'll unlock your wallet, order tracking, and more.",
                    side: "left",
                    align: "center"
                }
            }
        ];

        // LOGGED IN USER STEPS (Feature Focus)
        const userSteps = [
            {
                element: "#nav-brand",
                popover: {
                    title: "Welcome Back! 👋",
                    description: "Ready to order? We're open and delivering instantly.",
                    side: "bottom",
                    align: "start"
                }
            },
            {
                element: "#nav-address",
                popover: {
                    title: "Set Location 📍",
                    description: "Ensure your **Hostel Block & Room** are correct for hassle-free delivery.",
                    side: "bottom",
                    align: "start"
                }
            },
            {
                element: "#categories-section",
                popover: {
                    title: "Find Your Cravings 🔍",
                    description: "Browse specific categories to find exactly what you need.",
                    side: "top",
                    align: "center"
                }
            },
            // INTERACTIVE STEP: Open User Menu
            {
                element: "#nav-user-menu-btn",
                popover: {
                    title: "Unlock Your Profile 🔓",
                    description: "Click here to access your **Wallet**, **Orders**, and **Exclusive Rewards**.",
                    side: "bottom",
                    align: "end",
                    showButtons: [], // Force user to click
                },
                onHighlightStarted: (element: Element) => {
                    if (!element) return;
                    const clickHandler = () => {
                        setTimeout(() => { driverObj.moveNext(); }, 400); // Wait for menu animation
                        element.removeEventListener('click', clickHandler);
                    };
                    element.addEventListener('click', clickHandler);
                }
            },
            // Menu Items (Assuming menu is now open)
            {
                element: "#menu-wallet",
                popover: {
                    title: "Super Fast Checkout ⚡️",
                    description: "Top up your wallet for **1-click payments**. No OTPs, no waiting!",
                    side: "left",
                    align: "center"
                }
            },
            {
                element: "#menu-orders",
                popover: {
                    title: "Track Live Orders 🛵",
                    description: "Watch your runner bring your food in real-time on our map.",
                    side: "left",
                    align: "center"
                }
            },
            {
                element: "#menu-refer",
                popover: {
                    title: "Free Money! 💸",
                    description: "Invite friends and earn **₹50** for every referral. Unlimited earnings!",
                    side: "left",
                    align: "center"
                }
            },
            {
                element: "#nav-cart",
                popover: {
                    title: "Ready to Eat? 🛒",
                    description: "Your cart is waiting. Let's get snacking!",
                    side: "bottom",
                    align: "end"
                }
            }
        ];

        const driverObj = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            doneBtnText: "Let's Go!",
            nextBtnText: "Next",
            prevBtnText: "Back",
            steps: (user ? userSteps : guestSteps) as any
        });

        driverObj.drive();
    };

    if (stage === 'idle') return null;

    return (
        <AnimatePresence mode="wait">
            {/* Envelope Stage */}
            {stage === 'envelope' && (
                <motion.div
                    key="envelope"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div
                        layoutId="envelope-card"
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        whileHover={{ scale: 1.05, rotate: -2 }}
                        onClick={handleOpenEnvelope}
                        className="bg-zinc-900 border border-white/10 w-full max-w-sm aspect-[4/3] rounded-3xl shadow-2xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group"
                    >
                        {/* Envelope Flap Decoration */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-zinc-800 clip-path-triangle origin-top transition-transform duration-500 group-hover:rotate-x-180 z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />

                        <Mail className="text-white w-24 h-24 mb-6 z-20 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />

                        <div className="z-20 text-center">
                            <h3 className="text-2xl font-bold text-white mb-2">You've got mail!</h3>
                            <p className="text-zinc-400 text-sm animate-pulse">Tap to open</p>
                        </div>

                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </motion.div>
                </motion.div>
            )}

            {/* Letter Stage 1: Intro */}
            {stage === 'letter_intro' && (
                <motion.div
                    key="letter_intro"
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div
                        layoutId="envelope-card"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, x: -50 }}
                        className="bg-white text-zinc-900 w-full max-w-md p-8 rounded-2xl shadow-2xl relative"
                    >
                        <div className="absolute -top-6 -right-6 bg-primary text-white p-3 rounded-full shadow-lg animate-bounce">
                            <Sparkles size={24} />
                        </div>

                        <h2 className="text-3xl font-black mb-4 tracking-tight">Welcome to <span className="text-primary">Snackzo</span>!</h2>

                        <div className="space-y-4 text-zinc-600 leading-relaxed mb-8">
                            <p>Hey there! 👋</p>
                            <p>
                                Are late-night cravings hitting hard? Or maybe you ran out of essentials right before an exam?
                            </p>
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm">
                                <p className="font-bold text-amber-800 mb-1 flex items-center gap-2">
                                    ⚠️ Demo Purpose Only
                                </p>
                                <p className="text-amber-700">
                                    This application is a demonstration project. It is not a real service and no actual orders will be delivered.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleNextLetter}
                            className="w-full bg-zinc-900 hover:bg-black text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 group"
                        >
                            Next
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </motion.div>
            )}

            {/* Letter Stage 2: About Dev */}
            {stage === 'letter_about' && (
                <motion.div
                    key="letter_about"
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, x: 50 }}
                        animate={{ scale: 1, opacity: 1, x: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white text-zinc-900 w-full max-w-md p-8 rounded-2xl shadow-2xl relative"
                    >
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <MonitorSmartphone size={32} className="text-primary" />
                        </div>

                        <h2 className="text-2xl font-black mb-1 text-center">Hello, I'm <span className="text-primary">Sachin</span> 👋</h2>
                        <p className="text-center text-zinc-500 mb-6 font-medium">Developer & Creator of Snackzo</p>

                        <div className="space-y-4 text-zinc-600 leading-relaxed mb-6 text-sm bg-zinc-50 p-6 rounded-xl border border-zinc-100">
                            <p>
                                I built this project to solve real campus problems using cutting-edge tech. It's a full-stack showcase of modern quick-commerce.
                            </p>

                            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-zinc-500 mt-2 pt-2 border-t border-zinc-200">
                                <span className="flex items-center gap-1">⚛️ React & TS</span>
                                <span className="flex items-center gap-1">💨 Tailwind</span>
                                <span className="flex items-center gap-1">🔥 Supabase</span>
                                <span className="flex items-center gap-1">✨ Framer Motion</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <a
                                href="https://sachin-portfolio-5tb9.vercel.app"
                                target="_blank"
                                rel="noreferrer"
                                className="w-full bg-white border-2 border-zinc-900 hover:bg-zinc-50 text-zinc-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                Visit My Portfolio 🌐
                            </a>

                            <button
                                onClick={startTour}
                                className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 group shadow-lg shadow-primary/20"
                            >
                                Take a Tour
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AppTutorial;
