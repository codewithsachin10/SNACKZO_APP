import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const defaultAnnouncements = [
  "⚡ 15 min average delivery time",
  "🌙 Open 8 PM - 3 AM daily",
  "💳 UPI & Cash accepted",
];

const MarqueeAnnouncement = () => {
  const [announcements, setAnnouncements] = useState<string[]>(defaultAnnouncements);

  useEffect(() => {
    fetchConfig();
    const unsubscribe = subscribeToConfig();
    return () => { unsubscribe(); };
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase.from('store_config' as any).select('announcement_text, promo_text').single();
    if (data) {
      updateAnnouncements(data);
    }
  };

  const updateAnnouncements = (data: any) => {
    const newAnnouncements = [...defaultAnnouncements];
    // Add high priority dynamic announcements to the front
    if (data.promo_text) newAnnouncements.unshift(`🔥 ${data.promo_text}`);
    if (data.announcement_text) newAnnouncements.unshift(`📢 ${data.announcement_text}`);
    setAnnouncements(newAnnouncements);
  };

  const subscribeToConfig = () => {
    const channel = supabase
      .channel('marquee-config')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_config' }, (payload) => {
        updateAnnouncements(payload.new);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  return (
    <div className="mt-16 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 border-y border-border py-3 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap flex">
        {/* Duplicate list multiple times for smooth infinite scroll */}
        {[...announcements, ...announcements, ...announcements].map((text, index) => (
          <span
            key={index}
            className="mx-8 text-sm font-bold uppercase tracking-wider text-foreground"
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeAnnouncement;
