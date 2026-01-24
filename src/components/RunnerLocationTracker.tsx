import { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RunnerLocationTrackerProps {
  runnerId: string;
  isDelivering: boolean;
  currentOrderId?: string;
}

export function RunnerLocationTracker({ runnerId, isDelivering, currentOrderId }: RunnerLocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const updateLocation = useCallback(async (position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;

    try {
      // Update runner location (using any to bypass type checking for new columns)
      await (supabase
        .from('runners')
        .update({
          current_lat: latitude,
          current_lng: longitude,
          last_location_update: new Date().toISOString(),
          is_online: true,
        } as any)
        .eq('id', runnerId) as any);

      // If actively delivering, record location history
      if (currentOrderId) {
        await (supabase
          .from('order_location_history' as any)
          .insert({
            order_id: currentOrderId,
            runner_id: runnerId,
            lat: latitude,
            lng: longitude,
          }) as any);
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error updating location:', err);
    }
  }, [runnerId, currentOrderId]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      updateLocation,
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
    toast.success('Location tracking started');
  }, [updateLocation]);

  const stopTracking = useCallback(async () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    // Mark runner as offline
    await (supabase
      .from('runners')
      .update({ is_online: false } as any)
      .eq('id', runnerId) as any);

    setIsTracking(false);
    toast.info('Location tracking stopped');
  }, [watchId, runnerId]);

  // Auto-start tracking when delivering
  useEffect(() => {
    if (isDelivering && !isTracking) {
      startTracking();
    }
  }, [isDelivering, isTracking, startTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
      <div className={`p-2 rounded-full ${isTracking ? 'bg-green-500/20' : 'bg-muted-foreground/20'}`}>
        {isTracking ? (
          <Navigation className="text-green-500 animate-pulse" size={20} />
        ) : (
          <MapPin className="text-muted-foreground" size={20} />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Location Sharing</span>
          <Badge variant={isTracking ? 'default' : 'secondary'} className={isTracking ? 'bg-green-500' : ''}>
            {isTracking ? 'Active' : 'Off'}
          </Badge>
        </div>
        {lastUpdate && isTracking && (
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      <Button
        size="sm"
        variant={isTracking ? 'destructive' : 'default'}
        onClick={isTracking ? stopTracking : startTracking}
      >
        {isTracking ? 'Stop' : 'Start'}
      </Button>
    </div>
  );
}

export default RunnerLocationTracker;
