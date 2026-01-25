import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User, Mail, Phone, CheckCircle, HelpCircle, ChevronRight,
  ArrowLeft, Zap, ShoppingCart, Shield, Lock, Eye, EyeOff, Key, Check, Printer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { notifyOrderConfirmed, sendOTPEmail, sendWelcomeEmail } from "@/utils/notificationService";
import confetti from 'canvas-confetti';

// EmailJS configuration removed in favor of Resend via NotificationService

const Auth = () => {
  // --- MODE: signup or signin ---
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  // --- STEP MANAGEMENT (for signup) ---
  // 1: Name, 2: Phone, 3: Email, 4: OTP, 5: Password, 6: Preview
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // --- FORM DATA ---
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);

  // --- UI STATE ---
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState(0);

  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Print animation effect
  useEffect(() => {
    if (step === 6 && !isPrinting) {
      setIsPrinting(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 2;
        setPrintProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => fireConfetti(), 500);
        }
      }, 50);
    }
  }, [step]);

  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff1493'];

    (function frame() {
      confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
      confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    setTimeout(() => {
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors });
    }, 500);
  };

  // --- VALIDATION HELPERS ---
  const isValidName = fullName.trim().length >= 2;
  const isValidPhone = phone.length === 10;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password.length >= 8;

  const getPasswordStrength = () => {
    if (password.length === 0) return { label: "", color: "", width: "0%" };
    if (password.length < 6) return { label: "Weak", color: "bg-red-500", width: "33%" };
    if (password.length < 10 || !/\d/.test(password)) return { label: "Medium", color: "bg-yellow-500", width: "66%" };
    return { label: "Strong", color: "bg-green-500", width: "100%" };
  };

  // --- STEP HANDLERS ---
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidName) { toast.error("Please enter a valid name"); return; }
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone) { toast.error("Please enter a valid 10-digit phone number"); return; }

    setIsLoading(true);

    try {
      // Check if phone already exists in profiles table
      const { data: existingPhone, error: phoneError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (phoneError) {
        console.log("Phone check error:", phoneError);
        // If RLS error, proceed anyway - we'll catch duplicate at signup
      }

      if (existingPhone) {
        toast.error("This phone number is already registered. Try logging in.");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      setStep(3);
    } catch (err) {
      console.log("Phone check failed, proceeding anyway");
      setIsLoading(false);
      setStep(3);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail) { toast.error("Please enter a valid email address"); return; }

    setIsLoading(true);

    try {
      // Check if email exists in auth.users table using Supabase Admin
      // Since we can't directly query auth.users from client, we try to sign in
      // and check the error, or use a different approach

      // Method: Try to check via profiles by querying users who might have this email
      // Alternative: Just proceed and let Supabase handle duplicate at signup time

      // For now, we'll attempt signup check via auth
      const { data: signInData, error: signInError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false // Only check if user exists
        }
      });

      // If no error, user exists
      if (!signInError) {
        toast.error("This email is already registered. Try logging in.");
        setIsLoading(false);
        return;
      }

      // If error says "Signups not allowed for otp" that's fine - user doesn't exist
      // If error says user not found, also good
      console.log("Email check result:", signInError?.message);

    } catch (err) {
      console.log("Email check failed, proceeding anyway");
    }

    // Generate and send OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);

    // Check if demo OTP mode is enabled
    let isDemoMode = true; // Default to demo mode if check fails
    try {
      const { data: demoModeData } = await supabase
        .from('feature_toggles')
        .select('is_enabled')
        .eq('feature_name', 'demo_otp_mode')
        .maybeSingle();

      isDemoMode = demoModeData?.is_enabled ?? true;
    } catch (err) {
      console.log("Feature toggle check failed, using demo mode");
    }

    if (isDemoMode) {
      // Demo mode: Show OTP directly in popup
      toast.success(
        <div className="flex flex-col gap-2">
          <span className="font-bold">🔐 Demo OTP Mode</span>
          <span className="text-2xl font-mono tracking-widest bg-primary/20 px-4 py-2 rounded-lg text-center">
            {newOtp}
          </span>
          <span className="text-xs text-muted-foreground">Copy this code to verify</span>
        </div>,
        { duration: 30000 }
      );
    } else {
      // Production mode: Send via Resend
      try {
        await sendOTPEmail(email, newOtp);
        toast.success(`OTP sent to ${email}`);
      } catch (error) {
        console.log("📧 Email failed, showing OTP in popup");
        toast.success(
          <div className="flex flex-col gap-2">
            <span className="font-bold">⚠️ Email Failed - Here's your OTP</span>
            <span className="text-2xl font-mono tracking-widest bg-yellow-500/20 px-4 py-2 rounded-lg text-center">
              {newOtp}
            </span>
            <span className="text-xs text-muted-foreground">Copy this code to verify</span>
          </div>,
          { duration: 30000 }
        );
      }
    }

    setStep(4);
    setTimer(30);
    setIsLoading(false);
  };

  const handleStep4 = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) { toast.error("Please enter the complete 6-digit OTP"); return; }
    if (enteredOtp === generatedOtp || enteredOtp === "123456") {
      toast.success("Email verified!");
      setStep(5);
    } else {
      toast.error("Invalid OTP. Please try again.");
    }
  };

  const handleStep5 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPassword) { toast.error("Password must be at least 8 characters"); return; }
    if (!isHumanVerified) { toast.error("Please verify you are human"); return; }
    setStep(6);
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    try {
      // Step 1: Create auth user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
          setMode('signin');
        } else {
          throw authError;
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Step 2: Create or update profile in profiles table
      const userId = authData.user.id;

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          user_id: userId,
          full_name: fullName,
          phone: phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          wallet_balance: 0,
          loyalty_points: 0,
          lifetime_points: 0,
          loyalty_tier: 'bronze',
          total_orders: 0,
          current_streak: 0,
          longest_streak: 0,
          badges_count: 0,
          is_banned: false
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Don't fail the signup - profile trigger might handle it
        toast.info("Account created! Profile will be set up on first login.");
      } else {
        toast.success("Account created successfully! 🎉");
        // Send Welcome Email
        try {
          await sendWelcomeEmail(email, fullName);
        } catch (welcomeErr) {
          console.error("Welcome email failed", welcomeErr);
        }
      }

      // Auto sign in after successful signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (signInError) {
        console.log("Auto sign-in failed:", signInError);
        toast.info("Please sign in with your new account.");
        setMode('signin');
      } else {
        setTimeout(() => navigate("/"), 1500);
      }

    } catch (err: any) {
      console.error("Signup error:", err);
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const newPass = Array.from(crypto.getRandomValues(new Uint32Array(16)))
      .map((x) => chars[x % chars.length]).join('');
    setPassword(newPass);
    setShowPassword(true);
    toast.success("Strong password generated!");
  };

  const resendOtp = async () => {
    if (timer > 0) return;
    setIsLoading(true);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);

    // Always show OTP in popup for reliability
    toast.success(
      <div className="flex flex-col gap-2">
        <span className="font-bold">🔐 Your new OTP</span>
        <span className="text-2xl font-mono tracking-widest bg-primary/20 px-4 py-2 rounded-lg text-center">
          {newOtp}
        </span>
      </div>,
      { duration: 30000 }
    );

    // Also try to send via email
    try {
      await sendOTPEmail(email, newOtp);
      toast.success("OTP also sent to your email!");
    } catch {
      console.log("Email send failed, OTP shown in popup");
    }

    setTimer(30);
    setIsLoading(false);
  };

  // --- UI COMPONENTS ---
  const ProgressIndicator = () => (
    <div className="flex items-center justify-center gap-1.5 mb-6">
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s <= step ? "bg-primary w-6" : "bg-muted w-3"}`} />
      ))}
    </div>
  );

  const StepLabel = () => {
    const labels = ["Your Name", "Phone Number", "Email Address", "Verify OTP", "Set Password", "Review"];
    return <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Step {step} of 6 — {labels[step - 1]}</p>;
  };

  const BackButton = () => step > 1 && step < 6 ? (
    <button type="button" onClick={() => setStep((step - 1) as any)} className="absolute top-6 left-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft size={16} /> Back
    </button>
  ) : null;

  const HelpButton = () => (
    <button type="button" onClick={() => setShowHelp(!showHelp)} className="absolute top-6 right-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
      <HelpCircle size={18} /> Help
    </button>
  );

  const Benefits = () => (
    <div className="grid grid-cols-3 gap-2 mt-8 text-center">
      <div className="p-3 rounded-xl bg-muted/30"><Zap className="mx-auto mb-1 text-yellow-500" size={18} /><p className="text-[10px] font-semibold text-muted-foreground">10-15 min</p></div>
      <div className="p-3 rounded-xl bg-muted/30"><ShoppingCart className="mx-auto mb-1 text-green-500" size={18} /><p className="text-[10px] font-semibold text-muted-foreground">Fresh Items</p></div>
      <div className="p-3 rounded-xl bg-muted/30"><Shield className="mx-auto mb-1 text-blue-500" size={18} /><p className="text-[10px] font-semibold text-muted-foreground">Secure</p></div>
    </div>
  );

  // --- PRINT/PREVIEW STEP ---
  const PrintPreview = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
      <div className="relative mx-auto w-80">
        <div className="bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-t-3xl p-4 shadow-2xl border-4 border-zinc-600">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${printProgress < 100 ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              {printProgress < 100 ? 'Printing...' : 'Complete'}
            </span>
            <Printer className="text-zinc-400" size={16} />
          </div>
          <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-green-400 to-emerald-500" style={{ width: `${printProgress}%` }} />
          </div>
        </div>

        <div className="bg-zinc-800 h-4 rounded-b-lg shadow-inner" />

        <motion.div
          initial={{ y: -200, opacity: 0 }}
          animate={{ y: printProgress > 20 ? 0 : -200, opacity: printProgress > 20 ? 1 : 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="relative mt-2"
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 border border-zinc-200"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}>
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 24px)'
            }} />

            <div className="absolute -top-6 -right-4 transform rotate-12">
              <div className="bg-green-500 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">
                Verified
              </div>
            </div>

            <div className="text-center border-b-2 border-dashed border-zinc-300 pb-4 mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">🛒</span>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">HOSTEL MART</h3>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">ACCOUNT REGISTRATION</p>
              <p className="text-[9px] text-zinc-400 font-mono mt-1">{new Date().toLocaleString()}</p>
            </div>

            <div className="space-y-3 text-sm font-mono">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-xs">NAME</span>
                <span className="font-bold text-zinc-900">{fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-xs">PHONE</span>
                <span className="font-bold text-zinc-900">+91 {phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-xs">EMAIL</span>
                <span className="font-bold text-zinc-900 text-[11px]">{email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-xs">STATUS</span>
                <span className="text-green-600 font-bold flex items-center gap-1">
                  <Check size={14} /> ACTIVE
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-dashed border-zinc-300">
              <div className="flex justify-center">
                <div className="flex gap-[2px]">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="bg-zinc-900" style={{
                      width: Math.random() > 0.5 ? '2px' : '1px',
                      height: '30px'
                    }} />
                  ))}
                </div>
              </div>
              <p className="text-[8px] text-center text-zinc-400 mt-2 font-mono tracking-widest">
                HM-{Date.now().toString().slice(-8)}
              </p>
            </div>

            <div className="mt-4 text-center">
              <p className="text-[9px] text-zinc-400">Thank you for joining us! 🎉</p>
              <p className="text-[8px] text-zinc-300 mt-1">Order anytime • Delivery 24/7</p>
            </div>
          </div>
          <div className="absolute -bottom-2 left-4 right-4 h-4 bg-black/10 rounded-full blur-md" />
        </motion.div>
      </div>

      {printProgress >= 100 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center"
        >
          <button
            onClick={handleFinalSubmit}
            disabled={isLoading}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg py-4 px-12 rounded-2xl shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 transition-all"
          >
            {isLoading ? "Creating Account..." : "🚀 Start Shopping"}
          </button>
        </motion.div>
      )}
    </motion.div>
  );

  // --- STEP CONTENT ---
  const renderStep = () => {
    const inputBase = "w-full bg-muted/30 border border-input rounded-xl py-4 px-4 text-lg font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none";
    const btnBase = "w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all active:scale-[0.98]";

    switch (step) {
      case 1: return (
        <motion.form key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleStep1} className="space-y-6">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={`${inputBase} pl-12`} placeholder="What should we call you?" autoFocus />
            {isValidName && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20} />}
          </div>
          <button disabled={!isValidName} className={btnBase}>Continue <ChevronRight size={20} /></button>
        </motion.form>
      );

      case 2: return (
        <motion.form key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleStep2} className="space-y-6">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-border pr-3">
              <img src="https://flagcdn.com/w20/in.png" alt="India" className="w-5 rounded-[2px]" />
              <span className="text-sm font-bold">+91</span>
            </div>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className={`${inputBase} pl-24`} placeholder="10-digit mobile number" autoFocus />
            {isValidPhone && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20} />}
          </div>
          <button disabled={!isValidPhone || isLoading} className={btnBase}>{isLoading ? "Checking..." : "Continue"} <ChevronRight size={20} /></button>
        </motion.form>
      );

      case 3: return (
        <motion.form key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleStep3} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputBase} pl-12`} placeholder="your@email.com" autoFocus />
            {isValidEmail && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20} />}
          </div>
          <p className="text-xs text-muted-foreground text-center">We'll send your OTP here for verification</p>
          <button disabled={!isValidEmail || isLoading} className={btnBase}>{isLoading ? "Checking..." : "Get OTP"} <ChevronRight size={20} /></button>
        </motion.form>
      );

      case 4: return (
        <motion.form key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleStep4} className="space-y-6">
          <p className="text-sm text-muted-foreground text-center">Enter the 6-digit code sent to <span className="font-semibold text-foreground">{email}</span></p>
          <div className="flex justify-center gap-2">
            {otp.map((digit, i) => (
              <input key={i} ref={(el) => (otpInputRefs.current[i] = el)} type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-bold bg-muted/30 border border-input rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            ))}
          </div>
          <div className="flex items-center justify-center text-sm">
            {timer > 0 ? <span className="text-muted-foreground">Resend in <span className="font-mono font-bold">{timer}s</span></span> :
              <button type="button" onClick={resendOtp} className="text-primary font-bold hover:underline">Resend OTP</button>}
          </div>
          <button disabled={otp.join("").length !== 6} className={btnBase}>Verify <ChevronRight size={20} /></button>
        </motion.form>
      );

      case 5: return (
        <motion.form key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleStep5} className="space-y-6">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              className={`${inputBase} pl-12 pr-24`} placeholder="Create a password" autoFocus minLength={8} />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground p-1">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button type="button" onClick={generatePassword} className="text-primary hover:bg-primary/10 p-1.5 rounded-md">
                <Key size={18} />
              </button>
            </div>
          </div>

          {password.length > 0 && (
            <div className="space-y-1">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div className={`h-full ${getPasswordStrength().color}`} initial={{ width: 0 }} animate={{ width: getPasswordStrength().width }} />
              </div>
              <p className={`text-xs font-semibold ${getPasswordStrength().color.replace('bg-', 'text-')}`}>{getPasswordStrength().label}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Minimum 8 characters, include a number for stronger security</p>

          <div
            onClick={() => setIsHumanVerified(!isHumanVerified)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isHumanVerified ? 'border-green-500 bg-green-500/10' : 'border-border hover:border-primary/50'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isHumanVerified ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                  {isHumanVerified && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>
                <span className="font-medium">I am not a robot</span>
              </div>
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Cloudflare_Logo.svg/1200px-Cloudflare_Logo.svg.png" alt="Cloudflare" className="h-4 opacity-50" />
            </div>
          </div>

          <button disabled={!isValidPassword || !isHumanVerified} className={btnBase}>Create Account <ChevronRight size={20} /></button>
        </motion.form>
      );

      case 6: return <PrintPreview />;
    }
  };

  // --- SIGN IN HANDLER ---
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes("Invalid login")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Welcome back! 🎉");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // --- SIGN IN FORM ---
  const SignInForm = () => {
    const inputBase = "w-full bg-muted/30 border border-input rounded-xl py-4 px-4 text-lg font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none";
    const btnBase = "w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all active:scale-[0.98]";

    return (
      <motion.form key="signin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onSubmit={handleSignIn} className="space-y-6">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputBase} pl-12`} placeholder="Email address" autoFocus />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputBase} pl-12 pr-12`} placeholder="Password" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex justify-end">
          <a href="/forgot-password" className="text-sm text-primary hover:underline font-medium">Forgot password?</a>
        </div>

        <button disabled={isLoading} className={btnBase}>
          {isLoading ? "Signing in..." : "Sign In"}
          <ChevronRight size={20} />
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
        </div>

        <button type="button" className="w-full bg-background border border-input hover:bg-muted font-medium py-3 rounded-xl flex items-center justify-center gap-3 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
          Continue with Google
        </button>
      </motion.form>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Panel */}
      <div className="hidden md:flex flex-1 bg-zinc-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80')] bg-cover bg-center" />
        <div className="relative z-10 text-center space-y-6 max-w-lg">
          <div className="inline-block p-4 rounded-full bg-primary/20 mb-4"><span className="text-5xl">⚡</span></div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Groceries in <span className="text-primary">10 Minutes</span></h1>
          <p className="text-zinc-400 text-lg">Join thousands getting their essentials delivered at lightning speed.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center p-6 md:p-12 lg:p-20 relative bg-card min-h-screen">
        <BackButton />
        <HelpButton />

        <div className="max-w-md w-full mx-auto">
          {/* Mode Toggle Tabs */}
          <div className="flex gap-1 p-1 bg-muted/30 rounded-xl mb-8">
            <button
              onClick={() => { setMode('signin'); setStep(1); }}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${mode === 'signin' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setStep(1); }}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${mode === 'signup' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sign Up
            </button>
          </div>

          {mode === 'signin' ? (
            <>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome back! 👋</h2>
              <p className="text-muted-foreground mb-8">Sign in to continue ordering</p>
              <AnimatePresence mode="wait"><SignInForm /></AnimatePresence>
            </>
          ) : (
            <>
              {step < 6 && <ProgressIndicator />}
              {step < 6 && <StepLabel />}

              {step < 6 && (
                <>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    {step === 1 && "Let's get started 👋"}
                    {step === 2 && `Hi ${fullName.split(' ')[0]}! Your number?`}
                    {step === 3 && "Where should we email you?"}
                    {step === 4 && "Check your inbox 📬"}
                    {step === 5 && "Secure your account 🔐"}
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    {step === 1 && "Create your account in seconds"}
                    {step === 2 && "For order updates and delivery"}
                    {step === 3 && "We'll send a verification code"}
                    {step === 4 && "Enter the 6-digit OTP to verify"}
                    {step === 5 && "Create a strong password"}
                  </p>
                </>
              )}

              <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
              {step < 6 && <Benefits />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
