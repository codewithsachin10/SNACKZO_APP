import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Save, Calendar, Clock, Image as ImageIcon, Link as LinkIcon, Eye, EyeOff, LayoutTemplate, List, StickyNote, Smartphone, Laptop, CalendarDays, Search, Filter, Wand2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CalendarView from "@/components/admin/planner/CalendarView";
import EventsList from "@/components/admin/planner/EventsList";
import NotesBoard from "@/components/admin/planner/NotesBoard";
import { cn } from "@/lib/utils";

// --- Top Professional CMS Logic ---
interface Banner {
    id: string;
    title: string;
    image_url: string;
    link_url?: string;
    description?: string;
    is_active: boolean;
    priority: number;
    start_date?: string;
    end_date?: string;
    display_location?: string;
}

function BannersTab() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [previewMode, setPreviewMode] = useState<"mobile" | "laptop">("mobile");

    const [formData, setFormData] = useState<Partial<Banner>>({
        title: "",
        image_url: "",
        link_url: "",
        description: "",
        priority: 0,
        is_active: true,
        display_location: "home",
        start_date: "",
        end_date: ""
    });

    useEffect(() => { fetchBanners(); }, []);

    const fetchBanners = async () => {
        setIsLoading(true);
        const { data } = await supabase.from("banners").select("*").order("priority", { ascending: true }).order("created_at", { ascending: false });
        if (data) setBanners(data);
        setIsLoading(false);
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.image_url) {
            toast.error("Title and Image URL are required");
            return;
        }

        const payload = {
            ...formData,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null
        };

        const { error } = editingId
            ? await supabase.from("banners").update(payload).eq("id", editingId)
            : await supabase.from("banners").insert([payload]);

        if (error) { toast.error("Failed to save banner"); }
        else {
            toast.success(editingId ? "Campaign updated" : "Campaign launched");
            setIsDialogOpen(false);
            resetForm();
            fetchBanners();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this campaign?")) return;
        const { error } = await supabase.from("banners").delete().eq("id", id);
        if (error) toast.error("Failed to delete");
        else { toast.success("Campaign deleted"); fetchBanners(); }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ title: "", image_url: "", link_url: "", description: "", priority: 0, is_active: true, display_location: "home", start_date: "", end_date: "" });
    };

    const toggleActive = async (banner: Banner) => {
        setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
        await supabase.from("banners").update({ is_active: !banner.is_active }).eq("id", banner.id);
    };

    // --- Smart Helpers ---
    const applyQuickSchedule = (days: number) => {
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + days);
        const toLocalISO = (d: Date) => {
            const pad = (n: number) => n < 10 ? '0' + n : n;
            return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        };
        setFormData({
            ...formData,
            start_date: toLocalISO(start),
            end_date: toLocalISO(end)
        });
    };

    const generateAICopy = () => {
        const titles = ["Flash Sale!", "Limited Time Offer", "Exclusive Deal", "Don't Miss Out", "Mega Savings"];
        const descs = ["Shop now and save big.", "Best prices of the season.", "Grab your favorites before they're gone.", "Special discount just for you."];
        const randomTitle = titles[Math.floor(Math.random() * titles.length)];
        const randomDesc = descs[Math.floor(Math.random() * descs.length)];
        if (!formData.title) setFormData(prev => ({ ...prev, title: randomTitle }));
        if (!formData.description) setFormData(prev => ({ ...prev, description: randomDesc }));
        toast.success("AI suggestions applied!");
    };

    // --- Filtering ---
    const filteredBanners = banners.filter(b => {
        const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase());
        const isScheduled = b.start_date && new Date(b.start_date) > new Date();
        const isExpired = b.end_date && new Date(b.end_date) < new Date();

        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = b.is_active && !isExpired && !isScheduled;
        if (statusFilter === 'scheduled') matchesStatus = isScheduled;
        if (statusFilter === 'expired') matchesStatus = isExpired;
        if (statusFilter === 'inactive') matchesStatus = !b.is_active;

        return matchesSearch && matchesStatus;
    });

    const activeCount = banners.filter(b => b.is_active).length;
    const scheduledCount = banners.filter(b => b.start_date && new Date(b.start_date) > new Date()).length;

    return (
        <div className="space-y-6 animate-in fade-in h-full flex flex-col pb-20">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card/50 p-4 rounded-xl border border-border/50 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Total Campaigns</p>
                    <p className="text-2xl font-bold">{banners.length}</p>
                </div>
                <div className="bg-card/50 p-4 rounded-xl border border-green-500/20 backdrop-blur-sm">
                    <p className="text-xs text-green-600 font-medium uppercase">Active Now</p>
                    <p className="text-2xl font-bold text-green-700">{activeCount}</p>
                </div>
                <div className="bg-card/50 p-4 rounded-xl border border-blue-500/20 backdrop-blur-sm">
                    <p className="text-xs text-blue-600 font-medium uppercase">Scheduled</p>
                    <p className="text-2xl font-bold text-blue-700">{scheduledCount}</p>
                </div>
                {/* Search & New Button */}
                <div className="bg-card/50 p-3 rounded-xl border border-border/50 backdrop-blur-sm flex flex-col justify-center gap-2">
                    <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <button className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/25 font-bold flex items-center justify-center gap-2 text-sm transition-all hover:scale-[1.02]">
                                <Plus size={16} /> New Campaign
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] w-[1000px] h-[90vh] p-0 overflow-hidden flex flex-col md:flex-row bg-background/95 backdrop-blur-xl border-border/50">
                            {/* Left: Form */}
                            <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 border-r border-border/50 h-full custom-scrollbar">
                                <div>
                                    <DialogTitle className="text-2xl font-bold mb-1">{editingId ? "Edit Campaign" : "New Campaign"}</DialogTitle>
                                    <p className="text-muted-foreground text-sm">Configure your marketing assets and schedule.</p>
                                </div>
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <label className="text-sm font-medium">Campaign Title</label>
                                            <button onClick={generateAICopy} className="text-[10px] flex items-center gap-1 text-purple-500 hover:text-purple-600 font-medium transition-colors">
                                                <Wand2 size={10} /> AI Suggest
                                            </button>
                                        </div>
                                        <input className="flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:ring-2 ring-primary/20 transition-all font-medium" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Flash Sale" autoFocus />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Placement</label>
                                            <select className="flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" value={formData.display_location} onChange={e => setFormData({ ...formData, display_location: e.target.value })}>
                                                <option value="home">Home Screen</option>
                                                <option value="search">Search Page</option>
                                                <option value="profile">Profile Page</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Priority</label>
                                            <input type="number" className="flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" value={formData.priority} onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })} />
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold flex items-center gap-2">
                                                <CalendarDays size={14} className="text-blue-500" />
                                                Schedule
                                            </label>
                                            <div className="flex gap-1">
                                                <button onClick={() => applyQuickSchedule(7)} className="text-[10px] px-2 py-1 bg-background border rounded hover:border-primary transition-colors">7 Days</button>
                                                <button onClick={() => applyQuickSchedule(30)} className="text-[10px] px-2 py-1 bg-background border rounded hover:border-primary transition-colors">30 Days</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Start Date</span>
                                                <input type="datetime-local" className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={formData.start_date || ""} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">End Date</span>
                                                <input type="datetime-local" className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={formData.end_date || ""} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Image URL</label>
                                        <div className="flex gap-2">
                                            <input className="flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm font-mono text-xs" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Link Action (Deep Link)</label>
                                        <input className="flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" value={formData.link_url || ""} onChange={e => setFormData({ ...formData, link_url: e.target.value })} placeholder="app://product/123" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Internal Description</label>
                                        <textarea className="flex w-full rounded-lg border border-input bg-card px-3 py-2 text-sm min-h-[80px]" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Campaign goals..." />
                                    </div>
                                </div>

                                <div className="pt-6 mt-6 border-t flex justify-end gap-3 sticky bottom-0 bg-background py-4">
                                    <button onClick={() => setIsDialogOpen(false)} className="px-6 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
                                    <button onClick={handleSubmit} className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition-transform active:scale-95">
                                        Save Campaign <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Right: Preview */}
                            <div className="w-[400px] hidden md:flex flex-col items-center justify-center bg-muted/20 border-l border-border/50 relative p-8 transition-all duration-500 ease-in-out">
                                <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                                <div className="relative z-10 flex flex-col items-center w-full">
                                    <div className="flex items-center gap-2 mb-6 bg-background/50 p-1 rounded-full border border-border/50 backdrop-blur-md">
                                        <button
                                            onClick={() => setPreviewMode("mobile")}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                                previewMode === "mobile" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Smartphone size={14} /> Mobile
                                        </button>
                                        <button
                                            onClick={() => setPreviewMode("laptop")}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                                previewMode === "laptop" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Laptop size={14} /> Laptop
                                        </button>
                                    </div>

                                    {/* Mobile Mockup */}
                                    {previewMode === "mobile" && (
                                        <div className="animate-in fade-in zoom-in-95 duration-500">
                                            <div className="w-[280px] h-[580px] bg-black rounded-[2.5rem] p-3 shadow-2xl border-4 border-gray-800 relative overflow-hidden ring-1 ring-white/10">
                                                {/* Status Bar Mock */}
                                                <div className="absolute top-0 left-0 right-0 h-6 bg-black/50 z-20 flex justify-between px-6 items-center">
                                                    <div className="text-[8px] text-white font-mono">9:41</div>
                                                    <div className="flex gap-1"><div className="w-3 h-3 bg-white/20 rounded-full"></div></div>
                                                </div>
                                                {/* Screen Content */}
                                                <div className="w-full h-full bg-background rounded-[2rem] overflow-hidden relative flex flex-col">
                                                    <div className="h-14 bg-card border-b flex items-center justify-center">
                                                        <span className="font-bold text-sm">SnackZo</span>
                                                    </div>
                                                    <div className="p-4 space-y-4">
                                                        <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden shadow-lg bg-muted flex items-center justify-center text-muted-foreground text-xs group">
                                                            {formData.image_url ?
                                                                <img src={formData.image_url} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                                                : "No Image"
                                                            }
                                                        </div>
                                                        <div className="h-4 w-2/3 bg-muted rounded animate-pulse"></div>
                                                        <div className="h-20 w-full bg-muted rounded animate-pulse"></div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="h-32 bg-muted rounded animate-pulse"></div>
                                                            <div className="h-32 bg-muted rounded animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Laptop Mockup */}
                                    {previewMode === "laptop" && (
                                        <div className="animate-in fade-in zoom-in-95 duration-500 w-[500px] -ml-[100px] scale-[0.85] origin-top">
                                            <div className="w-full aspect-[16/10] bg-gray-900 rounded-t-xl p-2 pb-0 shadow-2xl border-2 border-gray-700 relative ring-1 ring-white/10 flex flex-col">
                                                {/* Webcam dot */}
                                                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/20 rounded-full"></div>
                                                {/* Screen Content */}
                                                <div className="flex-1 bg-background rounded-t-lg overflow-hidden relative flex flex-col w-full h-full">
                                                    <div className="h-8 bg-card border-b flex items-center justify-between px-4">
                                                        <div className="flex gap-1.5">
                                                            <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                                                            <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                                                            <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                                                        </div>
                                                        <div className="w-40 h-4 bg-muted/50 rounded-md"></div>
                                                        <div className="w-4"></div>
                                                    </div>
                                                    <div className="p-6 space-y-6 flex flex-col items-center">
                                                        <div className="relative w-[80%] aspect-[3/1] rounded-xl overflow-hidden shadow-lg bg-muted flex items-center justify-center text-muted-foreground text-xs group">
                                                            {formData.image_url ?
                                                                <img src={formData.image_url} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                                                : "No Image"
                                                            }
                                                        </div>
                                                        <div className="w-[60%] space-y-2 flex flex-col items-center">
                                                            <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                                                            <div className="h-2 w-full bg-muted rounded animate-pulse"></div>
                                                            <div className="h-2 w-3/4 bg-muted rounded animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Bottom Base */}
                                            <div className="w-[110%] -ml-[5%] h-3 bg-gray-800 rounded-b-xl shadow-lg border-t border-gray-900 relative">
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-700 rounded-b-md"></div>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground mt-8 text-center max-w-[200px]">
                                        This is a simulation of the {previewMode} view for the {formData.display_location === 'home' ? 'Home' : formData.display_location} screen.
                                    </p>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-card/50 p-2 rounded-xl border border-border/50">
                <div className="relative flex-1 w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-background/50 border border-transparent focus:border-border transition-all text-sm outline-none"
                        placeholder="Search campaigns..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-1 w-full md:w-auto overflow-x-auto">
                    {['all', 'active', 'scheduled', 'expired'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap",
                                statusFilter === status ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-20">
                {filteredBanners.map(banner => {
                    const isScheduled = banner.start_date && new Date(banner.start_date) > new Date();
                    const isExpired = banner.end_date && new Date(banner.end_date) < new Date();
                    return (
                        <div key={banner.id} className={`glass-card overflow-hidden group relative rounded-2xl border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${!banner.is_active || isExpired ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                            <div className="relative h-48 w-full bg-black/5">
                                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80" />

                                {/* Badges */}
                                <div className="absolute top-3 inset-x-3 flex justify-between items-start">
                                    <span className={cn(
                                        "backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-wider shadow-sm",
                                        banner.display_location === 'home' ? 'bg-blue-500/80' : 'bg-purple-500/80'
                                    )}>{banner.display_location || 'Home'}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditingId(banner.id); setFormData(banner); setIsDialogOpen(true); }} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"><Edit size={14} /></button>
                                        <button onClick={() => handleDelete(banner.id)} className="p-2 bg-red-500/20 backdrop-blur-md rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <div className="absolute bottom-4 left-4 right-4">
                                    <h3 className="font-bold text-lg text-white truncate">{banner.title}</h3>
                                    {isScheduled && <p className="text-xs text-blue-300 font-medium flex items-center gap-1 mt-0.5"><Clock size={12} /> Starts {new Date(banner.start_date!).toLocaleDateString()}</p>}
                                    {isExpired && <p className="text-xs text-red-300 font-medium flex items-center gap-1 mt-0.5"><Calendar size={12} /> Ended {new Date(banner.end_date!).toLocaleDateString()}</p>}
                                </div>
                            </div>
                            <div className="p-4 bg-card flex justify-between items-center border-t border-border/50">
                                <div className="flex flex-col">
                                    {banner.priority !== 0 && (
                                        <>
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase">Priority</span>
                                            <span className="font-mono text-sm">{banner.priority}</span>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={() => toggleActive(banner)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border",
                                        banner.is_active && !isExpired ? "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20" : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                                    )}
                                >
                                    {banner.is_active && !isExpired ? <><Eye size={12} /> Live</> : <><EyeOff size={12} /> Inactive</>}
                                </button>
                            </div>
                        </div>
                    )
                })}

                {filteredBanners.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed border-muted rounded-3xl flex flex-col items-center justify-center bg-muted/5">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">No campaigns found</p>
                        <p className="text-sm opacity-60">Try adjusting your search or filters</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Main Planner Wrapper ---

export default function MarketingPlanner() {
    const [activeTab, setActiveTab] = useState("calendar");

    return (
        <div className="space-y-6 animate-in fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Marketing Planner</h2>
                    <p className="text-muted-foreground mt-1">Orchestrate your campaigns and events</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <TabsList className="w-full justify-start h-auto p-1.5 bg-card/60 rounded-2xl shadow-sm border border-border/50 backdrop-blur-sm self-start inline-flex overflow-x-auto">
                    <TabsTrigger value="calendar" className="flex items-center gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                        <Calendar size={18} />
                        Calendar
                    </TabsTrigger>
                    <TabsTrigger value="events" className="flex items-center gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                        <List size={18} />
                        Events
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="flex items-center gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                        <StickyNote size={18} />
                        Notes
                    </TabsTrigger>
                    <TabsTrigger value="banners" className="flex items-center gap-2 px-6 py-2.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                        <LayoutTemplate size={18} />
                        Banners
                    </TabsTrigger>
                </TabsList>

                <div className="min-h-[500px]">
                    <TabsContent value="calendar" className="m-0 focus-visible:ring-0">
                        <CalendarView />
                    </TabsContent>

                    <TabsContent value="events" className="m-0 focus-visible:ring-0">
                        <EventsList />
                    </TabsContent>

                    <TabsContent value="notes" className="m-0 focus-visible:ring-0">
                        <NotesBoard />
                    </TabsContent>

                    <TabsContent value="banners" className="m-0 focus-visible:ring-0">
                        <BannersTab />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
