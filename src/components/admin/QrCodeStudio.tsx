import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
    Download, Copy, Globe, Package, Wifi, Type,
    Share2, Check, RefreshCw, Smartphone, QrCode,
    Palette, Image as ImageIcon, Layout, Box
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface QrStyle {
    fgColor: string;
    bgColor: string;
    logo: boolean;
    size: number;
    level: "L" | "M" | "Q" | "H";
}

const QrCodeStudio = () => {
    const [activeTab, setActiveTab] = useState<"url" | "product" | "wifi" | "text">("url");
    const [value, setValue] = useState("https://snackzo.tech");
    const [products, setProducts] = useState<any[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    // Form States
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
        level: "H"
    });

    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeTab === "product") fetchProducts();
    }, [activeTab]);

    useEffect(() => {
        generateQrValue();
    }, [activeTab, url, text, selectedProduct, wifiSSID, wifiPass, wifiHidden]);

    const fetchProducts = async () => {
        setIsLoadingProducts(true);
        const { data } = await supabase.from("products").select("id, name, price").limit(100);
        if (data) setProducts(data);
        setIsLoadingProducts(false);
    };

    const generateQrValue = () => {
        let val = "";
        switch (activeTab) {
            case "url":
                val = url;
                break;
            case "product":
                if (selectedProduct) {
                    val = `${window.location.origin}/product/${selectedProduct}`;
                } else {
                    val = window.location.origin;
                }
                break;
            case "wifi":
                // WIFI:S:MySSID;T:WPA;P:MyPass;H:false;;
                val = `WIFI:S:${wifiSSID};T:WPA;P:${wifiPass};H:${wifiHidden};;`;
                break;
            case "text":
                val = text;
                break;
        }
        setValue(val);
    };

    const handleDownload = (fmt: "png" | "jpg") => {
        const canvas = document.getElementById("studio-qr-canvas") as HTMLCanvasElement;
        if (canvas) {
            const url = canvas.toDataURL(`image/${fmt}`);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Snackzo-QR-${Date.now()}.${fmt}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Downloaded as ${fmt.toUpperCase()}`);
        }
    };

    const copyToClipboard = () => {
        const canvas = document.getElementById("studio-qr-canvas") as HTMLCanvasElement;
        if (canvas) {
            canvas.toBlob(blob => {
                if (blob) {
                    try {
                        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                        toast.success("QR Image copied to clipboard");
                    } catch (err) {
                        toast.error("Failed to copy image");
                    }
                }
            });
        }
    };

    return (
        <div className="space-y-8 p-6 lg:p-10 container mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-600 flex items-center gap-3">
                    <QrCode className="text-primary" size={40} />
                    QR Code Studio
                </h2>
                <p className="text-muted-foreground mt-2 text-lg">
                    Generate professional, branded QR codes for your store, products, and more.
                </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* LEFT: Controls */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Tabs */}
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
                        <AnimatePresence mode="wait">
                            {activeTab === "url" && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase">Website URL</label>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                            <input
                                                type="url"
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                className="w-full bg-muted/30 border border-border rounded-xl pl-12 pr-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="https://snackzo.tech"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "product" && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase">Select Product</label>
                                        {isLoadingProducts ? (
                                            <div className="flex items-center gap-2 text-muted-foreground h-12">
                                                <RefreshCw className="animate-spin" size={16} /> Loading products...
                                            </div>
                                        ) : (
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
                                        )}
                                        <p className="text-xs text-muted-foreground">Linking to: {window.location.origin}/product/{selectedProduct || '...'}</p>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "wifi" && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-muted-foreground uppercase">Network Name (SSID)</label>
                                            <input
                                                type="text"
                                                value={wifiSSID}
                                                onChange={(e) => setWifiSSID(e.target.value)}
                                                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="Hostel-WiFi-5G"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-muted-foreground uppercase">Password</label>
                                            <input
                                                type="text"
                                                value={wifiPass}
                                                onChange={(e) => setWifiPass(e.target.value)}
                                                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="SecretPass123"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="hiddenWifi"
                                            checked={wifiHidden}
                                            onChange={(e) => setWifiHidden(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <label htmlFor="hiddenWifi" className="font-medium">Hidden Network</label>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "text" && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-muted-foreground uppercase">Custom Content</label>
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                                            placeholder="Enter text, link, or any data..."
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Styling Controls */}
                    <div className="glass-card p-6 space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Palette size={20} className="text-primary" />
                            Customize Design
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground uppercase">QR Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={style.fgColor}
                                        onChange={(e) => setStyle({ ...style, fgColor: e.target.value })}
                                        className="h-10 w-20 rounded cursor-pointer border-0 p-0"
                                    />
                                    <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{style.fgColor}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground uppercase">Background</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={style.bgColor}
                                        onChange={(e) => setStyle({ ...style, bgColor: e.target.value })}
                                        className="h-10 w-20 rounded cursor-pointer border-0 p-0"
                                    />
                                    <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{style.bgColor}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border pt-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-muted-foreground uppercase block">Brand Logo</label>
                                    <p className="text-xs text-muted-foreground">Center brand icon</p>
                                </div>
                                <button
                                    onClick={() => setStyle({ ...style, logo: !style.logo })}
                                    className={`w-14 h-8 rounded-full transition-colors relative ${style.logo ? "bg-primary" : "bg-muted"}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${style.logo ? "left-7" : "left-1"}`} />
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-muted-foreground uppercase">Resolution</label>
                                <select
                                    value={style.size}
                                    onChange={(e) => setStyle({ ...style, size: parseInt(e.target.value) })}
                                    className="bg-muted border border-border rounded-lg px-2 py-1 text-sm font-bold outline-none"
                                >
                                    <option value={200}>Low (200px)</option>
                                    <option value={300}>Medium (300px)</option>
                                    <option value={500}>High (500px)</option>
                                    <option value={1000}>Ultra (1000px)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Preview */}
                <div className="lg:col-span-5">
                    <div className="sticky top-10 space-y-6">
                        <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-primary/10 border border-white/20 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

                            <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6" ref={canvasRef}>
                                <QRCodeCanvas
                                    id="studio-qr-canvas"
                                    value={value}
                                    size={300} // Display size
                                    fgColor={style.fgColor}
                                    bgColor={style.bgColor}
                                    level={style.level}
                                    includeMargin={true}
                                    imageSettings={style.logo ? {
                                        src: "/logo.png",
                                        x: undefined,
                                        y: undefined,
                                        height: 40,
                                        width: 40,
                                        excavate: true,
                                    } : undefined}
                                />
                            </div>

                            <h3 className="text-2xl font-black text-gray-900 mb-1">Scan Me</h3>
                            <p className="text-gray-500 font-medium text-sm">Open camera to view content</p>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleDownload("png")}
                                className="col-span-2 bg-primary text-primary-foreground text-lg font-bold py-4 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                            >
                                <Download size={24} /> Download PNG
                            </button>
                            <button
                                onClick={copyToClipboard}
                                className="bg-card hover:bg-muted border border-border text-foreground font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Copy size={18} /> Copy Image
                            </button>
                            <button
                                onClick={() => {
                                    setStyle({
                                        fgColor: "#000000",
                                        bgColor: "#ffffff",
                                        logo: true,
                                        size: 300,
                                        level: "H"
                                    });
                                    toast.success("Reset to defaults");
                                }}
                                className="bg-card hover:bg-muted border border-border text-foreground font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} /> Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QrCodeStudio;
