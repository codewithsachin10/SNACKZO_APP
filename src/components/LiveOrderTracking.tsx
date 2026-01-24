import { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Phone, MessageCircle, Clock, Package, CheckCircle, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const RunnerIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063823.png', // Delivery guy icon
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

interface RunnerLocation {
  lat: number;
  lng: number;
  lastUpdate: Date;
}

interface LiveOrderTrackingProps {
  orderId: string;
  deliveryAddress: string;
  runnerName?: string;
  runnerPhone?: string;
  runnerId?: string;
  orderStatus: string;
  estimatedTime?: string;
  onChatClick?: () => void;
  deliveryOtp?: string;
}

const statusSteps = [
  { key: 'placed', label: 'Order Placed', icon: Package },
  { key: 'packed', label: 'Being Packed', icon: CheckCircle },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

// Helper to center map
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function LiveOrderTracking({
  orderId,
  deliveryAddress,
  runnerName,
  runnerPhone,
  runnerId,
  orderStatus,
  estimatedTime,
  onChatClick,
  deliveryOtp,
}: LiveOrderTrackingProps) {
  const [runnerLocation, setRunnerLocation] = useState<RunnerLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRunnerLocation = useCallback(async () => {
    if (!runnerId) return;

    try {
      const { data, error } = await supabase
        .from('runners')
        .select('*')
        .eq('id', runnerId)
        .single();

      if (!error && data) {
        const runnerData = data as any;
        if (runnerData.current_lat && runnerData.current_lng) {
          setRunnerLocation({
            lat: parseFloat(runnerData.current_lat),
            lng: parseFloat(runnerData.current_lng),
            lastUpdate: new Date(runnerData.last_location_update),
          });
        }
      }
    } catch (err) {
      console.error('Error fetching runner location:', err);
    } finally {
      setIsLoading(false);
    }
  }, [runnerId]);

  useEffect(() => {
    fetchRunnerLocation();

    // Subscribe to real-time location updates
    const channel = supabase
      .channel(`runner-tracking-${runnerId}`) // Listen to runner ID, not just order
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'runners',
          filter: `id=eq.${runnerId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.current_lat && newData.current_lng) {
            setRunnerLocation({
              lat: parseFloat(newData.current_lat),
              lng: parseFloat(newData.current_lng),
              lastUpdate: new Date(newData.last_location_update)
            });
          }
        }
      )
      .subscribe();

    const interval = setInterval(fetchRunnerLocation, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [runnerId, fetchRunnerLocation]);

  const currentStepIndex = statusSteps.findIndex((s) => s.key === orderStatus);

  const handleCall = () => {
    if (runnerPhone) {
      window.location.href = `tel:${runnerPhone}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Progress */}
      <Card className="neu-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5 text-lime" />
            Order Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* ... Progress Bar Logic same as before ... */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div
              className="absolute left-4 top-0 w-0.5 bg-lime transition-all duration-500"
              style={{
                height: `${Math.min(100, ((currentStepIndex + 1) / statusSteps.length) * 100)}%`,
              }}
            />
            <div className="space-y-6">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <div key={step.key} className="flex items-center gap-4 relative">
                    <div
                      className={`z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isCompleted
                        ? 'bg-lime text-background'
                        : 'bg-muted text-muted-foreground'
                        } ${isCurrent ? 'ring-4 ring-lime/30 animate-pulse' : ''}`}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                      {isCurrent && estimatedTime && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> ETA: {estimatedTime}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OTP Display */}
      {orderStatus === 'out_for_delivery' && deliveryOtp && (
        <Card className="neu-card bg-primary text-primary-foreground border-primary animate-pulse">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Share this OTP with Runner</p>
              <p className="text-2xl font-black tracking-[0.5em]">{deliveryOtp}</p>
            </div>
            <div className="bg-white/20 p-2 rounded-full">
              <CheckCircle className="text-white" size={24} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real Map Visualization */}
      {['packed', 'out_for_delivery'].includes(orderStatus) && (
        <Card className="neu-card overflow-hidden border-2 border-lime/50 shadow-[0_0_20px_rgba(0,255,0,0.1)]">
          <CardHeader className="pb-2 bg-background/95">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-lime" />
                Live Tracking
              </span>
              {runnerLocation && (
                <Badge variant="outline" className="text-xs animate-pulse border-lime text-lime">
                  LIVE
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[300px] relative z-0">
            <MapContainer
              center={runnerLocation ? [runnerLocation.lat, runnerLocation.lng] : [12.9716, 79.1594]} // Default to standard college location if no runner yet
              zoom={15}
              style={{ height: '300px', width: '100%', zIndex: 0 }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              {runnerLocation && (
                <>
                  <ChangeView center={[runnerLocation.lat, runnerLocation.lng]} zoom={16} />
                  <Marker position={[runnerLocation.lat, runnerLocation.lng]} icon={RunnerIcon}>
                    <Popup>
                      <div className="text-center">
                        <p className="font-bold">{runnerName}</p>
                        <p className="text-xs text-gray-500">Runner</p>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}

              {/* Destination Marker (User) - Mocking location slightly offset for demo if real coords missing */}
              <Marker position={[12.9716, 79.1594]} icon={DefaultIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">You</p>
                    <p className="text-xs text-gray-500">{deliveryAddress}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {!runnerLocation && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-[400] pointer-events-none">
                <div className="bg-background/90 p-4 rounded-xl shadow-lg backdrop-blur text-center">
                  <div className="w-8 h-8 border-4 border-lime border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold">Waiting for Runner signal...</p>
                </div>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-background/90 backdrop-blur-md border-t border-border z-[500]">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-primary" />
                <p className="truncate font-medium">{deliveryAddress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Runner Info & Actions */}
      {runnerName && orderStatus === 'out_for_delivery' && (
        <Card className="neu-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-lime/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">🏃</span>
                </div>
                <div>
                  <p className="font-bold">{runnerName}</p>
                  <p className="text-sm text-muted-foreground">Your Delivery Partner</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" className="neu-btn h-10 w-10" onClick={handleCall} disabled={!runnerPhone}>
                  <Phone size={18} />
                </Button>
                <Button size="icon" className="neu-btn bg-lime text-background h-10 w-10" onClick={onChatClick}>
                  <MessageCircle size={18} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LiveOrderTracking;
