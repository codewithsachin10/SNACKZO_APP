import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle, XCircle, Shield, Lock, Smartphone, CreditCard,
    Loader2, Zap, ChevronRight, QrCode, Wifi, Timer, AlertCircle,
    ArrowLeft, Copy, RefreshCw, Clock, ChevronDown, Check, X,
    Sparkles, Star, Building2, Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SnackzoPayProps {
    amount: number;
    orderId: string;
    orderDescription?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    onSuccess: (transactionId: string) => void;
    onFailure: (error: string) => void;
    onCancel: () => void;
}

import { supabase } from "@/integrations/supabase/client";

type PaymentMethod = "upi" | "card" | "wallet" | "netbanking";
type PaymentStatus = "idle" | "processing" | "verifying" | "success" | "failed";

// Generate random transaction ID
const generateTransactionId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "SNKZ";
    for (let i = 0; i < 12; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
};

// Generate random UPI ID for demo
const generateUPIId = () => {
    const names = ["snackzo", "payments", "merchant", "hostelmart"];
    return `${names[Math.floor(Math.random() * names.length)]}@snackzopay`;
};

export const SnackzoPay = ({
    amount,
    orderId,
    orderDescription = "Order Payment",
    customerName = "Customer",
    customerEmail,
    customerPhone,
    onSuccess,
    onFailure,
    onCancel,
}: SnackzoPayProps) => {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
    const [status, setStatus] = useState<PaymentStatus>("idle");
    const [showTestMode, setShowTestMode] = useState(false);
    const [countdown, setCountdown] = useState(300); // 5 minutes
    const [scannerPosition, setScannerPosition] = useState(0);
    const [upiId, setUpiId] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvv, setCardCvv] = useState("");
    const [selectedBank, setSelectedBank] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Payment Session on Mount
    useEffect(() => {
        const initSession = async () => {
            if (!amount || !orderId) return;
            try {
                // Ensure orderId is formatted correctly if it's a UUID
                // If orderId is purely cosmetic (e.g. #ORD-123), pass null to p_order_id?
                // Assuming orderId IS the database UUID. If not, we might need a prop `dbOrderId`.
                // For now, let's assume orderId prop is the UUID. 
                // If it fails UUID validation, we might need to handle it.
                // NOTE: If orderId is "ORD-123...", this will fail. 
                // We'll try to use it if it looks like uuid, else pass null.
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

                const { data, error } = await supabase.rpc('initiate_payment_session', {
                    p_amount: amount,
                    p_order_id: isUUID ? orderId : null
                });

                if (error) console.error("Session Init Error:", error);
                if (data) setSessionId(data);
            } catch (err) {
                console.error("Payment Session Error", err);
            }
        };
        initSession();
    }, [amount, orderId]);

    const merchantUPI = generateUPIId();

    // Countdown timer
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 0) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    onFailure("Payment timeout");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [onFailure]);

    // Scanner animation
    useEffect(() => {
        const scanInterval = setInterval(() => {
            setScannerPosition(prev => (prev >= 100 ? 0 : prev + 2));
        }, 50);
        return () => clearInterval(scanInterval);
    }, []);

    // Process payment (Secure Mock Gateway)
    const processPayment = async (simulateSuccess: boolean) => {
        if (!sessionId) {
            onFailure("Session not initialized. Please try again.");
            return;
        }

        setStatus("processing");
        setShowTestMode(false);

        // Simulate network delay for realism
        await new Promise(r => setTimeout(r, 1500));
        setStatus("verifying");

        try {
            // Call the Server-Side Secure Function
            const { data, error } = await supabase.rpc('process_mock_payment', {
                p_session_id: sessionId,
                p_success: simulateSuccess,
                p_method: paymentMethod
            });

            if (error) throw error;

            if (data?.success && simulateSuccess) {
                const txnId = generateTransactionId();
                setTransactionId(txnId);
                setStatus("success");
                setTimeout(() => onSuccess(txnId), 2000);
            } else {
                throw new Error(data?.message || "Payment declined");
            }
        } catch (err: any) {
            console.error("Payment Processing Error:", err);
            setStatus("failed");
            setTimeout(() => onFailure(err.message || "Payment declined by server"), 2000);
        }
    };

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Format card number
    const formatCardNumber = (value: string) => {
        return value.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
    };

    // Banks list
    const banks = [
        { id: "sbi", name: "State Bank of India", color: "#1a4480" },
        { id: "hdfc", name: "HDFC Bank", color: "#004c8f" },
        { id: "icici", name: "ICICI Bank", color: "#f58025" },
        { id: "axis", name: "Axis Bank", color: "#97144d" },
        { id: "kotak", name: "Kotak Mahindra", color: "#ed1c24" },
        { id: "pnb", name: "Punjab National Bank", color: "#003399" },
    ];

    // Payment methods config
    const paymentMethods = [
        { id: "upi" as const, name: "UPI", icon: QrCode, desc: "Google Pay, PhonePe, BHIM" },
        { id: "card" as const, name: "Card", icon: CreditCard, desc: "Credit & Debit Cards" },
        { id: "wallet" as const, name: "Wallet", icon: Wallet, desc: "Snackzo Wallet" },
        { id: "netbanking" as const, name: "NetBanking", icon: Building2, desc: "All major banks" },
    ];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl">
            {/* Main Container */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-lg mx-4 bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
            >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 p-6">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMCAwaDIwdjIwSDB6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

                    <div className="relative flex items-center justify-between">
                        <button onClick={onCancel} className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors">
                            <ArrowLeft className="text-white" size={24} />
                        </button>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Zap className="text-white" size={24} fill="white" />
                                <h1 className="text-2xl font-black text-white tracking-tight">SnackzoPay</h1>
                            </div>
                            <p className="text-white/70 text-sm">Secure Payment Gateway</p>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-full">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-xs text-white font-medium">TEST</span>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="mt-6 text-center">
                        <p className="text-white/60 text-sm mb-1">Amount to Pay</p>
                        <p className="text-4xl font-black text-white">₹{amount.toLocaleString()}</p>
                        <p className="text-white/50 text-xs mt-2">Order: {orderId}</p>
                    </div>

                    {/* Timer */}
                    <div className="absolute top-6 right-20 flex items-center gap-1 text-white/60">
                        <Clock size={14} />
                        <span className={cn("text-sm font-mono", countdown < 60 && "text-red-300")}>{formatTime(countdown)}</span>
                    </div>
                </div>

                {/* Content Area */}
                <AnimatePresence mode="wait">
                    {/* Idle State - Payment Method Selection */}
                    {status === "idle" && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="p-6"
                        >
                            {/* Payment Methods */}
                            <div className="grid grid-cols-4 gap-2 mb-6">
                                {paymentMethods.map(method => (
                                    <button
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id)}
                                        className={cn(
                                            "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                                            paymentMethod === method.id
                                                ? "border-orange-500 bg-orange-500/10"
                                                : "border-white/10 hover:border-white/20 bg-white/5"
                                        )}
                                    >
                                        <method.icon size={20} className={paymentMethod === method.id ? "text-orange-500" : "text-white/60"} />
                                        <span className={cn("text-xs font-medium", paymentMethod === method.id ? "text-orange-500" : "text-white/60")}>
                                            {method.name}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* UPI Payment */}
                            {paymentMethod === "upi" && (
                                <div className="space-y-4">
                                    {/* QR Code */}
                                    <div className="relative bg-white rounded-2xl p-4 mx-auto w-fit">
                                        <div className="w-48 h-48 relative">
                                            {/* QR Pattern (simplified) */}
                                            <div className="absolute inset-0 grid grid-cols-8 gap-1 p-2">
                                                {Array.from({ length: 64 }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={cn("rounded-sm", Math.random() > 0.5 ? "bg-black" : "bg-white")}
                                                    />
                                                ))}
                                            </div>
                                            {/* Center Logo */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                                                    <Zap className="text-white" size={24} fill="white" />
                                                </div>
                                            </div>
                                            {/* Scanner Line */}
                                            <motion.div
                                                animate={{ top: `${scannerPosition}%` }}
                                                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent"
                                            />
                                        </div>
                                    </div>

                                    <p className="text-center text-white/50 text-sm">Scan with any UPI app</p>

                                    {/* Or Divider */}
                                    <div className="flex items-center gap-4 my-4">
                                        <div className="flex-1 h-px bg-white/10" />
                                        <span className="text-white/30 text-sm">or pay via UPI ID</span>
                                        <div className="flex-1 h-px bg-white/10" />
                                    </div>

                                    {/* UPI ID Input */}
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={upiId}
                                            onChange={e => setUpiId(e.target.value)}
                                            placeholder="Enter UPI ID (e.g., name@upi)"
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none transition-colors"
                                        />
                                        <p className="text-xs text-white/30 flex items-center gap-1">
                                            <Lock size={10} /> Paying to: <span className="text-orange-400">{merchantUPI}</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Card Payment */}
                            {paymentMethod === "card" && (
                                <div className="space-y-4">
                                    {/* Card Visual */}
                                    <div className="relative h-48 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-2xl p-6 overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==')] opacity-50" />
                                        <div className="relative">
                                            <div className="flex justify-between items-start">
                                                <div className="w-12 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md" />
                                                <Wifi className="text-white/30" size={24} />
                                            </div>
                                            <p className="text-white/80 font-mono text-xl tracking-widest mt-8">
                                                {cardNumber || "•••• •••• •••• ••••"}
                                            </p>
                                            <div className="flex justify-between mt-6">
                                                <div>
                                                    <p className="text-white/40 text-[10px]">VALID THRU</p>
                                                    <p className="text-white/80 font-mono">{cardExpiry || "MM/YY"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-white/40 text-[10px]">CVV</p>
                                                    <p className="text-white/80 font-mono">{cardCvv ? "•••" : "•••"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Inputs */}
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={e => setCardNumber(formatCardNumber(e.target.value.replace(/\D/g, "")))}
                                            placeholder="Card Number"
                                            maxLength={19}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none font-mono tracking-widest"
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                value={cardExpiry}
                                                onChange={e => {
                                                    const v = e.target.value.replace(/\D/g, "");
                                                    setCardExpiry(v.length >= 2 ? v.slice(0, 2) + "/" + v.slice(2, 4) : v);
                                                }}
                                                placeholder="MM/YY"
                                                maxLength={5}
                                                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none font-mono"
                                            />
                                            <input
                                                type="password"
                                                value={cardCvv}
                                                onChange={e => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                                                placeholder="CVV"
                                                maxLength={3}
                                                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Wallet */}
                            {paymentMethod === "wallet" && (
                                <div className="text-center py-8">
                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-4">
                                        <Wallet size={36} className="text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Snackzo Wallet</h3>
                                    <p className="text-white/50 mb-4">Available Balance: ₹500.00</p>
                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                                        <p className="text-green-500 text-sm">✓ Sufficient balance for this transaction</p>
                                    </div>
                                </div>
                            )}

                            {/* Net Banking */}
                            {paymentMethod === "netbanking" && (
                                <div className="space-y-3">
                                    <p className="text-white/50 text-sm mb-3">Select your bank</p>
                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                        {banks.map(bank => (
                                            <button
                                                key={bank.id}
                                                onClick={() => setSelectedBank(bank.id)}
                                                className={cn(
                                                    "p-3 rounded-xl border-2 text-left transition-all",
                                                    selectedBank === bank.id
                                                        ? "border-orange-500 bg-orange-500/10"
                                                        : "border-white/10 hover:border-white/20 bg-white/5"
                                                )}
                                            >
                                                <div className="w-8 h-8 rounded-full mb-2" style={{ backgroundColor: bank.color }} />
                                                <p className="text-white text-xs font-medium truncate">{bank.name}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pay Button */}
                            <motion.button
                                onClick={() => setShowTestMode(true)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full mt-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                            >
                                <Lock size={18} />
                                Pay ₹{amount.toLocaleString()}
                            </motion.button>

                            {/* Security Badge */}
                            <div className="flex items-center justify-center gap-2 mt-4 text-white/30 text-xs">
                                <Shield size={14} />
                                <span>256-bit SSL Encrypted • PCI DSS Compliant</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Processing State */}
                    {(status === "processing" || status === "verifying") && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="p-12 text-center"
                        >
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full" />
                                <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {status === "processing" ? (
                                        <Loader2 size={32} className="text-orange-500 animate-pulse" />
                                    ) : (
                                        <Shield size={32} className="text-orange-500" />
                                    )}
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                {status === "processing" ? "Processing Payment" : "Verifying Transaction"}
                            </h3>
                            <p className="text-white/50">
                                {status === "processing"
                                    ? "Connecting to your bank..."
                                    : "Confirming with payment network..."}
                            </p>
                            <div className="mt-6 flex items-center justify-center gap-2">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                        className="w-2 h-2 bg-orange-500 rounded-full"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Success State */}
                    {status === "success" && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-12 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                                className="w-24 h-24 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center"
                            >
                                <CheckCircle size={48} className="text-white" />
                            </motion.div>
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                <h3 className="text-2xl font-black text-white mb-2">Payment Successful!</h3>
                                <p className="text-4xl font-black text-green-500 mb-4">₹{amount.toLocaleString()}</p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-white/50 text-sm font-mono">
                                    <span>Txn: {transactionId}</span>
                                    <button onClick={() => navigator.clipboard.writeText(transactionId)} className="hover:text-white">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="mt-8 flex items-center justify-center gap-4"
                            >
                                <Sparkles className="text-yellow-500" />
                                <span className="text-white/50">Redirecting to order confirmation...</span>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Failed State */}
                    {status === "failed" && (
                        <motion.div
                            key="failed"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-12 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                                className="w-24 h-24 mx-auto mb-6 bg-red-500 rounded-full flex items-center justify-center"
                            >
                                <XCircle size={48} className="text-white" />
                            </motion.div>
                            <h3 className="text-2xl font-black text-white mb-2">Payment Failed</h3>
                            <p className="text-white/50 mb-6">Transaction was declined by your bank</p>
                            <button
                                onClick={() => {
                                    setStatus("idle");
                                    setShowTestMode(false);
                                }}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium flex items-center gap-2 mx-auto transition-colors"
                            >
                                <RefreshCw size={18} /> Try Again
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                {status === "idle" && (
                    <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
                                <span className="text-[8px] text-white font-bold">VISA</span>
                            </div>
                            <div className="w-8 h-5 bg-[#EB001B] rounded relative overflow-hidden">
                                <div className="absolute right-0 w-4 h-full bg-[#F79E1B]" />
                            </div>
                            <div className="w-8 h-5 bg-[#5F259F] rounded flex items-center justify-center">
                                <span className="text-[6px] text-white font-bold">RuPay</span>
                            </div>
                        </div>
                        <p className="text-white/30 text-xs">Powered by SnackzoPay</p>
                    </div>
                )}
            </motion.div>

            {/* Test Mode Modal */}
            <AnimatePresence>
                {showTestMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowTestMode(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
                                    <AlertCircle size={32} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Test Mode</h3>
                                <p className="text-white/50 text-sm mt-2">
                                    This is a demo payment gateway. Choose how you want this transaction to complete.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <motion.button
                                    onClick={() => processPayment(true)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-green-500/25"
                                >
                                    <CheckCircle size={22} />
                                    Simulate Success
                                </motion.button>

                                <motion.button
                                    onClick={() => processPayment(false)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-red-500/25"
                                >
                                    <XCircle size={22} />
                                    Simulate Failure
                                </motion.button>
                            </div>

                            <button
                                onClick={() => setShowTestMode(false)}
                                className="w-full mt-4 py-3 text-white/50 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SnackzoPay;
