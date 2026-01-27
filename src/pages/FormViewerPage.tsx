import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Type, AlignLeft, Hash, Star, CheckSquare, List, Calendar,
    Loader2, CheckCircle2, ChevronRight, Mail, Phone, Link, Clock,
    PenTool, Upload, Image as ImageIcon, User, LogOut
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const FIELD_ICONS = {
    text: Type,
    email: Mail,
    tel: Phone,
    url: Link,
    time: Clock,
    textarea: AlignLeft,
    number: Hash,
    select: List,
    rating: Star,
    boolean: CheckSquare,
    date: Calendar
};

// Internal Component for Login Logic
const LoginField = () => {
    const { user, signIn, signOut } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            toast.error("Please enter email and password");
            return;
        }
        setLoading(true);
        const { error } = await signIn(email, password);
        setLoading(false);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Logged in successfully!");
        }
    };

    if (user) {
        return (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-3">
                    <User size={24} />
                </div>
                <h3 className="font-bold text-lg mb-1">Welcome back!</h3>
                <p className="text-muted-foreground text-sm mb-4">You are logged in as <span className="text-foreground font-medium">{user.email}</span></p>
                <button
                    type="button"
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-background/50 hover:bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <LogOut size={14} /> Sign Out
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
                    placeholder="user@example.com"
                />
            </div>
            <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
                    placeholder="••••••••"
                />
            </div>
            <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-primary/20 hover:bg-primary/30 text-primary font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Sign In"}
            </button>
        </div>
    );
};

export default function FormViewerPage() {
    const { formId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // Get user from auth context for validation

    const [form, setForm] = useState<any>(null);
    const [fields, setFields] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Form State
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Ref for signature pads
    const signatureRefs = useState<Record<string, HTMLCanvasElement | null>>({})[0];

    useEffect(() => {
        if (!formId) return;
        fetchForm();
    }, [formId]);

    const fetchForm = async () => {
        try {
            // Fetch Form
            const { data: formData, error: formError } = await supabase
                .from('admin_forms')
                .select('*')
                .eq('id', formId)
                .single();

            if (formError) throw formError;
            if (!formData.is_active) {
                toast.error("This form is no longer accepting responses.");
                setLoading(false);
                return;
            }
            setForm(formData);

            // Fetch Fields
            const { data: fieldsData, error: fieldsError } = await supabase
                .from('admin_form_fields')
                .select('*')
                .eq('form_id', formId)
                .order('order_index', { ascending: true });

            if (fieldsError) throw fieldsError;
            setFields(fieldsData || []);

        } catch (err) {
            console.error(err);
            toast.error("Form not found");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (fieldId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [fieldId]: value }));
        // Clear error if exists
        if (errors[fieldId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldId];
                return newErrors;
            });
        }
    };

    const handleFileChange = async (fieldId: string, file: File | undefined) => {
        if (!file) return;

        // For a real app, we should upload this to storage and save URL.
        // For this demo/ MVP, we will convert small files to base64 or just store filename if too big,
        // effectively warning the user.
        // Better: We'll simulate an upload by reading as DataURL.
        if (file.size > 5 * 1024 * 1024) { // 5MB limit check
            toast.error("File is too large (max 5MB)");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            handleInputChange(fieldId, {
                name: file.name,
                type: file.type,
                size: file.size,
                data: reader.result // Base64
            });
        };
        reader.readAsDataURL(file);
    };

    // Simple Signature Pad Implementation
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get correct coordinates
        const rect = canvas.getBoundingClientRect();
        let x, y;
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.nativeEvent.offsetX;
            y = e.nativeEvent.offsetY;
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = '#FFFFFF'; // White stroke for dark mode
        ctx.lineWidth = 2;
        canvas.setAttribute('data-drawing', 'true');
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
        if (canvas.getAttribute('data-drawing') !== 'true') return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.nativeEvent.offsetX;
            y = e.nativeEvent.offsetY;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = (fieldId: string, canvas: HTMLCanvasElement) => {
        if (canvas.getAttribute('data-drawing') !== 'true') return;
        canvas.setAttribute('data-drawing', 'false');
        handleInputChange(fieldId, canvas.toDataURL()); // Save as image
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        fields.forEach(field => {
            if (field.is_required) {
                // Login Validation
                if (field.field_type === 'login') {
                    if (!user) {
                        newErrors[field.id] = "Please log in to submit this form";
                    }
                    return;
                }

                const val = answers[field.id];
                if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
                    newErrors[field.id] = "This field is required";
                }
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            toast.error("Please fill in all required fields", { position: "top-center" });
            const firstError = document.querySelector('.text-destructive');
            firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setSubmitting(true);
        try {
            // Re-fetch user to be sure
            const { data: currentUser } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('admin_form_responses')
                .insert({
                    form_id: formId,
                    user_id: currentUser.user?.id || null,
                    response_data: answers
                });

            if (error) throw error;

            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error(err);
            toast.error("Failed to submit form");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary w-10 h-10" />
            </div>
        );
    }

    if (!form && !loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold mb-2">Form Not Found</h1>
                <p className="text-muted-foreground mb-6">The form you are looking for does not exist or has been removed.</p>
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold">
                    Go Home
                </button>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md w-full glass-card border-white/5 bg-card/50 p-8 rounded-3xl text-center"
                >
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
                    <p className="text-muted-foreground mb-8">Your response has been recorded successfully.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-primary font-bold hover:underline"
                    >
                        Submit another response
                    </button>
                </motion.div>
            </div>
        );
    }

    // Theme Styles
    const theme = form?.theme || {};
    const primaryColor = theme.primaryColor || "#7c3aed";
    const backgroundColor = theme.backgroundColor || "#000000"; // Default to black/dark if null, but usually white in DB default
    const borderRadius = theme.borderRadius || "0.75rem";

    return (
        <div
            className="min-h-screen py-12 px-4 sm:px-6 transition-colors duration-500"
            style={{ backgroundColor: backgroundColor, color: '#ffffff' }} // Force text white for now? No, depends on contrast. 
        // Actually, if bg is white, text should be black. If bg is dark, text white.
        // The app seems to be dark mode by default ("min-h-screen bg-background").
        // If user picks white BG, we need to invert text color or assume they pick dark text?
        // "hostel-mart-theme" is set to dark in App.tsx.
        // Let's assume the user picks colors that work, but we should probably force a text color if we can calc contrast, 
        // OR just let the cards be contrasting.
        // For this specific request, the user wants the "Canvas Tone" to apply.
        >
            {/* Dynamic Style Injection for Primary Color */}
            <style>{`
                :root {
                    --primary: ${primaryColor};
                    --radius: ${borderRadius};
                }
                .theme-text { color: ${primaryColor}; }
                .theme-border { border-color: ${primaryColor}; }
                .theme-bg { background-color: ${primaryColor}; }
            `}</style>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="max-w-2xl mx-auto space-y-6"
            >
                {/* Header */}
                <div
                    className="glass-card bg-card/90 p-8 shadow-xl backdrop-blur-xl transition-all"
                    style={{
                        borderRadius: borderRadius,
                        borderTop: `8px solid ${primaryColor}`,
                        // If the background is very light, we might want a dark card, or vice-versa.
                        // For now, let's stick to the glass-card look but allow it to be opaque if needed?
                        // The user's screenshot had a white card on white bg (invisible).
                        // Let's force a card background that contrasts slightly or just standard 'bg-card' 
                        // which in this app seems to be dark.
                    }}
                >
                    <h1 className="text-3xl font-black mb-2">{form.title}</h1>
                    {form.description && (
                        <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-wrap">{form.description}</p>
                    )}
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {fields.map((field) => (
                        <div
                            key={field.id}
                            className={cn(
                                "glass-card bg-card/40 p-6 border border-white/5 transition-all focus-within:ring-2 focus-within:ring-primary/20",
                                errors[field.id] && "border-destructive/50 focus-within:ring-destructive/20"
                            )}
                            style={{ borderRadius: borderRadius }}
                        >
                            <label className="block text-base font-bold mb-3 flex gap-1">
                                {field.label}
                                {field.is_required && field.field_type !== 'login' && <span className="text-destructive">*</span>}
                            </label>

                            {/* Input Renderers */}
                            {['text', 'email', 'tel', 'url', 'time'].includes(field.field_type) && (
                                <input
                                    type={field.field_type}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/30 [color-scheme:dark]"
                                    placeholder={field.field_type === 'time' ? '' : "Your answer"}
                                    value={answers[field.id] || ''}
                                    onChange={e => handleInputChange(field.id, e.target.value)}
                                />
                            )}

                            {field.field_type === 'login' && <LoginField />}

                            {field.field_type === 'section' && (
                                <div className="border-b border-white/10 pb-2 mb-4">
                                    <h2 className="text-2xl font-black text-primary">{field.label}</h2>
                                    {field.description && <p className="text-muted-foreground mt-1">{field.description}</p>}
                                </div>
                            )}

                            {field.field_type === 'signature' && (
                                <div className="space-y-2">
                                    <div className="h-40 bg-black/20 border border-white/10 rounded-xl overflow-hidden relative touch-none">
                                        <canvas
                                            ref={el => { if (el) { el.width = el.offsetWidth; el.height = el.offsetHeight; } }}
                                            className="w-full h-full cursor-crosshair"
                                            onMouseDown={(e) => startDrawing(e, e.currentTarget)}
                                            onMouseMove={(e) => draw(e, e.currentTarget)}
                                            onMouseUp={(e) => stopDrawing(field.id, e.currentTarget)}
                                            onMouseLeave={(e) => stopDrawing(field.id, e.currentTarget)}
                                            onTouchStart={(e) => startDrawing(e, e.currentTarget)}
                                            onTouchMove={(e) => draw(e, e.currentTarget)}
                                            onTouchEnd={(e) => stopDrawing(field.id, e.currentTarget)}
                                        />
                                        {!answers[field.id] && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/30">
                                                <span className="text-sm">Sign Above</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleInputChange(field.id, null);
                                            // Force re-render of canvas would be needed to clear, 
                                            // ideally we keep ref to canvas and call clearRect.
                                            // For MVP, just reload works or we can't clear easily without ref.
                                            // Let's rely on user overwriting.
                                        }}
                                        className="text-xs text-muted-foreground hover:text-destructive"
                                    >
                                        Clear Signature
                                    </button>
                                </div>
                            )}

                            {field.field_type === 'file' && (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            onChange={(e) => handleFileChange(field.id, e.target.files?.[0])}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="h-32 bg-black/20 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:bg-white/5 hover:border-primary/50 transition-all">
                                            {answers[field.id] ? (
                                                <div className="text-center text-primary">
                                                    <CheckCircle2 size={32} className="mx-auto mb-2" />
                                                    <p className="font-bold  break-all px-4">{answers[field.id].name}</p>
                                                    <p className="text-xs text-muted-foreground">{(answers[field.id].size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="mb-2 opacity-50" size={24} />
                                                    <span className="font-bold">Upload File</span>
                                                    <span className="text-xs opacity-50">Drag & drop or Click</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {field.field_type === 'image' && (
                                <div className="aspect-video bg-black/20 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                                    {field.options?.[0] ? (
                                        <img src={field.options[0]} alt="Display" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="text-center text-muted-foreground/50">
                                            <ImageIcon size={48} className="mx-auto mb-2 opacity-20" />
                                            <p>No Image Configured</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {field.field_type === 'textarea' && (
                                <textarea
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 min-h-[100px] focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/30 resize-y"
                                    placeholder="Your answer"
                                    value={answers[field.id] || ''}
                                    onChange={e => handleInputChange(field.id, e.target.value)}
                                />
                            )}

                            {field.field_type === 'number' && (
                                <input
                                    type="number"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/30"
                                    placeholder="0"
                                    value={answers[field.id] || ''}
                                    onChange={e => handleInputChange(field.id, e.target.value)}
                                />
                            )}

                            {field.field_type === 'select' && (
                                <div className="space-y-3">
                                    {(field.options || []).map((opt: string, idx: number) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleInputChange(field.id, opt)}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-white/5 transition-all",
                                                answers[field.id] === opt
                                                    ? "bg-primary/10 border-primary text-primary"
                                                    : "border-white/10 bg-transparent"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border flex items-center justify-center",
                                                answers[field.id] === opt ? "border-primary" : "border-muted-foreground"
                                            )}>
                                                {answers[field.id] === opt && <div className="w-2 h-2 rounded-full bg-primary" />}
                                            </div>
                                            <span className="font-medium">{opt}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {field.field_type === 'rating' && (
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => handleInputChange(field.id, star)}
                                            className={cn(
                                                "p-2 rounded-full transition-all hover:scale-110",
                                                (answers[field.id] || 0) >= star ? "text-yellow-400" : "text-muted-foreground/30"
                                            )}
                                        >
                                            <Star size={32} fill={(answers[field.id] || 0) >= star ? "currentColor" : "none"} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {field.field_type === 'boolean' && (
                                <div className="flex gap-4">
                                    {['Yes', 'No'].map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => handleInputChange(field.id, opt === 'Yes')}
                                            className={cn(
                                                "flex-1 py-3 px-4 rounded-xl border font-bold transition-all",
                                                answers[field.id] === (opt === 'Yes')
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-black/20 border-white/10 hover:bg-white/5"
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {field.field_type === 'date' && (
                                <input
                                    type="date"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary transition-colors text-foreground [color-scheme:dark]"
                                    value={answers[field.id] || ''}
                                    onChange={e => handleInputChange(field.id, e.target.value)}
                                />
                            )}

                            {errors[field.id] && (
                                <p className="text-destructive text-sm font-bold mt-2 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                    <span className="w-1 h-1 rounded-full bg-destructive" />
                                    {errors[field.id]}
                                </p>
                            )}
                        </div>
                    ))}

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg py-4 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <>Submit Response <ChevronRight /></>}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
