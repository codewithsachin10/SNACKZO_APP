import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const StoreStatus = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusText, setStatusText] = useState("Checking...");
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetchConfig();

    // Refresh every minute for time-based logic if DB says "Open" (Auto mode), 
    // or just listen to DB changes.
    const interval = setInterval(updateStatus, 60000);
    const unsubscribe = subscribeToConfig();

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (config) updateStatus();
  }, [config]);

  const fetchConfig = async () => {
    const { data } = await supabase.from('store_config' as any).select('*').single();
    if (data) setConfig(data);
  };

  const subscribeToConfig = () => {
    const channel = supabase
      .channel('status-config')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_config' }, (payload) => {
        setConfig(payload.new);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  const updateStatus = () => {
    if (!config) return;

    // 1. Check Master Switch
    if (config.is_open === false) {
      setIsOpen(false);
      setStatusText("Temporarily Closed");
      return;
    }

    // 2. Check Time Schedule if Master Switch is TRUE
    const now = new Date();
    // Parse HH:MM from config or default
    const [openH, openM] = (config.operating_hours_open || "20:00").split(':').map(Number);
    const [closeH, closeM] = (config.operating_hours_close || "03:00").split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    let isOpenTime = false;

    // Handle overnight schedule (e.g. 20:00 to 03:00)
    if (closeMinutes < openMinutes) {
      if (currentMinutes >= openMinutes || currentMinutes < closeMinutes) {
        isOpenTime = true;
      }
    } else {
      // Normal day schedule (e.g. 09:00 to 17:00)
      if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
        isOpenTime = true;
      }
    }

    setIsOpen(isOpenTime);

    if (isOpenTime) {
      // Calculate closing time for display
      let closing = new Date();
      closing.setHours(closeH, closeM, 0, 0);
      if (currentMinutes >= closeMinutes && closeMinutes < openMinutes) {
        // If currently early morning (e.g. 1 AM) and close is 3 AM, closing is today.
        // Logic handles correctly by Date setHours.
      } else if (closeMinutes < openMinutes && currentMinutes >= openMinutes) {
        // If currently late night (22 PM) and close is 3 AM tomorrow
        closing.setDate(closing.getDate() + 1);
      }

      const diff = closing.getTime() - now.getTime();
      if (diff > 0) {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setStatusText(`Closes in ${h}h ${m}m`);
      } else {
        setStatusText("Closing soon");
      }
    } else {
      // Calculate opening time
      let opening = new Date();
      opening.setHours(openH, openM, 0, 0);
      if (currentMinutes >= openMinutes || (closeMinutes < openMinutes && currentMinutes >= closeMinutes)) {
        // If currently after open (but closed?), or early morning after close.
        // If we are closed, we must be waiting for next open.
        if (now.getTime() > opening.getTime()) opening.setDate(opening.getDate() + 1);
      }

      const diff = opening.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setStatusText(`Opens in ${h}h ${m}m`);
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${isOpen
        ? "bg-lime/10 border-lime/30 text-lime"
        : "bg-destructive/10 border-destructive/30 text-destructive"
      }`}>
      <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-lime animate-pulse" : "bg-destructive"}`} />
      <span className="font-bold text-sm uppercase tracking-wider">
        {isOpen ? "Open" : "Closed"}
      </span>
      <span className="text-xs opacity-80">• {statusText}</span>
    </div>
  );
};

export default StoreStatus;
