import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings, Zap, Bell, Gift, ToggleLeft, ToggleRight,
  Check, X, RefreshCw, AlertCircle, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FeatureToggle {
  id: string;
  feature_name: string;
  display_name: string;
  description: string;
  is_enabled: boolean;
  icon: string;
  category: string;
  updated_at: string;
}

const FEATURE_ICONS: Record<string, React.ElementType> = {
  flash_deals: Zap,
  price_alerts: Bell,
  spin_wheel: Gift,
  demo_otp_mode: AlertCircle
};

const DEFAULT_FEATURES: Omit<FeatureToggle, "id" | "updated_at">[] = [
  {
    feature_name: "flash_deals",
    display_name: "Flash Deals & Coupons",
    description: "Time-limited offers and promotional codes for customers",
    is_enabled: true,
    icon: "flash_deals",
    category: "promotions"
  },
  {
    feature_name: "price_alerts",
    display_name: "Price Drop Alerts",
    description: "Allow customers to set alerts for price drops on products",
    is_enabled: true,
    icon: "price_alerts",
    category: "engagement"
  },
  {
    feature_name: "spin_wheel",
    display_name: "Spin-the-Wheel Rewards",
    description: "Daily spin game for customers to win points and discounts",
    is_enabled: true,
    icon: "spin_wheel",
    category: "gamification"
  },
  {
    feature_name: "demo_otp_mode",
    display_name: "Demo OTP Mode",
    description: "When email fails, show OTP in a popup instead. Enable this for testing/demo purposes.",
    is_enabled: false,
    icon: "demo_otp_mode",
    category: "developer"
  }
];

export function AdminFeatureControls() {
  const { toast } = useToast();
  const [features, setFeatures] = useState<FeatureToggle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingFeature, setUpdatingFeature] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    setIsLoading(true);
    const { data, error } = await (supabase.from as any)("feature_toggles")
      .select("*")
      .order("feature_name");

    if (!error && data && data.length > 0) {
      setFeatures(data);
    } else {
      // Initialize with defaults if no features exist
      setFeatures(DEFAULT_FEATURES.map((f, i) => ({
        ...f,
        id: `default_${i}`,
        updated_at: new Date().toISOString()
      })));
    }
    setIsLoading(false);
  };

  const toggleFeature = async (feature: FeatureToggle) => {
    setUpdatingFeature(feature.feature_name);

    const newState = !feature.is_enabled;

    const { error } = await (supabase.from as any)("feature_toggles")
      .update({
        is_enabled: newState,
        updated_at: new Date().toISOString()
      })
      .eq("feature_name", feature.feature_name);

    if (!error) {
      setFeatures(features.map(f =>
        f.feature_name === feature.feature_name
          ? { ...f, is_enabled: newState, updated_at: new Date().toISOString() }
          : f
      ));

      toast({
        title: newState ? "Feature Enabled" : "Feature Disabled",
        description: `${feature.display_name} is now ${newState ? "active" : "inactive"}`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update feature",
        variant: "destructive"
      });
    }

    setUpdatingFeature(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const groupedFeatures = features.reduce((acc, feature) => {
    const category = feature.category || "general";
    if (!acc[category]) acc[category] = [];
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, FeatureToggle[]>);

  const categoryLabels: Record<string, { label: string; description: string }> = {
    promotions: {
      label: "Promotions & Offers",
      description: "Manage deals, discounts, and promotional features"
    },
    engagement: {
      label: "Customer Engagement",
      description: "Features that keep customers engaged with your store"
    },
    gamification: {
      label: "Gamification",
      description: "Fun and interactive features to boost customer loyalty"
    },
    developer: {
      label: "🛠️ Developer Tools",
      description: "Testing and development features (disable in production)"
    },
    general: {
      label: "General Features",
      description: "Other platform features"
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="text-primary" size={24} />
            Feature Controls
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable features across the platform
          </p>
        </div>
        <button
          onClick={fetchFeatures}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-xl">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="font-medium text-blue-700">Feature Toggle Guide</p>
          <p className="text-sm text-blue-600">
            Disabled features will be hidden from customers but their data will be preserved.
            You can re-enable them anytime without losing any configuration.
          </p>
        </div>
      </div>

      {/* Feature categories */}
      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <div key={category} className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">
              {categoryLabels[category]?.label || category}
            </h3>
            <p className="text-sm text-muted-foreground">
              {categoryLabels[category]?.description || ""}
            </p>
          </div>

          <div className="space-y-3">
            {categoryFeatures.map((feature) => {
              const IconComponent = FEATURE_ICONS[feature.icon] || Settings;
              const isUpdating = updatingFeature === feature.feature_name;

              return (
                <motion.div
                  key={feature.feature_name}
                  layout
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    feature.is_enabled
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2.5 rounded-lg shrink-0",
                        feature.is_enabled
                          ? "bg-green-500/20 text-green-600"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <IconComponent size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{feature.display_name}</h4>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            feature.is_enabled
                              ? "bg-green-500/20 text-green-600"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {feature.is_enabled ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Last updated: {new Date(feature.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleFeature(feature)}
                      disabled={isUpdating}
                      className={cn(
                        "relative w-14 h-8 rounded-full transition-colors shrink-0",
                        feature.is_enabled ? "bg-green-500" : "bg-muted",
                        isUpdating && "opacity-50"
                      )}
                    >
                      <motion.div
                        animate={{ x: feature.is_enabled ? 26 : 4 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center"
                      >
                        {isUpdating ? (
                          <RefreshCw size={12} className="animate-spin text-muted-foreground" />
                        ) : feature.is_enabled ? (
                          <Check size={12} className="text-green-500" />
                        ) : (
                          <X size={12} className="text-muted-foreground" />
                        )}
                      </motion.div>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quick stats */}
      <div className="p-4 bg-muted/50 rounded-xl">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Active Features</span>
          <span className="font-bold">
            {features.filter(f => f.is_enabled).length} / {features.length}
          </span>
        </div>
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{
              width: `${(features.filter(f => f.is_enabled).length / features.length) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// QUICK TOGGLE FOR ADMIN SIDEBAR
// ============================================

interface QuickFeatureToggleProps {
  featureName: string;
  compact?: boolean;
}

export function QuickFeatureToggle({ featureName, compact = false }: QuickFeatureToggleProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFeatureState();
  }, [featureName]);

  const fetchFeatureState = async () => {
    const { data } = await (supabase.from as any)("feature_toggles")
      .select("is_enabled")
      .eq("feature_name", featureName)
      .single();

    if (data) {
      setIsEnabled(data.is_enabled);
    }
    setIsLoading(false);
  };

  const toggle = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);

    await (supabase.from as any)("feature_toggles")
      .update({ is_enabled: newState })
      .eq("feature_name", featureName);
  };

  if (isLoading) {
    return <div className="w-10 h-5 bg-muted animate-pulse rounded-full" />;
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        className={cn(
          "w-10 h-5 rounded-full transition-colors relative",
          isEnabled ? "bg-green-500" : "bg-muted"
        )}
      >
        <motion.div
          animate={{ x: isEnabled ? 20 : 2 }}
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
        />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
        isEnabled
          ? "bg-green-500/10 text-green-600"
          : "bg-muted text-muted-foreground"
      )}
    >
      {isEnabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
      {isEnabled ? "Enabled" : "Disabled"}
    </button>
  );
}
