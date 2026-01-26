import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Plus, Trash2, Save, Type, AlignLeft, Hash, Star, CheckSquare, List,
    Mail, Phone, Link as LinkIcon, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Field {
    id: string; // temp id for UI
    label: string;
    type: 'text' | 'textarea' | 'number' | 'rating' | 'boolean' | 'select' | 'email' | 'tel' | 'url' | 'time';
    required: boolean;
    options: string[]; // For select
}

const FIELD_TYPES = [
    { type: 'text', icon: Type, label: 'Short Text' },
    { type: 'textarea', icon: AlignLeft, label: 'Long Text' },
    { type: 'number', icon: Hash, label: 'Number' },
    { type: 'email', icon: Mail, label: 'Email' },
    { type: 'tel', icon: Phone, label: 'Phone' },
    { type: 'url', icon: LinkIcon, label: 'Website' },
    { type: 'time', icon: Clock, label: 'Time' },
    { type: 'rating', icon: Star, label: 'Star Rating' },
    { type: 'boolean', icon: CheckSquare, label: 'Yes/No' },
    { type: 'select', icon: List, label: 'Dropdown' },
] as const;

export function FormBuilder({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) {
    const [title, setTitle] = useState("Untitled Form");
    const [description, setDescription] = useState("");
    const [fields, setFields] = useState<Field[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const addField = (type: Field['type']) => {
        setFields([...fields, {
            id: crypto.randomUUID(),
            label: "New Question",
            type,
            required: false,
            options: type === 'select' ? ['Option 1', 'Option 2'] : []
        }]);
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const updateField = (id: string, updates: Partial<Field>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handleSave = async () => {
        if (!title.trim()) return toast.error("Please enter a form title");
        if (fields.length === 0) return toast.error("Please add at least one question");

        setIsSaving(true);
        try {
            // 1. Create Form
            const { data: form, error: formError } = await supabase
                .from('admin_forms')
                .insert({ title, description, created_by: (await supabase.auth.getUser()).data.user?.id })
                .select()
                .single();

            if (formError) throw formError;

            // 2. Create Fields
            const fieldData = fields.map((f, index) => ({
                form_id: form.id,
                label: f.label,
                field_type: f.type,
                is_required: f.required,
                options: f.type === 'select' ? f.options : null,
                order_index: index
            }));

            const { error: fieldsError } = await supabase
                .from('admin_form_fields')
                .insert(fieldData);

            if (fieldsError) throw fieldsError;

            toast.success("Form created successfully!");
            onCreated();
            onClose();

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to create form");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-background border border-border w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Sidebar: Field Types */}
                <div className="w-64 bg-muted/30 border-r border-border p-4 flex flex-col gap-2">
                    <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">Components</h3>
                    {FIELD_TYPES.map(t => (
                        <button
                            key={t.type}
                            onClick={() => addField(t.type)}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all text-sm font-medium text-left"
                        >
                            <t.icon size={18} className="text-primary" />
                            {t.label}
                        </button>
                    ))}

                    <div className="mt-auto">
                        <button onClick={onClose} className="w-full py-3 text-muted-foreground hover:text-foreground text-sm font-bold">
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Main: Preview & Edit */}
                <div className="flex-1 flex flex-col bg-card/40">
                    {/* Header */}
                    <div className="p-6 border-b border-border bg-background/50 flex justify-between items-center">
                        <div className="flex-1 mr-8">
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-transparent text-2xl font-bold focus:outline-none placeholder:text-muted-foreground/50 mb-1"
                                placeholder="Form Title"
                            />
                            <input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-transparent text-sm text-muted-foreground focus:outline-none"
                                placeholder="Form description or instructions..."
                            />
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            <Save size={18} />
                            {isSaving ? "Saving..." : "Publish Form"}
                        </button>
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                        {fields.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 border-2 border-dashed border-muted-foreground/10 rounded-xl">
                                <Plus size={48} className="mb-4" />
                                <p className="font-bold">Add questions from the left menu</p>
                            </div>
                        ) : (
                            fields.map((field, idx) => (
                                <div key={field.id} className="glass-card p-6 relative group animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex gap-4">
                                        <div className="mt-1 flex-shrink-0 text-muted-foreground font-mono text-xs opacity-50">{idx + 1}</div>
                                        <div className="flex-1 space-y-4">
                                            <input
                                                value={field.label}
                                                onChange={e => updateField(field.id, { label: e.target.value })}
                                                className="w-full bg-transparent font-medium focus:outline-none border-b border-transparent focus:border-primary/50 transition-colors pb-1"
                                                placeholder="Question text"
                                                autoFocus
                                            />

                                            {/* Preview Area */}
                                            <div className="opacity-50 pointer-events-none">
                                                {['text', 'email', 'tel', 'url'].includes(field.type) && <input className="w-full p-2 rounded border border-white/10 bg-black/20 text-sm" disabled placeholder="Short answer text" />}
                                                {field.type === 'time' && <input type="time" className="w-full p-2 rounded border border-white/10 bg-black/20 text-sm" disabled />}
                                                {field.type === 'textarea' && <textarea className="w-full p-2 rounded border border-white/10 bg-black/20 text-sm h-20" disabled placeholder="Long answer text" />}
                                                {field.type === 'number' && <input type="number" className="w-32 p-2 rounded border border-white/10 bg-black/20 text-sm" disabled placeholder="0" />}
                                                {field.type === 'rating' && <div className="flex gap-1 text-yellow-400"><Star /><Star /><Star /><Star className="text-gray-600" /><Star className="text-gray-600" /></div>}
                                                {field.type === 'select' && (
                                                    <div className="space-y-2 pointer-events-auto opacity-100">
                                                        {field.options.map((opt, optIdx) => (
                                                            <div key={optIdx} className="flex gap-2">
                                                                <div className="w-4 h-4 rounded-full border border-muted-foreground/50 mt-1" />
                                                                <input
                                                                    value={opt}
                                                                    onChange={e => {
                                                                        const newOpts = [...field.options];
                                                                        newOpts[optIdx] = e.target.value;
                                                                        updateField(field.id, { options: newOpts });
                                                                    }}
                                                                    className="bg-transparent text-sm border-b border-white/5 focus:border-primary/50 focus:outline-none flex-1"
                                                                />
                                                                <button onClick={() => updateField(field.id, { options: field.options.filter((_, i) => i !== optIdx) })} className="text-destructive/50 hover:text-destructive"><Trash2 size={12} /></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => updateField(field.id, { options: [...field.options, `Option ${field.options.length + 1}`] })} className="text-xs text-primary hover:underline font-bold">+ Add Option</button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer Actions */}
                                            <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/5">
                                                <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required}
                                                        onChange={e => updateField(field.id, { required: e.target.checked })}
                                                        className="rounded border-white/20 bg-black/20 text-primary focus:ring-primary"
                                                    />
                                                    Required
                                                </label>
                                                <div className="h-4 w-[1px] bg-white/10" />
                                                <button onClick={() => removeField(field.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
