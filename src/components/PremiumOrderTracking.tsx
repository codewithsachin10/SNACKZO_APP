import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MapPin,
  Phone,
  MessageCircle,
  Navigation2,
  Clock,
  Package,
  CheckCircle,
  Truck,
  Home,
  AlertTriangle,
  Camera,
  DollarSign,
  Share2,
  Star,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  Bike,
  User,
  ShieldCheck,
  X,
  Send,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  MapPinned,
  Route,
  Timer,
  Zap,
  Gift,
  Bell,
  Settings,
  CloudRain,
  Sun,
  Cloud,
  Wind
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ============================================
// TYPES
// ============================================

interface Order {
  id: string;
  status: "placed" | "preparing" | "packed" | "out_for_delivery" | "nearby" | "delivered" | "cancelled";
  payment_method: string;
  delivery_mode: string;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  created_at: string;
  runner_id: string | null;
  delivery_otp?: string;
  scheduled_for?: string;
  is_contactless?: boolean;
  delivery_instructions?: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  product_id: string;
  image_url?: string;
}

interface Runner {
  id: string;
  name: string;
  phone: string;
  photo_url?: string;
  average_rating?: number;
  total_ratings?: number;
  total_deliveries?: number;
  vehicle_type?: string;
  vehicle_number?: string;
}

interface RunnerLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updated_at: string;
}

interface StatusUpdate {
  status: string;
  timestamp: string;
  message?: string;
}

interface DeliveryProof {
  photo_url: string;
  signature_url?: string;
  received_by?: string;
  timestamp: string;
}

// ============================================
// STATUS TIMELINE COMPONENT
// ============================================

const statusSteps = [
  { key: "placed", label: "Order Placed", icon: Package, color: "bg-blue-500" },
  { key: "preparing", label: "Preparing", icon: Zap, color: "bg-yellow-500" },
  { key: "packed", label: "Packed", icon: CheckCircle, color: "bg-orange-500" },
  { key: "out_for_delivery", label: "On the Way", icon: Truck, color: "bg-purple-500" },
  { key: "nearby", label: "Nearby", icon: MapPin, color: "bg-cyan-500" },
  { key: "delivered", label: "Delivered", icon: Home, color: "bg-green-500" },
];

interface StatusTimelineProps {
  currentStatus: string;
  statusHistory: StatusUpdate[];
  estimatedDelivery?: string;
}

export function StatusTimeline({ currentStatus, statusHistory, estimatedDelivery }: StatusTimelineProps) {
  const currentIndex = statusSteps.findIndex(s => s.key === currentStatus);

  return (
    <div className="glass-card bg-black/40 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
      {/* Header with ETA */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-lime rounded-full animate-pulse shadow-[0_0_15px_rgba(163,230,53,0.5)]" />
          <span className="font-bold uppercase tracking-wider text-[10px] text-white">Live Tracking System</span>
        </div>
        {estimatedDelivery && currentStatus !== "delivered" && (
          <div className="flex items-center gap-2 bg-lime text-black px-4 py-1.5 rounded-full shadow-lg shadow-lime/20">
            <Clock size={14} className="stroke-[3]" />
            <span className="text-[10px] font-black uppercase tracking-widest">Arrival at {estimatedDelivery}</span>
          </div>
        )}
      </div>

      {/* Horizontal Timeline */}
      <div className="p-8 overflow-x-auto scrollbar-none">
        <div className="relative min-w-[600px] py-4">
          {/* Progress Track */}
          <div className="absolute top-10 left-10 right-10 h-[2px] bg-white/10 rounded-full">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-lime to-accent rounded-full shadow-[0_0_20px_rgba(163,230,53,0.4)]"
              initial={{ width: 0 }}
              animate={{ width: `${(currentIndex / (statusSteps.length - 1)) * 100}%` }}
              transition={{ duration: 1.5, ease: "circOut" }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between h-20">
            {statusSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentIndex;
              const isCurrent = index === currentIndex;
              const historyItem = statusHistory.find(h => h.status === step.key);

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center z-10"
                  style={{ width: `${100 / statusSteps.length}%` }}
                >
                  {/* Icon Circle */}
                  <div className="relative group">
                    <motion.div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
                        isActive
                          ? "bg-white text-black border-white shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                          : "bg-black/40 border-white/10 text-muted-foreground",
                        isCurrent && "scale-125 bg-lime text-black border-lime shadow-[0_0_30px_rgba(163,230,53,0.4)]"
                      )}
                    >
                      <Icon size={20} className={cn("transition-all", isCurrent ? "stroke-[2.5]" : "stroke-2")} />
                    </motion.div>

                    {isCurrent && (
                      <motion.div
                        className="absolute -inset-2 rounded-3xl border border-lime/30"
                        animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="mt-6 text-center">
                    <p className={cn(
                      "text-[9px] font-bold uppercase tracking-wider transition-colors duration-300",
                      isCurrent ? "text-lime" : isActive ? "text-white" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </p>
                    {historyItem && (
                      <p className="text-[8px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-1 opacity-80">
                        {format(new Date(historyItem.timestamp), "h:mm a")}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LIVE MAP COMPONENT
// ============================================

interface LiveMapProps {
  runnerLocation: RunnerLocation | null;
  deliveryAddress: string;
  storeLocation?: { lat: number; lng: number };
  isLoading?: boolean;
}

export function LiveMap({ runnerLocation, deliveryAddress, storeLocation, isLoading }: LiveMapProps) {
  const [showFullMap, setShowFullMap] = useState(false);

  if (isLoading) {
    return (
      <div className="glass-card bg-black/40 border border-white/5 h-64 flex items-center justify-center rounded-[2rem]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scanning Location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card bg-black/40 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl group">
      {/* Map Header */}
      <div className="flex items-center justify-between p-5 bg-white/5 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPinned size={18} className="text-primary" />
          </div>
          <span className="font-bold uppercase text-[10px] tracking-wider">Live Tracking</span>
        </div>
        <button
          onClick={() => setShowFullMap(!showFullMap)}
          className="text-[9px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
        >
          {showFullMap ? "Minimize" : "Expand Radar"}
        </button>
      </div>

      {/* Map View */}
      <div className={cn(
        "relative bg-[#0a0a0b] transition-all duration-700 ease-in-out",
        showFullMap ? "h-[500px]" : "h-64"
      )}>
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: `40px 40px`
          }}
        />

        {/* Decorative Scanner Line */}
        <motion.div
          className="absolute inset-x-0 h-[100px] bg-gradient-to-b from-primary/20 to-transparent pointer-events-none z-10"
          animate={{ top: ['-100px', '100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        {/* Simulated Topography */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 100 100">
          <path d="M0 20 Q 25 25 50 20 T 100 20" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0 40 Q 25 45 50 40 T 100 40" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0 60 Q 25 65 50 60 T 100 60" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0 80 Q 25 85 50 80 T 100 80" fill="none" stroke="white" strokeWidth="0.5" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.5" />
        </svg>

        {/* Store Marker */}
        {storeLocation && (
          <div className="absolute left-1/4 top-1/3 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full" />
              <div className="relative bg-primary p-2.5 rounded-2xl shadow-xl shadow-primary/20">
                <Package size={20} className="text-white" />
              </div>
              <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border border-white/10">SNACKZO HQ</div>
            </div>
          </div>
        )}

        {/* Runner Marker */}
        <motion.div
          className="absolute z-20"
          animate={{
            left: `${50 + Math.sin(Date.now() / 2000) * 15}%`,
            top: `${50 + Math.cos(Date.now() / 2000) * 8}%`,
          }}
        >
          <div className="relative">
            <div className="absolute -inset-8 bg-lime/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative bg-lime p-3 rounded-2xl shadow-[0_0_30px_rgba(163,230,53,0.4)] flex items-center justify-center">
              <Bike size={24} className="text-black" />
            </div>

            {/* Direction Beam */}
            <motion.div
              className="absolute -top-12 left-1/2 -translate-x-1/2"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Navigation2 size={24} className="text-lime fill-lime" />
            </motion.div>
          </div>
        </motion.div>

        {/* Destination Marker */}
        <div className="absolute right-1/4 bottom-1/3 transform translate-x-1/2 translate-y-1/2">
          <div className="relative">
            <div className="absolute -inset-4 bg-accent/20 blur-xl rounded-full" />
            <div className="relative bg-accent p-2.5 rounded-2xl shadow-xl shadow-accent/20 text-black">
              <Home size={20} />
            </div>
            <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border border-white/10">YOUR BASE</div>
          </div>
        </div>

        {/* Route Visualization */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <motion.path
            d="M 25% 33% Q 50% 50% 75% 67%"
            fill="none"
            stroke="hsl(var(--lime))"
            strokeWidth="3"
            strokeDasharray="8 6"
            animate={{ strokeDashoffset: [100, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
        </svg>

        {/* Telemetry Overlay */}
        <div className="absolute bottom-4 left-4 flex gap-2">
          <div className="glass-card bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
            <Route size={14} className="text-lime" />
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Range</span>
              <span className="text-[10px] font-black italic">1.2 KM</span>
            </div>
          </div>
          <div className="glass-card bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
            <Timer size={14} className="text-lime" />
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Time</span>
              <span className="text-[10px] font-black italic">~5 MINS</span>
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4 glass-card bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
          <span className="text-[8px] font-black uppercase tracking-widest">Live Feed Stabilized</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// RUNNER INFO CARD
// ============================================

interface RunnerCardProps {
  runner: Runner;
  onCall: () => void;
  onChat: () => void;
  onTip?: () => void;
  isDelivered?: boolean;
}

export function RunnerCard({ runner, onCall, onChat, onTip, isDelivered }: RunnerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      className="glass-card bg-black/40 border border-white/10 rounded-[2.5rem] p-6 overflow-hidden shadow-2xl"
    >
      <div className="flex items-center gap-6">
        {/* Runner Photo */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 overflow-hidden shadow-xl group">
            {runner.photo_url ? (
              <img src={runner.photo_url} alt={runner.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-accent">
                <User size={32} className="text-black" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-lime w-6 h-6 rounded-full border-[3px] border-black flex items-center justify-center">
            <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
          </div>
        </div>

        {/* Runner Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-black italic uppercase tracking-tighter text-xl text-white truncate">{runner.name}</h4>
            <div className="p-1 rounded-full bg-primary/20">
              <ShieldCheck size={14} className="text-primary" />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest opacity-60">
            <div className="flex items-center gap-1.5 text-lime">
              <Star size={12} className="fill-lime" />
              <span>{runner.average_rating?.toFixed(1) || "4.9"}</span>
            </div>
            <span>{runner.total_deliveries || 120} Trips</span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] uppercase font-black tracking-widest px-3">{runner.vehicle_type || "BIKE"} • {runner.vehicle_number || "TN-01-X-1234"}</Badge>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-5">
        <motion.button
          onClick={onCall}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-green-500/25"
        >
          <Phone size={18} />
          Call
        </motion.button>
        <motion.button
          onClick={onChat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-500/25"
        >
          <MessageCircle size={18} />
          Chat
        </motion.button>
        {!isDelivered && onTip && (
          <motion.button
            onClick={onTip}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black py-3 px-4 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/25"
          >
            <DollarSign size={18} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// DELIVERY INSTRUCTIONS PANEL
// ============================================

interface DeliveryInstructionsProps {
  instructions: string;
  isContactless: boolean;
  onUpdateInstructions: (instructions: string) => void;
  onToggleContactless: (value: boolean) => void;
  canEdit: boolean;
}

export function DeliveryInstructions({
  instructions,
  isContactless,
  onUpdateInstructions,
  onToggleContactless,
  canEdit
}: DeliveryInstructionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedInstructions, setEditedInstructions] = useState(instructions);
  const [showSafeDropRequest, setShowSafeDropRequest] = useState(false);

  const quickInstructions = [
    { label: "Leave at door", icon: "🚪" },
    { label: "Ring doorbell", icon: "🔔" },
    { label: "Call on arrival", icon: "📞" },
    { label: "Don't ring bell", icon: "🤫" },
    { label: "Hand to me", icon: "🤝" }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-border/50 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Package size={18} className="text-primary" />
            </div>
            <h4 className="font-bold">Delivery Instructions</h4>
          </div>
          {canEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Quick Options */}
              <div className="flex flex-wrap gap-2">
                {quickInstructions.map(option => (
                  <motion.button
                    key={option.label}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setEditedInstructions(option.label)}
                    className={cn(
                      "text-xs px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5",
                      editedInstructions === option.label
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-border/50 hover:border-primary/50"
                    )}
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </motion.button>
                ))}
              </div>

              <textarea
                value={editedInstructions}
                onChange={(e) => setEditedInstructions(e.target.value)}
                placeholder="Add specific instructions..."
                className="w-full p-4 rounded-xl border border-border/50 bg-muted/30 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />

              <motion.button
                onClick={() => {
                  onUpdateInstructions(editedInstructions);
                  setIsEditing(false);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-primary to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-primary/25"
              >
                Save Instructions
              </motion.button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/30">
                {instructions || "No special instructions"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contactless Toggle */}
        <div className="flex items-center justify-between mt-5 pt-5 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl transition-colors",
              isContactless ? "bg-green-500/20" : "bg-muted/50"
            )}>
              <ShieldCheck size={18} className={isContactless ? "text-green-500" : "text-muted-foreground"} />
            </div>
            <div>
              <span className="text-sm font-bold block">Contactless Delivery</span>
              <span className="text-xs text-muted-foreground">Leave order at door</span>
            </div>
          </div>
          <button
            onClick={() => onToggleContactless(!isContactless)}
            disabled={!canEdit}
            className={cn(
              "w-14 h-8 rounded-full transition-all relative",
              isContactless
                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                : "bg-muted border border-border/50",
              !canEdit && "opacity-50"
            )}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg"
              animate={{ left: isContactless ? "calc(100% - 28px)" : "4px" }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Safe Drop Photo Request */}
        <button
          onClick={() => setShowSafeDropRequest(!showSafeDropRequest)}
          className="w-full mt-4 flex items-center justify-between text-sm p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors border border-border/30"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Camera size={16} className="text-blue-500" />
            </div>
            <span className="font-medium">Request delivery photo proof</span>
          </div>
          <motion.div
            animate={{ rotate: showSafeDropRequest ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showSafeDropRequest && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 mt-3 rounded-xl border border-blue-500/20">
                <p className="text-sm text-muted-foreground">
                  The runner will take a photo when leaving your order as proof of delivery.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 px-4 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/25"
                >
                  Enable Photo Proof
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================
// ORDER DETAILS PANEL
// ============================================

interface OrderDetailsPanelProps {
  order: Order;
  items: OrderItem[];
  onReorder: () => void;
}

export function OrderDetailsPanel({ order, items, onReorder }: OrderDetailsPanelProps) {
  const [showItems, setShowItems] = useState(true);

  const copyOTP = () => {
    if (order.delivery_otp) {
      navigator.clipboard.writeText(order.delivery_otp);
      toast.success("OTP copied!");
    }
  };

  return (
    <div className="glass-card bg-black/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
      {/* OTP Section - For out_for_delivery status */}
      {order.delivery_otp && order.status === "out_for_delivery" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-500 animate-pulse opacity-90" />
          <div className="relative p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-black/70">Delivery OTP</p>
              <p className="text-3xl font-mono font-black tracking-[0.3em] text-black">{order.delivery_otp}</p>
            </div>
            <button onClick={copyOTP} className="p-3 bg-black/20 rounded-xl hover:bg-black/30 transition-colors">
              <Copy size={20} className="text-black" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Items Toggle Header */}
      <button
        onClick={() => setShowItems(!showItems)}
        className="w-full p-6 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-all border-b border-white/5"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Package size={20} />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-black uppercase italic tracking-tighter text-white leading-none">Order Basket</h4>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{items.length} Securely Packed Items</p>
          </div>
        </div>
        <motion.div animate={{ rotate: showItems ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown size={20} className="text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {showItems && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto scrollbar-none bg-black/20">
              {items.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 overflow-hidden shrink-0 group-hover:border-primary/30 transition-colors">
                    <img src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"} alt={item.product_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate uppercase tracking-tighter">{item.product_name}</p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Qty: {item.quantity} • Paid ₹{item.price}</p>
                  </div>
                  <p className="font-black text-sm text-lime">₹{item.price * item.quantity}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bill Summary */}
      <div className="p-8 border-t border-white/5 space-y-4 bg-white/5 backdrop-blur-md">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <span>Subtotal</span>
          <span className="text-white">₹{order.subtotal}</span>
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <span>Logistics Fee</span>
          <span className={cn("text-lime", order.delivery_fee > 0 && "text-white")}>
            {order.delivery_fee === 0 ? "WAVED" : `₹${order.delivery_fee}`}
          </span>
        </div>
        <div className="h-px bg-white/5 w-full my-2" />
        <div className="flex justify-between items-center">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-white">Net Total</span>
          <span className="text-3xl font-black italic tracking-tighter text-primary">₹{order.total}</span>
        </div>
      </div>
      {/* Actions */}
      <div className="p-4 border-t border-border/50">
        <motion.button
          onClick={onReorder}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 px-4 bg-gradient-to-r from-primary/20 to-orange-500/20 border border-primary/30 rounded-xl flex items-center justify-center gap-2 font-bold text-primary hover:from-primary/30 hover:to-orange-500/30 transition-all"
        >
          <RefreshCw size={18} />
          Reorder These Items
        </motion.button>
      </div>
    </div>
  );
}

// ============================================
// WEATHER INFO WIDGET
// ============================================

export function WeatherWidget() {
  // Simulated weather data
  const weather = {
    temp: 28,
    condition: "sunny",
    humidity: 65,
    wind: 12
  };

  const WeatherIcon = weather.condition === "sunny" ? Sun : weather.condition === "rainy" ? CloudRain : Cloud;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 border-3 border-foreground p-3 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WeatherIcon size={24} />
          <div>
            <p className="text-xl font-bold">{weather.temp}°C</p>
            <p className="text-xs capitalize">{weather.condition}</p>
          </div>
        </div>
        <div className="text-xs text-right">
          <p className="flex items-center gap-1 justify-end">
            <Wind size={12} />
            {weather.wind} km/h
          </p>
          <p>Humidity: {weather.humidity}%</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ISSUE REPORTING COMPONENT
// ============================================

interface IssueReportingProps {
  orderId: string;
  isDelivered: boolean;
}

export function IssueReporting({ orderId, isDelivered }: IssueReportingProps) {
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const issueTypes = [
    { id: "late", label: "Late Delivery", icon: Clock, color: "from-orange-500 to-amber-500" },
    { id: "wrong", label: "Wrong Order", icon: AlertTriangle, color: "from-red-500 to-pink-500" },
    { id: "missing", label: "Missing Items", icon: Package, color: "from-purple-500 to-violet-500" },
    { id: "damaged", label: "Damaged Items", icon: AlertTriangle, color: "from-rose-500 to-red-500" },
    { id: "quality", label: "Quality Issue", icon: ThumbsDown, color: "from-yellow-500 to-orange-500" },
    { id: "other", label: "Other Issue", icon: MessageCircle, color: "from-blue-500 to-cyan-500" }
  ];

  const handleSubmit = async () => {
    if (!selectedIssue) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success("Issue reported! We'll get back to you soon.");
    setShowIssuePanel(false);
    setSelectedIssue(null);
    setDescription("");
    setIsSubmitting(false);
  };

  return (
    <div>
      <motion.button
        onClick={() => setShowIssuePanel(!showIssuePanel)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 flex items-center justify-center gap-2 text-red-500 font-bold hover:from-red-500/20 hover:to-rose-500/20 transition-all"
      >
        <AlertTriangle size={18} />
        Report an Issue
      </motion.button>

      <AnimatePresence>
        {showIssuePanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-border/50 p-5">
              <h4 className="font-bold text-lg mb-4">What's the issue?</h4>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {issueTypes.map((issue, idx) => {
                  const Icon = issue.icon;
                  const isSelected = selectedIssue === issue.id;
                  return (
                    <motion.button
                      key={issue.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setSelectedIssue(issue.id)}
                      className={cn(
                        "p-4 rounded-xl text-left transition-all relative overflow-hidden",
                        isSelected
                          ? "bg-gradient-to-r text-white shadow-lg"
                          : "bg-muted/50 border border-border/50 hover:border-primary/50"
                      )}
                      style={isSelected ? {
                        backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`
                      } : {}}
                    >
                      {isSelected && (
                        <div className={cn("absolute inset-0 bg-gradient-to-r opacity-100", issue.color)} />
                      )}
                      <div className="relative">
                        <Icon size={20} className={cn("mb-2", isSelected ? "text-white" : "text-muted-foreground")} />
                        <span className="text-sm font-bold">{issue.label}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {selectedIssue && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    className="w-full p-4 rounded-xl border border-border/50 bg-muted/30 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />

                  {selectedIssue === "damaged" && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center gap-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <Camera size={16} />
                      Add Photo Evidence
                    </motion.button>
                  )}

                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => setShowIssuePanel(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 rounded-xl bg-muted/50 border border-border/50 font-medium hover:bg-muted transition-colors"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <>
                          <Send size={16} />
                          Submit
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// DELIVERY PROOF COMPONENT
// ============================================

interface DeliveryProofViewProps {
  proof: DeliveryProof;
}

export function DeliveryProofView({ proof }: DeliveryProofViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-border/50 overflow-hidden"
    >
      <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center gap-3">
        <div className="p-2 rounded-full bg-white/20">
          <Camera size={18} />
        </div>
        <span className="font-bold">Delivery Proof</span>
        <div className="ml-auto px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
          VERIFIED ✓
        </div>
      </div>

      <div className="p-4">
        <div className="aspect-video bg-muted rounded-xl border border-border/50 overflow-hidden mb-4 shadow-lg">
          <img src={proof.photo_url} alt="Delivery proof" className="w-full h-full object-cover" />
        </div>

        <div className="text-sm space-y-3 bg-muted/30 p-4 rounded-xl border border-border/30">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Delivered at</span>
            <span className="font-bold">{format(new Date(proof.timestamp), "h:mm a, MMM d")}</span>
          </div>
          {proof.received_by && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Received by</span>
              <span className="font-bold">{proof.received_by}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// TIP RUNNER MODAL
// ============================================

interface TipRunnerModalProps {
  runnerName: string;
  isOpen: boolean;
  onClose: () => void;
  onTip: (amount: number) => void;
}

export function TipRunnerModal({ runnerName, isOpen, onClose, onTip }: TipRunnerModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  const tipAmounts = [
    { amount: 20, emoji: "👍" },
    { amount: 30, emoji: "🙌" },
    { amount: 50, emoji: "⭐" },
    { amount: 100, emoji: "🎉" }
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background w-full max-w-md rounded-t-3xl overflow-hidden"
      >
        {/* Header with gradient */}
        <div className="relative p-6 pb-8 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent)]" />
          <div className="relative">
            <button onClick={onClose} className="absolute -top-1 right-0 p-2 rounded-full bg-black/20 hover:bg-black/30 transition-colors">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-white/20">
                <Gift size={28} />
              </div>
              <div>
                <h3 className="font-black text-xl">Tip {runnerName}</h3>
                <p className="text-black/70 text-sm">100% goes to the runner</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-muted-foreground text-center">
            Show your appreciation for great service! ✨
          </p>

          <div className="grid grid-cols-4 gap-3">
            {tipAmounts.map(({ amount, emoji }) => (
              <motion.button
                key={amount}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount("");
                }}
                className={cn(
                  "py-4 rounded-2xl font-bold transition-all flex flex-col items-center gap-1",
                  selectedAmount === amount
                    ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/25"
                    : "bg-muted/50 border border-border/50 hover:border-yellow-500/50"
                )}
              >
                <span className="text-lg">{emoji}</span>
                <span>₹{amount}</span>
              </motion.button>
            ))}
          </div>

          <div className="relative">
            <input
              type="number"
              placeholder="Enter custom amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
              }}
              className="w-full p-4 rounded-xl border border-border/50 bg-muted/30 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            />
          </div>

          <motion.button
            onClick={() => {
              const amount = selectedAmount || parseInt(customAmount) || 0;
              if (amount > 0) {
                onTip(amount);
                onClose();
              }
            }}
            disabled={!selectedAmount && !customAmount}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Gift size={22} />
            Send Tip
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// POINTS EARNED DISPLAY
// ============================================

interface PointsEarnedProps {
  points: number;
  isDelivered: boolean;
}

export function PointsEarned({ points, isDelivered }: PointsEarnedProps) {
  if (!isDelivered || points === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 animate-gradient-x" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent)]" />

      <div className="relative p-5 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex items-center justify-center gap-3"
        >
          <div className="p-2 rounded-full bg-white/20">
            <Star className="text-white fill-white" size={28} />
          </div>
          <span className="text-3xl font-black text-white">+{points} Points!</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-white/80 mt-2"
        >
          🎉 Earned on this order
        </motion.p>
      </div>
    </motion.div>
  );
}

// ============================================
// SHARE ORDER COMPONENT
// ============================================

interface ShareOrderProps {
  orderId: string;
  items: OrderItem[];
}

export function ShareOrder({ orderId, items }: ShareOrderProps) {
  const shareText = `Just ordered ${items.length} items from SnackZo! 🛍️`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My SnackZo Order",
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      toast.success("Link copied!");
    }
  };

  return (
    <motion.button
      onClick={handleShare}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30 flex items-center justify-center gap-2 font-bold text-primary hover:from-primary/20 hover:to-purple-500/20 transition-all"
    >
      <Share2 size={18} />
      Share Order
    </motion.button>
  );
}

// ============================================
// MAIN EXPORT - Premium Order Tracking Page Component
// ============================================

export default function PremiumOrderTrackingPage() {
  // This is a placeholder - the actual implementation would be in OrderTracking.tsx
  return null;
}
