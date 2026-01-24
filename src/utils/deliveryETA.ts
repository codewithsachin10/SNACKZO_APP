/**
 * Enhanced Delivery ETA Calculation Service
 * Calculates real-time delivery estimates based on multiple factors
 */

import { supabase } from "@/integrations/supabase/client";

export interface ETAFactors {
  runnerId?: string | null;
  orderId?: string;
  isExpress?: boolean;
  timeOfDay?: string;
  orderQueue?: number;
  distanceKm?: number;
  trafficLevel?: 'low' | 'medium' | 'high';
}

export interface ETAResult {
  estimatedMinutes: number;
  estimatedSeconds: number;
  estimatedTime: Date;
  confidence: 'high' | 'medium' | 'low';
  factors: {
    baseTime: number;
    queueDelay: number;
    trafficDelay: number;
    distanceDelay: number;
    expressBonus: number;
  };
}

/**
 * Calculate enhanced delivery ETA
 */
export async function calculateEnhancedETA(factors: ETAFactors): Promise<ETAResult> {
  const {
    runnerId,
    orderId,
    isExpress = false,
    timeOfDay,
    orderQueue,
    distanceKm,
    trafficLevel
  } = factors;

  // Base delivery time (in minutes)
  let baseTime = isExpress ? 10 : 15;

  // Get time of day if not provided
  const currentTimeOfDay = timeOfDay || getTimeOfDay();

  // Get order queue if not provided
  const queue = orderQueue !== undefined ? orderQueue : await getOrderQueue(runnerId);

  // Get distance if not provided
  const distance = distanceKm !== undefined ? distanceKm : await getEstimatedDistance(orderId);

  // Get traffic level if not provided
  const traffic = trafficLevel || await getTrafficLevel();

  // Calculate delays
  const queueDelay = calculateQueueDelay(queue);
  const trafficDelay = calculateTrafficDelay(traffic, currentTimeOfDay);
  const distanceDelay = calculateDistanceDelay(distance);
  const expressBonus = isExpress ? -2 : 0; // Express orders get 2 min bonus

  // Runner-specific adjustments
  let runnerAdjustment = 0;
  if (runnerId) {
    const runnerStats = await getRunnerStats(runnerId);
    if (runnerStats) {
      // If runner is faster than average, reduce time
      if (runnerStats.avgDeliveryTime < baseTime) {
        runnerAdjustment = -(baseTime - runnerStats.avgDeliveryTime) * 0.3;
      }
    }
  }

  // Calculate total estimated time
  const totalMinutes = Math.max(
    isExpress ? 8 : 10, // Minimum 8 min for express, 10 for regular
    Math.round(
      baseTime +
      queueDelay +
      trafficDelay +
      distanceDelay +
      expressBonus +
      runnerAdjustment
    )
  );

  // Calculate confidence
  const confidence = calculateConfidence(runnerId, queue, traffic);

  // Calculate estimated arrival time
  const estimatedTime = new Date(Date.now() + totalMinutes * 60000);

  return {
    estimatedMinutes: totalMinutes,
    estimatedSeconds: totalMinutes * 60,
    estimatedTime,
    confidence,
    factors: {
      baseTime,
      queueDelay,
      trafficDelay,
      distanceDelay,
      expressBonus
    }
  };
}

/**
 * Get current time of day category
 */
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Get order queue for runner
 */
async function getOrderQueue(runnerId?: string | null): Promise<number> {
  if (!runnerId) return 0;

  try {
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("runner_id", runnerId)
      .in("status", ["packed", "out_for_delivery"]);

    return count || 0;
  } catch (error) {
    console.error("Error fetching order queue:", error);
    return 0;
  }
}

/**
 * Get estimated distance for order
 */
async function getEstimatedDistance(orderId?: string): Promise<number> {
  if (!orderId) return 0.5; // Default 500m

  try {
    const { data } = await (supabase.from as any)("delivery_estimates")
      .select("distance_km")
      .eq("order_id", orderId)
      .maybeSingle();

    return data?.distance_km || 0.5;
  } catch (error) {
    return 0.5; // Default distance
  }
}

/**
 * Get current traffic level (simulated - in production, use Google Maps API)
 */
async function getTrafficLevel(): Promise<'low' | 'medium' | 'high'> {
  const hour = new Date().getHours();

  // Peak hours: 8-10 AM, 5-8 PM
  if ((hour >= 8 && hour < 10) || (hour >= 17 && hour < 20)) {
    return 'high';
  }

  // Moderate: 10 AM - 5 PM
  if (hour >= 10 && hour < 17) {
    return 'medium';
  }

  // Low traffic: night and early morning
  return 'low';
}

/**
 * Calculate delay based on order queue
 */
function calculateQueueDelay(queue: number): number {
  // Each pending order adds 3-5 minutes
  return queue * 4;
}

/**
 * Calculate delay based on traffic
 */
function calculateTrafficDelay(traffic: 'low' | 'medium' | 'high', timeOfDay: string): number {
  const baseMultipliers = {
    low: 0,
    medium: 2,
    high: 5
  };

  // Evening rush hour adds extra delay
  if (timeOfDay === 'evening' && traffic === 'high') {
    return baseMultipliers.high + 3;
  }

  return baseMultipliers[traffic];
}

/**
 * Calculate delay based on distance
 */
function calculateDistanceDelay(distanceKm: number): number {
  // Base: 1 minute per 0.5km
  return Math.round(distanceKm * 2);
}

/**
 * Get runner statistics
 */
async function getRunnerStats(runnerId: string): Promise<{
  avgDeliveryTime: number;
  totalDeliveries: number;
} | null> {
  try {
    const { data } = await supabase
      .from("orders")
      .select("created_at, delivered_at")
      .eq("runner_id", runnerId)
      .eq("status", "delivered")
      .not("delivered_at", "is", null)
      .order("delivered_at", { ascending: false })
      .limit(20);

    if (!data || data.length === 0) return null;

    const deliveryTimes = data
      .map(order => {
        const created = new Date(order.created_at);
        const delivered = new Date(order.delivered_at);
        return (delivered.getTime() - created.getTime()) / 60000; // minutes
      })
      .filter(time => time > 0 && time < 60); // Filter outliers

    if (deliveryTimes.length === 0) return null;

    const avgDeliveryTime = deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length;

    return {
      avgDeliveryTime: Math.round(avgDeliveryTime),
      totalDeliveries: deliveryTimes.length
    };
  } catch (error) {
    console.error("Error fetching runner stats:", error);
    return null;
  }
}

/**
 * Calculate confidence level
 */
function calculateConfidence(
  runnerId?: string | null,
  queue?: number,
  traffic?: 'low' | 'medium' | 'high'
): 'high' | 'medium' | 'low' {
  let score = 0;

  // Runner assigned: +2
  if (runnerId) score += 2;

  // Low queue: +1
  if (queue !== undefined && queue <= 1) score += 1;

  // Low traffic: +1
  if (traffic === 'low') score += 1;

  if (score >= 3) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

/**
 * Format ETA for display
 */
export function formatETA(eta: ETAResult): string {
  const { estimatedMinutes, estimatedTime, confidence } = eta;

  if (estimatedMinutes < 1) {
    return "Less than 1 minute";
  }

  if (estimatedMinutes < 60) {
    return `${estimatedMinutes} min`;
  }

  const hours = Math.floor(estimatedMinutes / 60);
  const minutes = estimatedMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/**
 * Get countdown seconds until delivery
 */
export function getCountdownSeconds(estimatedTime: Date): number {
  const now = new Date();
  const diff = estimatedTime.getTime() - now.getTime();
  return Math.max(0, Math.floor(diff / 1000));
}
