import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
    Download, Copy, Globe, Package, Wifi, Type,
    Share2, Check, RefreshCw, Smartphone, QrCode,
    Palette, Image as ImageIcon, Layout, Box, Save,
    List, Trash2, Edit2, ExternalLink, Clock, BarChart3,
    ArrowRight, Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface QrStyle {
    fgColor: string;
    bgColor: string;
    logo: boolean;
    size: number;
    logoSize: number;
    level: "L" | "M" | "Q" | "H";
}

interface SavedQr {
    id: string;
    name: string;
    short_code: string;
    target_url: string;
    type: "static" | "dynamic" | "temporary";
    settings: QrStyle;
    scan_count: number;
    expires_at: string | null;
    created_at: string;
}

const QrCodeStudio = () => {
    // Top Level Tabs
    const [viewMode, setViewMode] = useState<"studio" | "list">("studio");

    // Studio State
    const [activeTab, setActiveTab] = useState<"url" | "product" | "wifi" | "text">("url");
    const [value, setValue] = useState("https://snackzo.tech");
    const [products, setProducts] = useState<any[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    // Form States
    const [promoTitle, setPromoTitle] = useState("My QR Code");
    const [qrType, setQrType] = useState<"static" | "dynamic" | "temporary">("static");
    const [expiryDate, setExpiryDate] = useState("");

    const [url, setUrl] = useState("https://snackzo.tech");
    const [text, setText] = useState("");
    const [selectedProduct, setSelectedProduct] = useState("");
    const [wifiSSID, setWifiSSID] = useState("");
    const [wifiPass, setWifiPass] = useState("");
    const [wifiHidden, setWifiHidden] = useState(false);

    // Style State
    const [style, setStyle] = useState<QrStyle>({
        fgColor: "#000000",
        bgColor: "#ffffff",
        logo: true,
        size: 300,
        logoSize: 40,
        level: "H"
    });

    // Saved QRs State
    const [savedQrs, setSavedQrs] = useState<SavedQr[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [editingQr, setEditingQr] = useState<SavedQr | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === "product") fetchProducts();
    }, [activeTab]);

    useEffect(() => {
        if (viewMode === "list") fetchSavedQrs();
    }, [viewMode]);

    useEffect(() => {
        if (!editingQr) generateQrValue();
    }, [activeTab, url, text, selectedProduct, wifiSSID, wifiPass, wifiHidden, qrType]);

    const fetchProducts = async () => {
        setIsLoadingProducts(true);
        const { data } = await supabase.from("products").select("id, name, price").limit(100);
        if (data) setProducts(data);
        setIsLoadingProducts(false);
    };

    const fetchSavedQrs = async () => {
        setIsLoadingList(true);
        const { data, error } = await supabase
            .from("qr_codes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            // Quietly fail or show toast if it's a real error vs missing table
            console.error(error);
        } else {
            setSavedQrs(data as unknown as SavedQr[]);
        }
        setIsLoadingList(false);
    };

    const generateQrValue = () => {
        // If creating a dynamic QR, the value is just a placeholder until saved?
        // No, we show the user what it WILL look like basically, or just the current target.
        // Actually for dynamic, we can't show the real QR until we have the short_code.
        // So we interpret "dynamic" as "I want to save this to get a short URL".
        // For preview, we use the target URL directly if static, or a dummy short URL if dynamic selected but not saved.

        // Wait, if Dynamic is selected, the QR content will be "https://snackzo.tech/q/XXXXXX".
        // Since we haven't saved, we don't have XXXXXX.
        // So in "Studio" mode, we just show the static content QR for preview, 
        // OR we warn "Save to generate Dynamic QR". 
        // Let's generate a temporary random code for visualization if Dynamic is checked.

        let content = "";

        if (activeTab === "url") {
            content = url;
            // Smart URL Fixer
            if (content && content.length > 3 && !content.startsWith("http://") && !content.startsWith("https://") && content.includes(".")) {
                content = "https://" + content;
            }
        }
        else if (activeTab === "product") content = selectedProduct ? `${window.location.origin}/products/${selectedProduct}` : window.location.origin;
        else if (activeTab === "wifi") content = `WIFI:S:${wifiSSID};T:WPA;P:${wifiPass};H:${wifiHidden};;`;
        else if (activeTab === "text") content = text;

        setValue(content || "https://snackzo.tech");
    };

    const saveQrCode = async () => {
        if (!promoTitle) {
            toast.error("Please enter a name for this QR code");
            return;
        }

        // 1. Determine Target URL
        // 1. Determine Target URL
        let targetUrl = "";
        if (activeTab === "url") {
            targetUrl = url;
            if (targetUrl && targetUrl.length > 3 && !targetUrl.startsWith("http://") && !targetUrl.startsWith("https://") && targetUrl.includes(".")) {
                targetUrl = "https://" + targetUrl;
            }
        }
        else if (activeTab === "product") targetUrl = selectedProduct ? `/products/${selectedProduct}` : "/";
        else if (activeTab === "wifi") targetUrl = `WIFI:S:${wifiSSID};T:WPA;P:${wifiPass};H:${wifiHidden};;`;
        else if (activeTab === "text") targetUrl = text;

        if (!targetUrl) {
            toast.error("content is empty");
            return;
        }

        // 2. Generate Short Code
        const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        try {
            const { error } = await supabase.from("qr_codes").insert({
                name: promoTitle,
                short_code: shortCode,
                target_url: targetUrl,
                type: qrType, // 'static' (just saving record), 'dynamic' (redirect), 'temporary'
                settings: style,
                expires_at: qrType === "temporary" && expiryDate ? new Date(expiryDate).toISOString() : null
            });

            if (error) throw error;

            toast.success("QR Code Saved!");
            setViewMode("list");
            fetchSavedQrs();
        } catch (err: any) {
            toast.error("Failed to save. Did you run the migration?");
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        const { error } = await supabase.from("qr_codes").delete().eq("id", id);
        if (!error) {
            toast.success("Deleted");
            fetchSavedQrs();
        }
    };

    const handleUpdate = async () => {
        if (!editingQr) return;

        // Update valid fields (target_url, name, settings, expiry)
        const { error } = await supabase.from("qr_codes").update({
            name: editingQr.name,
            target_url: editingQr.target_url,
            settings: editingQr.settings,
            expires_at: editingQr.expires_at,
            type: editingQr.type // Allow changing type? Maybe.
        }).eq("id", editingQr.id);

        if (!error) {
            toast.success("QR Code Updated");
            setEditingQr(null);
            fetchSavedQrs();
        } else {
            toast.error("Update failed");
        }
    };

    const handleDownload = (fmt: "png" | "jpg", elementId: string = "studio-qr-canvas", filename: string = "QR") => {
        const canvas = document.getElementById(elementId) as HTMLCanvasElement;
        if (canvas) {
            const url = canvas.toDataURL(`image/${fmt}`);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${filename}-${Date.now()}.${fmt}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Downloaded as ${fmt.toUpperCase()}`);
        }
    };

    return (
        <div className="space-y-8 p-6 lg:p-10 container mx-auto fade-in-bottom">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-600 flex items-center gap-3">
                        <QrCode className="text-primary" size={40} />
                        QR Master Studio
                    </h2>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Create, manage, and track dynamic QR codes.
                    </p>
                </div>

                <div className="bg-muted/30 p-1.5 rounded-xl flex">
                    <button
                        onClick={() => setViewMode("studio")}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === "studio" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <QrCode size={16} /> Create
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <List size={16} /> My Codes
                    </button>
                </div>
            </div>

            {/* STUDIO MODE */}
            <AnimatePresence mode="wait">
                {viewMode === "studio" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid lg:grid-cols-12 gap-8"
                    >
                        {/* LEFT: Controls */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* Name & Type */}
                            <div className="glass-card p-6 space-y-4">
                                <h3 className="text-lg font-bold">Campaign Details</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
                                        <input
                                            type="text"
                                            value={promoTitle}
                                            onChange={e => setPromoTitle(e.target.value)}
                                            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 font-medium outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="E.g. Summer Promo"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Type</label>
                                        <select
                                            value={qrType}
                                            onChange={(e: any) => setQrType(e.target.value)}
                                            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 font-medium outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="static">Static (Direct Link)</option>
                                            <option value="dynamic">Dynamic (Trackable/Editable)</option>
                                            <option value="temporary">Temporary (Expiring)</option>
                                        </select>
                                    </div>
                                </div>

                                {qrType === "temporary" && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Expires At</label>
                                        <input
                                            type="datetime-local"
                                            value={expiryDate}
                                            onChange={e => setExpiryDate(e.target.value)}
                                            className="w-full mt-2 bg-muted/30 border border-border rounded-xl px-4 py-2.5 font-medium outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Content Tabs */}
                            <div className="flex gap-2 p-1.5 bg-muted/50 rounded-2xl overflow-x-auto">
                                {[
                                    { id: "url", label: "Website", icon: Globe },
                                    { id: "product", label: "Product", icon: Package },
                                    { id: "wifi", label: "Wi-Fi", icon: Wifi },
                                    { id: "text", label: "Custom", icon: Type },
                                ].map((tab: any) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${activeTab === tab.id
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                            : "hover:bg-background text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <tab.icon size={18} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Inputs */}
                            <div className="glass-card p-6 space-y-6">
                                {activeTab === "url" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase">Website URL</label>
                                        <input
                                            type="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="https://snackzo.tech"
                                        />
                                    </div>
                                )}

                                {activeTab === "product" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase">Select Product</label>
                                        <select
                                            value={selectedProduct}
                                            onChange={(e) => setSelectedProduct(e.target.value)}
                                            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary appearance-none"
                                        >
                                            <option value="">-- Choose a Product --</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-muted-foreground">Linking to: {window.location.origin}/products/{selectedProduct || '...'}</p>
                                    </div>
                                )}

                                {activeTab === "wifi" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-muted-foreground uppercase">SSID</label>
                                            <input type="text" value={wifiSSID} onChange={(e) => setWifiSSID(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-muted-foreground uppercase">Password</label>
                                            <input type="text" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary" />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "text" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase">Custom Content</label>
                                        <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary min-h-[100px]" />
                                    </div>
                                )}
                            </div>

                            {/* Styling Controls */}
                            <div className="glass-card p-6 space-y-6">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Palette size={20} className="text-primary" />
                                    Appearance
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase">QR Color</label>
                                        <div className="flex items-center gap-3">
                                            <input type="color" value={style.fgColor} onChange={(e) => setStyle({ ...style, fgColor: e.target.value })} className="h-10 w-20 rounded cursor-pointer border-0 p-0" />
                                            <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{style.fgColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase">Background</label>
                                        <div className="flex items-center gap-3">
                                            <input type="color" value={style.bgColor} onChange={(e) => setStyle({ ...style, bgColor: e.target.value })} className="h-10 w-20 rounded cursor-pointer border-0 p-0" />
                                            <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{style.bgColor}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-border pt-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-bold text-muted-foreground uppercase block">Logo</label>
                                            <p className="text-xs text-muted-foreground">Add Snackzo branding</p>
                                        </div>
                                        <button onClick={() => setStyle({ ...style, logo: !style.logo })} className={`w-14 h-8 rounded-full transition-colors relative ${style.logo ? "bg-primary" : "bg-muted"}`}>
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${style.logo ? "left-7" : "left-1"}`} />
                                        </button>
                                    </div>

                                    {style.logo && (
                                        <div className="flex items-center gap-3 flex-1">
                                            <input
                                                type="range"
                                                min="20"
                                                max="80"
                                                value={style.logoSize}
                                                onChange={(e) => setStyle({ ...style, logoSize: parseInt(e.target.value) })}
                                                className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-xs font-bold w-8">{style.logoSize}px</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Preview */}
                        <div className="lg:col-span-5">
                            <div className="sticky top-10 space-y-6">
                                <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

                                    <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6" ref={canvasRef}>
                                        <QRCodeCanvas
                                            id="studio-qr-canvas"
                                            value={value}
                                            size={300}
                                            fgColor={style.fgColor}
                                            bgColor={style.bgColor}
                                            level={style.level}
                                            includeMargin={true}
                                            imageSettings={style.logo ? { src: "/logo.png", x: undefined, y: undefined, height: style.logoSize, width: style.logoSize, excavate: true } : undefined}
                                        />
                                    </div>

                                    <h3 className="text-2xl font-black text-gray-900 mb-1">{promoTitle}</h3>
                                    <p className="text-gray-500 font-medium text-sm">Preview ({qrType})</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={saveQrCode} className="col-span-2 bg-gradient-to-r from-primary to-purple-600 text-white text-lg font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                                        <Save size={24} /> Save QR Code
                                    </button>
                                    <button onClick={() => handleDownload("png")} className="bg-card hover:bg-muted border border-border text-foreground font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                                        <Download size={18} /> Download
                                    </button>
                                    <button onClick={() => { setStyle({ fgColor: "#000000", bgColor: "#ffffff", logo: true, size: 300, logoSize: 40, level: "H" }); toast.success("Reset"); }} className="bg-card hover:bg-muted border border-border text-foreground font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                                        <RefreshCw size={18} /> Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div >
                )}
            </AnimatePresence >

            {/* LIST MODE */}
            < AnimatePresence mode="wait" >
                {viewMode === "list" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {savedQrs.length === 0 && !isLoadingList && (
                                <div className="col-span-full text-center py-20 text-muted-foreground">
                                    <QrCode size={48} className="mx-auto mb-4 opacity-50" />
                                    <h3 className="text-xl font-bold">No saved QR codes</h3>
                                    <p>Create your first campaign in the Studio tab.</p>
                                </div>
                            )}

                            {savedQrs.map(qr => (
                                <div key={qr.id} className="glass-card hover:border-primary/50 transition-colors p-6 group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm">
                                                <QRCodeCanvas
                                                    id={`qr-thumb-${qr.id}`}
                                                    value={qr.type === 'static' ? qr.target_url : `${window.location.origin}/q/${qr.short_code}`}
                                                    size={40}
                                                    fgColor={qr.settings?.fgColor || '#000'}
                                                    bgColor={qr.settings?.bgColor || '#fff'}
                                                    level="L"
                                                />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg">{qr.name}</h4>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${qr.type === 'dynamic' ? 'bg-purple-500/10 text-purple-500' :
                                                        qr.type === 'temporary' ? 'bg-amber-500/10 text-amber-500' :
                                                            'bg-muted text-muted-foreground'
                                                        }`}>{qr.type}</span>
                                                    <span>• {new Date(qr.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => setEditingQr(qr)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(qr.id)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-1"><BarChart3 size={14} /> Scans</span>
                                            <span className="font-bold">{qr.scan_count || 0}</span>
                                        </div>
                                        {qr.expires_at && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground flex items-center gap-1"><Clock size={14} /> Expires</span>
                                                <span className={`font-bold ${new Date(qr.expires_at) < new Date() ? "text-destructive" : ""}`}>
                                                    {new Date(qr.expires_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                        <div className="bg-muted/30 p-2 rounded-lg text-xs font-mono break-all truncate">
                                            {qr.type === 'static' ? qr.target_url : `${window.location.origin}/q/${qr.short_code}`}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                // Trigger download of hidden canvas or dynamic regeneration?
                                                // Simpler: Just regenerate canvas on fly or assume we want to download the one in view. 
                                                // Actually best to re-render it in a hidden div or modal.
                                                // For now, let's just open the edit modal to download, or basic alert.
                                                setEditingQr(qr);
                                            }}
                                            className="flex-1 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            Download / Edit
                                        </button>
                                        <button onClick={() => window.open(qr.type === 'static' ? qr.target_url : `/q/${qr.short_code}`, '_blank')} className="p-2 bg-muted hover:bg-muted/80 rounded-lg"><ExternalLink size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >

            {/* EDIT MODAL */}
            < Dialog open={!!editingQr} onOpenChange={(o) => !o && setEditingQr(null)}>
                <DialogContent className="max-w-xl bg-card border-white/10">
                    <DialogHeader>
                        <DialogTitle>Edit QR Code</DialogTitle>
                        <DialogDescription>Update destination or style</DialogDescription>
                    </DialogHeader>
                    {editingQr && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase">Name</label>
                                <input type="text" value={editingQr.name} onChange={e => setEditingQr({ ...editingQr, name: e.target.value })} className="w-full bg-muted p-2 rounded-lg font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase">Target URL</label>
                                <input type="text" value={editingQr.target_url} onChange={e => setEditingQr({ ...editingQr, target_url: e.target.value })} className="w-full bg-muted p-2 rounded-lg font-mono text-sm" />
                                <p className="text-xs text-muted-foreground">If Dynamic, changing this updates where the QR points to instantly.</p>
                            </div>

                            <div className="flex justify-center p-6 bg-white rounded-xl relative group">
                                <div className="absolute top-2 right-2 text-xs font-bold bg-black/10 px-2 rounded">{editingQr.type}</div>
                                <QRCodeCanvas
                                    id="edit-qr-canvas"
                                    value={editingQr.type === 'static' ? editingQr.target_url : `${window.location.origin}/q/${editingQr.short_code}`}
                                    size={250}
                                    fgColor={editingQr.settings?.fgColor}
                                    bgColor={editingQr.settings?.bgColor}
                                    level="H"
                                    includeMargin={true}

                                    imageSettings={editingQr.settings?.logo ? { src: "/logo.png", x: undefined, y: undefined, height: editingQr.settings?.logoSize || 40, width: editingQr.settings?.logoSize || 40, excavate: true } : undefined}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleDownload("png", "edit-qr-canvas", editingQr.name)} className="bg-primary text-primary-foreground py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                                    <Download size={16} /> Download PNG
                                </button>
                                <button onClick={handleUpdate} className="bg-green-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog >
        </div >
    );
};

export default QrCodeStudio;
