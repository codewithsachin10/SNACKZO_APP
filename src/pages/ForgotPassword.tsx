import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                toast.error("Error sending reset email: " + error.message);
            } else {
                setIsSubmitted(true);
                toast.success("Reset link sent!");
            }
        } catch (err) {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="fixed inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(var(--foreground)) 20px, hsl(var(--foreground)) 22px)`
                }} />
            </div>

            <div className="w-full max-w-md relative">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-secondary border-3 border-foreground p-3 shadow-neu mb-4">
                        <span className="text-3xl">🔑</span>
                        <span className="text-2xl font-bold uppercase">Reset Password</span>
                    </div>
                </div>

                <div className="neu-card bg-card p-6 md:p-8">
                    {!isSubmitted ? (
                        <>
                            <p className="text-muted-foreground mb-6 text-center">
                                Enter your email address and we'll send you a link to reset your password.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold uppercase mb-2">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full border-3 border-foreground bg-background p-3 pl-10 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="you@college.edu"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="neu-btn bg-primary text-primary-foreground w-full py-4 text-lg flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <span className="animate-pulse">Sending...</span>
                                    ) : (
                                        <>
                                            Send Reset Link
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-lime/20 text-lime rounded-full flex items-center justify-center mx-auto mb-4 border-3 border-lime">
                                <Mail size={32} />
                            </div>
                            <h2 className="text-xl font-bold uppercase">Check your inbox</h2>
                            <p className="text-muted-foreground">
                                We've sent a password reset link to <span className="font-bold text-foreground">{email}</span>.
                            </p>
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="text-primary text-sm font-bold hover:underline mt-4"
                            >
                                Try a different email
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-center">
                    <Link
                        to="/auth"
                        className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
