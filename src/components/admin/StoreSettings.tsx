import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Clock, DollarSign, Bell, Save, Megaphone, Send, Store, Lock, Unlock, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StoreConfig {
  id: string;
  is_open: boolean;
  announcement_text: string;
  promo_text: string;
  operating_hours_open: string;
  operating_hours_close: string;
  delivery_fee: number;
  free_delivery_threshold: number;
}

const StoreSettings = () => {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('store_config' as any)
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newData } = await supabase
            .from('store_config' as any)
            .insert([{ is_open: true }])
            .select()
            .single();
          if (newData) { setConfig(newData as any); setLoading(false); return; }
        }
        throw error;
      };
      if (data) setConfig(data as any);
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error("Could not load store settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('store_config' as any)
        .update({
          is_open: config.is_open,
          announcement_text: config.announcement_text,
          promo_text: config.promo_text,
          operating_hours_open: config.operating_hours_open,
          operating_hours_close: config.operating_hours_close,
          delivery_fee: config.delivery_fee,
          free_delivery_threshold: config.free_delivery_threshold
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error('Error saving:', error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const sendNotification = async (type: 'announcement' | 'promo') => {
    if (!config) return;
    const message = type === 'announcement' ? config.announcement_text : config.promo_text;
    if (!message) {
      toast.error("Please enter a message first");
      return;
    }

    setBroadcasting(true);
    try {
      const { error } = await supabase.from('notifications' as any).insert({
        title: type === 'announcement' ? '📢 Announcement' : '🔥 New Offer!',
        body: message,
        type: type === 'announcement' ? 'announcement' : 'promo'
      });

      if (error) throw error;

      // Trigger Push Notification Edge Function
      await supabase.functions.invoke('send-push-notification', {
        body: {
          title: type === 'announcement' ? '📢 Announcement' : '🔥 New Offer!',
          body: message,
          url: '/'
        }
      });

      toast.success(`${type === 'announcement' ? 'Announcement' : 'Offer'} broadcasted!`);
    } catch (error) {
      console.error('Error sending:', error);
      toast.error("Failed to broadcast");
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!config) return <div className="text-center py-10">Error loading configuration.</div>;

  return (
    <div className="max-w-4xl space-y-8 pb-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Store Configuration</h2>
        <p className="text-muted-foreground">Manage your store's operating status, fees, and global announcements.</p>
      </div>

      {/* Store Status Card */}
      <div className="glass-card p-0 overflow-hidden border-l-4 border-l-primary shadow-lg shadow-primary/5">
        <div className="p-6 bg-gradient-to-r from-background to-primary/5">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-primary" />
            Store Status
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <button
              onClick={() => setConfig({ ...config, is_open: !config.is_open })}
              className={`relative group w-full sm:w-auto px-8 py-5 rounded-2xl font-black uppercase tracking-wider transition-all duration-300 transform active:scale-95 shadow-xl ${config.is_open
                ? "bg-gradient-to-br from-lime to-lime-600 text-white shadow-lime/30"
                : "bg-gradient-to-br from-destructive to-red-600 text-white shadow-destructive/30"
                }`}
            >
              <div className="flex items-center justify-center gap-3">
                {config.is_open ? <Unlock size={24} /> : <Lock size={24} />}
                <span className="text-xl">{config.is_open ? "OPEN" : "CLOSED"}</span>
              </div>
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <div className="flex-1 text-center sm:text-left">
              <p className="font-bold text-xl mb-1">
                The store is currently <span className={config.is_open ? "text-lime" : "text-destructive"}>{config.is_open ? 'Open' : 'Closed'}</span>
              </p>
              <p className="text-muted-foreground text-sm">
                {config.is_open
                  ? "Customers can browse and place orders immediately."
                  : "Customers can browse but cannot place new orders."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Announcements */}
        <div className="glass-card p-6 flex flex-col h-full border-t-4 border-t-orange-500 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-orange-500">
            <Bell className="w-5 h-5" />
            Global Announcement
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Display a banner message at the top of the app.</p>

          <div className="flex-1 space-y-3">
            <textarea
              value={config.announcement_text || ''}
              onChange={(e) => setConfig({ ...config, announcement_text: e.target.value })}
              placeholder="e.g. We are closed for maintenance until 2 PM."
              className="w-full h-24 glass-card p-3 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 rounded-xl"
            />
            <button
              onClick={() => sendNotification('announcement')}
              disabled={broadcasting || !config.announcement_text}
              className="w-full py-2.5 bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={16} /> Broadcast Notification
            </button>
          </div>
        </div>

        {/* Promotions */}
        <div className="glass-card p-6 flex flex-col h-full border-t-4 border-t-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-purple-600">
            <Megaphone className="w-5 h-5" />
            Promotions & Offers
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Highlight special deals on the home screen.</p>

          <div className="flex-1 space-y-3">
            <textarea
              value={config.promo_text || ''}
              onChange={(e) => setConfig({ ...config, promo_text: e.target.value })}
              placeholder="e.g. Free Delivery on orders above ₹200!"
              className="w-full h-24 glass-card p-3 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-xl"
            />
            <button
              onClick={() => sendNotification('promo')}
              disabled={broadcasting || !config.promo_text}
              className="w-full py-2.5 bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={16} /> Broadcast Offer
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Operating Hours */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Operating Hours
          </h3>
          <div className="space-y-5">
            <div className="relative">
              <label className="text-xs font-bold uppercase text-muted-foreground absolute -top-2.5 left-3 bg-background px-1">Opens At</label>
              <input
                type="time"
                value={config.operating_hours_open}
                onChange={(e) => setConfig({ ...config, operating_hours_open: e.target.value })}
                className="w-full glass-card px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="relative">
              <label className="text-xs font-bold uppercase text-muted-foreground absolute -top-2.5 left-3 bg-background px-1">Closes At</label>
              <input
                type="time"
                value={config.operating_hours_close}
                onChange={(e) => setConfig({ ...config, operating_hours_close: e.target.value })}
                className="w-full glass-card px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Delivery Config */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            Fees & delivery
          </h3>
          <div className="space-y-5">
            <div className="relative">
              <label className="text-xs font-bold uppercase text-muted-foreground absolute -top-2.5 left-3 bg-background px-1">Delivery Fee (₹)</label>
              <input
                type="number"
                value={config.delivery_fee}
                onChange={(e) => setConfig({ ...config, delivery_fee: Number(e.target.value) })}
                className="w-full glass-card px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="relative">
              <label className="text-xs font-bold uppercase text-muted-foreground absolute -top-2.5 left-3 bg-background px-1">Free Delivery Above (₹)</label>
              <input
                type="number"
                value={config.free_delivery_threshold}
                onChange={(e) => setConfig({ ...config, free_delivery_threshold: Number(e.target.value) })}
                className="w-full glass-card px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button Fixed/Floating */}
      <div className="sticky bottom-6 pt-4 bg-gradient-to-t from-background via-background/90 to-transparent pb-4 z-10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full neon-btn bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 disabled:pointer-events-none"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save size={20} />
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StoreSettings;
