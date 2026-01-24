import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Clock, Phone, MessageCircle, User, Package } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom marker icons
const runnerIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="5"/>
      <path d="M20 21a8 8 0 1 0-16 0"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const destinationIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const storeIcon = new L.DivIcon({
  className: "custom-marker",
  html: `<div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
      <path d="M2 7h20"/>
      <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

interface RunnerLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  created_at: string;
}

interface LiveRunnerMapProps {
  orderId: string;
  runnerId: string;
  runnerName?: string;
  runnerPhone?: string;
  deliveryAddress: string;
  estimatedMinutes?: number;
  onCallRunner?: () => void;
  onMessageRunner?: () => void;
}

// Map center updater component
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function LiveRunnerMap({
  orderId,
  runnerId,
  runnerName = "Runner",
  runnerPhone,
  deliveryAddress,
  estimatedMinutes,
  onCallRunner,
  onMessageRunner
}: LiveRunnerMapProps) {
  const [runnerLocation, setRunnerLocation] = useState<RunnerLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Mock store and destination locations (in real app, these would come from order/profile)
  const storeLocation: [number, number] = [12.9716, 77.5946]; // Example: Bangalore
  const destinationLocation: [number, number] = [12.9816, 77.6046]; // Example destination

  // Fetch runner location and subscribe to updates
  useEffect(() => {
    const fetchLocation = async () => {
      const { data, error } = await (supabase.from as any)("runner_locations")
        .select("*")
        .eq("runner_id", runnerId)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setRunnerLocation(data);
        setLastUpdate(new Date(data.created_at));
      }
      setIsLoading(false);
    };

    fetchLocation();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`runner-location-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "runner_locations",
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          setRunnerLocation(payload.new as RunnerLocation);
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, runnerId]);

  // Calculate ETA based on current position
  const calculateETA = () => {
    if (!runnerLocation || !estimatedMinutes) return estimatedMinutes || 15;
    // In real app, calculate based on distance
    return estimatedMinutes;
  };

  const currentRunnerPosition: [number, number] = runnerLocation
    ? [runnerLocation.latitude, runnerLocation.longitude]
    : storeLocation;

  // Generate route polyline (simplified)
  const routePoints: [number, number][] = [
    currentRunnerPosition,
    destinationLocation
  ];

  if (isLoading) {
    return (
      <div className="h-64 bg-muted rounded-xl flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"
          />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="relative h-64 md:h-80 rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={currentRunnerPosition}
          zoom={15}
          className="h-full w-full"
          ref={mapRef}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapUpdater center={currentRunnerPosition} />

          {/* Store marker */}
          <Marker position={storeLocation} icon={storeIcon}>
            <Popup>
              <div className="text-center">
                <strong>Store</strong>
                <p className="text-sm">Pickup point</p>
              </div>
            </Popup>
          </Marker>

          {/* Runner marker */}
          <Marker position={currentRunnerPosition} icon={runnerIcon}>
            <Popup>
              <div className="text-center">
                <strong>{runnerName}</strong>
                <p className="text-sm">On the way</p>
              </div>
            </Popup>
          </Marker>

          {/* Destination marker */}
          <Marker position={destinationLocation} icon={destinationIcon}>
            <Popup>
              <div className="text-center">
                <strong>Delivery Location</strong>
                <p className="text-sm">{deliveryAddress}</p>
              </div>
            </Popup>
          </Marker>

          {/* Route line */}
          <Polyline
            positions={routePoints}
            color="#6366f1"
            weight={4}
            opacity={0.8}
            dashArray="10, 10"
          />
        </MapContainer>

        {/* ETA overlay */}
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-border">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <div>
              <div className="text-lg font-bold">{calculateETA()} min</div>
              <div className="text-xs text-muted-foreground">Estimated arrival</div>
            </div>
          </div>
        </div>

        {/* Last update */}
        {lastUpdate && (
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-muted-foreground">
            Updated {Math.round((new Date().getTime() - lastUpdate.getTime()) / 1000)}s ago
          </div>
        )}
      </div>

      {/* Runner info card */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User size={24} className="text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">{runnerName}</h4>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Package size={12} />
                Delivering your order
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {runnerPhone && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCallRunner}
                className="p-3 bg-green-500/10 text-green-500 rounded-full hover:bg-green-500/20 transition-colors"
              >
                <Phone size={20} />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMessageRunner}
              className="p-3 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
            >
              <MessageCircle size={20} />
            </motion.button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Store</span>
            <span>On the way</span>
            <span>You</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: "30%" }}
              animate={{ width: "60%" }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MINI MAP WIDGET (For Order Card)
// ============================================

interface MiniMapWidgetProps {
  orderId: string;
  runnerId: string;
  onClick?: () => void;
}

export function MiniMapWidget({ orderId, runnerId, onClick }: MiniMapWidgetProps) {
  const [isNearby, setIsNearby] = useState(false);

  // In real app, check if runner is within certain distance
  useEffect(() => {
    // Mock: randomly set nearby status
    const timer = setTimeout(() => setIsNearby(Math.random() > 0.5), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative w-full h-24 rounded-xl overflow-hidden bg-muted"
    >
      {/* Static map placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-green-500/20" />
      
      {/* Animated runner dot */}
      <motion.div
        animate={{
          x: [0, 20, 40, 60],
          y: [0, -10, 0, 10]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: "linear"
        }}
        className="absolute top-1/2 left-1/4 w-3 h-3 bg-primary rounded-full shadow-lg"
      />

      {/* Destination dot */}
      <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-green-500 rounded-full" />

      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
          <Navigation size={14} className="text-primary" />
          <span className="text-sm font-medium">
            {isNearby ? "Runner nearby!" : "Track live"}
          </span>
        </div>
      </div>

      {/* Pulse effect if nearby */}
      {isNearby && (
        <motion.div
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute top-1/2 right-1/4 w-8 h-8 -translate-x-1/2 -translate-y-1/2 bg-green-500 rounded-full"
        />
      )}
    </motion.button>
  );
}
