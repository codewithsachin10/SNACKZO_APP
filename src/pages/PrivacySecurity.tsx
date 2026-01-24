import { useState, useEffect } from "react";
import {
    Shield, Key, Lock, LogOut, ArrowLeft, Smartphone, Check, X,
    Loader2, Copy, QrCode, History, AlertTriangle, Trash2, SmartphoneNfc
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const PrivacySecurity = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    // Password State
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // 2FA States
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [checking2FA, setChecking2FA] = useState(true);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [setupStep, setSetupStep] = useState<'intro' | 'qr' | 'verify' | 'success' | 'disable'>('intro');
    const [qrCode, setQrCode] = useState("");
    const [totpSecret, setTotpSecret] = useState("");
    const [factorId, setFactorId] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isDisabling, setIsDisabling] = useState(false);

    // New Features State
    const [loginHistory, setLoginHistory] = useState<any[]>([]);
    const [isPinSet, setIsPinSet] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [pinStep, setPinStep] = useState<'create' | 'confirm' | 'success'>('create');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    // Check 2FA & Load Data
    useEffect(() => {
        const initData = async () => {
            if (!user) return;

            // Check 2FA
            try {
                const { data, error } = await supabase.auth.mfa.listFactors();
                if (!error) {
                    const verifiedFactor = data?.totp?.find(f => f.status === 'verified');
                    if (verifiedFactor) {
                        setIs2FAEnabled(true);
                        setFactorId(verifiedFactor.id);
                    }
                }
            } catch (err) { console.error(err); }
            setChecking2FA(false);

            // Fetch Profile for PIN status
            const { data: profile } = await supabase
                .from('profiles')
                .select('transaction_pin')
                .eq('user_id', user.id)
                .single();

            if (profile?.transaction_pin) setIsPinSet(true);

            // Fetch Login History (Mock + Real if available)
            const { data: history } = await supabase
                .from('login_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (history && history.length > 0) {
                setLoginHistory(history);
            } else {
                // Mock data for demo
                setLoginHistory([
                    { id: '1', device_name: 'Chrome on MacOS', location: 'Mumbai, India', created_at: new Date().toISOString(), ip_address: '192.168.1.1' },
                    { id: '2', device_name: 'Safari on iPhone 13', location: 'Mumbai, India', created_at: new Date(Date.now() - 86400000).toISOString(), ip_address: '192.168.1.25' },
                ]);
            }
        };

        initData();
    }, [user]);

    // Password Logic
    const checkStrength = (pass: string) => {
        let s = 0;
        if (pass.length > 5) s++;
        if (pass.length > 9) s++;
        if (/[A-Z]/.test(pass)) s++;
        if (/[0-9]/.test(pass)) s++;
        if (/[^A-Za-z0-9]/.test(pass)) s++;
        setPasswordStrength(s);
    };

    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) return toast.error("Please fill in both fields");
        if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
        setIsLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) toast.error(error.message);
        else {
            toast.success("Password updated successfully!");
            setNewPassword("");
            setConfirmPassword("");
        }
        setIsLoading(false);
    };

    // Login History Logic
    const handleLogoutAll = async () => {
        await signOut();
        navigate("/auth");
        toast.info("Logged out from all devices");
    };

    // Transaction PIN Logic
    const handleSetPin = async () => {
        if (pin.length !== 4) return toast.error("PIN must be 4 digits");
        if (pinStep === 'create') {
            setPinStep('confirm');
            return;
        }
        if (pin !== confirmPin) {
            toast.error("PINs do not match");
            setPin("");
            setConfirmPin("");
            setPinStep('create');
            return;
        }

        // Save PIN
        try {
            const { error } = await supabase.from('profiles').update({ transaction_pin: pin }).eq('user_id', user?.id);
            if (error) throw error;
            setIsPinSet(true);
            setPinStep('success');
            toast.success("Transaction PIN set successfully!");
            setTimeout(() => { setShowPinModal(false); setPin(""); setConfirmPin(""); setPinStep('create'); }, 2000);
        } catch (err) {
            toast.error("Failed to set PIN");
        }
    };

    // Account Deletion
    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== "DELETE") return;
        try {
            // In real app, call Edge Function to delete user
            toast.error("Account deletion requires admin approval in this demo.");
            setShowDeleteModal(false);
        } catch (e) { toast.error("Failed to request deletion"); }
    };

    // 2FA Functions (Existing)
    const startEnrollment = async () => {
        setIsEnrolling(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' });
            if (error) throw error;
            setQrCode(data.totp.qr_code);
            setTotpSecret(data.totp.secret);
            setFactorId(data.id);
            setSetupStep('qr');
        } catch (err: any) { toast.error(err.message || "Enrollment failed"); }
        setIsEnrolling(false);
    };

    const verifyTOTP = async () => {
        if (verifyCode.length !== 6) return toast.error("Enter 6 digits");
        setIsVerifying(true);
        try {
            const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
            const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: verifyCode });
            if (error) throw error;
            setIs2FAEnabled(true);
            setSetupStep('success');
            toast.success("2FA Enabled!");
        } catch (err) { toast.error("Invalid code"); }
        setIsVerifying(false);
    };

    const disable2FA = async () => {
        setIsDisabling(true);
        try {
            await supabase.auth.mfa.unenroll({ factorId });
            setIs2FAEnabled(false);
            setShow2FAModal(false);
            setSetupStep('intro');
            toast.success("2FA Disabled");
        } catch (err) { toast.error("Failed to disable"); }
        setIsDisabling(false);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <header className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center gap-3">
                <button onClick={() => navigate(-1)}><ArrowLeft /></button>
                <h1 className="font-bold text-lg">Privacy & Security</h1>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-2xl space-y-8">

                {/* Header */}
                <div className="hidden md:flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                        <Shield className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Privacy & Security</h1>
                        <p className="text-muted-foreground">Manage your account security and authentication.</p>
                    </div>
                </div>

                {/* Change Password with Strength Meter */}
                <div className="glass-card p-6 space-y-4">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Key size={18} className="text-primary" /> Change Password
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => { setNewPassword(e.target.value); checkStrength(e.target.value); }}
                                className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                                placeholder="Enter new password"
                            />
                            {/* Strength Meter */}
                            <div className="flex gap-1 mt-2 h-1">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex-1 rounded-full transition-all duration-300",
                                            i < passwordStrength
                                                ? (passwordStrength < 3 ? "bg-red-500" : passwordStrength < 4 ? "bg-yellow-500" : "bg-green-500")
                                                : "bg-muted"
                                        )}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                                {passwordStrength === 0 ? "" : passwordStrength < 3 ? "Weak" : passwordStrength < 4 ? "Medium" : "Strong"}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                                placeholder="Retype new password"
                            />
                        </div>
                        <button
                            onClick={handleUpdatePassword}
                            disabled={isLoading}
                            className="w-full neon-btn bg-primary text-primary-foreground py-3"
                        >
                            {isLoading ? "Updating..." : "Update Password"}
                        </button>
                    </div>
                </div>

                {/* 2FA Section */}
                <div className="glass-card p-6 space-y-4">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Smartphone size={18} className="text-secondary" /> Two-Factor Authentication
                    </h2>
                    <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${is2FAEnabled ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                                {checking2FA ? <Loader2 size={20} className="animate-spin" /> : is2FAEnabled ? <Check size={20} /> : <Lock size={20} />}
                            </div>
                            <div>
                                <p className="font-bold text-sm">Authenticator App</p>
                                <p className="text-xs text-muted-foreground">{is2FAEnabled ? "Enabled" : "Not configured"}</p>
                            </div>
                        </div>
                        <Button onClick={() => setShow2FAModal(true)} variant={is2FAEnabled ? "outline" : "default"} size="sm">
                            {is2FAEnabled ? "Manage" : "Enable"}
                        </Button>
                    </div>
                </div>

                {/* Transaction PIN */}
                <div className="glass-card p-6 space-y-4">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <SmartphoneNfc size={18} className="text-purple-400" /> Transaction PIN
                    </h2>
                    <p className="text-sm text-muted-foreground">Secure your wallet payments with a 4-digit PIN.</p>
                    <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPinSet ? 'bg-purple-500/20 text-purple-500' : 'bg-muted text-muted-foreground'}`}>
                                {isPinSet ? <Check size={20} /> : <Lock size={20} />}
                            </div>
                            <div>
                                <p className="font-bold text-sm">Wallet PIN</p>
                                <p className="text-xs text-muted-foreground">{isPinSet ? "Active" : "Not set"}</p>
                            </div>
                        </div>
                        <Button onClick={() => setShowPinModal(true)} variant="outline" size="sm">
                            {isPinSet ? "Change" : "Set PIN"}
                        </Button>
                    </div>
                </div>

                {/* Login History */}
                <div className="glass-card p-6 space-y-4">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <History size={18} className="text-orange-400" /> Login History
                    </h2>
                    <div className="space-y-3">
                        {loginHistory.map((login) => (
                            <div key={login.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                        <Smartphone size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{login.device_name}</p>
                                        <p className="text-xs text-muted-foreground">{login.location} • {format(new Date(login.created_at), 'MMM d, h:mm a')}</p>
                                    </div>
                                </div>
                                {login.id === '1' && <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold">CURRENT</span>}
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" onClick={handleLogoutAll} className="w-full text-destructive hover:text-destructive">
                        <LogOut size={16} className="mr-2" /> Log out of all devices
                    </Button>
                </div>

                {/* Danger Zone */}
                <div className="glass-card p-6 border-red-500/20 space-y-4">
                    <h2 className="font-bold text-lg flex items-center gap-2 text-destructive">
                        <AlertTriangle size={18} /> Danger Zone
                    </h2>
                    <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back.</p>
                    <Button onClick={() => setShowDeleteModal(true)} variant="destructive" className="w-full">
                        <Trash2 size={16} className="mr-2" /> Delete Account
                    </Button>
                </div>

            </main>

            {/* 2FA Modal */}
            <AnimatePresence>
                {show2FAModal && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShow2FAModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card w-full max-w-md p-6 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between mb-4">
                                <h3 className="text-xl font-bold">{setupStep === 'intro' ? "Enable 2FA" : setupStep === 'qr' ? "Scan QR Code" : setupStep === 'verify' ? "Verify Code" : "Success"}</h3>
                                <button onClick={() => setShow2FAModal(false)}><X /></button>
                            </div>

                            {setupStep === 'intro' && (
                                <>
                                    <p className="text-muted-foreground mb-4">Protect your account with an Authenticator app.</p>
                                    <Button onClick={startEnrollment} className="w-full">Get Started</Button>
                                </>
                            )}
                            {setupStep === 'qr' && (
                                <>
                                    <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-4"><img src={qrCode} className="w-40 h-40" /></div>
                                    <div className="bg-muted p-2 rounded text-center mb-4 cursor-pointer" onClick={() => { navigator.clipboard.writeText(totpSecret); toast.success("Copied!"); }}>
                                        <code className="text-xs">{totpSecret}</code> <Copy size={12} className="inline ml-1" />
                                    </div>
                                    <Button onClick={() => setSetupStep('verify')} className="w-full">I've Scanned It</Button>
                                </>
                            )}
                            {setupStep === 'verify' && (
                                <>
                                    <input type="text" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="000000" className="w-full text-center text-3xl font-mono p-3 bg-muted rounded-xl mb-4" />
                                    <Button onClick={verifyTOTP} className="w-full">Verify & Enable</Button>
                                </>
                            )}
                            {setupStep === 'success' && (
                                <>
                                    <div className="text-center py-6">
                                        <Check size={40} className="text-green-500 mx-auto mb-2" />
                                        <p>2FA is now active.</p>
                                    </div>
                                    <Button onClick={() => setShow2FAModal(false)} className="w-full">Done</Button>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Transaction PIN Modal */}
            <AnimatePresence>
                {showPinModal && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPinModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card w-full max-w-xs p-6 rounded-2xl shadow-2xl text-center" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold mb-2">
                                {pinStep === 'create' ? "Create PIN" : pinStep === 'confirm' ? "Confirm PIN" : "Success"}
                            </h3>

                            {pinStep !== 'success' ? (
                                <>
                                    <p className="text-muted-foreground text-sm mb-4">Enter a 4-digit PIN for payments</p>
                                    <div className="flex justify-center gap-2 mb-6">
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={i} className={cn("w-3 h-3 rounded-full", (pinStep === 'create' ? pin : confirmPin).length > i ? "bg-primary" : "bg-muted")} />
                                        ))}
                                    </div>
                                    <input
                                        type="tel"
                                        maxLength={4}
                                        value={pinStep === 'create' ? pin : confirmPin}
                                        onChange={e => pinStep === 'create' ? setPin(e.target.value) : setConfirmPin(e.target.value)}
                                        className="w-full text-center text-2xl font-mono bg-muted p-2 rounded-lg mb-4"
                                        placeholder="****"
                                        autoFocus
                                    />
                                    <Button onClick={handleSetPin} className="w-full">
                                        {pinStep === 'create' ? "Next" : "Set PIN"}
                                    </Button>
                                </>
                            ) : (
                                <div className="py-4">
                                    <Check size={40} className="text-green-500 mx-auto mb-2" />
                                    <p>PIN setup complete!</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Account Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-destructive/10 border border-destructive bg-black w-full max-w-md p-6 rounded-2xl">
                            <h3 className="text-xl font-bold text-destructive mb-2">Delete Account?</h3>
                            <p className="text-white/80 mb-4">This action cannot be undone. All your data will be lost.</p>
                            <p className="text-xs text-muted-foreground mb-2">Type "DELETE" to confirm</p>
                            <input
                                value={deleteConfirmation}
                                onChange={e => setDeleteConfirmation(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded p-2 mb-4"
                            />
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setShowDeleteModal(false)} className="flex-1">Cancel</Button>
                                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirmation !== "DELETE"} className="flex-1">Delete Permanently</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default PrivacySecurity;
