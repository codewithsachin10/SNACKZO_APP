import { Mail, AlertCircle, X, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface MailSentNotificationProps {
    type: string; // e.g. "Verification", "Password Reset", "OTP"
    email: string;
    onClose?: () => void;
    className?: string;
}

export const MailSentNotification = ({ type, email, onClose, className = "" }: MailSentNotificationProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`bg-card border border-primary/20 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden ${className}`}
        >
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 flex flex-col items-center text-center">
                {/* Envelope Effect */}
                <div className="mb-6 relative">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center relative">
                        <Mail size={40} className="text-primary drop-shadow-md" />
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 border-4 border-card"
                        >
                            <CheckCircle2 size={16} />
                        </motion.div>
                    </div>
                    {/* Floating Particles */}
                    <motion.div
                        animate={{ y: [-5, 5, -5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full opacity-50"
                    />
                    <motion.div
                        animate={{ y: [5, -5, 5] }}
                        transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
                        className="absolute bottom-0 left-0 w-3 h-3 bg-primary rounded-full opacity-30"
                    />
                </div>

                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 mb-2">
                    {type} Sent!
                </h3>

                <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                    We've sent a <b>{type.toLowerCase()} email</b> to <span className="text-foreground font-semibold">{email}</span>.
                </p>

                {/* Spam Notice Box */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-left w-full max-w-sm mb-6">
                    <div className="flex gap-3">
                        <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wide">
                                Didn't receive it?
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Please check your <b>Spam</b> or <b>Junk</b> folder. If found there, kindly mark it as <b className="text-foreground">"Not Spam"</b> to receive future updates.
                            </p>
                        </div>
                    </div>
                </div>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-full bg-primary/10 hover:bg-primary/20 text-primary font-bold py-3 rounded-xl transition-colors text-sm"
                    >
                        Back to Login
                    </button>
                )}
            </div>

            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-2"
                >
                    <X size={20} />
                </button>
            )}
        </motion.div>
    );
};
