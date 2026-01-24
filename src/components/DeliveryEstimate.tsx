import { useState, useEffect } from "react";
import { Clock, Zap, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DeliveryEstimateProps {
  runnerId?: string | null;
  orderId?: string;
  showDetails?: boolean;
}

export const DeliveryEstimate = ({ runnerId, orderId, showDetails = false }: DeliveryEstimateProps) => {
  const [estimate, setEstimate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    calculateEstimate();
  }, [runnerId]);

  const getTimeOfDay = (): string => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  };

  const calculateEstimate = async () => {
    setIsLoading(true);
    
    try {
      // Call the database function (type will be available after migration)
      const { data, error } = await (supabase.rpc as any)('calculate_delivery_estimate', {
        p_runner_id: runnerId || null,
        p_time_of_day: getTimeOfDay()
      });

      if (!error && data) {
        setEstimate(data as number);
        
        // Determine confidence based on available data
        if (runnerId) {
          // Check if runner has delivery history
          const { count } = await (supabase
            .from as any)('delivery_metrics')
            .select('*', { count: 'exact', head: true })
            .eq('runner_id', runnerId);
          
          if (count && count > 10) {
            setConfidence('high');
          } else if (count && count > 3) {
            setConfidence('medium');
          } else {
            setConfidence('low');
          }
        } else {
          setConfidence('low');
        }
      } else {
        // Fallback estimate
        setEstimate(15);
        setConfidence('low');
      }
    } catch (error) {
      console.error('Error calculating estimate:', error);
      setEstimate(15);
      setConfidence('low');
    } finally {
      setIsLoading(false);
    }
  };

  const getEstimateRange = () => {
    if (!estimate) return { min: 10, max: 20 };
    
    switch (confidence) {
      case 'high':
        return { min: estimate - 2, max: estimate + 3 };
      case 'medium':
        return { min: estimate - 5, max: estimate + 5 };
      case 'low':
        return { min: estimate - 5, max: estimate + 10 };
    }
  };

  const getConfidenceColor = () => {
    switch (confidence) {
      case 'high': return 'text-lime';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-muted-foreground';
    }
  };

  const getConfidenceLabel = () => {
    switch (confidence) {
      case 'high': return 'Based on runner history';
      case 'medium': return 'Estimated';
      case 'low': return 'Approximate';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
        <Clock size={16} />
        <span>Calculating...</span>
      </div>
    );
  }

  const range = getEstimateRange();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="bg-lime/20 p-2 rounded-lg">
          <Clock size={20} className="text-lime" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {range.min}-{range.max} min
            </span>
            {confidence === 'high' && (
              <Zap size={14} className="text-lime" />
            )}
          </div>
          <p className={`text-xs ${getConfidenceColor()}`}>
            {getConfidenceLabel()}
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time of day</span>
            <span className="capitalize">{getTimeOfDay()}</span>
          </div>
          {runnerId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Runner assigned</span>
              <span className="text-lime">Yes</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Confidence</span>
            <span className={getConfidenceColor()}>{confidence}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for order cards
export const DeliveryEstimateBadge = ({ runnerId }: { runnerId?: string | null }) => {
  const [estimate, setEstimate] = useState<number | null>(null);

  useEffect(() => {
    const fetchEstimate = async () => {
      const hour = new Date().getHours();
      let timeOfDay = 'afternoon';
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
      else if (hour >= 21 || hour < 6) timeOfDay = 'night';

      const { data } = await (supabase.rpc as any)('calculate_delivery_estimate', {
        p_runner_id: runnerId || null,
        p_time_of_day: timeOfDay
      });

      if (data) setEstimate(data as number);
    };

    fetchEstimate();
  }, [runnerId]);

  if (!estimate) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-lime/20 text-lime text-xs font-bold rounded">
      <Clock size={12} />
      ~{estimate} min
    </span>
  );
};
