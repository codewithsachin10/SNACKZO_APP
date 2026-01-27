import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, startOfDay } from "date-fns"; // Added imports
import { Trash2, Edit, Calendar as CalendarIcon, Filter, Search, Sparkles } from "lucide-react";
import { FESTIVALS_2026 } from "@/constants/festivals";

interface AdminEvent {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    type: 'festival' | 'sale' | 'event' | 'reminder';
    color: string;
}

export default function EventsList() {
    const [events, setEvents] = useState<AdminEvent[]>([]);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        const { data, error } = await supabase
            .from("admin_events")
            .select("*")
            .order("start_date", { ascending: true });

        if (error) toast.error("Failed to fetch events");
        else setEvents(data || []);
    };

    const handleDelete = async (id: string, isFestival: boolean) => {
        if (isFestival) {
            toast.error("Cannot delete a public festival");
            return;
        }
        if (!confirm("Are you sure?")) return;
        const { error } = await supabase.from("admin_events").delete().eq("id", id);
        if (!error) {
            toast.success("Event deleted");
            fetchEvents();
        }
    };

    // Merge and filter
    const allEvents = [
        ...events,
        ...FESTIVALS_2026.map((f, i) => ({
            id: `fest-${f.date}-${i}`,
            title: f.title,
            start_date: f.date,
            type: 'festival',
            color: f.color,
            description: "Public Festival"
        } as AdminEvent))
    ].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const filteredEvents = allEvents.filter(e => {
        if (filter !== "all" && e.type !== filter) return false;
        if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
        // Optional: Filter past events if needed, but let's keep all for now or just upcoming
        // if (new Date(e.start_date) < startOfDay(new Date())) return false; 
        return true;
    });

    return (
        <div className="space-y-4 animate-in fade-in pb-20">
            <div className="flex gap-4 mb-6 sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        placeholder="Search events..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border/50 focus:ring-2 ring-primary transition-all"
                    />
                </div>
                <select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="bg-card px-4 py-2.5 rounded-xl border border-border/50 focus:ring-2 ring-primary transition-all"
                >
                    <option value="all">All Types</option>
                    <option value="festival">Festivals</option>
                    <option value="sale">Sales</option>
                    <option value="event">Events</option>
                    <option value="reminder">Reminders</option>
                </select>
            </div>

            <div className="space-y-3">
                {filteredEvents.map((event, idx) => (
                    <div key={event.id || idx} className="bg-card p-4 rounded-xl flex items-center justify-between group hover:shadow-lg hover:bg-muted/20 transition-all border-l-4 border shadow-sm" style={{ borderLeftColor: event.color }}>
                        <div className="flex items-center gap-4">
                            <div className="text-center min-w-[3.5rem] p-2 bg-muted/50 rounded-lg shrink-0">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">{format(new Date(event.start_date), "MMM")}</p>
                                <p className="text-xl font-bold">{format(new Date(event.start_date), "d")}</p>
                            </div>
                            <div>
                                <h3 className="font-bold flex items-center gap-2 text-lg">
                                    {event.title}
                                    {event.type === 'festival' && <Sparkles size={14} className="text-yellow-500 fill-yellow-500" />}
                                </h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className="capitalize px-2 py-0.5 rounded-full bg-muted text-xs font-medium">{event.type}</span>
                                    {event.description && <span className="text-muted-foreground/50">• {event.description}</span>}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!event.id.startsWith('fest-') && (
                                <button onClick={() => handleDelete(event.id, false)} className="p-2.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {filteredEvents.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">No events found matching criteria.</div>
                )}
            </div>
        </div>
    );
}
