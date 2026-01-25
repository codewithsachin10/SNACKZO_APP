import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Shield, CreditCard, Lock, Zap, Loader2 } from "lucide-react";

const SnackzoMobilePay = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const amount = searchParams.get("amount");
    const orderId = searchParams.get("orderId");

    const [status, setStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");

    const handlePayment = async (success: boolean) => {
        if (!sessionId) return;

        setStatus("processing");

        // Simulate network delay
        await new Promise(r => setTimeout(r, 1500));

        try {
            const { error } = await supabase
                .from("payment_sessions")
                .update({
                    status: success ? "success" : "failed",
                    updated_at: new Date().toISOString()
                })
                .eq("id", sessionId);

            if (error) throw error;
            setStatus(success ? "success" : "failed");
        } catch (err) {
            console.error("Payment update failed:", err);
            setStatus("failed");
        }
    };

    if (!sessionId) {
        return <div className="p-8 text-center bg-slate-950 text-white min-h-screen">Invalid Payment Session</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center font-sans">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 p-6 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-orange-500/20" />
                    <Zap className="mx-auto mb-3 text-yellow-400 fill-yellow-400" size={32} />
                    <h1 className="text-lg font-bold">SnackzoPay</h1>
                    <p className="text-slate-400 text-xs uppercase tracking-wider mt-1">Secure Payment</p>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="text-center mb-8">
                        <p className="text-slate-500 text-sm mb-1">Total Amount</p>
                        <p className="text-4xl font-black text-slate-800">₹{amount}</p>
                        <p className="text-xs text-slate-400 mt-2 bg-slate-100 py-1 px-3 rounded-full inline-block">
                            Order: {orderId}
                        </p>
                    </div>

                    {status === "idle" && (
                        <div className="space-y-3">
                            <button
                                onClick={() => handlePayment(true)}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Lock size={18} />
                                Pay Securely
                            </button>
                            <button
                                onClick={() => handlePayment(false)}
                                className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 active:scale-95 transition-all"
                            >
                                Decline
                            </button>
                        </div>
                    )}

                    {status === "processing" && (
                        <div className="text-center py-8">
                            <Loader2 size={40} className="text-purple-600 animate-spin mx-auto mb-4" />
                            <p className="font-medium text-slate-700">Processing...</p>
                        </div>
                    )}

                    {status === "success" && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center py-4"
                        >
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Payment Successful</h3>
                            <p className="text-slate-500 text-sm mt-2">You can close this window now.</p>
                        </motion.div>
                    )}

                    {status === "failed" && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center py-4"
                        >
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircle size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Payment Failed</h3>
                            <button onClick={() => setStatus("idle")} className="mt-4 text-purple-600 font-medium">Try Again</button>
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                        <Shield size={10} /> Secured by SnackzoPay
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SnackzoMobilePay;
