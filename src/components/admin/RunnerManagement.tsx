import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, Phone, RefreshCw, UserCheck, UserX, Trash2, MessageSquare, MessageCircle } from "lucide-react";

interface Runner {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  notification_preference: string | null;
  created_at: string;
}

const RunnerManagement = () => {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "pending">("all");

  useEffect(() => {
    fetchRunners();
  }, []);

  const fetchRunners = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("runners")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch runners");
    } else {
      setRunners(data || []);
    }
    setIsLoading(false);
  };

  const toggleRunnerStatus = async (runnerId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("runners")
      .update({ is_active: !currentStatus })
      .eq("id", runnerId);

    if (error) {
      toast.error("Failed to update runner");
    } else {
      toast.success(currentStatus ? "Runner deactivated" : "Runner activated");
      fetchRunners();
    }
  };

  const updateNotificationPreference = async (runnerId: string, preference: string) => {
    const { error } = await supabase
      .from("runners")
      .update({ notification_preference: preference })
      .eq("id", runnerId);

    if (error) {
      toast.error("Failed to update preference");
    } else {
      toast.success(`Notification preference updated to ${preference}`);
      fetchRunners();
    }
  };

  const deleteRunner = async (runnerId: string) => {
    if (!confirm("Are you sure you want to delete this runner?")) return;

    const { error } = await supabase
      .from("runners")
      .delete()
      .eq("id", runnerId);

    if (error) {
      toast.error("Failed to delete runner");
    } else {
      toast.success("Runner deleted");
      fetchRunners();
    }
  };

  const filteredRunners = runners.filter(r => {
    if (filter === "active") return r.is_active;
    if (filter === "pending") return !r.is_active;
    return true;
  });

  const pendingCount = runners.filter(r => !r.is_active).length;
  const activeCount = runners.filter(r => r.is_active).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold">{runners.length}</p>
          <p className="text-xs text-muted-foreground">Total Runners</p>
        </div>
        <div className="glass-card p-4 text-center bg-gradient-to-br from-lime/20 to-lime/5 border-lime/30">
          <p className="text-2xl font-bold text-lime">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="glass-card p-4 text-center bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30">
          <p className="text-2xl font-bold text-accent">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending Approval</p>
        </div>
      </div>

      {/* Filter & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "active", "pending"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === f 
                  ? "bg-primary text-primary-foreground" 
                  : "glass-card hover:bg-muted/50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <button 
          onClick={fetchRunners}
          className="glass-card p-2 hover:bg-muted/50"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Runners List */}
      <div className="space-y-3">
        {filteredRunners.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <Truck size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No runners found</p>
          </div>
        ) : (
          filteredRunners.map(runner => (
            <div 
              key={runner.id} 
              className={`glass-card p-4 ${
                !runner.is_active ? "border-l-4 border-accent" : "border-l-4 border-lime"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    runner.is_active 
                      ? "bg-lime/20 text-lime" 
                      : "bg-accent/20 text-accent"
                  }`}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="font-bold">{runner.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone size={12} />
                      <span>{runner.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
                    runner.is_active 
                      ? "bg-lime/20 text-lime" 
                      : "bg-accent/20 text-accent"
                  }`}>
                    {runner.is_active ? "Active" : "Pending"}
                  </span>

                  <button
                    onClick={() => toggleRunnerStatus(runner.id, runner.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      runner.is_active 
                        ? "hover:bg-destructive/20 text-destructive" 
                        : "hover:bg-lime/20 text-lime"
                    }`}
                    title={runner.is_active ? "Deactivate" : "Activate"}
                  >
                    {runner.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                  </button>

                  <button
                    onClick={() => deleteRunner(runner.id)}
                    className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Notification Preference */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground mr-2">Notifications:</span>
                {(["sms", "whatsapp", "both"]).map(pref => (
                  <button
                    key={pref}
                    onClick={() => updateNotificationPreference(runner.id, pref)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      (runner.notification_preference || "sms") === pref
                        ? pref === "whatsapp" 
                          ? "bg-green-500/20 text-green-500 border border-green-500/30"
                          : pref === "both"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-secondary/20 text-secondary border border-secondary/30"
                        : "glass-card hover:bg-muted/50"
                    }`}
                  >
                    {pref === "sms" && <MessageSquare size={12} />}
                    {pref === "whatsapp" && <MessageCircle size={12} />}
                    {pref === "both" && (
                      <>
                        <MessageSquare size={10} />
                        <span>+</span>
                        <MessageCircle size={10} />
                      </>
                    )}
                    <span className="capitalize">{pref}</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RunnerManagement;
