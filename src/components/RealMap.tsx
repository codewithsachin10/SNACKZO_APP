import { useEffect, useRef, useState } from "react";
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
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Premium custom marker icons with pulse animation
const createPremiumIcon = (type: 'store' | 'runner' | 'destination') => {
  const configs = {
    store: { bg: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', icon: '🏪', pulse: '#3B82F6' },
    runner: { bg: 'linear-gradient(135deg, #84CC16, #65A30D)', icon: '🛵', pulse: '#84CC16' },
    destination: { bg: 'linear-gradient(135deg, #22C55E, #16A34A)', icon: '🏠', pulse: '#22C55E' }
  };
  const config = configs[type];
  
  return L.divIcon({
    className: "custom-marker-premium",
    html: `
      <div style="position: relative;">
        <div style="
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${config.pulse};
          opacity: 0.3;
          animation: pulse-ring 2s infinite;
          top: -10px;
          left: -10px;
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
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          font-size: 22px;
          position: relative;
          z-index: 10;
        ">
          ${config.icon}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
  });
};

const storeIcon = createPremiumIcon('store');
const runnerIcon = createPremiumIcon('runner');
const destinationIcon = createPremiumIcon('destination');

// Component to recenter map when runner moves
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Component to fit bounds
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

interface RealMapProps {
  runnerLocation?: { latitude: number; longitude: number; heading?: number } | null;
  storeLocation?: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number };
  deliveryAddress?: string;
  showNavigation?: boolean;
  onNavigate?: () => void;
  isCustomerView?: boolean;
}

export function RealMap({
  runnerLocation,
  storeLocation = { lat: 13.0827, lng: 80.2707 }, // Default Chennai
  destinationLocation,
  deliveryAddress = "Delivery Location",
  showNavigation = false,
  onNavigate,
  isCustomerView = true,
}: RealMapProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [distance, setDistance] = useState<string>("--");
  const [eta, setEta] = useState<string>("--");
  const mapRef = useRef<L.Map>(null);

  // Calculate center point
  const runnerPos: [number, number] = runnerLocation 
    ? [runnerLocation.latitude, runnerLocation.longitude]
    : [storeLocation.lat, storeLocation.lng];
  
  const destPos: [number, number] = destinationLocation
    ? [destinationLocation.lat, destinationLocation.lng]
    : [storeLocation.lat + 0.01, storeLocation.lng + 0.01]; // Default offset

  // Calculate distance and ETA
  useEffect(() => {
    if (runnerLocation && destinationLocation) {
      const R = 6371; // Earth's radius in km
      const dLat = (destinationLocation.lat - runnerLocation.latitude) * Math.PI / 180;
      const dLon = (destinationLocation.lng - runnerLocation.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(runnerLocation.latitude * Math.PI / 180) * 
        Math.cos(destinationLocation.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const dist = R * c;
      
      setDistance(dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`);
      // Assume 20 km/h average speed
      const etaMinutes = Math.round((dist / 20) * 60);
      setEta(etaMinutes < 1 ? "< 1 min" : `${etaMinutes} mins`);
    }
  }, [runnerLocation, destinationLocation]);

  // Route path
  const routePath: [number, number][] = [
    [storeLocation.lat, storeLocation.lng],
    runnerPos,
    destPos,
  ];

  // Open Google Maps navigation
  const openGoogleMapsNavigation = () => {
    if (destinationLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationLocation.lat},${destinationLocation.lng}&travelmode=driving`;
      window.open(url, "_blank");
    }
    onNavigate?.();
  };

  return (
    <div className={cn(
      "relative border-3 border-foreground rounded-lg overflow-hidden transition-all duration-300",
      isFullscreen ? "fixed inset-4 z-50" : "h-64"
    )}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-lime" />
          <span className="font-bold text-white text-sm uppercase">Live Tracking</span>
        </div>
        <div className="flex gap-2">
          {showNavigation && (
            <button
              onClick={openGoogleMapsNavigation}
              className="bg-lime text-black px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-lime/80 transition-colors"
            >
              <Navigation size={14} />
              Navigate
            </button>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="bg-black/50 text-white p-2 rounded-lg hover:bg-black/70 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={runnerPos}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Store Marker */}
        <Marker position={[storeLocation.lat, storeLocation.lng]} icon={storeIcon}>
          <Popup>
            <div className="text-center">
              <strong>🏪 Store</strong>
              <p className="text-xs">Order picked up</p>
            </div>
          </Popup>
        </Marker>

        {/* Runner Marker */}
        {runnerLocation && (
          <Marker position={runnerPos} icon={runnerIcon}>
            <Popup>
              <div className="text-center">
                <strong>🛵 Runner</strong>
                <p className="text-xs">On the way!</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        <Marker position={destPos} icon={destinationIcon}>
          <Popup>
            <div className="text-center">
              <strong>🏠 Destination</strong>
              <p className="text-xs">{deliveryAddress}</p>
            </div>
          </Popup>
        </Marker>

        {/* Route Line */}
        <Polyline
          positions={routePath}
          color="#84CC16"
          weight={4}
          opacity={0.8}
          dashArray="10, 10"
        />

        {/* Auto-fit bounds */}
        <FitBounds bounds={[
          [storeLocation.lat, storeLocation.lng],
          runnerPos,
          destPos
        ]} />
      </MapContainer>

      {/* Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Route size={16} className="text-lime" />
              <span className="font-bold">{distance}</span>
            </div>
            <div className="flex items-center gap-1">
              <Timer size={16} className="text-cyan-400" />
              <span className="font-bold">{eta}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-300">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </div>
        </div>
      </div>

      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/50 -z-10" 
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}

// Runner Navigation Map with turn-by-turn directions
interface RunnerNavigationMapProps {
  currentLocation: { latitude: number; longitude: number };
  destination: { lat: number; lng: number; address: string };
  onStartNavigation?: () => void;
}

export function RunnerNavigationMap({ 
  currentLocation, 
  destination, 
  onStartNavigation 
}: RunnerNavigationMapProps) {
  const [distance, setDistance] = useState<string>("--");
  const [eta, setEta] = useState<string>("--");

  const currentPos: [number, number] = [currentLocation.latitude, currentLocation.longitude];
  const destPos: [number, number] = [destination.lat, destination.lng];

  // Calculate distance
  useEffect(() => {
    const R = 6371;
    const dLat = (destination.lat - currentLocation.latitude) * Math.PI / 180;
    const dLon = (destination.lng - currentLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(currentLocation.latitude * Math.PI / 180) * 
      Math.cos(destination.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const dist = R * c;
    
    setDistance(dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`);
    const etaMinutes = Math.round((dist / 20) * 60);
    setEta(etaMinutes < 1 ? "< 1 min" : `${etaMinutes} mins`);
  }, [currentLocation, destination]);

  const openGoogleMapsNavigation = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    window.open(url, "_blank");
    onStartNavigation?.();
  };

  return (
    <div className="border-3 border-foreground rounded-xl overflow-hidden">
      {/* Map */}
      <div className="h-48 relative">
        <MapContainer
          center={currentPos}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Current Location */}
          <Marker position={currentPos} icon={runnerIcon}>
            <Popup>You are here</Popup>
          </Marker>
          
          {/* Destination */}
          <Marker position={destPos} icon={destinationIcon}>
            <Popup>{destination.address}</Popup>
          </Marker>
          
          {/* Route */}
          <Polyline
            positions={[currentPos, destPos]}
            color="#84CC16"
            weight={4}
            dashArray="10, 5"
          />

          <FitBounds bounds={[currentPos, destPos]} />
        </MapContainer>
      </div>

      {/* Navigation Info */}
      <div className="bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-lg">{destination.address}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Route size={14} /> {distance}
              </span>
              <span className="flex items-center gap-1">
                <Timer size={14} /> {eta}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Button */}
        <button
          onClick={openGoogleMapsNavigation}
          className="w-full bg-lime text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-lime/90 transition-colors"
        >
          <Navigation size={20} />
          START NAVIGATION
          <ExternalLink size={16} />
        </button>
      </div>
    </div>
  );
}

export default RealMap;
