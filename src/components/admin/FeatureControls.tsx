import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings, Zap, Bell, Gift, ToggleLeft, ToggleRight,
  Check, X, RefreshCw, AlertCircle, Info,
  Store, Truck, Bot, Banknote, Coins, Wallet,
  Sparkles, Construction, Ghost, Lock, ShieldAlert,
  Smartphone, Mail, ShoppingBag, MessageSquare
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
  icon_key?: string; // Updated to match DB Column
  icon?: string;     // Backward compatibility for existing code logic
  category: string;
  updated_at: string;
}

const FEATURE_ICONS: Record<string, React.ElementType> = {
  // Operations
  store: Store,
  truck: Truck,
  bot: Bot,

  // Financial
  banknote: Banknote,
  coins: Coins,
  wallet: Wallet,

  // Growth
  gift: Gift,
  sparkles: Sparkles,

  // System/Security
  construction: Construction,
  ghost: Ghost,
  lock: Lock,
  shield: ShieldAlert,

  // Existing
  flash_deals: Zap,
  price_alerts: Bell,
  spin_wheel: Gift,
  demo_otp_mode: Smartphone,
  email_simulation: Mail,
  sms: MessageSquare,

  // Defaults
  settings: Settings,
  promotions: Zap,
  engagement: Bell,
  shopping: ShoppingBag
};

const DEFAULT_FEATURES: Omit<FeatureToggle, "id" | "updated_at">[] = [
  // 🏪 Operations
  {
    feature_name: "store_open_status",
    display_name: "Master Store Status",
    description: "Global switch to open or close the store. When closed, no new orders can be placed.",
    is_enabled: true,
    icon_key: "store",
    category: "operations"
  },
  {
    feature_name: "enable_delivery",
    display_name: "Delivery Service",
    description: "Toggle delivery availability. If disabled, store switches to 'Pickup Only' mode.",
    is_enabled: true,
    icon_key: "truck",
    category: "operations"
  },
  {
    feature_name: "auto_runner_logic",
    display_name: "AI Runner Assignment",
    description: "Automatically assign the nearest available runner to new orders using geolocation logic.",
    is_enabled: true,
    icon_key: "bot",
    category: "operations"
  },

  // 💰 Financial
  {
    feature_name: "enable_cod",
    display_name: "Cash on Delivery (COD)",
    description: "Allow customers to pay via Cash on Delivery. Disable to force online payments.",
    is_enabled: true,
    icon_key: "banknote",
    category: "financial"
  },
  {
    feature_name: "enable_tips",
    display_name: "Runner Tipping",
    description: "Enable the tipping interface during checkout to allow customers to tip runners.",
    is_enabled: true,
    icon_key: "coins",
    category: "financial"
  },
  {
    feature_name: "snackzopay_gateway",
    display_name: "SnackzoPay Gateway",
    description: "Master switch for SnackzoPay Payment Gateway.",
    is_enabled: true,
    icon_key: "wallet",
    category: "financial"
  },

  // 🚀 Growth
  {
    feature_name: "flash_deals",
    display_name: "Flash Deals & Coupons",
    description: "Time-limited offers and promotional codes for customers",
    is_enabled: true,
    icon_key: "flash_deals",
    category: "growth"
  },
  {
    feature_name: "referral_system",
    display_name: "Referral & Earn",
    description: "Enable the referral program allowing users to invite friends for rewards.",
    is_enabled: true,
    icon_key: "gift",
    category: "growth"
  },

  // 🔔 Engagement
  {
    feature_name: "enable_sms",
    display_name: "SMS Notifications",
    description: "Master switch for sending SMS via Fast2SMS. Disable to stop all outgoing SMS.",
    is_enabled: true,
    icon_key: "sms",
    category: "engagement"
  },

  // 🛡️ Security / System
  {
    feature_name: "maintenance_mode",
    display_name: "System Maintenance Mode",
    description: "Put the entire user-facing app into maintenance mode. Only admins can access.",
    is_enabled: false,
    icon_key: "construction",
    category: "system"
  },
  {
    feature_name: "demo_otp_mode",
    display_name: "Demo OTP Mode",
    description: "When email fails, show OTP in a popup instead. Enable for testing.",
    is_enabled: false,
    icon_key: "demo_otp_mode",
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
      .order("category", { ascending: false }) // Rudimentary grouping sort
      .order("feature_name");

    if (!error && data && data.length > 0) {
      setFeatures(data);
    } else {
      // Initialize with defaults if no features exist
      setFeatures(DEFAULT_FEATURES.map((f, i) => ({
        ...f,
        id: `default_${i}`,
        updated_at: new Date().toISOString(),
        icon: f.icon || f.icon_key // Fallback
      } as FeatureToggle)));
    }
    setIsLoading(false);
  };
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    feature: FeatureToggle | null;
    action: "enable" | "disable";
    inputValue: string;
  }>({
    isOpen: false,
    feature: null,
    action: "enable",
    inputValue: ""
  });

  const initiateToggle = (feature: FeatureToggle) => {
    setConfirmModal({
      isOpen: true,
      feature,
      action: feature.is_enabled ? "disable" : "enable",
      inputValue: ""
    });
  };

  const confirmToggle = async () => {
    if (!confirmModal.feature) return;

    const feature = confirmModal.feature;
    const newState = confirmModal.action === "enable";
    setUpdatingFeature(feature.feature_name);
    setConfirmModal(prev => ({ ...prev, isOpen: false })); // Close modal immediately

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
        className: newState ? "border-green-500 bg-green-50" : "border-slate-200",
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
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-xl" />
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

  // Define sort order for categories
  const categoryOrder = ["operations", "financial", "growth", "engagement", "gamification", "security", "system", "developer", "general"];

  const categoryLabels: Record<string, { label: string; description: string; color: string }> = {
    operations: {
      label: "🏪 Operations & Logistics",
      description: "Manage core store functionality, delivery, and runner assignments.",
      color: "text-blue-500"
    },
    financial: {
      label: "💰 Payments & Finance",
      description: "Control payment methods, tipping, and wallet systems.",
      color: "text-emerald-500"
    },
    growth: {
      label: "🚀 Growth & Marketing",
      description: "Referral programs, signup bonuses, and viral features.",
      color: "text-purple-500"
    },
    promotions: {
      label: "🎁 Promotions & Offers",
      description: "Manage deals, discounts, and promotional features",
      color: "text-pink-500"
    },
    engagement: {
      label: "🔔 Customer Engagement",
      description: "Features that keep customers engaged with your store",
      color: "text-amber-500"
    },
    gamification: {
      label: "🎮 Gamification",
      description: "Fun and interactive features to boost customer loyalty",
      color: "text-orange-500"
    },
    security: {
      label: "🛡️ Security Controls",
      description: "Access control, guest checkout permissions, and fraud prevention.",
      color: "text-red-500"
    },
    system: {
      label: "⚙️ System & Maintenance",
      description: "Critical system-wide controls and maintenance modes.",
      color: "text-slate-500"
    },
    developer: {
      label: "🛠️ Developer Tools",
      description: "Testing and development features (disable in production)",
      color: "text-gray-400"
    },
    general: {
      label: "✨ General Features",
      description: "Other platform features",
      color: "text-indigo-500"
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="text-primary animate-spin-slow" size={28} />
            Feature Controls
          </h2>
          <p className="text-muted-foreground mt-1 text-base">
            Toggle platform capabilities in real-time. ("God Mode")
          </p>
        </div>
        <button
          onClick={fetchFeatures}
          className="p-2.5 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border"
          title="Refresh Features"
        >
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/10 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Zap size={120} />
        </div>
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Info className="text-blue-500 shrink-0" size={24} />
        </div>
        <div>
          <h4 className="font-bold text-blue-500 text-lg">Feature Toggle Guide</h4>
          <p className="text-sm text-blue-600/80 mt-1 max-w-2xl leading-relaxed">
            Changes made here apply <strong>instantly</strong> to the live application.
            Disabled features are safely hidden from users without data loss.
            Use "Maintenance Mode" with caution.
          </p>
        </div>
      </div>

      {/* Feature categories */}
      {categoryOrder.filter(cat => groupedFeatures[cat]).map((category) => {
        const categoryFeatures = groupedFeatures[category];
        const config = categoryLabels[category];

        return (
          <div key={category} className="space-y-5">
            <div className="flex items-center gap-3 pb-2 border-b border-border/50">
              <h3 className={cn("font-bold text-xl flex items-center gap-2", config?.color)}>
                {config?.label || category}
              </h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {categoryFeatures.length}
              </span>
              <p className="text-sm text-muted-foreground ml-auto hidden md:block">
                {config?.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {categoryFeatures.map((feature) => {
                // Resolve Icon
                const iconKey = feature.icon_key || feature.icon || "settings";
                const IconComponent = FEATURE_ICONS[iconKey] || Settings;
                const isUpdating = updatingFeature === feature.feature_name;

                return (
                  <motion.div
                    layout
                    key={feature.feature_name}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                      "hover:shadow-lg hover:border-primary/20",
                      feature.is_enabled
                        ? "bg-card border-green-500/20"
                        : "bg-muted/30 border-dashed border-muted-foreground/30 opacity-70 hover:opacity-100"
                    )}
                  >
                    {/* Active Indicator Glow */}
                    {feature.is_enabled && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-3xl pointer-events-none" />
                    )}

                    <div className="p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className={cn(
                          "p-3 rounded-xl transition-colors",
                          feature.is_enabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <IconComponent size={24} />
                        </div>

                        <button
                          onClick={() => initiateToggle(feature)}
                          disabled={isUpdating}
                          className={cn(
                            "relative w-12 h-7 rounded-full transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                            feature.is_enabled ? "bg-green-500" : "bg-zinc-600",
                            isUpdating && "opacity-50 cursor-wait"
                          )}
                        >
                          <span className={cn(
                            "absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 flex items-center justify-center",
                            feature.is_enabled ? "translate-x-5" : "translate-x-0"
                          )}>
                            {isUpdating && <RefreshCw size={10} className="animate-spin text-zinc-400" />}
                          </span>
                        </button>
                      </div>

                      <div>
                        <h4 className={cn("font-bold text-base mb-1", feature.is_enabled ? "text-foreground" : "text-muted-foreground")}>
                          {feature.display_name}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-snug min-h-[40px]">
                          {feature.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{feature.category}</span>
                        <span className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-md",
                          feature.is_enabled ? "bg-green-500/10 text-green-600 font-medium" : "bg-zinc-500/10 text-zinc-500"
                        )}>
                          {feature.is_enabled ? <Check size={10} /> : <X size={10} />}
                          {feature.is_enabled ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.feature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className={cn(
              "absolute top-0 left-0 w-full h-1 bg-gradient-to-r",
              confirmModal.action === "enable" ? "from-green-500 to-emerald-500" : "from-red-500 to-orange-500"
            )} />

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              {confirmModal.action === "enable"
                ? <Zap className="text-green-500" />
                : <ShieldAlert className="text-red-500" />
              }
              {confirmModal.action === "enable" ? "Enable Feature?" : "Disable Feature?"}
            </h3>

            <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
              You are about to <strong className={confirmModal.action === "enable" ? "text-green-400" : "text-red-400"}>
                {confirmModal.action}
              </strong> the <strong>{confirmModal.feature.display_name}</strong>.
              {confirmModal.action === "disable" && " Users may lose access to this functionality immediately."}
            </p>

            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
              Type "{confirmModal.action === "enable" ? "Enable" : "Disable"}" to confirm
            </label>
            <input
              type="text"
              autoFocus
              className={cn(
                "w-full bg-black border rounded-lg p-3 text-white outline-none transition-all font-mono text-sm",
                confirmModal.action === "enable"
                  ? "focus:border-green-500 border-zinc-800"
                  : "focus:border-red-500 border-zinc-800"
              )}
              placeholder={`Type ${confirmModal.action === "enable" ? "Enable" : "Disable"}`}
              value={confirmModal.inputValue}
              onChange={e => setConfirmModal(prev => ({ ...prev, inputValue: e.target.value }))}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false, inputValue: "" }))}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggle}
                disabled={confirmModal.inputValue !== (confirmModal.action === "enable" ? "Enable" : "Disable")}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg",
                  confirmModal.action === "enable"
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-900/20"
                    : "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-red-900/20"
                )}
              >
                Confirm {confirmModal.action === "enable" ? "Enable" : "Disable"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
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
