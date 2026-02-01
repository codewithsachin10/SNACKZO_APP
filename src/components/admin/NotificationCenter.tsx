import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerSuccessCelebration, sendNotification } from "@/utils/notificationService";
import {
    Mail, Send, Users, Search, Smartphone, Globe,
    Zap, History as HistoryIcon, Plus, X,
    Terminal, Library, Flame, Utensils, Check, Loader2,
    Cpu, User, MoreHorizontal, Settings, ShieldCheck,
    Activity, Radio, MessageSquare, Info, Filter, Paperclip, Monitor, Eye, Sparkles, Clock, TrendingUp, Save, Package, CreditCard, Hash, DollarSign, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { TEMPLATES as DESIGN_TEMPLATES, MOCK_DATA } from "./email-templates/TemplateComponents";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const MOCK_USERS = [
    { id: 'm1', full_name: 'Aditya Sharma', email: 'aditya.s@hostel.edu', phone: '+91 98765 43210' },
    { id: 'm2', full_name: 'Priya Verma', email: 'priya.v@hostel.edu', phone: '+91 87654 32109' },
    { id: 'm3', full_name: 'Rahul Khanna', email: 'rahul.k@hostel.edu', phone: '+91 76543 21098' },
    { id: 'm4', full_name: 'Sneha Reddy', email: 'sneha.r@hostel.edu', phone: '+91 65432 10987' },
];

const MESSAGE_SNIPPETS = [
    { id: 't1', category: 'Promo', title: 'Midnight Biryani', icon: <Flame className="text-orange-500" />, content: "Late night study session? 📚 Order 'Midnight Masala' Biryani! Extra spicy, delivered in 15 mins. Use code STUDY20 for 20% OFF." },
    { id: 't2', category: 'Promo', title: 'Free Burger Drink', icon: <Utensils className="text-amber-500" />, content: "Burger Binge! 🍔 Order any Monster Burger and get a FREE Cold Coffee. Valid tonight for {name}!" },
    { id: 't3', category: 'Status', title: 'Out for Delivery', icon: <Smartphone className="text-blue-500" />, content: "On the Move! 🛵 Your runner is heading to your block. ETA: 8 minutes. Keep your phone ready, {name}!" },
];

export default function NotificationCenter() {
    const [activeTab, setActiveTab] = useState<'compose' | 'templates'>('compose');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState("");
    const [subject, setSubject] = useState("");
    const [sendType, setSendType] = useState<'email' | 'sms'>('email');

    // Attachment State
    const [attachment, setAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Template Manager State
    const [managerCategory, setManagerCategory] = useState<'order' | 'payment' | 'update'>('update');
    const [activeDesignIds, setActiveDesignIds] = useState({
        order: 'modern',
        payment: 'receipt',
        update: 'genz'
    });
    const [customBanners, setCustomBanners] = useState<Record<string, string>>({});

    // Editor State
    const [editorData, setEditorData] = useState({
        order: { ...MOCK_DATA.order },
        payment: { ...MOCK_DATA.payment },
        update: { ...MOCK_DATA.update }
    });
    const [editorOptions, setEditorOptions] = useState<{ showSocial: boolean; showFooter: boolean; showQr: boolean; themeColor?: string }>({
        showSocial: true,
        showFooter: true,
        showQr: false,
        themeColor: undefined
    });
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedTemplates, setSavedTemplates] = useState<Record<string, string>>(() => {
        // Load saved templates from localStorage on init
        try {
            const saved = localStorage.getItem('snackzo_email_templates');
            return saved ? JSON.parse(saved) : { order: 'modern', payment: 'receipt', update: 'genz' };
        } catch {
            return { order: 'modern', payment: 'receipt', update: 'genz' };
        }
    });

    // Save Default Template Function
    const handleSaveDefault = async () => {
        setIsSaving(true);
        try {
            const newSaved = { ...savedTemplates, [managerCategory]: activeDesignIds[managerCategory] };
            setSavedTemplates(newSaved);
            localStorage.setItem('snackzo_email_templates', JSON.stringify(newSaved));

            // Also save editor options per category
            const optionsKey = `snackzo_template_options_${managerCategory}`;
            localStorage.setItem(optionsKey, JSON.stringify(editorOptions));

            // Simulate a brief delay for UX
            await new Promise(resolve => setTimeout(resolve, 500));

            const templateName = DESIGN_TEMPLATES.find(t => t.id === activeDesignIds[managerCategory])?.name;
            toast.success(`"${templateName}" saved as default for ${managerCategory}!`, {
                description: 'This template will be used for all future emails.',
                duration: 4000
            });
        } catch (err) {
            toast.error('Failed to save template');
        } finally {
            setIsSaving(false);
        }
    };

    // Send Test Email Function
    const handleSendTest = async () => {
        setIsSendingTest(true);
        try {
            // Get current user's email
            const { data: { user } } = await supabase.auth.getUser();
            const adminEmail = user?.email;

            if (!adminEmail) {
                toast.error("Could not get admin email. Please login again.");
                return;
            }

            // Get current template data
            const mockData = (editorData as any)[managerCategory];
            const templateName = DESIGN_TEMPLATES.find(t => t.id === activeDesignIds[managerCategory])?.name || 'Template';

            // Build simple HTML preview
            const testHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">🧪 Test Email</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Template Preview from Snackzo</p>
                    </div>
                    <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
                        <h2 style="color: #333; margin-top: 0;">Template: ${templateName}</h2>
                        <p style="color: #666;"><strong>Category:</strong> ${managerCategory.toUpperCase()}</p>
                        <p style="color: #666;"><strong>Subject:</strong> ${mockData?.subject || 'N/A'}</p>
                        ${managerCategory === 'update' ? `<p style="color: #666;"><strong>Message:</strong> ${mockData?.message || 'N/A'}</p>` : ''}
                        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
                        <p style="color: #888; font-size: 12px;">Options: Social ${editorOptions.showSocial ? '✓' : '✗'} | Footer ${editorOptions.showFooter ? '✓' : '✗'} | QR ${editorOptions.showQr ? '✓' : '✗'}</p>
                        <p style="color: #888; font-size: 12px;">Theme Color: ${editorOptions.themeColor || 'Default'}</p>
                    </div>
                    <div style="background: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px;">
                        This is a test email from Snackzo Template Studio
                    </div>
                </div>
            `;

            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: adminEmail,
                    subject: `[TEST] ${templateName} - ${managerCategory.toUpperCase()} Template Preview`,
                    html: testHtml
                }
            });

            if (error) throw error;

            toast.success(`Test email sent to ${adminEmail}!`, {
                description: 'Check your inbox for the preview.',
                duration: 5000
            });
        } catch (err: any) {
            console.error('Send test failed:', err);
            toast.error('Failed to send test email', {
                description: err?.message || 'Please try again'
            });
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (activeTab === 'templates') {
                // Banner Upload for Templates
                const url = URL.createObjectURL(file);
                setCustomBanners(prev => ({ ...prev, [managerCategory]: url }));
                toast.success("Banner updated");
                return;
            }

            // Normal Notification Attachment
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File too large. Max 5MB.");
                return;
            }
            setAttachment(file);
        }
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const syncDatabase = useCallback(async () => {
        try {
            setIsLoading(true);

            // 1. Try View (Most descriptive data)
            const { data: viewData } = await supabase
                .from('admin_users_view' as any)
                .select('id:user_id, full_name, phone, email')
                .limit(200);

            if (viewData && viewData.length > 0) {
                setUsers(viewData);
                return;
            }

            // 2. Fallback to Profiles
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id:user_id, full_name, phone, email' as any) // Type cast in case schema is being synced
                .limit(200);

            if (profileError) throw profileError;

            if (profileData && profileData.length > 0) {
                setUsers(profileData);
            } else {
                setUsers(MOCK_USERS);
            }
        } catch (err) {
            setUsers(MOCK_USERS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { syncDatabase(); }, [syncDatabase]);

    const handleSend = async () => {
        if (selectedUserIds.length === 0) {
            toast.error("Please select recipients.");
            return;
        }

        if (!message.trim()) {
            toast.error("Message content cannot be empty.");
            return;
        }

        setIsSending(true);
        const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
        let successCount = 0;

        try {
            for (const user of selectedUsers) {
                const target = sendType === 'email' ? user.email : user.phone;
                if (!target) continue;

                try {
                    // Use Edge Function for Email (Server-Side)
                    if (sendType === 'email') {
                        let attachmentsPayload = [];
                        if (attachment) {
                            const base64Content = await convertToBase64(attachment);
                            // Helper removed header "data:application/pdf;base64," if needed or client handles it
                            // For simplicity, we pass the full data URI or strip it based on Edge Function needs.
                            // Assuming backend expects: { filename: string, content: string (base64) }
                            // Stripping header usually required for plain base64
                            const content = base64Content.split(',')[1];
                            attachmentsPayload.push({
                                filename: attachment.name,
                                content: content
                            });
                        }

                        const { error } = await supabase.functions.invoke('send-email', {
                            body: {
                                to: target,
                                subject: subject || "Update from Snackzo",
                                html: `<div>${message.replace(/{name}/g, user.full_name || 'Student')}</div>`,
                                attachments: attachmentsPayload
                            }
                        });
                        if (error) throw error;
                    }
                    // Use Existing Helper for SMS (Client-Side Simulation)
                    else {
                        await sendNotification('sms', {
                            to: target,
                            message: message.replace(/{name}/g, user.full_name || 'Student')
                        });
                    }

                    successCount++;
                } catch (e) {
                    console.error("Single Node Failure:", e);
                }
            }

            if (successCount > 0) {
                triggerSuccessCelebration();
                toast.success(`Message sent to ${successCount} recipients.`);
                setMessage("");
                setSubject("");
                setAttachment(null);
                setSelectedUserIds([]);
            } else {
                toast.error("Failed to send message. Please check your credentials.");
            }
        } finally {
            setIsSending(false);
        }
    };



    const selectedUsers = useMemo(() => {
        return users.filter(u => selectedUserIds.includes(u.id));
    }, [users, selectedUserIds]);

    return (
        <div className="bg-background text-foreground min-h-[600px] flex flex-col font-sans overflow-hidden rounded-2xl border border-border bg-card/50 shadow-sm relative">

            {/* Simple Navigation Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <Send size={16} className="text-muted-foreground" />
                        <h1 className="text-sm font-semibold text-foreground">Notifications</h1>
                    </div>

                    <nav className="flex items-center gap-1">
                        {[
                            { id: 'compose', label: 'Compose' },
                            { id: 'templates', label: 'Templates' },
                        ].map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                                className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                                    activeTab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                                {t.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-lime/20 border border-lime/30 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-lime" />
                        <span className="text-[10px] font-medium text-lime">Online</span>
                    </div>
                    <Settings size={16} className="text-muted-foreground cursor-pointer hover:text-foreground" />
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">

                {/* User Sidebar - Simple & Clean */}
                <div className="w-72 border-r border-border bg-card/30 flex flex-col">
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                className="w-full bg-muted/50 border border-border rounded-lg h-9 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-0.5">
                            {users.map(u => {
                                const isSelected = selectedUserIds.includes(u.id);
                                return (
                                    <div key={u.id} onClick={() => setSelectedUserIds(prev => isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                        className={cn("group px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all",
                                            isSelected ? "bg-primary/10" : "hover:bg-muted/50")}>

                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                                {u.full_name?.[0].toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-medium text-foreground truncate">{u.full_name || 'Anonymous'}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    {sendType === 'email' ? (u.email || 'No email') : (u.phone || 'No phone')}
                                                </p>
                                            </div>
                                        </div>
                                        {isSelected && <Check size={14} className="text-primary" />}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t border-border bg-muted/10">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground">Selected</span>
                            <span className="text-[10px] font-bold text-foreground">{selectedUserIds.length} users</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-card flex flex-col relative">
                    <AnimatePresence mode="wait">
                        {activeTab === 'compose' && (
                            <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">

                                {/* Header Fields - Minimalist */}
                                <div className="divide-y divide-zinc-100">
                                    <div className="py-3 px-8 flex items-center gap-6">
                                        <span className="text-xs font-medium text-muted-foreground w-16">To</span>
                                        <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                                            {selectedUsers.length === 0 && <span className="text-xs text-muted-foreground/50 italic">Select recipients from the list</span>}
                                            {selectedUsers.map(u => (
                                                <Badge key={u.id} variant="secondary" className="bg-muted hover:bg-muted/80 text-foreground font-medium px-2 py-1 border-transparent transition-all flex items-center gap-2">
                                                    <span className="max-w-[100px] truncate">{u.full_name?.split(' ')[0]}</span>
                                                    <span className="text-[10px] opacity-50 font-normal bg-background/50 px-1.5 rounded-sm">
                                                        {sendType === 'email' ? u.email : u.phone}
                                                    </span>
                                                    <X size={10} className="opacity-40 hover:opacity-100 cursor-pointer" onClick={() => setSelectedUserIds(p => p.filter(id => id !== u.id))} />
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="py-3 px-8 flex items-center gap-6">
                                        <span className="text-xs font-medium text-muted-foreground w-16">Platform</span>
                                        <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
                                            <button onClick={() => setSendType('email')} className={cn("px-4 py-1 rounded-md text-[11px] font-medium transition-all", sendType === 'email' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Email</button>
                                            <button onClick={() => setSendType('sms')} className={cn("px-4 py-1 rounded-md text-[11px] font-medium transition-all", sendType === 'sms' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>SMS</button>
                                        </div>
                                    </div>

                                    {sendType === 'email' && (
                                        <div className="py-3 px-8 flex items-center gap-6">
                                            <span className="text-xs font-medium text-muted-foreground w-16">Subject</span>
                                            <input className="flex-1 bg-transparent border-none text-sm font-medium text-foreground focus:outline-none placeholder:text-muted-foreground/50" placeholder="Message subject..." value={subject} onChange={e => setSubject(e.target.value)} />
                                        </div>
                                    )}
                                </div>

                                {/* Text Area - Clean Page Style */}
                                <div className="flex-1 p-10 flex flex-col relative group">
                                    <div className="flex gap-2 absolute top-6 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {['name', 'block', 'order'].map(tag => (
                                            <button key={tag} onClick={() => setMessage(p => p + `{${tag}}`)}
                                                className="px-2 py-1 rounded border border-border text-[10px] font-medium text-muted-foreground hover:bg-muted transition-all">+{tag}</button>
                                        ))}
                                    </div>
                                    <Textarea
                                        className="flex-1 bg-transparent border-none p-0 text-base leading-relaxed font-medium resize-none focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/30 text-foreground"
                                        placeholder="Start typing your message here..."
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                    />

                                    {sendType === 'sms' && (
                                        <div className="mt-4 flex items-center gap-4 py-2 px-4 bg-muted/30 border border-border rounded-lg w-fit">
                                            <div className="text-[10px] font-medium text-muted-foreground">
                                                Chars: <span className={cn("font-bold", message.length > 160 ? "text-destructive" : "text-foreground")}>{message.length} / 160</span>
                                            </div>
                                            <div className="w-px h-3 bg-border" />
                                            <div className="text-[10px] font-medium text-muted-foreground">
                                                Segments: <span className="font-bold text-foreground">{Math.ceil(message.length / 160) || 1}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Bar */}
                                <div className="h-20 border-t border-border px-8 flex items-center justify-between bg-card/30">
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleFileSelect}
                                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Paperclip
                                                size={18}
                                                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                                onClick={() => fileInputRef.current?.click()}
                                            />
                                            {attachment && (
                                                <Badge variant="outline" className="flex items-center gap-1 bg-muted/50 text-xs font-normal">
                                                    {attachment.name.slice(0, 15)}{attachment.name.length > 15 ? '...' : ''}
                                                    <X size={10} className="cursor-pointer hover:text-destructive" onClick={(e) => { e.stopPropagation(); setAttachment(null); }} />
                                                </Badge>
                                            )}
                                        </div>

                                        <MoreHorizontal size={18} className="text-muted-foreground hover:text-foreground cursor-pointer" />
                                    </div>

                                    <Button
                                        onClick={handleSend}
                                        disabled={isSending}
                                        className="h-10 px-6 bg-primary text-primary-foreground font-medium text-xs rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2"
                                    >
                                        {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        {isSending ? "Sending..." : "Send Dispatch"}
                                    </Button>
                                </div>
                            </motion.div>
                        )}



                        {activeTab === 'templates' && (
                            <motion.div key="templates" className="flex flex-col h-full bg-muted/10">
                                {/* Enhanced Template Studio Header */}
                                <div className="px-6 py-5 border-b border-border bg-gradient-to-br from-card via-card to-primary/5 shrink-0 relative overflow-hidden">
                                    {/* Decorative Background Pattern */}
                                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                    <div className="relative">
                                        {/* Title Row */}
                                        <div className="flex items-start justify-between mb-5">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                                                        <Library size={20} className="text-primary-foreground" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                                                            Template Studio
                                                            <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary border-0">PRO</Badge>
                                                        </h2>
                                                        <p className="text-xs text-muted-foreground">Design and customize email templates for all notification types</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">Live</span>
                                                </div>
                                                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                                                    <Eye size={12} /> Preview All
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="grid grid-cols-4 gap-3 mb-5">
                                            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Templates</span>
                                                    <Sparkles size={12} className="text-amber-500" />
                                                </div>
                                                <p className="text-2xl font-bold text-foreground">{DESIGN_TEMPLATES.length}</p>
                                                <p className="text-[10px] text-muted-foreground">Available designs</p>
                                            </div>
                                            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Active</span>
                                                    <Check size={12} className="text-green-500" />
                                                </div>
                                                <p className="text-2xl font-bold text-foreground">3</p>
                                                <p className="text-[10px] text-muted-foreground">Configured types</p>
                                            </div>
                                            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sent Today</span>
                                                    <TrendingUp size={12} className="text-blue-500" />
                                                </div>
                                                <p className="text-2xl font-bold text-foreground">127</p>
                                                <p className="text-[10px] text-green-600 font-medium">+23% from yesterday</p>
                                            </div>
                                            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Delivery Rate</span>
                                                    <Activity size={12} className="text-purple-500" />
                                                </div>
                                                <p className="text-2xl font-bold text-foreground">98.5%</p>
                                                <p className="text-[10px] text-muted-foreground">Excellent score</p>
                                            </div>
                                        </div>

                                        {/* Currently Active Templates - Mini Preview Cards */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {(['order', 'payment', 'update'] as const).map(cat => {
                                                const activeTemplate = DESIGN_TEMPLATES.find(t => t.id === activeDesignIds[cat]);
                                                const isSelected = managerCategory === cat;
                                                const catColors = {
                                                    order: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-100 text-blue-700', icon: '📦' },
                                                    payment: { bg: 'from-green-500 to-green-600', light: 'bg-green-100 text-green-700', icon: '💳' },
                                                    update: { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-100 text-purple-700', icon: '📢' }
                                                };
                                                return (
                                                    <div
                                                        key={cat}
                                                        onClick={() => setManagerCategory(cat)}
                                                        className={cn(
                                                            "group relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                                                            isSelected
                                                                ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                                                                : "bg-card/80 backdrop-blur border-border hover:border-primary/50 hover:shadow-lg"
                                                        )}
                                                    >
                                                        {/* Active Indicator */}
                                                        {isSelected && (
                                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg ring-2 ring-background">
                                                                <Check size={12} className="text-primary-foreground" />
                                                            </div>
                                                        )}

                                                        <div className="flex items-start gap-3">
                                                            {/* Colorful Icon Preview */}
                                                            <div className={cn(
                                                                "w-12 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br shadow-lg shrink-0",
                                                                catColors[cat].bg
                                                            )}>
                                                                {catColors[cat].icon}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <span className={cn(
                                                                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                                        catColors[cat].light
                                                                    )}>
                                                                        {cat}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm font-bold text-foreground truncate">{activeTemplate?.name}</p>
                                                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{activeTemplate?.description}</p>

                                                                {/* Mini Stats */}
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                                                        <Clock size={8} className="inline mr-0.5" /> Updated 2h ago
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Bottom Accent */}
                                                        <div className={cn(
                                                            "absolute inset-x-0 bottom-0 h-1 rounded-b-2xl transition-all bg-gradient-to-r",
                                                            isSelected ? catColors[cat].bg + " opacity-100" : "from-transparent to-transparent opacity-0 group-hover:from-primary/30 group-hover:to-primary/10 group-hover:opacity-100"
                                                        )} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                {/* Content */}
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Sidebar List (Tabbed) */}
                                    <div className="w-80 border-r border-border bg-card/50 flex flex-col">
                                        <Tabs defaultValue="style" className="w-full flex-1 flex flex-col">
                                            <div className="p-4 pb-2">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-sm font-bold text-foreground capitalize">{managerCategory} Template</h3>
                                                    <Badge variant="secondary" className="text-[9px]">Editing</Badge>
                                                </div>
                                                <TabsList className="w-full grid grid-cols-2">
                                                    <TabsTrigger value="style" className="text-xs">Design</TabsTrigger>
                                                    <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
                                                </TabsList>
                                            </div>

                                            <TabsContent value="style" className="flex-1 overflow-y-auto p-4 pt-2 space-y-3 mt-0">
                                                <div className="space-y-2">
                                                    {DESIGN_TEMPLATES.map(t => {
                                                        const isActive = activeDesignIds[managerCategory] === t.id;
                                                        return (
                                                            <div key={t.id}
                                                                onClick={() => setActiveDesignIds(prev => ({ ...prev, [managerCategory]: t.id as any }))}
                                                                className={cn(
                                                                    "p-3 rounded-xl border-2 cursor-pointer transition-all group relative",
                                                                    isActive
                                                                        ? "bg-primary/5 border-primary shadow-md"
                                                                        : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
                                                                )}>
                                                                <div className="flex items-start gap-3">
                                                                    {/* Template Icon */}
                                                                    <div className={cn(
                                                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                                                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                                    )}>
                                                                        <Mail size={16} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-sm text-foreground">{t.name}</span>
                                                                            {isActive && <Check size={12} className="text-primary" />}
                                                                        </div>
                                                                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t.description}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="pt-4 border-t border-border mt-4">
                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <Zap size={10} />
                                                        Quick Snippets
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {MESSAGE_SNIPPETS.map(s => (
                                                            <div key={s.id} onClick={() => { setMessage(s.content); setActiveTab('compose'); }}
                                                                className="p-2.5 bg-muted/50 border border-transparent rounded-lg text-[10px] hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {s.icon}
                                                                    <span className="font-bold text-foreground">{s.title}</span>
                                                                </div>
                                                                <span className="text-muted-foreground line-clamp-2">{s.content}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="content" className="flex-1 overflow-y-auto p-4 pt-2 space-y-5 mt-0">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-medium">Subject / Title</Label>
                                                    <Input
                                                        className="h-9"
                                                        value={(editorData as any)[managerCategory]?.subject || "Order Confirmation"}
                                                        onChange={(e) => setEditorData(prev => ({ ...prev, [managerCategory]: { ...(prev as any)[managerCategory], subject: e.target.value } }))}
                                                    />
                                                </div>

                                                {/* ORDER CONTENT EDITOR */}
                                                {managerCategory === 'order' && (
                                                    <>
                                                        <div className="space-y-4 pt-3 border-t border-border">
                                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                                <Package size={10} />
                                                                Order Details
                                                            </Label>

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1.5">
                                                                    <Label className="text-[10px] text-muted-foreground">Order ID</Label>
                                                                    <div className="flex items-center gap-1">
                                                                        <Hash size={12} className="text-muted-foreground" />
                                                                        <Input
                                                                            className="h-8 text-xs"
                                                                            value={editorData.order.orderId}
                                                                            onChange={(e) => setEditorData(prev => ({ ...prev, order: { ...prev.order, orderId: e.target.value } }))}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <Label className="text-[10px] text-muted-foreground">Status</Label>
                                                                    <select
                                                                        className="w-full h-8 text-xs rounded-md border border-border bg-background px-2"
                                                                        value={editorData.order.status}
                                                                        onChange={(e) => setEditorData(prev => ({ ...prev, order: { ...prev.order, status: e.target.value } }))}
                                                                    >
                                                                        <option value="confirmed">Confirmed</option>
                                                                        <option value="preparing">Preparing</option>
                                                                        <option value="out_for_delivery">Out for Delivery</option>
                                                                        <option value="delivered">Delivered</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] text-muted-foreground">Customer Name</Label>
                                                                <Input
                                                                    className="h-8 text-xs"
                                                                    value={editorData.order.userName}
                                                                    onChange={(e) => setEditorData(prev => ({ ...prev, order: { ...prev.order, userName: e.target.value } }))}
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1.5">
                                                                    <Label className="text-[10px] text-muted-foreground">Total Amount</Label>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-xs text-muted-foreground">₹</span>
                                                                        <Input
                                                                            className="h-8 text-xs"
                                                                            type="number"
                                                                            value={editorData.order.amount}
                                                                            onChange={(e) => setEditorData(prev => ({ ...prev, order: { ...prev.order, amount: Number(e.target.value) } }))}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <Label className="text-[10px] text-muted-foreground">Delivery ETA</Label>
                                                                    <Input
                                                                        className="h-8 text-xs"
                                                                        placeholder="15-20 mins"
                                                                        defaultValue="15-20 mins"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">Order Items</Label>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-5 text-[10px] px-2 text-primary hover:bg-primary/10"
                                                                        onClick={() => {
                                                                            const newItems = [...(editorData.order.items || []), { name: "New Item", qty: 1, price: 0 }];
                                                                            setEditorData(prev => ({ ...prev, order: { ...prev.order, items: newItems } }));
                                                                        }}
                                                                    >
                                                                        <Plus size={10} className="mr-1" /> Add Item
                                                                    </Button>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    {editorData.order.items?.map((item: any, idx: number) => (
                                                                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border group hover:border-primary/30 transition-colors">
                                                                            {/* Qty */}
                                                                            <div className="w-10 shrink-0">
                                                                                <Input
                                                                                    className="h-7 text-xs text-center px-1"
                                                                                    type="number"
                                                                                    min={1}
                                                                                    value={item.qty}
                                                                                    onChange={(e) => {
                                                                                        const newItems = [...(editorData.order.items || [])];
                                                                                        newItems[idx].qty = Number(e.target.value);
                                                                                        const newTotal = newItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
                                                                                        setEditorData(prev => ({
                                                                                            ...prev,
                                                                                            order: { ...prev.order, items: newItems, amount: newTotal }
                                                                                        }));
                                                                                    }}
                                                                                />
                                                                            </div>

                                                                            {/* Name */}
                                                                            <div className="flex-1">
                                                                                <Input
                                                                                    className="h-7 text-xs"
                                                                                    value={item.name}
                                                                                    onChange={(e) => {
                                                                                        const newItems = [...(editorData.order.items || [])];
                                                                                        newItems[idx].name = e.target.value;
                                                                                        setEditorData(prev => ({ ...prev, order: { ...prev.order, items: newItems } }));
                                                                                    }}
                                                                                />
                                                                            </div>

                                                                            {/* Price */}
                                                                            <div className="w-16">
                                                                                <div className="relative">
                                                                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">₹</span>
                                                                                    <Input
                                                                                        className="h-7 text-xs pl-4"
                                                                                        type="number"
                                                                                        value={item.price}
                                                                                        onChange={(e) => {
                                                                                            const newItems = [...(editorData.order.items || [])];
                                                                                            newItems[idx].price = Number(e.target.value);
                                                                                            const newTotal = newItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
                                                                                            setEditorData(prev => ({
                                                                                                ...prev,
                                                                                                order: { ...prev.order, items: newItems, amount: newTotal }
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            {/* Remove */}
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                                onClick={() => {
                                                                                    const newItems = editorData.order.items.filter((_: any, index: number) => index !== idx);
                                                                                    const newTotal = newItems.reduce((acc: number, curr: any) => acc + (curr.price * curr.qty), 0);
                                                                                    setEditorData(prev => ({
                                                                                        ...prev,
                                                                                        order: { ...prev.order, items: newItems, amount: newTotal }
                                                                                    }));
                                                                                }}
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </Button>
                                                                        </div>
                                                                    ))}

                                                                    {(!editorData.order.items || editorData.order.items.length === 0) && (
                                                                        <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg bg-muted/20">
                                                                            <p className="text-xs text-muted-foreground mb-2">No items in order</p>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => {
                                                                                    const newItems = [{ name: "New Item", qty: 1, price: 100 }];
                                                                                    setEditorData(prev => ({
                                                                                        ...prev,
                                                                                        order: { ...prev.order, items: newItems, amount: 100 }
                                                                                    }));
                                                                                }}
                                                                            >
                                                                                <Plus size={12} className="mr-1" /> Add First Item
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {/* PAYMENT CONTENT EDITOR */}
                                                {managerCategory === 'payment' && (
                                                    <>
                                                        <div className="space-y-4 pt-3 border-t border-border">
                                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                                <CreditCard size={10} />
                                                                Payment Details
                                                            </Label>

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1.5">
                                                                    <Label className="text-[10px] text-muted-foreground">Order ID</Label>
                                                                    <Input
                                                                        className="h-8 text-xs"
                                                                        value={editorData.payment.orderId}
                                                                        onChange={(e) => setEditorData(prev => ({ ...prev, payment: { ...prev.payment, orderId: e.target.value } }))}
                                                                    />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <Label className="text-[10px] text-muted-foreground">Transaction ID</Label>
                                                                    <Input
                                                                        className="h-8 text-xs"
                                                                        placeholder="TXN_12345678"
                                                                        defaultValue="TXN_12345678"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1.5">
                                                                    <Label className="text-[10px] text-muted-foreground">Amount</Label>
                                                                    <div className="flex items-center gap-1">
                                                                        <DollarSign size={12} className="text-green-600" />
                                                                        <Input
                                                                            className="h-8 text-xs"
                                                                            type="number"
                                                                            value={editorData.payment.amount}
                                                                            onChange={(e) => setEditorData(prev => ({ ...prev, payment: { ...prev.payment, amount: Number(e.target.value) } }))}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <Label className="text-[10px] text-muted-foreground">Payment Status</Label>
                                                                    <select
                                                                        className="w-full h-8 text-xs rounded-md border border-border bg-background px-2"
                                                                        value={editorData.payment.status}
                                                                        onChange={(e) => setEditorData(prev => ({ ...prev, payment: { ...prev.payment, status: e.target.value } }))}
                                                                    >
                                                                        <option value="Paid">Paid</option>
                                                                        <option value="Pending">Pending</option>
                                                                        <option value="Failed">Failed</option>
                                                                        <option value="Refunded">Refunded</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] text-muted-foreground">Payment Method</Label>
                                                                <select
                                                                    className="w-full h-8 text-xs rounded-md border border-border bg-background px-2"
                                                                    defaultValue="UPI"
                                                                >
                                                                    <option value="UPI">UPI</option>
                                                                    <option value="Credit Card">Credit Card</option>
                                                                    <option value="Debit Card">Debit Card</option>
                                                                    <option value="Net Banking">Net Banking</option>
                                                                    <option value="Wallet">Wallet</option>
                                                                    <option value="Cash on Delivery">Cash on Delivery</option>
                                                                </select>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">Receipt Items</Label>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-5 text-[10px] px-2 text-primary hover:bg-primary/10"
                                                                        onClick={() => {
                                                                            const newItems = [...(editorData.payment.items || []), { name: "New Item", qty: 1, price: 0 }];
                                                                            setEditorData(prev => ({ ...prev, payment: { ...prev.payment, items: newItems } }));
                                                                        }}
                                                                    >
                                                                        <Plus size={10} className="mr-1" /> Add
                                                                    </Button>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    {editorData.payment.items?.map((item: any, idx: number) => (
                                                                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border group hover:border-primary/30 transition-colors">
                                                                            <div className="w-8 shrink-0">
                                                                                <Input
                                                                                    className="h-7 text-xs text-center px-1"
                                                                                    type="number"
                                                                                    min={1}
                                                                                    value={item.qty}
                                                                                    onChange={(e) => {
                                                                                        const newItems = [...(editorData.payment.items || [])];
                                                                                        newItems[idx].qty = Number(e.target.value);
                                                                                        const newTotal = newItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
                                                                                        setEditorData(prev => ({
                                                                                            ...prev,
                                                                                            payment: { ...prev.payment, items: newItems, amount: newTotal }
                                                                                        }));
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <Input
                                                                                    className="h-7 text-xs"
                                                                                    value={item.name}
                                                                                    onChange={(e) => {
                                                                                        const newItems = [...(editorData.payment.items || [])];
                                                                                        newItems[idx].name = e.target.value;
                                                                                        setEditorData(prev => ({ ...prev, payment: { ...prev.payment, items: newItems } }));
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <div className="w-14">
                                                                                <Input
                                                                                    className="h-7 text-xs pl-2"
                                                                                    type="number"
                                                                                    value={item.price}
                                                                                    onChange={(e) => {
                                                                                        const newItems = [...(editorData.payment.items || [])];
                                                                                        newItems[idx].price = Number(e.target.value);
                                                                                        const newTotal = newItems.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
                                                                                        setEditorData(prev => ({
                                                                                            ...prev,
                                                                                            payment: { ...prev.payment, items: newItems, amount: newTotal }
                                                                                        }));
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                                onClick={() => {
                                                                                    const newItems = editorData.payment.items.filter((_: any, index: number) => index !== idx);
                                                                                    const newTotal = newItems.reduce((acc: number, curr: any) => acc + (curr.price * curr.qty), 0);
                                                                                    setEditorData(prev => ({
                                                                                        ...prev,
                                                                                        payment: { ...prev.payment, items: newItems, amount: newTotal }
                                                                                    }));
                                                                                }}
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </Button>
                                                                        </div>
                                                                    ))}

                                                                    {(!editorData.payment.items || editorData.payment.items.length === 0) && (
                                                                        <div className="text-center py-4 border-2 border-dashed border-muted rounded-lg bg-muted/20">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() => {
                                                                                    const newItems = [{ name: "Order Payment", qty: 1, price: 500 }];
                                                                                    setEditorData(prev => ({
                                                                                        ...prev,
                                                                                        payment: { ...prev.payment, items: newItems, amount: 500 }
                                                                                    }));
                                                                                }}
                                                                            >
                                                                                <Plus size={12} className="mr-1" /> Add Payment Item
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                                                <div className="flex items-center gap-2 text-green-700">
                                                                    <Check size={14} />
                                                                    <span className="text-xs font-medium">Receipt will be attached as PDF</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {/* UPDATE MESSAGE EDITOR */}
                                                {managerCategory === 'update' && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-medium">Message Body</Label>
                                                        <Textarea
                                                            className="min-h-[120px] text-sm"
                                                            value={editorData.update.message}
                                                            onChange={(e) => setEditorData(prev => ({ ...prev, update: { ...prev.update, message: e.target.value } }))}
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-3 pt-3 border-t border-border">
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Components</Label>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                                            <div className="flex items-center gap-2">
                                                                <Globe size={14} className="text-muted-foreground" />
                                                                <Label className="font-normal text-xs cursor-pointer">Social Links</Label>
                                                            </div>
                                                            <Switch checked={editorOptions.showSocial} onCheckedChange={c => setEditorOptions(prev => ({ ...prev, showSocial: c }))} />
                                                        </div>
                                                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                                            <div className="flex items-center gap-2">
                                                                <Info size={14} className="text-muted-foreground" />
                                                                <Label className="font-normal text-xs cursor-pointer">Footer Info</Label>
                                                            </div>
                                                            <Switch checked={editorOptions.showFooter} onCheckedChange={c => setEditorOptions(prev => ({ ...prev, showFooter: c }))} />
                                                        </div>
                                                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                                            <div className="flex items-center gap-2">
                                                                <Activity size={14} className="text-muted-foreground" />
                                                                <Label className="font-normal text-xs cursor-pointer">QR Code</Label>
                                                            </div>
                                                            <Switch checked={editorOptions.showQr} onCheckedChange={c => setEditorOptions(prev => ({ ...prev, showQr: c }))} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 pt-3 border-t border-border">
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Theme Color</Label>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {['#2563eb', '#ef4444', '#db2777', '#7c3aed', '#059669', '#ea580c', '#0f172a'].map(c => (
                                                            <div key={c}
                                                                className={cn("w-7 h-7 rounded-full cursor-pointer ring-2 ring-offset-2 ring-offset-card transition-all hover:scale-110",
                                                                    editorOptions.themeColor === c ? "ring-foreground scale-110" : "ring-transparent")}
                                                                style={{ backgroundColor: c }}
                                                                onClick={() => setEditorOptions(prev => ({ ...prev, themeColor: c }))}
                                                            />
                                                        ))}
                                                        <div className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-foreground transition-colors"
                                                            title="Reset Color"
                                                            onClick={() => setEditorOptions(prev => ({ ...prev, themeColor: undefined }))}>
                                                            <X size={12} className="text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    {/* Preview Area (Device Simulator) */}
                                    <div className="flex-1 bg-muted/20 relative flex flex-col h-full overflow-hidden">
                                        {/* Simulator Toolbar */}
                                        <div className="h-12 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-4 shrink-0 z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="flex bg-muted/50 p-1 rounded-lg border border-border gap-1">
                                                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-md", previewDevice === 'desktop' && "bg-background shadow-sm text-primary")} onClick={() => setPreviewDevice('desktop')}>
                                                        <Monitor size={14} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-md", previewDevice === 'mobile' && "bg-background shadow-sm text-primary")} onClick={() => setPreviewDevice('mobile')}>
                                                        <Smartphone size={14} />
                                                    </Button>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {previewDevice === 'desktop' ? '600px Desktop' : '375px Mobile'}
                                                </span>
                                            </div>
                                            <div className="flex gap-3 items-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs gap-1.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                                                    onClick={handleSendTest}
                                                    disabled={isSendingTest}
                                                >
                                                    {isSendingTest ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                                    {isSendingTest ? 'Sending...' : 'Send Test'}
                                                </Button>
                                                <div className="h-4 w-px bg-border mx-1"></div>
                                                <span className="text-[10px] font-mono text-muted-foreground uppercase opacity-50 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Live Preview
                                                </span>
                                            </div>
                                        </div>

                                        {/* Canvas */}
                                        <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                                            {(() => {
                                                const T = DESIGN_TEMPLATES.find(t => t.id === activeDesignIds[managerCategory])?.component;
                                                if (!T) return null;

                                                const mockData = (editorData as any)[managerCategory];
                                                const data = { ...mockData, bannerUrl: customBanners[managerCategory] || (mockData as any).bannerUrl };

                                                return (
                                                    <div className={cn("transition-all duration-500 origin-top shadow-2xl bg-white relative shrink-0",
                                                        previewDevice === 'mobile' ? "w-[375px] rounded-[40px] border-[12px] border-gray-900 ring-4 ring-gray-900/10 my-8 min-h-[700px] overflow-hidden" : "w-[600px] rounded-lg border border-gray-200 min-h-[800px]")}>

                                                        {/* Mobile Notch */}
                                                        {previewDevice === 'mobile' && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-7 w-28 bg-black rounded-b-xl z-50"></div>}

                                                        {/* Desktop Browser Bar */}
                                                        {previewDevice === 'desktop' && (
                                                            <div className="h-9 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-2 sticky top-0 z-40">
                                                                <div className="flex gap-1.5">
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                                                                </div>
                                                                <div className="flex-1 mx-4 h-6 bg-white rounded-md border border-gray-200 text-[9px] flex items-center px-3 text-gray-400 font-mono shadow-sm">
                                                                    https://mail.snackzo.tech/view/{activeDesignIds[managerCategory]}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <T type={managerCategory} data={data} options={editorOptions} />
                                                    </div>
                                                )
                                            })()}
                                        </div>

                                        {/* Floating Actions (Overlaid) */}
                                        <div className="absolute bottom-6 right-6 flex gap-2 z-50">
                                            <Button size="sm" variant="outline" className="bg-background shadow-lg text-foreground hover:bg-muted" onClick={() => fileInputRef.current?.click()}>
                                                <Paperclip size={14} className="mr-2" /> Change Banner
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                                                onClick={handleSaveDefault}
                                                disabled={isSaving}
                                            >
                                                {isSaving ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                                                {isSaving ? 'Saving...' : 'Save Default'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileSelect} />
            {/* Minimal Footer Info */}
            <div className="h-8 border-t border-border flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-muted-foreground/60">Region: Asia-Pacific</span>
                    <span className="text-[10px] text-muted-foreground/60">v1.2.0</span>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={10} className="text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/60">Authenticated Secure Connection</span>
                </div>
            </div>
        </div>
    );
}
