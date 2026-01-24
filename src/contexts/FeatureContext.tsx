import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureToggle {
  feature_key: string;
  is_enabled: boolean;
  config: Record<string, any>;
}

interface FeatureContextType {
  features: Record<string, FeatureToggle>;
  isFeatureEnabled: (key: string) => boolean;
  getFeatureConfig: (key: string) => Record<string, any> | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Record<string, FeatureToggle>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const fetchFeatures = async () => {
    // Only try to fetch once to avoid console spam
    if (hasFetchedOnce) return;
    setHasFetchedOnce(true);

    try {
      const { data, error } = await (supabase.from as any)('feature_toggles')
        .select('*');

      if (error) {
        // Silently use defaults - table may not exist or RLS may be blocking
        setDefaultFeatures();
        return;
      }

      if (data && data.length > 0) {
        const featureMap: Record<string, FeatureToggle> = {};
        data.forEach((f: any) => {
          featureMap[f.feature_key] = {
            feature_key: f.feature_key,
            is_enabled: f.is_enabled,
            config: f.config || {}
          };
        });
        setFeatures(featureMap);
      } else {
        // No data in table, use defaults
        setDefaultFeatures();
      }
    } catch (err) {
      // Silently use defaults
      setDefaultFeatures();
    } finally {
      setIsLoading(false);
    }
  };

  // Default features when database table doesn't exist
  const setDefaultFeatures = () => {
    const defaults: Record<string, FeatureToggle> = {
      flash_deals: { feature_key: 'flash_deals', is_enabled: true, config: {} },
      price_alerts: { feature_key: 'price_alerts', is_enabled: true, config: {} },
      spin_wheel: { feature_key: 'spin_wheel', is_enabled: true, config: {} },
      split_payment: { feature_key: 'split_payment', is_enabled: true, config: {} },
      live_tracking: { feature_key: 'live_tracking', is_enabled: true, config: {} },
      order_scheduling: { feature_key: 'order_scheduling', is_enabled: true, config: {} },
      achievements: { feature_key: 'achievements', is_enabled: true, config: {} },
      social_sharing: { feature_key: 'social_sharing', is_enabled: true, config: {} },
      advanced_search: { feature_key: 'advanced_search', is_enabled: true, config: {} },
      product_gallery: { feature_key: 'product_gallery', is_enabled: true, config: {} },
      referral_program: { feature_key: 'referral_program', is_enabled: true, config: {} },
      loyalty_points: { feature_key: 'loyalty_points', is_enabled: true, config: {} },
    };
    setFeatures(defaults);
  };

  useEffect(() => {
    fetchFeatures();

    // Subscribe to changes
    const channel = supabase
      .channel('feature_toggles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_toggles' },
        () => {
          fetchFeatures();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isFeatureEnabled = (key: string): boolean => {
    return features[key]?.is_enabled ?? true; // Default to enabled
  };

  const getFeatureConfig = (key: string): Record<string, any> | null => {
    return features[key]?.config ?? null;
  };

  return (
    <FeatureContext.Provider value={{ 
      features, 
      isFeatureEnabled, 
      getFeatureConfig,
      isLoading, 
      refetch: fetchFeatures 
    }}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatures() {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
}
