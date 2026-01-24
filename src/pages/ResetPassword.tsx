import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, ArrowRight } from "lucide-react";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check if we have a valid session or recover token
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                // This is the correct flow
            }
        });

        // Parse hash if direct session recovery fails
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
            // Let Supabase process the hash automatically
            supabase.auth.getSession();
        }
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Password updated successfully!");
                navigate("/auth");
            }
        } catch (error) {
            toast.error("Failed to update password");
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
                        <span className="text-3xl">🔐</span>
                        <span className="text-2xl font-bold uppercase">New Password</span>
                    </div>
                </div>

                <div className="neu-card bg-card p-6 md:p-8">
                    <form onSubmit={handleReset} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold uppercase mb-2">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full border-3 border-foreground bg-background p-3 pl-10 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="neu-btn bg-primary text-primary-foreground w-full py-4 text-lg flex items-center justify-center gap-2"
                        >
                            {isLoading ? "Updating..." : "Update Password"}
                            <ArrowRight size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
