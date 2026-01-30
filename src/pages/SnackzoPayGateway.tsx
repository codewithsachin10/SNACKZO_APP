import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle, XCircle, Shield, ShieldCheck, Lock, CreditCard,
    Zap, QrCode, AlertCircle, X, Copy,
    Building2, Wallet, ChevronRight, Check,
    Phone, RefreshCw, Loader2, Clock, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PaymentMethod = "upi" | "cards" | "netbanking" | "wallet";
type PaymentStatus = "idle" | "simulating" | "processing" | "success" | "failed" | "redirecting";

const generateTxnId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "pay_";
    for (let i = 0; i < 14; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
};

// Real UPI App Icons as SVG
const GPay = () => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect fill="white" width="48" height="48" rx="8" />
        <path fill="#4285F4" d="M23.5 24.5v7h-3v-17h8c1.9 0 3.5.7 4.8 2 1.3 1.3 2 2.9 2 4.7 0 1.9-.7 3.5-2 4.8-1.3 1.3-2.9 2-4.8 2h-5zm0-7.3v4.8h5.1c1 0 1.8-.3 2.4-1 .6-.6 1-1.4 1-2.3 0-.9-.3-1.7-1-2.4-.6-.6-1.5-.9-2.4-.9h-5.1z" transform="translate(4,4) scale(0.8)" />
        <path fill="#34A853" d="M37.3 28.8l-3.8 3.8c1.4 1.3 3.2 2 5.1 2 2.5 0 4.9-1 6.6-2.8l-3-3c-.9.9-2.2 1.5-3.6 1.5-1.2 0-2.4-.5-3.3-1.5z" transform="translate(4,4) scale(0.8)" />
        <path fill="#FBBC05" d="M24.7 36.5c2.6 0 4.8-.8 6.4-2.3l-3.2-2.5c-.8.6-1.9.9-3.2.9-2.5 0-4.6-1.7-5.3-3.9h-3.3v2.6c1.6 3.2 4.9 5.2 8.6 5.2z" transform="translate(4,4) scale(0.8)" />
        <path fill="#EA4335" d="M19.2 28.8c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2v-2.6h-3.3c-.7 1.4-1 2.9-1 4.5s.4 3.1 1 4.5l3.3-2.4z" transform="translate(4,4) scale(0.8)" />
    </svg>
);

const PhonePe = () => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect fill="#5f259f" width="48" height="48" rx="8" />
        <path fill="white" d="M24 10c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14-6.3-14-14-14zm6 20h-4v-8l-4 8h-4V18h4v8l4-8h4v12z" transform="scale(0.8) translate(6,6)" />
    </svg>
);

const Paytm = () => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect fill="#00BAF2" width="48" height="48" rx="8" />
        <path fill="white" d="M14 28c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-8h-8v8zm18-8h-6v8h2v-4h2v4h2v-8z" transform="translate(6,6) scale(0.8)" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">PTM</text>
    </svg>
);

const BHIM = () => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect fill="#00A651" width="48" height="48" rx="8" />
        <path fill="white" d="M24 12L12 36h24L24 12z" transform="scale(0.5) translate(24,24)" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">BHIM</text>
    </svg>
);

// Bank Icons
const HDFCIcon = () => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect fill="#004C8F" width="48" height="48" rx="6" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">HDFC</text>
    </svg>
);

const SBIIcon = () => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect fill="#22409A" width="48" height="48" rx="6" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">SBI</text>
    </svg>
);

const ICICIIcon = () => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect fill="#F58025" width="48" height="48" rx="6" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">ICICI</text>
    </svg>
);

const AxisIcon = () => (
    <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect fill="#97144D" width="48" height="48" rx="6" />
        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">AXIS</text>
    </svg>
);

const SnackzoPayGateway = () => {
    const [searchParams] = useSearchParams();

    // ... (params)
    const amount = parseFloat(searchParams.get("amount") || "499");
    const orderId = searchParams.get("orderId") || "order_" + Date.now();
    const returnUrl = searchParams.get("returnUrl") || "/";
    const merchantName = searchParams.get("merchant") || "Hostel Mart";
    const customerPhone = searchParams.get("phone") || "+91 93201 XXXXX";

    const [method, setMethod] = useState<PaymentMethod>("upi");
    const [status, setStatus] = useState<PaymentStatus>("idle");
    const [showExitModal, setShowExitModal] = useState(false); // Removed showTestModal
    const [countdown, setCountdown] = useState(600);
    const [upiId, setUpiId] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [redirectCountdown, setRedirectCountdown] = useState(3);
    const [sessionId, setSessionId] = useState<string>("");

    // Helper to start the Full Page Simulation
    const startSimulation = () => {
        setStatus("simulating");
    };



    const paymentUrl = sessionId
        ? `${window.location.origin}/pay/confirm?amount=${amount}&orderId=${orderId}&sessionId=${sessionId}&returnUrl=${encodeURIComponent(returnUrl)}`
        : "";
    // ...

    const qrCodeUrl = paymentUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymentUrl)}&format=png&margin=8`
        : "";

    // Countdown Timer
    useEffect(() => {
        if (status !== "idle" && status !== "processing") return;

        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setStatus("failed");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [status]);

    const customerName = searchParams.get("customerName");

    // Create a payment session on mount
    useEffect(() => {
        const createSession = async () => {
            try {
                // Get User
                const { data: { user } } = await supabase.auth.getUser();

                // Insert a new pending payment session
                const { data, error } = await supabase
                    .from("payment_sessions")
                    .insert({
                        order_id: orderId,
                        amount: amount,
                        status: "pending",
                        user_id: user?.id || null, // Link User
                        guest_name: customerName ? decodeURIComponent(customerName) : null
                    })
                    .select()
                    .single();

                if (error) {
                    console.error("Error creating payment session:", error);
                    toast.error(`DB Error: ${error.message}`); // Show visible error
                    setSessionId("offline_" + Date.now());
                    return;
                }

                if (data) {
                    console.log("Session Created:", data);
                    setSessionId(data.id);
                    // Subscribe to changes for this specific session
                    const channel = supabase
                        .channel(`payment_${data.id}`)
                        .on(
                            "postgres_changes",
                            {
                                event: "UPDATE",
                                schema: "public",
                                table: "payment_sessions",
                                filter: `id=eq.${data.id}`
                            },
                            (payload) => {
                                console.log("Payment update received:", payload);
                                if (payload.new.status === "success") {
                                    processPayment(true);
                                } else if (payload.new.status === "failed") {
                                    processPayment(false);
                                }
                            }
                        )
                        .subscribe();

                    return () => {
                        supabase.removeChannel(channel);
                    };
                }
            } catch (err) {
                console.error("Session init failed:", err);
                // FALLBACK: If DB fails, still show QR code (without sync)
                setSessionId("offline_" + Date.now());
            }
        };

        createSession();
    }, [orderId, amount]);



    useEffect(() => {
        if (status === "redirecting") {
            const intv = setInterval(() => {
                setRedirectCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(intv);
                        const url = new URL(returnUrl, window.location.origin);
                        url.searchParams.set("status", "success");
                        url.searchParams.set("transaction_id", transactionId);
                        window.location.href = url.toString();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(intv);
        }
    }, [status, returnUrl, transactionId]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

    const processPayment = async (success: boolean) => {
        // setShowTestModal(false);
        setStatus("processing");

        // Update Database IMMEDIATELY
        if (sessionId && !sessionId.startsWith("offline_")) {
            const statusToSet = success ? "success" : "failed";
            console.log(`Updating DB Session ${sessionId} to ${statusToSet}`);

            // Use RPC to bypass RLS
            await supabase.rpc('complete_payment_session', {
                p_session_id: sessionId,
                p_status: statusToSet,
                p_method: method // Send the selected method (upi, cards, etc.)
            });
        }

        await new Promise(r => setTimeout(r, 2000));

        if (success) {
            const txnId = generateTxnId();
            setTransactionId(txnId);
            setStatus("success");
            await new Promise(r => setTimeout(r, 2500));
            setStatus("redirecting");
        } else {
            setStatus("failed");
        }
    };

    const cancel = () => {
        const url = new URL(returnUrl, window.location.origin);
        url.searchParams.set("status", "cancelled");
        window.location.href = url.toString();
    };

    const upiApps = [
        { id: "phonepe", name: "PhonePe", Icon: PhonePe },
        { id: "gpay", name: "Google Pay", Icon: GPay },
        { id: "paytm", name: "Paytm", Icon: Paytm },
        { id: "bhim", name: "BHIM", Icon: BHIM },
    ];

    const banks = [
        { id: "hdfc", name: "HDFC Bank", Icon: HDFCIcon },
        { id: "sbi", name: "State Bank of India", Icon: SBIIcon },
        { id: "icici", name: "ICICI Bank", Icon: ICICIIcon },
        { id: "axis", name: "Axis Bank", Icon: AxisIcon },
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
                {/* ===== MAIN PAYMENT MODAL (OLD GOOD UI) ===== */}
                {(status === "idle" || status === "processing") && (
                    <motion.div
                        key="payment-modal"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row bg-slate-900 border border-slate-800"
                    >
                        {/* Left Panel - Gradient */}
                        <div
                            className="relative w-full md:w-[320px] p-6 text-white"
                            style={{
                                background: "linear-gradient(160deg, #a855f7 0%, #ec4899 50%, #f97316 100%)"
                            }}
                        >
                            <div className="flex items-center gap-2 mb-8">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                    <Zap size={22} className="text-white" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-lg">SnackzoPay</h1>
                                    <p className="text-white/70 text-xs flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                        Trusted Business
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-center my-8">
                                <motion.div
                                    animate={{ y: [0, -8, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="text-7xl"
                                >
                                    🛍️
                                </motion.div>
                            </div>

                            <div className="bg-white/10 backdrop-blur rounded-xl p-4 mt-auto">
                                <p className="text-white/60 text-sm">Price Summary</p>
                                <p className="text-4xl font-black mt-1">₹{amount.toLocaleString("en-IN")}</p>

                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20">
                                    <div className="flex items-center gap-1.5 text-sm text-white/70">
                                        <Phone size={14} />
                                        <span>Paying as {customerPhone}</span>
                                    </div>
                                    <span className={cn(
                                        "text-xl font-mono font-bold",
                                        countdown < 60 ? "text-red-300" : "text-white"
                                    )}>
                                        {formatTime(countdown)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 mt-6 text-xs text-white/50">
                                <Lock size={12} />
                                <span>Secured by <strong className="text-white/70">SnackzoPay</strong></span>
                            </div>
                        </div>

                        {/* Right Panel */}
                        <div className="flex-1 flex flex-col bg-slate-900">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                    <h2 className="font-semibold text-white">Payment Options</h2>
                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px] font-bold">TEST MODE</span>
                                </div>
                                <button onClick={() => setShowExitModal(true)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                                    <X size={18} className="text-slate-400" />
                                </button>
                            </div>

                            {status === "processing" ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center p-12">
                                    <div className="relative w-16 h-16">
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-4 border-slate-700 border-t-purple-500 rounded-full" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <CreditCard size={24} className="text-purple-400" />
                                        </div>
                                    </div>
                                    <h3 className="font-semibold mt-6 text-white">Processing Payment</h3>
                                    <p className="text-sm text-slate-400 mt-1">Please wait...</p>
                                </motion.div>
                            ) : (
                                <div className="flex-1 flex overflow-hidden">
                                    <div className="w-40 border-r border-slate-800 py-2 bg-slate-900/50">
                                        {[
                                            { id: "upi", label: "UPI", icon: QrCode },
                                            { id: "cards", label: "Cards", icon: CreditCard },
                                            { id: "netbanking", label: "Netbanking", icon: Building2 },
                                            { id: "wallet", label: "Wallet", icon: Wallet },
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setMethod(tab.id as PaymentMethod)}
                                                className={cn(
                                                    "w-full px-4 py-3 text-left flex items-center gap-2.5 transition-all relative",
                                                    method === tab.id ? "bg-slate-800 text-purple-400" : "text-slate-400 hover:bg-slate-800/50"
                                                )}
                                            >
                                                {method === tab.id && <motion.div layoutId="activeTab" className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-500" />}
                                                <tab.icon size={18} />
                                                <span className="text-sm font-medium">{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex-1 p-5 overflow-y-auto">
                                        <AnimatePresence mode="wait">
                                            {method === "upi" && (
                                                <motion.div key="upi" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
                                                    <div>
                                                        <h3 className="text-sm font-medium text-slate-300 mb-4 text-center">Scan with any UPI App</h3>
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="bg-white p-3 rounded-2xl shadow-xl shadow-purple-500/10">
                                                                {qrCodeUrl ? (
                                                                    <img src={qrCodeUrl} alt="Scan to Pay" className="w-64 h-64" />
                                                                ) : (
                                                                    <div className="w-64 h-64 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center">
                                                                        <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-col items-center">
                                                                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                                                                    <Clock size={14} />
                                                                    <span>Expires in</span>
                                                                </div>
                                                                <span className={cn(
                                                                    "text-2xl font-mono font-bold tracking-widest bg-slate-800 px-4 py-1 rounded-lg border border-slate-700",
                                                                    countdown < 60 ? "text-red-400 border-red-500/30 animate-pulse" : "text-white"
                                                                )}>
                                                                    {formatTime(countdown)}
                                                                </span>
                                                            </div>

                                                            <div className="flex gap-4 mt-2">
                                                                {upiApps.map(app => (
                                                                    <button key={app.id} onClick={startSimulation} className="w-10 h-10 rounded-xl overflow-hidden shadow-lg hover:scale-110 transition-transform hover:shadow-purple-500/50">
                                                                        <app.Icon />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h3 className="text-sm font-medium text-slate-300 mb-2">Recommended</h3>
                                                        <div className="space-y-2">
                                                            {upiApps.slice(0, 2).map(app => (
                                                                <button key={app.id} onClick={startSimulation} className="w-full p-3 border border-slate-700 rounded-lg hover:border-purple-500/50 hover:bg-slate-800/50 transition-all flex items-center gap-3 group">
                                                                    <div className="w-8 h-8 rounded-md overflow-hidden shadow">
                                                                        <app.Icon />
                                                                    </div>
                                                                    <span className="flex-1 text-sm text-left text-slate-300">UPI - {app.name}</span>
                                                                    <ChevronRight size={16} className="text-slate-600 group-hover:text-purple-400" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h3 className="text-sm font-medium text-slate-300 mb-2">Or enter UPI ID</h3>
                                                        <div className="flex gap-2">
                                                            <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" className="flex-1 px-3 py-2.5 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none text-sm" />
                                                            <button onClick={startSimulation} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-sm transition-colors">Pay</button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {method === "cards" && (
                                                <motion.div key="cards" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                                                    <h3 className="text-sm font-medium text-slate-300">Card Details</h3>
                                                    <input type="text" placeholder="Card Number" className="w-full px-3 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none text-sm font-mono" />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input type="text" placeholder="MM / YY" className="px-3 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none text-sm font-mono" />
                                                        <input type="password" placeholder="CVV" className="px-3 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none text-sm font-mono" />
                                                    </div>
                                                    <input type="text" placeholder="Name on Card" className="w-full px-3 py-3 border border-slate-700 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none text-sm" />
                                                    <button onClick={startSimulation} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
                                                        <Lock size={16} /> Pay ₹{amount.toLocaleString("en-IN")}
                                                    </button>
                                                </motion.div>
                                            )}

                                            {method === "netbanking" && (
                                                <motion.div key="netbanking" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                                                    <h3 className="text-sm font-medium text-slate-300">Select Bank</h3>
                                                    {banks.map(bank => (
                                                        <button key={bank.id} onClick={startSimulation} className="w-full p-3 border border-slate-700 rounded-lg hover:border-purple-500/50 hover:bg-slate-800/50 transition-all flex items-center gap-3 group">
                                                            <div className="w-8 h-8 rounded-md overflow-hidden shadow">
                                                                <bank.Icon />
                                                            </div>
                                                            <span className="flex-1 text-sm text-left text-slate-300">{bank.name}</span>
                                                            <ChevronRight size={16} className="text-slate-600 group-hover:text-purple-400" />
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}

                                            {method === "wallet" && (
                                                <motion.div key="wallet" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="text-center py-6">
                                                    <div className="w-16 h-16 mx-auto bg-purple-600/20 rounded-2xl flex items-center justify-center mb-4">
                                                        <Wallet size={32} className="text-purple-400" />
                                                    </div>
                                                    <h3 className="font-bold text-lg text-white">Snackzo Wallet</h3>
                                                    <p className="text-slate-400 text-sm">Balance: ₹500.00</p>
                                                    <button onClick={startSimulation} className="w-full mt-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors">
                                                        Pay ₹{amount.toLocaleString("en-IN")}
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ===== NEW FULL SCREEN SIMULATOR ===== */}
                {status === "simulating" && (
                    <motion.div
                        key="simulator"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden relative"
                    >
                        {/* Simulation Header */}
                        <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-green-400" />
                                <span className="text-sm font-medium">Secure Payment Gateway</span>
                            </div>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                            </div>
                        </div>

                        {/* Simulation Body */}
                        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="w-full flex flex-col items-center"
                            >
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 relative">
                                    <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                                    />
                                    <Lock size={32} className="text-slate-400" />
                                </div>

                                <h3 className="text-xl font-bold text-slate-800 mb-2">Connecting to Bank...</h3>
                                <p className="text-slate-500 text-center text-sm mb-8">
                                    Please do not close this window or press back button.
                                </p>

                                {/* SIMULATION CONTROLS */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 2 }} // Show controls after 2 seconds
                                    className="w-full space-y-3"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-slate-200" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-white px-2 text-slate-400">Simulator Actions</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => processPayment(true)}
                                        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={20} /> Authorize Payment (Success)
                                    </button>

                                    <button
                                        onClick={() => processPayment(false)}
                                        className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <XCircle size={20} /> Decline Transaction (Fail)
                                    </button>
                                </motion.div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {/* ===== NEW STUNNING SUCCESS PAGE ===== */}
                {status === "success" && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full max-w-md text-center"
                    >
                        {/* Floating particles background */}
                        <div className="fixed inset-0 pointer-events-none overflow-hidden">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: "100vh", x: `${Math.random() * 100}vw`, opacity: 0 }}
                                    animate={{
                                        y: "-10vh",
                                        opacity: [0, 1, 1, 0],
                                        scale: [0.5, 1, 1, 0.5],
                                    }}
                                    transition={{
                                        duration: 4 + Math.random() * 2,
                                        repeat: Infinity,
                                        delay: i * 0.3,
                                        ease: "linear"
                                    }}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={{
                                        background: `linear-gradient(135deg, ${['#22c55e', '#10b981', '#34d399'][i % 3]}, transparent)`
                                    }}
                                />
                            ))}
                        </div>

                        <motion.div
                            initial={{ scale: 0.8, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 150, damping: 20 }}
                            className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-10 relative overflow-hidden"
                        >
                            {/* Glowing ring */}
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="relative w-28 h-28 mx-auto mb-8"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"
                                />
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                                    className="relative w-full h-full bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30"
                                >
                                    <motion.div
                                        initial={{ scale: 0, rotate: -90 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                                    >
                                        <Check size={50} className="text-white" strokeWidth={3} />
                                    </motion.div>
                                </motion.div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                                <h2 className="text-2xl font-bold text-white mb-3">Payment Successful!</h2>
                                <motion.p
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    className="text-5xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
                                >
                                    ₹{amount.toLocaleString("en-IN")}
                                </motion.p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                className="mt-8 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 rounded-xl"
                            >
                                <span className="text-slate-500 text-sm">Transaction ID:</span>
                                <span className="text-white font-mono">{transactionId}</span>
                                <button onClick={() => navigator.clipboard.writeText(transactionId)} className="p-1 hover:bg-white/10 rounded">
                                    <Copy size={14} className="text-slate-400" />
                                </button>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}

                {/* ===== NEW STUNNING REDIRECT PAGE ===== */}
                {status === "redirecting" && (
                    <motion.div
                        key="redirecting"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md text-center"
                    >
                        <motion.div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-10 relative overflow-hidden">
                            {/* Pulsing background glow */}
                            <motion.div
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-orange-600/10"
                            />

                            {/* Logo with pulse */}
                            <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="relative w-20 h-20 mx-auto mb-8"
                            >
                                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl">
                                    <Zap size={36} className="text-white" />
                                </div>
                            </motion.div>

                            <h2 className="text-xl font-bold text-white mb-2 relative">Redirecting to Order...</h2>
                            <p className="text-slate-400 text-sm mb-10 relative">Taking you back to {merchantName}</p>

                            {/* Animated countdown */}
                            <div className="relative mb-10">
                                <motion.div
                                    key={redirectCountdown}
                                    initial={{ scale: 2, opacity: 0, y: -20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, y: 20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="text-8xl font-black bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent"
                                >
                                    {redirectCountdown}
                                </motion.div>
                            </div>

                            {/* Animated progress bar */}
                            <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: 3, ease: "linear" }}
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full"
                                />
                                <motion.div
                                    animate={{ x: ["-100%", "200%"] }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* ===== FAILED ===== */}
                {status === "failed" && (
                    <motion.div key="failed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="w-20 h-20 mx-auto bg-red-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-500/25">
                                <XCircle size={40} className="text-white" />
                            </motion.div>
                            <h2 className="text-xl font-bold text-white mb-2">Payment Failed</h2>
                            <p className="text-slate-400 text-sm mb-6">Please try again</p>
                            <div className="flex gap-3">
                                <button onClick={() => setStatus("idle")} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                                    <RefreshCw size={16} /> Retry
                                </button>
                                <button onClick={cancel} className="flex-1 py-3 border border-slate-700 text-slate-400 rounded-lg font-medium">Cancel</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* EXIT MODAL */}
            <AnimatePresence>
                {showExitModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full relative overflow-hidden text-center shadow-2xl"
                        >
                            {/* Background Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-purple-500/20 blur-3xl rounded-full pointer-events-none" />

                            <div className="relative z-10">
                                <div className="w-20 h-20 mx-auto bg-slate-800 rounded-3xl flex items-center justify-center mb-6 rotate-3 border border-slate-700 shadow-xl">
                                    <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                                        <LogOut size={24} className="text-red-500 ml-1" />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2">Are you sure?</h3>
                                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                    Your payment session will be cancelled and you will be returned to the store.
                                </p>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => setShowExitModal(false)}
                                        className="w-full py-3.5 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg shadow-white/10"
                                    >
                                        Continue Payment
                                    </button>
                                    <button
                                        onClick={cancel}
                                        className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-medium border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-colors"
                                    >
                                        Yes, Exit
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SnackzoPayGateway;
