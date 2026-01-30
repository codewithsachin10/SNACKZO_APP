import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureToggle {
  feature_name: string;
  is_enabled: boolean;
  display_name?: string;
  description?: string;
  category?: string;
}

interface FeatureContextType {
  features: Record<string, FeatureToggle>;
  isFeatureEnabled: (key: string) => boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Record<string, FeatureToggle>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeatures = async () => {
    try {
      const { data, error } = await (supabase.from as any)('feature_toggles')
        .select('*');

      if (error) {
        console.error("Error fetching feature toggles:", error);
        // Fallback to defaults or empty if error
        if (Object.keys(features).length === 0) setDefaultFeatures();
        return;
      }

      if (data && data.length > 0) {
        const featureMap: Record<string, FeatureToggle> = {};
        data.forEach((f: any) => {
          featureMap[f.feature_name] = {
            feature_name: f.feature_name,
            is_enabled: f.is_enabled,
            display_name: f.display_name,
            description: f.description,
            category: f.category
          };
        });
        setFeatures(featureMap);
      } else {
        setDefaultFeatures();
      }
    } catch (err) {
      console.error("Exception fetching feature toggles:", err);
      setDefaultFeatures();
    } finally {
      setIsLoading(false);
    }
  };

  // Safe defaults while loading or on error
  const setDefaultFeatures = () => {
    const defaults: Record<string, FeatureToggle> = {
      store_open_status: { feature_name: 'store_open_status', is_enabled: true },
      enable_delivery: { feature_name: 'enable_delivery', is_enabled: true },
      snackzopay_gateway: { feature_name: 'snackzopay_gateway', is_enabled: true },
      enable_cod: { feature_name: 'enable_cod', is_enabled: true },
      enable_tips: { feature_name: 'enable_tips', is_enabled: true },
      maintenance_mode: { feature_name: 'maintenance_mode', is_enabled: false },
    };
    setFeatures(prev => ({ ...defaults, ...prev }));
  };

  useEffect(() => {
    fetchFeatures();

    // Subscribe to changes
    const channel = supabase
      .channel('feature_context_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_toggles' },
        (payload) => {
          // Optimistic update or refetch
          if (payload.new && 'feature_name' in payload.new) {
            setFeatures(prev => ({
              ...prev,
              [payload.new.feature_name]: payload.new as FeatureToggle
            }));
          } else {
            fetchFeatures();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isFeatureEnabled = (key: string): boolean => {
    // If we have the feature in state, return its status. 
    // Otherwise, return true by default to avoid blocking features if DB is slow (FAIL OPEN policy for non-critical)
    // EXCEPT for maintenance_mode which should fail CLOSED (false).
    if (key === 'maintenance_mode') return features[key]?.is_enabled ?? false;

    // Strict check: if it exists, return value. If not, assume true (or false depending on strategy).
    // Let's go with: if not found, assume ENABLED for business continuity, unless critical.
    return features[key]?.is_enabled ?? true;
  };

  return (
    <FeatureContext.Provider value={{
      features,
      isFeatureEnabled,
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
