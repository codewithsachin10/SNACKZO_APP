import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FESTIVALS_2026 } from "@/constants/festivals";

interface AdminEvent {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    type: 'festival' | 'sale' | 'event' | 'reminder';
    color: string;
}


export default function CalendarView() {
    const [currentMonth, setCurrentMonth] = useState(new Date("2026-01-27T00:00:00")); // Start near user's current time
    const [events, setEvents] = useState<AdminEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<AdminEvent>>({
        title: "",
        description: "",
        type: "event",
        color: "#3b82f6"
    });

    useEffect(() => {
        fetchEvents();
        // Check if we are in 2026, if so use real date, else default to 2026 for demo purpose if testing
        if (new Date().getFullYear() === 2026) {
            setCurrentMonth(new Date());
        }
    }, []);

    const fetchEvents = async () => {
        const { data, error } = await supabase.from("admin_events").select("*");
        if (!error) setEvents(data || []);
    };

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const startDay = startOfMonth(currentMonth).getDay();
    const paddingDays = Array(startDay).fill(null);

    const getEventsForDay = (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd");

        // DB Events
        const dbEvents = events.filter(e => {
            if (!e.start_date) return false;
            return format(parseISO(e.start_date), "yyyy-MM-dd") === dateStr;
        });

        // Festivals
        const festivalEvents = FESTIVALS_2026
            .filter(f => f.date === dateStr)
            .map((f, i) => ({
                id: `fest-${f.date}-${i}`,
                title: f.title,
                start_date: f.date,
                type: 'festival',
                color: f.color
            } as AdminEvent));

        return [...dbEvents, ...festivalEvents];
    };

    const handleCreateEvent = async () => {
        if (!formData.title || !selectedDate) return;

        const payload = {
            ...formData,
            start_date: selectedDate.toISOString(),
        };

        const { error } = await supabase.from("admin_events").insert([payload]);
        if (error) {
            toast.error("Failed to save event");
        } else {
            toast.success("Event added to calendar");
            setIsDialogOpen(false);
            fetchEvents();
            setFormData({ title: "", description: "", type: "event", color: "#3b82f6" });
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">
            {/* Main Calendar Area */}
            <div className="flex-1 flex flex-col glass-card p-6 bg-card/50 shadow-md border border-border/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-4xl font-bold tracking-tight text-foreground">{format(currentMonth, "MMMM yyyy")}</h2>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/50 p-1.5 rounded-xl border border-border/50">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-background rounded-lg transition-all shadow-sm">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={() => setCurrentMonth(new Date())} className="px-6 py-2 text-sm font-bold hover:bg-background rounded-lg transition-all shadow-sm">
                            Today
                        </button>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-background rounded-lg transition-all shadow-sm">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider py-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-px bg-border/30 rounded-2xl overflow-hidden shadow-sm border border-border">
                    {paddingDays.map((_, i) => (
                        <div key={`pad-${i}`} className="bg-muted/10 min-h-[140px]" />
                    ))}

                    {days.map((day, i) => {
                        const dayEvents = getEventsForDay(day);
                        const isToday = isSameDay(day, new Date());
                        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

                        return (
                            <div
                                key={i}
                                onClick={() => { setSelectedDate(day); setIsDialogOpen(true); }}
                                className={`
                                    relative p-3 min-h-[140px] transition-all cursor-pointer group flex flex-col gap-2
                                    bg-background hover:bg-muted/30
                                    ${isToday ? 'bg-primary/5' : ''}
                                    ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`
                                        text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full
                                        ${isToday ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/70'}
                                    `}>
                                        {format(day, "d")}
                                    </span>
                                </div>

                                <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                                    {dayEvents.slice(0, 4).map((evt, idx) => (
                                        <div
                                            key={idx}
                                            className="text-xs truncate px-2 py-1 rounded-md font-medium text-white shadow-sm transition-transform hover:scale-[1.02]"
                                            style={{ backgroundColor: evt.color }}
                                            title={evt.title}
                                        >
                                            {evt.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 4 && (
                                        <div className="text-xs font-medium text-muted-foreground pl-1">
                                            +{dayEvents.length - 4} more
                                        </div>
                                    )}
                                </div>

                                {/* Quick Add Button (Hover) */}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-primary/10 text-primary p-1.5 rounded-full hover:bg-primary hover:text-white transition-colors">
                                        <Plus size={14} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Upcoming Section (Now Below) */}
            <div className="glass-card p-6 bg-card/50 border border-border/50">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-600">
                        <Sparkles size={20} />
                    </div>
                    <h3 className="text-xl font-bold">Upcoming Festivals & Events</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {FESTIVALS_2026
                        .filter(f => new Date(f.date) >= startOfDay(new Date()))
                        .slice(0, 8) // Show top 8
                        .map((fest, idx) => (
                            <div key={idx} className="flex gap-4 items-center p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-md group">
                                <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-primary/5 text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
                                    <span className="text-[10px] uppercase font-bold opacity-80">{format(parseISO(fest.date), "MMM")}</span>
                                    <span className="text-xl font-bold leading-none">{format(parseISO(fest.date), "d")}</span>
                                </div>
                                <div>
                                    <p className="font-bold text-base group-hover:text-primary transition-colors">{fest.title}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fest.color }}></span>
                                        <p className="text-xs text-muted-foreground">Festival</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Create Event Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Event for {selectedDate && format(selectedDate, "MMMM d, yyyy")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Event Title</label>
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="E.g., Summer Sale Start"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Type</label>
                                <Select value={formData.type} onValueChange={(val: any) => setFormData({ ...formData, type: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="event">Event</SelectItem>
                                        <SelectItem value="sale">Sale</SelectItem>
                                        <SelectItem value="reminder">Reminder</SelectItem>
                                        <SelectItem value="festival">Festival</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Color</label>
                                <div className="flex gap-2">
                                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setFormData({ ...formData, color: c })}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform ${formData.color === c ? 'border-primary scale-110' : 'border-transparent hover:scale-110'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                                value={formData.description || ""}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional details..."
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setIsDialogOpen(false)} className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">Cancel</button>
                            <button onClick={handleCreateEvent} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">Save Event</button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
