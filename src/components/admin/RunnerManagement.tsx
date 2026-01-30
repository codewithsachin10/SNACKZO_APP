import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Truck, Phone, RefreshCw, UserCheck, UserX, Trash2, MessageSquare,
  MessageCircle, MapPin, Battery, Signal, Clock, ChevronRight,
  TrendingUp, DollarSign, ShieldAlert, Award, Search, Filter,
  Calendar, Megaphone, Inbox, ArrowRightLeft, GripVertical, Camera
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

// Fix for Leaflet icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Runner {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  notification_preference: string | null;
  created_at: string;
  avatar_url?: string; // Added avatar_url property
  location?: { lat: number; lng: number };
  battery?: number;
  total_deliveries?: number;
  earnings?: number;
  rating?: number;
  status_msg?: string;
  shift_start?: string;
  shift_end?: string;
}

const RunnerManagement = () => {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [selectedRunner, setSelectedRunner] = useState<Runner | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Mock Data Generators
  const generateMockData = (baseRunners: any[]) => {
    return baseRunners.map((r, i) => ({
      ...r,
      location: {
        lat: 12.9716 + (Math.random() * 0.01 - 0.005),
        lng: 77.5946 + (Math.random() * 0.01 - 0.005)
      },
      battery: Math.floor(Math.random() * 60) + 40,
      total_deliveries: Math.floor(Math.random() * 500) + 50,
      earnings: Math.floor(Math.random() * 15000) + 2000,
      rating: (4 + Math.random()).toFixed(1),
      status_msg: r.is_active ? (Math.random() > 0.5 ? "Delivering #1024" : "Idle - Waiting") : "Offline",
      shift_start: "09:00 AM",
      shift_end: "05:00 PM"
    }));
  };

  useEffect(() => {
    fetchRunners();
  }, []);

  const fetchRunners = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("runners")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch runners");
    } else {
      setRunners(generateMockData(data || []));
    }
    setIsLoading(false);
  };

  const toggleRunnerStatus = async (runnerId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("runners")
      .update({ is_active: !currentStatus })
      .eq("id", runnerId);

    if (error) toast.error("Update failed");
    else {
      toast.success(currentStatus ? "Runner Deactivated" : "Runner Activated");
      fetchRunners();
    }
  };

  const deleteRunner = async (id: string) => {
    if (!confirm("Permantently delete runner?")) return;
    const { error } = await supabase.from('runners').delete().eq('id', id);
    if (error) toast.error("Delete failed");
    else { toast.success("Runner deleted"); fetchRunners(); }
  }

  const sendBroadcast = () => {
    if (!broadcastMsg) return;
    toast.success(`Message sent to ${runners.length} runners`, { description: "Push notification delivered." });
    setBroadcastMsg("");
  }

  // --- Statistics ---
  const activeCount = runners.filter(r => r.is_active).length;
  const totalEarnings = runners.reduce((acc, curr) => acc + (curr.earnings || 0), 0);

  const activityData = [
    { time: '09:00', active: 2 }, { time: '11:00', active: 5 },
    { time: '13:00', active: 8 }, { time: '15:00', active: 6 },
    { time: '17:00', active: 10 }, { time: '19:00', active: 12 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={Truck} label="Fleet Size" value={runners.length} sub="Active Runners" subValue={activeCount} color="text-blue-500" />
        <StatsCard icon={ZapIcon} label="Total Orders" value="1,248" sub="Today" subValue="+34" color="text-yellow-500" />
        <StatsCard icon={DollarSign} label="Fleet Earnings" value={`₹${(totalEarnings / 1000).toFixed(1)}k`} sub="Avg/Runner" subValue="₹3.2k" color="text-green-500" />
        <StatsCard icon={ShieldAlert} label="Issues" value="2" sub="Requires Attention" subValue="High Priority" color="text-red-500" />
      </div>

      <Tabs defaultValue="list" className="w-full" onValueChange={setViewMode}>
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="list" className="px-4">Fleet List</TabsTrigger>
            <TabsTrigger value="map" className="px-4">Live Map</TabsTrigger>
            <TabsTrigger value="dispatch" className="px-4">Dispatch</TabsTrigger>
            <TabsTrigger value="shifts" className="px-4">Schedule</TabsTrigger>
            <TabsTrigger value="analytics" className="px-4">Performance</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors">
                  <Megaphone size={16} /> Broadcast
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Emergency Broadcast</DialogTitle></DialogHeader>
                <Textarea
                  placeholder="Type message to all runners (e.g. 'Heavy rain alert, drive safely')..."
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  className="min-h-[100px]"
                />
                <DialogFooter>
                  <button onClick={sendBroadcast} className="px-4 py-2 bg-red-500 text-white rounded-lg">Send Alert</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <button onClick={fetchRunners} className="p-2 hover:bg-muted rounded-full transition-colors"><RefreshCw size={18} /></button>
          </div>
        </div>

        {/* --- List View --- */}
        <TabsContent value="list" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {runners.map(runner => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={runner.id}
                onClick={() => setSelectedRunner(runner)}
                className={`group relative overflow-hidden rounded-2xl border bg-card/50 p-4 transition-all hover:shadow-lg cursor-pointer ${runner.is_active ? 'border-primary/20' : 'border-destructive/20 opacity-80'}`}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${runner.name}`} />
                      <AvatarFallback>{runner.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg leading-none">{runner.name}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        <Badge variant={runner.is_active ? "default" : "destructive"} className="px-1.5 py-0 h-5 text-[10px] uppercase tracking-wider">
                          {runner.is_active ? "Online" : "Offline"}
                        </Badge>
                        <span className="text-xs">• {runner.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">ID: {runner.id.substring(0, 4)}</span>
                    {runner.is_active && (
                      <div className="flex items-center gap-1 text-[10px] text-green-500 mt-1 font-bold animate-pulse">
                        <Signal size={10} /> GPS LIVE
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-muted/30 p-2 rounded-lg text-center">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Award size={10} /> Rating</div>
                    <div className="font-bold text-sm">{runner.rating} ★</div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg text-center">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Truck size={10} /> Trips</div>
                    <div className="font-bold text-sm">{runner.total_deliveries}</div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg text-center">
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Battery size={10} /> Batt</div>
                    <div className={`font-bold text-sm ${runner.battery && runner.battery < 20 ? 'text-red-500' : 'text-green-500'}`}>{runner.battery}%</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 p-2 rounded-lg">
                  <span>Status: <span className="text-foreground font-medium">{runner.status_msg}</span></span>
                  <span>{new Date(runner.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* --- Map View --- */}
        <TabsContent value="map" className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-inner h-[600px] relative">
          <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '100%', width: '100%' }} className="z-0">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            {runners.filter(r => r.is_active).map(runner => (
              <Marker key={runner.id} position={[runner.location!.lat, runner.location!.lng]}>
                <Popup>
                  <div className="p-2 min-w-[150px]">
                    <h4 className="font-bold">{runner.name}</h4>
                    <p className="text-xs text-muted-foreground">{runner.status_msg}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
            {showHeatmap && (
              <Circle center={[12.9716, 77.5946]} radius={1500} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }} />
            )}
          </MapContainer>

          <div className="absolute top-4 right-4 bg-background/90 backdrop-blur p-4 rounded-xl border border-border shadow-lg z-[1000] w-64 space-y-4">
            <div>
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Signal size={14} className="text-green-500 animate-pulse" /> Live Tracking</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span>Active Fleet</span><span className="font-mono">{activeCount}/{runners.length}</span></div>
                <Progress value={(activeCount / runners.length) * 100} className="h-1.5" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="heatmap" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} className="rounded border-gray-600" />
              <label htmlFor="heatmap" className="text-xs font-medium cursor-pointer">Show Demand Heatmap</label>
            </div>
          </div>
        </TabsContent>

        {/* --- Dispatch Console --- */}
        <TabsContent value="dispatch" className="min-h-[600px] flex flex-col lg:flex-row gap-6">
          {/* Unassigned Orders */}
          <div className="flex-1 bg-card/50 border border-border/50 rounded-2xl p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2"><Inbox size={18} /> Unassigned Orders</h3>
              <Badge variant="secondary">3 Pending</Badge>
            </div>
            <div className="space-y-3 flex-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-background p-3 rounded-xl border border-border shadow-sm flex items-center justify-between group hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-sm"><span>Order #482{i}</span> <Badge className="text-[10px] h-5 px-1 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20">High Priority</Badge></div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2"><MapPin size={10} /> 2.4km • ₹142</div>
                  </div>
                  <button className="p-2 bg-muted hover:bg-primary/20 hover:text-primary rounded-lg transition-colors"><ChevronRight size={16} /></button>
                </div>
              ))}
              <div className="border-2 border-dashed border-muted rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-2"><Inbox size={24} /></div>
                <p className="text-sm">Waiting for new orders...</p>
              </div>
            </div>
          </div>

          {/* Available Runners */}
          <div className="flex-1 bg-card/50 border border-border/50 rounded-2xl p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2"><Truck size={18} /> Available Fleet</h3>
              <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/5">{activeCount} Online</Badge>
            </div>
            <div className="space-y-3 flex-1">
              {runners.filter(r => r.is_active).map(r => (
                <div key={r.id} className="bg-background p-3 rounded-xl border border-border shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8"><AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.name}`} /></Avatar>
                    <div>
                      <div className="font-bold text-sm">{r.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1 text-green-500"><Battery size={10} /> {r.battery}%</span>
                        <span>• Idle</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => toast.success(`Assigned mock order to ${r.name}`)} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-medium hover:bg-primary/20 transition-colors">Assign</button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* --- Shift Scheduler --- */}
        <TabsContent value="shifts" className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2"><Calendar size={18} /> Shift Schedule</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs bg-card border rounded-lg">Today</button>
                <button className="px-3 py-1 text-xs bg-muted text-muted-foreground border rounded-lg">Tomorrow</button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Time Labels */}
              <div className="flex text-xs text-muted-foreground pl-32">
                {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"].map(t => (
                  <div key={t} className="flex-1 text-center border-l border-border/30 h-4">{t}</div>
                ))}
              </div>

              {/* Runners Rows */}
              {runners.slice(0, 5).map((r, i) => (
                <div key={r.id} className="flex items-center gap-4 group">
                  <div className="w-28 flex items-center gap-2">
                    <Avatar className="w-8 h-8"><AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.name}`} /></Avatar>
                    <div className="truncate text-sm font-medium">{r.name}</div>
                  </div>
                  <div className="flex-1 h-8 bg-muted/20 rounded-lg relative overflow-hidden">
                    {/* Mock Shift Bars */}
                    <div
                      className={`absolute top-1 bottom-1 rounded-md opacity-80 ${i % 2 === 0 ? 'left-[10%] w-[60%] bg-blue-500/20 border border-blue-500/50' : 'left-[30%] w-[50%] bg-purple-500/20 border border-purple-500/50'}`}
                    >
                      <div className="text-[10px] font-medium px-2 py-0.5 text-foreground/80 h-full flex items-center">Regular Shift</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* --- Analytics View --- */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={18} /> Activity Timeline</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#333' }} />
                    <Line type="monotone" dataKey="active" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6" }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2"><DollarSign size={18} /> Top Earners</h3>
              <div className="space-y-4">
                {runners.slice(0, 5).sort((a, b) => (b.earnings || 0) - (a.earnings || 0)).map((r, i) => (
                  <div key={r.id} className="flex items-center gap-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted text-muted-foreground'}`}>#{i + 1}</span>
                    <Avatar className="w-8 h-8"><AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${r.name}`} /></Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span>{r.name}</span>
                        <span>₹{r.earnings}</span>
                      </div>
                      <Progress value={(r.earnings! / 15000) * 100} className="h-1.5 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
        {/* Runner Details Modal/Sheet */}
        {selectedRunner && (
          <Dialog open={!!selectedRunner} onOpenChange={() => setSelectedRunner(null)}>
            <DialogContent className="max-w-xl">
              <div className="flex gap-6">
                <div className="flex flex-col gap-3">
                  <div className="relative group w-24 mx-auto">
                    <Avatar className="w-24 h-24 rounded-2xl border-4 border-background shadow-xl">
                      <AvatarImage src={selectedRunner.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedRunner.name}`} className="object-cover" />
                      <AvatarFallback>{selectedRunner.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer backdrop-blur-sm">
                      <span className="text-xs font-bold flex flex-col items-center gap-1">
                        <Camera size={20} /> Upload
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const toastId = toast.loading("Uploading avatar...");
                          const fileName = `runners/${selectedRunner.id}/${Date.now()}_avatar`;

                          // 1. Upload to Supabase Storage
                          const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('public-assets')
                            .upload(fileName, file, { upsert: true });

                          if (uploadError) {
                            toast.dismiss(toastId);
                            toast.error("Upload failed");
                            return;
                          }

                          // 2. Get Public URL
                          const { data: { publicUrl } } = supabase.storage
                            .from('public-assets')
                            .getPublicUrl(fileName);

                          // 3. Update Runner Profile in DB
                          const { error: dbError } = await supabase
                            .from('runners')
                            .update({ avatar_url: publicUrl })
                            .eq('id', selectedRunner.id);

                          toast.dismiss(toastId);

                          if (dbError) {
                            console.error(dbError);
                            if (dbError.code === 'PGRST204') {
                              toast.warning("Saved locally. (DB Schema needs update)", {
                                description: "Run: ALTER TABLE runners ADD COLUMN avatar_url TEXT;",
                                duration: 5000
                              });
                            } else {
                              toast.error("Saved locally (DB Error)");
                            }
                            // Update local state regardless
                            setSelectedRunner({ ...selectedRunner, avatar_url: publicUrl });
                            setRunners(prev => prev.map(r => r.id === selectedRunner.id ? { ...r, avatar_url: publicUrl } : r));
                          } else {
                            toast.success("Profile updated!");
                            setSelectedRunner({ ...selectedRunner, avatar_url: publicUrl });
                            setRunners(prev => prev.map(r => r.id === selectedRunner.id ? { ...r, avatar_url: publicUrl } : r));
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Predefined Avatars */}
                  <div className="grid grid-cols-4 gap-1 w-full max-w-[120px] mx-auto">
                    {["Felix", "Aneka", "Zoe", "Jack", "Molly", "Sam", "Bear", "Leo"].map(seed => (
                      <div
                        key={seed}
                        onClick={async () => {
                          const newUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

                          // Optimistic Update
                          setSelectedRunner({ ...selectedRunner, avatar_url: newUrl });
                          setRunners(prev => prev.map(r => r.id === selectedRunner.id ? { ...r, avatar_url: newUrl } : r));

                          // Persist to DB
                          const { error } = await supabase
                            .from('runners')
                            .update({ avatar_url: newUrl })
                            .eq('id', selectedRunner.id);

                          if (error) {
                            console.error("Failed to save avatar", error);
                            if (error.code === 'PGRST204') {
                              toast.warning("Saved locally. (DB Schema needs update)", {
                                description: "Run: ALTER TABLE runners ADD COLUMN avatar_url TEXT;",
                                duration: 5000
                              });
                            } else {
                              toast.error("Could not save to DB (Local only)");
                            }
                          } else {
                            toast.success("Avatar saved");
                          }
                        }}
                        className="w-6 h-6 rounded-full overflow-hidden border border-border cursor-pointer hover:scale-125 transition-transform bg-muted"
                        title={seed}
                      >
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={seed} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedRunner.name}</h2>
                      <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone size={14} /> {selectedRunner.phone}</p>
                    </div>
                    <Badge variant={selectedRunner.is_active ? "default" : "destructive"}>{selectedRunner.is_active ? "Active" : "Offline"}</Badge>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button onClick={() => toggleRunnerStatus(selectedRunner.id, selectedRunner.is_active)} className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded-lg font-medium hover:bg-secondary/80">
                      {selectedRunner.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => deleteRunner(selectedRunner.id)} className="px-3 py-1 bg-destructive/10 text-destructive text-xs rounded-lg font-medium hover:bg-destructive/20">
                      Delete Profile
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-muted/30 p-4 rounded-xl">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">Performance</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total Delivers</span> <b>{selectedRunner.total_deliveries}</b></div>
                    <div className="flex justify-between"><span>Avg Rating</span> <b>{selectedRunner.rating} / 5.0</b></div>
                    <div className="flex justify-between"><span>Reliability</span> <b className="text-green-500">98%</b></div>
                  </div>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-2">Current Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Battery</span> <b>{selectedRunner.battery}%</b></div>
                    <div className="flex justify-between"><span>Location</span> <b>Bangalore, IN</b></div>
                    <div className="flex justify-between"><span>Current Task</span> <b className="truncate max-w-[100px]">{selectedRunner.status_msg}</b></div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </Tabs>
    </div>
  );
};

// Sub-Component: Stat Card
function StatsCard({ icon: Icon, label, value, sub, subValue, color }: any) {
  return (
    <div className="bg-card border border-border/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
        <Icon size={64} />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-muted ${color.replace('text-', 'bg-')}/10 ${color}`}>
          <Icon size={20} />
        </div>
        <span className="text-muted-foreground text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight mb-1">{value}</div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{sub}</span>
        <span className={`font-bold ${color}`}>{subValue}</span>
      </div>
    </div>
  )
}

function ZapIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export default RunnerManagement;
