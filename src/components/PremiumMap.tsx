import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation2,
  MapPin,
  Package,
  Home,
  Bike,
  Route,
  Timer,
  Maximize2,
  Minimize2,
  Navigation,
  ExternalLink,
  Phone,
  MessageCircle,
  Zap,
  Shield,
  Star,
  Clock,
  ChevronUp,
  ChevronDown,
  Locate,
  Layers,
  Car
} from "lucide-react";
import { cn } from "@/lib/utils";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Animated CSS styles for markers
const pulseKeyframes = `
@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 0.4; }
  100% { transform: scale(0.8); opacity: 0.8; }
}
@keyframes bounce-marker {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes dash-flow {
  to { stroke-dashoffset: -30; }
}
.anim-dash-flow {
  animation: dash-flow 1s linear infinite;
  filter: drop-shadow(0 0 2px rgba(255,255,255,0.8));
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
}

// Premium custom marker icons
const createPremiumIcon = (type: 'store' | 'runner' | 'destination') => {
  const configs = {
    store: {
      bg: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      icon: '🏪',
      shadow: 'rgba(59, 130, 246, 0.5)',
      label: 'Store'
    },
    runner: {
      bg: 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
      icon: '🛵',
      shadow: 'rgba(132, 204, 22, 0.5)',
      label: 'Runner'
    },
    destination: {
      bg: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
      icon: '📍',
      shadow: 'rgba(249, 115, 22, 0.5)',
      label: 'You'
    }
  };
  const config = configs[type];

  return L.divIcon({
    className: "premium-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          position: absolute;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: ${config.shadow};
          animation: pulse-ring 2s ease-in-out infinite;
          top: -6px;
          left: -6px;
        "></div>
        <div style="
          background: ${config.bg};
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 8px 32px ${config.shadow}, 0 4px 12px rgba(0,0,0,0.3);
          font-size: 20px;
          position: relative;
          z-index: 10;
          animation: ${type === 'runner' ? 'bounce-marker 1s ease-in-out infinite' : 'none'};
        ">
          ${config.icon}
        </div>
        <div style="
          background: rgba(0,0,0,0.8);
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          margin-top: 4px;
          white-space: nowrap;
        ">${config.label}</div>
      </div>
    `,
    iconSize: [44, 70],
    iconAnchor: [22, 44],
  });
};

const storeIcon = createPremiumIcon('store');
const runnerIcon = createPremiumIcon('runner');
const destinationIcon = createPremiumIcon('destination');

// Component to fit bounds with animation
function FitBounds({ bounds, padding = 60 }: { bounds: L.LatLngBoundsExpression; padding?: number }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [padding, padding], animate: true, duration: 0.5 });
  }, [bounds, map, padding]);
  return null;
}

// Generate curved route path between points
function generateCurvedRoute(start: [number, number], end: [number, number], numPoints: number = 20): [number, number][] {
  const points: [number, number][] = [];
  const midLat = (start[0] + end[0]) / 2;
  const midLng = (start[1] + end[1]) / 2;

  // Add slight curve offset
  const dx = end[1] - start[1];
  const dy = end[0] - start[0];
  const curveOffset = Math.sqrt(dx * dx + dy * dy) * 0.15;

  const controlLat = midLat + (Math.random() - 0.5) * curveOffset;
  const controlLng = midLng + (Math.random() - 0.5) * curveOffset;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Quadratic bezier curve
    const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * controlLat + t * t * end[0];
    const lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * controlLng + t * t * end[1];
    points.push([lat, lng]);
  }

  return points;
}

interface PremiumMapProps {
  runnerLocation?: { latitude: number; longitude: number; heading?: number } | null;
  storeLocation?: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number };
  deliveryAddress?: string;
  runnerName?: string;
  runnerPhone?: string;
  estimatedTime?: string;
  onCallRunner?: () => void;
  onChatRunner?: () => void;
}

export function PremiumLiveMap({
  runnerLocation,
  storeLocation = { lat: 13.0827, lng: 80.2707 },
  destinationLocation,
  deliveryAddress = "Your Location",
  runnerName = "Your Runner",
  runnerPhone,
  estimatedTime,
  onCallRunner,
  onChatRunner,
}: PremiumMapProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [distance, setDistance] = useState<string>("--");
  const [eta, setEta] = useState<string>("--");
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [showDetails, setShowDetails] = useState(true);

  const runnerPos: [number, number] = runnerLocation
    ? [runnerLocation.latitude, runnerLocation.longitude]
    : [storeLocation.lat + 0.005, storeLocation.lng + 0.003];

  const destPos: [number, number] = destinationLocation
    ? [destinationLocation.lat, destinationLocation.lng]
    : [runnerPos[0] + 0.004, runnerPos[1] + 0.004];

  // Calculate distance and ETA
  useEffect(() => {
    const lat1 = runnerPos[0];
    const lon1 = runnerPos[1];
    const lat2 = destPos[0];
    const lon2 = destPos[1];

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    setDistance(dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`);
    const etaMinutes = Math.max(1, Math.round((dist / 15) * 60));
    setEta(`${etaMinutes} min`);
  }, [runnerPos, destPos]);


  const routeToDestination = generateCurvedRoute(runnerPos, destPos, 20);

  const tileUrls = {
    street: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  };

  // Fix map size on mount/resize
  function MapResizer() {
    const map = useMap();
    useEffect(() => {
      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      const container = map.getContainer();
      resizeObserver.observe(container);

      // Force initial resize
      setTimeout(() => map.invalidateSize(), 100);

      return () => resizeObserver.disconnect();
    }, [map]);
    return null;
  }

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-lime/30 shadow-2xl shadow-lime/10 transition-all duration-500 bg-zinc-900",
        isExpanded ? "fixed inset-0 z-[50]" : "h-80 w-full"
      )}
    >
      {/* Glassmorphic Header */}
      <div className="absolute top-0 left-0 right-0 z-[400] backdrop-blur-md bg-black/40 border-b border-white/10">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-lime rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-lime rounded-full animate-ping" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">Live Tracking</h3>
              <p className="text-[10px] text-lime font-medium">Runner is on the way</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMapStyle(mapStyle === 'street' ? 'satellite' : 'street')}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Layers size={16} className="text-white" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg bg-lime/20 hover:bg-lime/30 transition-colors"
            >
              {isExpanded ? <Minimize2 size={16} className="text-lime" /> : <Maximize2 size={16} className="text-lime" />}
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <MapContainer
        center={runnerPos}
        zoom={15}
        style={{ height: "100%", width: "100%", background: "#1a1a1a" }}
        zoomControl={false}
        attributionControl={false}
      >
        <MapResizer />
        <TileLayer url={tileUrls[mapStyle]} />

        {/* Completed Route (Store to Runner) - Faded */}


        {/* Active Route (Runner to Destination) - Highlighted with Animation */}
        {/* Glow Layer */}
        <Polyline
          positions={routeToDestination}
          pathOptions={{
            color: "#84CC16",
            weight: 12,
            opacity: 0.2,
          }}
        />

        {/* Main Line */}
        <Polyline
          positions={routeToDestination}
          pathOptions={{
            color: "#84CC16",
            weight: 6,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round"
          }}
        />

        {/* Moving Dash Animation (The 'Flow' effect) */}
        <Polyline
          positions={routeToDestination}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            opacity: 0.8,
            dashArray: "10, 20",
            className: "anim-dash-flow" // Requires CSS
          }}
        />

        {/* Markers */}


        <Marker position={runnerPos} icon={runnerIcon}>
          <Popup className="custom-popup">
            <div className="text-center p-2">
              <p className="font-bold text-base">🛵 {runnerName}</p>
              <p className="text-xs text-gray-500 mt-1">On the way to you!</p>
            </div>
          </Popup>
        </Marker>

        <Marker position={destPos} icon={destinationIcon}>
          <Popup className="custom-popup">
            <div className="text-center p-2">
              <p className="font-bold text-base">📍 Your Location</p>
              <p className="text-xs text-gray-500 mt-1">{deliveryAddress}</p>
            </div>
          </Popup>
        </Marker>

        <FitBounds bounds={[
          runnerPos,
          destPos
        ]} padding={80} />
      </MapContainer>

      {/* Bottom Info Panel */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 z-[1000]"
          >
            {/* Toggle Button */}
            <div className="flex justify-center -mb-1">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="bg-black/60 backdrop-blur-md px-4 py-1 rounded-t-lg border-t border-x border-white/10"
              >
                <ChevronDown size={16} className="text-white" />
              </button>
            </div>

            {/* Info Card */}
            <div className="backdrop-blur-xl bg-gradient-to-t from-black via-black/95 to-black/80 border-t border-white/10 p-4">
              {/* ETA Banner */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-lime/20">
                    <Clock size={20} className="text-lime" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Estimated Arrival</p>
                    <p className="text-2xl font-black text-white">{estimatedTime || eta}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-xl font-black text-lime">{distance}</p>
                    <p className="text-[10px] text-gray-400 uppercase">Distance</p>
                  </div>
                </div>
              </div>

              {/* Runner Quick Actions */}
              {(onCallRunner || onChatRunner) && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={onCallRunner}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition-colors"
                  >
                    <Phone size={18} className="text-green-400" />
                    <span className="font-bold text-green-400">Call</span>
                  </button>
                  <button
                    onClick={onChatRunner}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 transition-colors"
                  >
                    <MessageCircle size={18} className="text-blue-400" />
                    <span className="font-bold text-blue-400">Chat</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed ETA Pill */}
      {!showDetails && (
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => setShowDetails(true)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-xl bg-black/60 border border-white/20 shadow-xl"
        >
          <div className="w-2 h-2 bg-lime rounded-full animate-pulse" />
          <span className="font-bold text-white">{eta}</span>
          <span className="text-gray-400">•</span>
          <span className="text-lime font-bold">{distance}</span>
          <ChevronUp size={16} className="text-gray-400" />
        </motion.button>
      )}

      {/* Fullscreen backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/70 -z-10 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </motion.div>
  );
}

// Runner Navigation Map - Premium Version
interface RunnerNavigationMapProps {
  currentLocation: { latitude: number; longitude: number };
  destination: { lat: number; lng: number; address: string };
  customerName?: string;
  customerPhone?: string;
  orderTotal?: number;
  paymentMethod?: string;
  onStartNavigation?: () => void;
  onCall?: () => void;
}

export function RunnerNavigationMap({
  currentLocation,
  destination,
  customerName = "Customer",
  customerPhone,
  orderTotal,
  paymentMethod = "paid",
  onStartNavigation,
  onCall
}: RunnerNavigationMapProps) {
  const [distance, setDistance] = useState<string>("--");
  const [eta, setEta] = useState<string>("--");
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  const currentPos: [number, number] = [currentLocation.latitude, currentLocation.longitude];
  const destPos: [number, number] = [destination.lat, destination.lng];

  useEffect(() => {
    const fetchRoute = async () => {
      const R = 6371;
      const calcFallback = () => {
        const dLat = (destination.lat - currentLocation.latitude) * Math.PI / 180;
        const dLon = (destination.lng - currentLocation.longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(currentLocation.latitude * Math.PI / 180) *
          Math.cos(destination.lat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;
        setDistance(dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`);
        setEta(`${Math.max(1, Math.round((dist / 15) * 60))} min`);
        setRoutePath(generateCurvedRoute([currentLocation.latitude, currentLocation.longitude], [destination.lat, destination.lng], 25));
      };

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes?.[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
          setRoutePath(coords);
          setDistance(route.distance >= 1000 ? `${(route.distance / 1000).toFixed(1)} km` : `${Math.round(route.distance)} m`);
          setEta(`${Math.max(1, Math.round(route.duration / 60))} min`);
        } else {
          calcFallback();
        }
      } catch (e) {
        calcFallback();
      }
    };
    fetchRoute();
  }, [currentLocation, destination]);

  const openGoogleMapsNavigation = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    window.open(url, "_blank");
    onStartNavigation?.();
  };

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-lime/30 shadow-xl bg-card">
      {/* Map Section */}
      <div className="h-52 relative">
        <MapContainer
          center={currentPos}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

          {/* Route with glow */}
          <Polyline
            positions={routePath}
            pathOptions={{ color: "#84CC16", weight: 10, opacity: 0.2 }}
          />
          <Polyline
            positions={routePath}
            pathOptions={{ color: "#84CC16", weight: 4, opacity: 1, lineCap: "round" }}
          />

          {/* You marker */}
          <Marker position={currentPos} icon={createPremiumIcon('runner')}>
            <Popup>You are here</Popup>
          </Marker>

          {/* Destination marker */}
          <Marker position={destPos} icon={createPremiumIcon('destination')}>
            <Popup>{destination.address}</Popup>
          </Marker>

          <FitBounds bounds={[currentPos, destPos]} padding={50} />
        </MapContainer>

        {/* Floating ETA Badge */}
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl bg-black/60 border border-white/10">
          <Clock size={16} className="text-lime" />
          <span className="font-black text-white">{eta}</span>
          <span className="text-gray-400">•</span>
          <span className="text-lime font-bold">{distance}</span>
        </div>
      </div>

      {/* Destination Info */}
      <div className="p-4 space-y-4">
        {/* Address */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-orange-500/20 mt-1">
            <MapPin size={20} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="font-black text-lg">{destination.address}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{customerName}</p>
          </div>
        </div>

        {/* Payment Info */}
        {orderTotal && (
          <div className={cn(
            "flex items-center justify-between p-3 rounded-xl",
            paymentMethod === "cod" ? "bg-orange-500/10 border border-orange-500/30" : "bg-green-500/10 border border-green-500/30"
          )}>
            <span className="font-bold text-sm">{paymentMethod === "cod" ? "💵 Collect Cash" : "✅ Already Paid"}</span>
            <span className={cn(
              "font-black text-lg",
              paymentMethod === "cod" ? "text-orange-400" : "text-green-400"
            )}>
              ₹{orderTotal}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              className="flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition-colors"
            >
              <Phone size={20} className="text-green-400" />
              <span className="text-xs font-bold text-green-400">Call</span>
            </a>
          )}
          <button
            onClick={openGoogleMapsNavigation}
            className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-lime hover:bg-lime/90 transition-colors"
          >
            <Navigation size={20} className="text-black" />
            <span className="font-black text-black">START NAVIGATION</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Export both components
export { PremiumLiveMap as RealMap };
export default PremiumLiveMap;
