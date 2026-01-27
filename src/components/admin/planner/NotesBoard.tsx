import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Pin, Trash2, CalendarCheck, Palette } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Note {
    id: string;
    content: string;
    color: string;
    is_pinned: boolean;
    created_at: string;
}

const COLORS = [
    { bg: "#fef3c7", text: "#78350f" }, // Yellow
    { bg: "#dcfce7", text: "#14532d" }, // Green
    { bg: "#dbeafe", text: "#1e3a8a" }, // Blue
    { bg: "#f3e8ff", text: "#581c87" }, // Purple
    { bg: "#fee2e2", text: "#7f1d1d" }, // Red
    { bg: "#f3f4f6", text: "#1f2937" }, // Gray
];

export default function NotesBoard() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState("");
    const [selectedColorIdx, setSelectedColorIdx] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        const { data, error } = await supabase
            .from("admin_notes")
            .select("*")
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false });
        if (!error) setNotes(data || []);
        setIsLoading(false);
    };

    const addNote = async () => {
        if (!newNote.trim()) return;

        const color = COLORS[selectedColorIdx].bg;
        // Optimistic UI
        const tempId = Math.random().toString();
        const optimisticNote = {
            id: tempId,
            content: newNote,
            color,
            is_pinned: false,
            created_at: new Date().toISOString()
        };
        setNotes([optimisticNote, ...notes]);
        setNewNote("");

        const { data, error } = await supabase.from("admin_notes").insert([{
            content: optimisticNote.content,
            color: optimisticNote.color,
            is_pinned: false
        }]).select().single();

        if (error) {
            toast.error("Failed to add note");
            fetchNotes(); // Revert
        } else if (data) {
            setNotes(prev => prev.map(n => n.id === tempId ? data : n));
        }
    };

    const deleteNote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Optimistic
        setNotes(notes.filter(n => n.id !== id));
        const { error } = await supabase.from("admin_notes").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete note");
            fetchNotes();
        }
    };

    const togglePin = async (note: Note, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedNotes = notes.map(n => n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n)
            .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned)); // Re-sort locally

        setNotes(updatedNotes);

        const { error } = await supabase.from("admin_notes").update({ is_pinned: !note.is_pinned }).eq("id", note.id);
        if (error) {
            toast.error("Update failed");
            fetchNotes(); // Revert
        }
    };

    return (
        <div className="flex flex-col min-h-[600px]">
            {/* Input Area */}
            <div className="glass-card p-6 mb-6 flex flex-col md:flex-row gap-4 items-start shadow-sm bg-card/60">
                <div className="flex-1 w-full">
                    <textarea
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="💡 Capture an idea..."
                        className="w-full bg-transparent border-none focus:ring-0 resize-none min-h-[60px] text-lg placeholder:text-muted-foreground/60"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                addNote();
                            }
                        }}
                    />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex gap-2">
                        {COLORS.map((c, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedColorIdx(i)}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColorIdx === i ? 'border-primary scale-110' : 'border-transparent hover:scale-110'}`}
                                style={{ backgroundColor: c.bg }}
                                title="Color"
                            />
                        ))}
                    </div>
                    <button
                        onClick={addNote}
                        disabled={!newNote.trim()}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        Add Note
                    </button>
                </div>
            </div>

            {/* Notes Grid */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="masonry-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                    <AnimatePresence>
                        {notes.map(note => (
                            <motion.div
                                key={note.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="relative group p-5 rounded-2xl shadow-sm hover:shadow-md transition-all min-h-[180px] flex flex-col"
                                style={{ backgroundColor: note.color }}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <button
                                        onClick={(e) => togglePin(note, e)}
                                        className={`transition-colors ${note.is_pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                        title={note.is_pinned ? "Unpin" : "Pin to top"}
                                    >
                                        <Pin size={16} className={note.is_pinned ? "fill-black rotate-45" : "text-black/40 hover:text-black"} />
                                    </button>
                                    <button
                                        onClick={(e) => deleteNote(note.id, e)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/50 rounded-full hover:bg-red-100 text-red-600"
                                        title="Delete"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <p className="text-gray-800 whitespace-pre-wrap flex-1 text-base leading-relaxed font-medium font-handwriting">
                                    {note.content}
                                </p>
                                <div className="mt-4 flex justify-between items-end border-t border-black/5 pt-3">
                                    <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider">
                                        {format(new Date(note.created_at), "MMM d, h:mm a")}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {notes.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground opacity-50">
                        <StickyNote size={48} className="mb-4" />
                        <p className="text-lg font-medium">No notes yet</p>
                        <p className="text-sm">Capture your brilliant ideas here</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper icon
function StickyNote({ size, className }: { size: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
            <path d="M15 3v6h6" />
        </svg>
    )
}
