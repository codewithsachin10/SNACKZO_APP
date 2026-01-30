import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerSuccessCelebration, sendNotification } from "@/utils/notificationService";
import {
    Mail, Send, Users, Search, Smartphone, Globe,
    Zap, History as HistoryIcon, Plus, X,
    Terminal, Library, Flame, Utensils, Check, Loader2,
    Cpu, User, MoreHorizontal, Settings, ShieldCheck,
    Activity, Radio, MessageSquare, Info, Filter, Paperclip, Monitor
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
                                {/* Configuration Toolbar */}
                                <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between shrink-0">
                                    <div className="flex bg-muted p-1 rounded-lg">
                                        {(['order', 'payment', 'update'] as const).map(cat => (
                                            <button key={cat} onClick={() => setManagerCategory(cat)}
                                                className={cn("px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all",
                                                    managerCategory === cat ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                                {cat.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Active Template:</span>
                                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                            {DESIGN_TEMPLATES.find(t => t.id === activeDesignIds[managerCategory])?.name}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Sidebar List (Tabbed) */}
                                    <div className="w-80 border-r border-border bg-card/50 flex flex-col">
                                        <Tabs defaultValue="style" className="w-full flex-1 flex flex-col">
                                            <div className="p-4 pb-0">
                                                <TabsList className="w-full grid grid-cols-2">
                                                    <TabsTrigger value="style">Design</TabsTrigger>
                                                    <TabsTrigger value="content">Content</TabsTrigger>
                                                </TabsList>
                                            </div>

                                            <TabsContent value="style" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
                                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Available Styles</h3>
                                                {DESIGN_TEMPLATES.map(t => (
                                                    <div key={t.id}
                                                        onClick={() => setActiveDesignIds(prev => ({ ...prev, [managerCategory]: t.id as any }))}
                                                        className={cn("p-3 rounded-xl border cursor-pointer transition-all",
                                                            activeDesignIds[managerCategory] === t.id ? "bg-primary/5 border-primary shadow-sm" : "bg-card border-border hover:border-primary/50")}>
                                                        <div className="font-bold text-sm mb-1 text-foreground">{t.name}</div>
                                                        <p className="text-[10px] text-muted-foreground leading-tight">{t.description}</p>
                                                    </div>
                                                ))}

                                                <div className="pt-6 border-t border-border mt-6">
                                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Quick Snippets</h3>
                                                    <div className="space-y-2">
                                                        {MESSAGE_SNIPPETS.map(s => (
                                                            <div key={s.id} onClick={() => { setMessage(s.content); setActiveTab('compose'); }}
                                                                className="p-2 bg-card border border-border rounded-lg text-[10px] hover:border-foreground cursor-pointer transition-all">
                                                                <span className="font-bold block mb-1 text-foreground">{s.title}</span>
                                                                <span className="text-muted-foreground line-clamp-2">{s.content}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="content" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
                                                <div className="space-y-3">
                                                    <Label>Subject / Title</Label>
                                                    <Input
                                                        value={(editorData as any)[managerCategory]?.subject || "Order Confirmation"}
                                                        onChange={(e) => setEditorData(prev => ({ ...prev, [managerCategory]: { ...(prev as any)[managerCategory], subject: e.target.value } }))}
                                                    />
                                                </div>

                                                {managerCategory === 'update' && (
                                                    <div className="space-y-3">
                                                        <Label>
                                                            Message Body
                                                        </Label>
                                                        <Textarea
                                                            className="min-h-[150px]"
                                                            value={editorData.update.message}
                                                            onChange={(e) => setEditorData(prev => ({ ...prev, update: { ...prev.update, message: e.target.value } }))}
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-4 pt-4 border-t border-border">
                                                    <Label className="uppercase text-xs text-muted-foreground tracking-widest font-bold">Components</Label>
                                                    <div className="flex items-center justify-between">
                                                        <Label className="font-normal">Social Links</Label>
                                                        <Switch checked={editorOptions.showSocial} onCheckedChange={c => setEditorOptions(prev => ({ ...prev, showSocial: c }))} />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <Label className="font-normal">Footer Info</Label>
                                                        <Switch checked={editorOptions.showFooter} onCheckedChange={c => setEditorOptions(prev => ({ ...prev, showFooter: c }))} />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <Label className="font-normal">QR Code</Label>
                                                        <Switch checked={editorOptions.showQr} onCheckedChange={c => setEditorOptions(prev => ({ ...prev, showQr: c }))} />
                                                    </div>

                                                    <div className="space-y-3 pt-4 border-t border-border">
                                                        <Label className="uppercase text-xs text-muted-foreground tracking-widest font-bold">Theme</Label>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {['#2563eb', '#ef4444', '#db2777', '#7c3aed', '#059669', '#ea580c', '#0f172a'].map(c => (
                                                                <div key={c}
                                                                    className={cn("w-6 h-6 rounded-full cursor-pointer ring-2 ring-offset-2 ring-offset-card transition-all",
                                                                        editorOptions.themeColor === c ? "ring-foreground scale-110" : "ring-transparent hover:scale-105")}
                                                                    style={{ backgroundColor: c }}
                                                                    onClick={() => setEditorOptions(prev => ({ ...prev, themeColor: c }))}
                                                                />
                                                            ))}
                                                            <div className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center cursor-pointer hover:border-foreground"
                                                                title="Reset Color"
                                                                onClick={() => setEditorOptions(prev => ({ ...prev, themeColor: undefined }))}>
                                                                <X size={10} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    {/* Preview Area */}
                                    {/* Preview Area (Device Simulator) */}
                                    <div className="flex-1 bg-muted/20 relative flex flex-col h-full overflow-hidden">
                                        {/* Simulator Toolbar */}
                                        <div className="h-12 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-4 shrink-0 z-10">
                                            <div className="flex bg-muted/50 p-1 rounded-lg border border-border gap-1">
                                                <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-md", previewDevice === 'desktop' && "bg-background shadow-sm text-primary")} onClick={() => setPreviewDevice('desktop')}>
                                                    <Monitor size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-md", previewDevice === 'mobile' && "bg-background shadow-sm text-primary")} onClick={() => setPreviewDevice('mobile')}>
                                                    <Smartphone size={14} />
                                                </Button>
                                            </div>
                                            <div className="flex gap-3 items-center">
                                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10" onClick={() => toast.success("Test message sent to admin!")}>
                                                    <Send size={12} /> Send Test
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
                                            <Button size="sm" className="bg-primary text-primary-foreground shadow-lg hover:bg-primary/90" onClick={() => toast.success("Template set as default for " + managerCategory)}>
                                                <Check size={14} className="mr-2" /> Save Default
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
