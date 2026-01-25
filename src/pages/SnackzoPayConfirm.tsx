import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
    CheckCircle, XCircle, Shield, Zap, Loader2, AlertCircle,
    Check, Lock
} from "lucide-react";

type PaymentStatus = "confirm" | "processing" | "success" | "failed";

const SnackzoPayConfirm = () => {
    const [searchParams] = useSearchParams();

    const amount = parseFloat(searchParams.get("amount") || "0");
    const orderId = searchParams.get("orderId") || "";
    const sessionId = searchParams.get("sessionId"); // We need this!

    const [status, setStatus] = useState<PaymentStatus>("confirm");
    const [showTestModal, setShowTestModal] = useState(false);
    const [transactionId, setTransactionId] = useState("");

    // Generate transaction ID
    const generateTxnId = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let id = "pay_";
        for (let i = 0; i < 14; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    };

    const processPayment = async (success: boolean) => {
        setShowTestModal(false);
        setStatus("processing");

        // Simulate network delay
        await new Promise(r => setTimeout(r, 1500));

        const txnId = generateTxnId();
        setTransactionId(txnId);

        if (success) {
            // Update Supabase if session ID exists and is likely real
            if (sessionId && !sessionId.startsWith("offline_")) {
                try {
                    console.log("Updating session:", sessionId);
                    const { error } = await supabase
                        .from("payment_sessions")
                        .update({
                            status: "success",
                            updated_at: new Date().toISOString()
                        })
                        .eq("id", sessionId);

                    if (error) {
                        console.error("Supabase update error:", error);
                    } else {
                        console.log("Supabase update success");
                    }
                } catch (err) {
                    console.error("Payment update failed:", err);
                }
            }
            setStatus("success");
        } else {
            if (sessionId && !sessionId.startsWith("offline_")) {
                await supabase
                    .from("payment_sessions")
                    .update({ status: "failed", updated_at: new Date().toISOString() })
                    .eq("id", sessionId);
            }
            setStatus("failed");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-slate-900 p-6 text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-orange-500/20" />
                    <Zap className="mx-auto mb-3 text-yellow-400 fill-yellow-400" size={32} />
                    <h1 className="text-lg font-bold">SnackzoPay</h1>
                    <p className="text-slate-400 text-xs uppercase tracking-wider mt-1">Secure Payment</p>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Confirm */}
                    {status === "confirm" && (
                        <div className="text-center">
                            <p className="text-slate-500 text-sm mb-1">Total Amount</p>
                            <p className="text-4xl font-black text-slate-800">₹{amount.toLocaleString("en-IN")}</p>

                            <div className="bg-slate-100 rounded-lg p-3 my-6 flex justify-between items-center text-sm">
                                <span className="text-slate-500">Order ID</span>
                                <span className="font-mono font-medium text-slate-700">{orderId}</span>
                            </div>

                            <button
                                onClick={() => setShowTestModal(true)}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Lock size={18} />
                                Pay Securely
                            </button>

                            {!sessionId && (
                                <p className="text-xs text-red-500 mt-4 bg-red-50 p-2 rounded">
                                    Warning: No Session ID. Sync will not work.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Processing */}
                    {status === "processing" && (
                        <div className="text-center py-8">
                            <Loader2 size={48} className="text-purple-600 animate-spin mx-auto mb-4" />
                            <h3 className="font-semibold text-slate-800 mb-1">Processing Payment...</h3>
                            <p className="text-sm text-slate-500">Please do not close this window</p>
                        </div>
                    )}

                    {/* Success */}
                    {status === "success" && (
                        <div className="text-center py-4">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                                className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/30"
                            >
                                <Check size={40} className="text-white" strokeWidth={3} />
                            </motion.div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">Payment Successful!</h3>
                            <p className="text-3xl font-bold text-green-600 mb-6">₹{amount.toLocaleString("en-IN")}</p>
                            <div className="bg-slate-50 rounded-lg p-3 text-sm border border-slate-100">
                                <p className="text-slate-500 text-xs uppercase mb-1">Transaction ID</p>
                                <p className="font-mono font-medium text-slate-700">{transactionId}</p>
                            </div>
                            <p className="text-xs text-slate-400 mt-6">You can close this window now.</p>
                        </div>
                    )}

                    {/* Failed */}
                    {status === "failed" && (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
                                <XCircle size={40} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">Payment Failed</h3>
                            <p className="text-sm text-slate-500 mb-6">Transaction was declined</p>
                            <button
                                onClick={() => setStatus("confirm")}
                                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transaction-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                        <Shield size={10} /> Secured by SnackzoPay
                    </p>
                </div>
            </motion.div>

            {/* Test Modal */}
            {showTestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowTestModal(false)}>
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-white rounded-xl p-6 max-w-xs w-full shadow-2xl"
                    >
                        <div className="text-center mb-4">
                            <AlertCircle size={32} className="mx-auto text-yellow-500 mb-2" />
                            <h3 className="font-bold text-slate-800">Test Mode</h3>
                            <p className="text-sm text-slate-500">Choose outcome:</p>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => processPayment(true)}
                                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700"
                            >
                                <CheckCircle size={18} /> Success
                            </button>
                            <button
                                onClick={() => processPayment(false)}
                                className="w-full py-3 bg-red-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-700"
                            >
                                <XCircle size={18} /> Failure
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default SnackzoPayConfirm;
