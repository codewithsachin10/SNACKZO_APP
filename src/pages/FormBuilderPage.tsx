import { useState, useEffect } from "react";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, DragOverlay
} from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Type, AlignLeft, Hash, Star, CheckSquare, List, Calendar,
    MoveVertical, Trash2, Copy, Plus, Save, Eye, Settings, ArrowLeft, Pencil, X, Globe, Link as LinkIcon, ExternalLink, BarChart3,
    Mail, Phone, Clock, LogIn, Upload, PenTool, Image as ImageIcon, Heading
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Types
export type FieldType = 'text' | 'textarea' | 'number' | 'rating' | 'boolean' | 'select' | 'date' | 'email' | 'tel' | 'url' | 'time' | 'login' | 'file' | 'signature' | 'image' | 'section';

export interface FormField {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[]; // For select
    placeholder?: string;
    description?: string;
}

const FIELD_TYPES = [
    { type: 'text', icon: Type, label: 'Short Text', desc: 'Single line text input' },
    { type: 'textarea', icon: AlignLeft, label: 'Long Text', desc: 'Multi-line text area' },
    { type: 'number', icon: Hash, label: 'Number', desc: 'Numeric input only' },
    { type: 'email', icon: Mail, label: 'Email', desc: 'Email address validation' },
    { type: 'tel', icon: Phone, label: 'Phone', desc: 'Phone number input' },
    { type: 'url', icon: LinkIcon, label: 'Website', desc: 'URL input' },
    { type: 'select', icon: List, label: 'Dropdown', desc: 'Select from options' },
    { type: 'login', icon: LogIn, label: 'Login', desc: 'Login session block' },
    { type: 'rating', icon: Star, label: 'Rating', desc: 'Star rating scale' },
    { type: 'boolean', icon: CheckSquare, label: 'Yes/No', desc: 'Toggle switch' },
    { type: 'date', icon: Calendar, label: 'Date', desc: 'Date picker' },
    { type: 'time', icon: Clock, label: 'Time', desc: 'Time picker' },
    { type: 'file', icon: Upload, label: 'File Upload', desc: 'Limit 10MB' },
    { type: 'signature', icon: PenTool, label: 'Signature', desc: 'E-Signature pad' },
    { type: 'image', icon: ImageIcon, label: 'Image', desc: 'Display an image' },
    { type: 'section', icon: Heading, label: 'Section', desc: 'Section header' },
] as const;

// Draggable Sortable Item Component
function SortableField({
    field, activeId, updateField, removeField, duplicateField
}: {
    field: FormField;
    activeId: string | null;
    updateField: (id: string, data: Partial<FormField>) => void;
    removeField: (id: string) => void;
    duplicateField: (field: FormField) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative bg-card glass-card border border-white/5 rounded-xl p-6 transition-all hover:border-primary/20 hover:shadow-lg",
                activeId === field.id && "ring-2 ring-primary z-10"
            )}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-0 left-0 bottom-0 w-8 flex items-center justify-center cursor-move text-muted-foreground/20 hover:text-foreground hover:bg-white/5 transition-colors rounded-l-xl"
            >
                <MoveVertical size={16} />
            </div>

            <div className="pl-6 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 space-y-3">
                        <input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            className={cn(
                                "bg-transparent border-b border-transparent hover:border-white/10 focus:border-primary w-full outline-none transition-colors pb-1 placeholder:text-muted-foreground/50",
                                field.type === 'section' ? "text-2xl font-black text-primary" : "text-lg font-bold"
                            )}
                            placeholder={field.type === 'section' ? "Section Title" : "Question Title"}
                        />
                        <input
                            value={field.description || ''}
                            onChange={(e) => updateField(field.id, { description: e.target.value })}
                            className="text-sm text-muted-foreground bg-transparent border-b border-transparent hover:border-white/10 focus:border-primary w-full outline-none transition-colors pb-1 placeholder:text-muted-foreground/30"
                            placeholder="Add a description (optional)"
                        />
                    </div>
                    {/* Field Type Indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 h-fit text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {(() => {
                            const typeObj = FIELD_TYPES.find(t => t.type === field.type);
                            const Icon = typeObj?.icon;
                            return Icon ? <Icon size={14} /> : null;
                        })()}
                        {FIELD_TYPES.find(t => t.type === field.type)?.label}
                    </div>
                </div>

                {/* Field Specific Options */}
                <div className="pt-2">
                    {field.type === 'select' && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Options</p>
                            {field.options?.map((opt, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <div className="w-3 h-3 rounded-full border border-muted-foreground/50" />
                                    <input
                                        value={opt}
                                        onChange={(e) => {
                                            const newOpts = [...(field.options || [])];
                                            newOpts[idx] = e.target.value;
                                            updateField(field.id, { options: newOpts });
                                        }}
                                        className="bg-transparent text-sm border-b border-white/5 focus:border-primary/50 outline-none flex-1 py-1"
                                        placeholder={`Option ${idx + 1}`}
                                    />
                                    <button
                                        onClick={() => updateField(field.id, { options: field.options?.filter((_, i) => i !== idx) })}
                                        className="text-muted-foreground hover:text-destructive p-1"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => updateField(field.id, { options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })}
                                className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mt-2"
                            >
                                <Plus size={12} /> Add Option
                            </button>
                        </div>
                    )}

                    {/* Custom Image Configuration */}
                    {field.type === 'image' && (
                        <div className="space-y-4 pt-2">
                            {field.options?.[0] ? (
                                <div className="relative group/image">
                                    <div className="aspect-video w-full bg-black/40 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
                                        <img src={field.options[0]} alt="Preview" className="w-full h-full object-contain" />
                                    </div>
                                    <button
                                        onClick={() => updateField(field.id, { options: [] })}
                                        className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-lg hover:bg-destructive transition-colors opacity-0 group-hover/image:opacity-100 backdrop-blur-sm"
                                        title="Remove Image"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-white/5 transition-all cursor-pointer group/drop"
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const file = e.dataTransfer.files?.[0];
                                        if (file && file.type.startsWith('image/')) {
                                            if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
                                            const reader = new FileReader();
                                            reader.onload = (ev) => updateField(field.id, { options: [ev.target?.result as string] });
                                            reader.readAsDataURL(file);
                                        } else {
                                            toast.error("Please drop a valid image file");
                                        }
                                    }}
                                    onClick={() => document.getElementById(`upload-${field.id}`)?.click()}
                                >
                                    <div className="p-3 bg-white/5 rounded-full text-muted-foreground group-hover/drop:text-primary group-hover/drop:bg-primary/10 transition-colors">
                                        <ImageIcon size={24} />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="font-bold text-sm">Click to upload or drag and drop</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">SVG, PNG, JPG (MAX. 5MB)</p>
                                    </div>
                                    <input
                                        id={`upload-${field.id}`}
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
                                                const reader = new FileReader();
                                                reader.onload = (ev) => updateField(field.id, { options: [ev.target?.result as string] });
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* URL Fallback */}
                            {!field.options?.[0] && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-[1px] flex-1 bg-white/10" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">OR</span>
                                        <div className="h-[1px] flex-1 bg-white/10" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                            <input
                                                value={field.options?.[0] || ''}
                                                onChange={(e) => updateField(field.id, { options: [e.target.value] })}
                                                className="w-full bg-black/20 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-sm focus:border-primary/50 outline-none transition-colors placeholder:text-muted-foreground/30"
                                                placeholder="Paste image link..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Previews */}
                    {field.type === 'login' && (
                        <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-3 pointer-events-none">
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Email</label>
                                <div className="h-9 bg-white/5 rounded-lg border border-white/10" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Password</label>
                                <div className="h-9 bg-white/5 rounded-lg border border-white/10" />
                            </div>
                            <div className="h-9 w-full bg-primary/20 rounded-lg flex items-center justify-center text-xs font-bold text-primary">
                                Sign In
                            </div>
                        </div>
                    )}

                    {field.type === 'signature' && (
                        <div className="h-24 bg-white/5 rounded-xl border border-dashed border-white/10 flex items-end justify-between p-4">
                            <span className="text-xs text-muted-foreground/50 italic">Sign here...</span>
                            <PenTool size={16} className="text-muted-foreground/30" />
                        </div>
                    )}

                    {field.type === 'file' && (
                        <div className="h-20 bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                            <Upload size={20} className="text-muted-foreground/40" />
                            <span className="text-xs text-muted-foreground/40">Drop files here or click to upload</span>
                        </div>
                    )}

                    {/* Generic Preview Placeholder for simple inputs */}
                    {!['select', 'login', 'signature', 'file', 'image', 'section'].includes(field.type) && (
                        <div className="w-full h-10 bg-black/20 border border-white/5 rounded-lg flex items-center px-4 text-xs text-muted-foreground/40 italic select-none">
                            User input preview for {field.type}...
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/5 mt-4">
                    {!['section', 'image'].includes(field.type) && (
                        <label title="Users must answer this question to submit" className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                            <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                className="rounded border-white/20 bg-black/20 text-primary focus:ring-primary shadow-sm"
                            />
                            Required
                        </label>
                    )}
                    <div className="h-4 w-[1px] bg-white/10" />
                    <button
                        onClick={() => duplicateField(field)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                        title="Duplicate"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        onClick={() => removeField(field.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Main Component
export default function FormBuilderPage() {
    const navigate = useNavigate();
    // Add state for editing
    const [editingFormId, setEditingFormId] = useState<string | null>(null);

    const [title, setTitle] = useState("Untitled Form");
    const [description, setDescription] = useState("");
    const [fields, setFields] = useState<FormField[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'build' | 'my-forms'>('build');

    // Sensors for drag & drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
        setActiveId(null);
    };

    const addField = (type: FieldType) => {
        const newField: FormField = {
            id: crypto.randomUUID(),
            label: "New Question",
            type,
            required: false,
            options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
        };
        setFields([...fields, newField]);
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const duplicateField = (field: FormField) => {
        const newField = { ...field, id: crypto.randomUUID(), label: `${field.label} (Copy)` };
        const index = fields.findIndex(f => f.id === field.id);
        const newFields = [...fields];
        newFields.splice(index + 1, 0, newField);
        setFields(newFields);
    };

    const handleSave = async () => {
        if (!title.trim()) return toast.error("Please enter a form title");
        if (fields.length === 0) return toast.error("Add at least one question");

        setIsSaving(true);
        try {
            const { data: user } = await supabase.auth.getUser();

            let currentFormId = editingFormId;

            if (editingFormId) {
                // UPDATE existing form
                const { error: updateError } = await supabase
                    .from('admin_forms')
                    .update({
                        title,
                        description,
                        is_active: true // Ensure it stays active on edit
                    })
                    .eq('id', editingFormId);

                if (updateError) throw updateError;

                // For fields, simplest strategy: Delete all old ones and re-insert new ones to maintain order perfect
                // This avoids complex ID matching and reordering logic
                await supabase.from('admin_form_fields').delete().eq('form_id', editingFormId);
            } else {
                // CREATE new form
                const { data: form, error: formError } = await supabase
                    .from('admin_forms')
                    .insert({
                        title,
                        description,
                        created_by: user.user?.id,
                        is_active: true
                    })
                    .select()
                    .single();

                if (formError) throw formError;
                currentFormId = form.id;
            }

            // Insert Fields (for both create and update flows)
            if (fields.length > 0 && currentFormId) {
                const fieldData = fields.map((f, index) => ({
                    form_id: currentFormId,
                    label: f.label, // This reads the current state 'f.label' which should be correct
                    field_type: f.type,
                    is_required: f.required,
                    options: f.options,
                    order_index: index
                }));

                const { error: fieldsError } = await supabase
                    .from('admin_form_fields')
                    .insert(fieldData);

                if (fieldsError) throw fieldsError;
            }

            toast.success(editingFormId ? "Form updated successfully!" : "Form published successfully!");
            setActiveTab('my-forms');
            resetBuilder();

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to save form");
        } finally {
            setIsSaving(false);
        }
    };

    const resetBuilder = () => {
        setTitle("Untitled Form");
        setDescription("");
        setFields([]);
        setEditingFormId(null);
    };

    const editForm = async (form: any) => {
        setIsSaving(true);
        try {
            setEditingFormId(form.id);
            setTitle(form.title);
            setDescription(form.description || "");

            // Fetch fields
            const { data: formFields, error } = await supabase
                .from('admin_form_fields')
                .select('*')
                .eq('form_id', form.id)
                .order('order_index', { ascending: true });

            if (error) throw error;

            // Map DB fields back to UI fields
            const mappedFields: FormField[] = (formFields || []).map(f => ({
                id: crypto.randomUUID(), // New temp ID for dnd-kit stability (db recreation strategy)
                label: f.label,
                type: f.field_type as FieldType,
                required: f.is_required,
                options: f.options,
                description: "" // Schema doesn't save desc yet
            }));

            setFields(mappedFields);
            setActiveTab('build');
        } catch (err) {
            toast.error("Failed to load form for editing");
        } finally {
            setIsSaving(false);
        }
    };

    const deleteForm = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure? This will delete the form and all responses.")) return;

        const { error } = await supabase.from('admin_forms').delete().eq('id', id);
        if (error) {
            toast.error("Failed to delete form");
        } else {
            toast.success("Form deleted");
            // If we were editing this form, reset
            if (editingFormId === id) resetBuilder();
            // Trigger refresh in MyFormsList component effectively by remounting or state update
            // Since MyFormsList is internal, we can just let it re-render? No, it has internal state.
            // We need to trigger a reload.
            // I'll make MyFormsList accept a key or something.
            // Better yet, I'll move the fetch logic up?
            // For simplicity, I'll pass a refresh trigger to MyFormsList relative to activeTab
            if (activeTab === 'my-forms') {
                // Force a re-render of MyFormsList by changing its key
                // This is a common pattern to re-mount a component and trigger its useEffect
                setActiveTab('build'); // Temporarily switch tab
                setTimeout(() => setActiveTab('my-forms'), 0); // Switch back to force re-mount
            }
        }
    };

    // My Forms List Component (Internal)
    const MyFormsList = () => { // Removed 'key' from props as it's a special React prop
        const [forms, setForms] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        const loadForms = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('admin_forms')
                .select('*, admin_form_responses(count)')
                .order('created_at', { ascending: false });
            setForms(data || []);
            setLoading(false);
        };

        useEffect(() => {
            loadForms();
        }, [activeTab]); // Reload forms when activeTab changes to 'my-forms'

        const copyLink = (id: string) => {
            const url = `${window.location.origin}/forms/${id}`;
            navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard");
        };

        if (loading) return <div className="p-12 text-center text-muted-foreground"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />Loading forms...</div>;


        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {forms.length === 0 ? (
                    <div className="col-span-full py-20 text-center glass-card rounded-2xl border-white/5 bg-white/5">
                        <p className="text-xl font-bold text-muted-foreground">No forms created yet</p>
                        <button onClick={() => setActiveTab('build')} className="mt-4 text-primary hover:underline">Create your first form</button>
                    </div>
                ) : (
                    forms.map(form => (
                        <div key={form.id} className="glass-card bg-card/40 border-white/5 p-8 rounded-3xl hover:border-primary/20 transition-all group flex flex-col hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                                    <Globe size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => navigate(`/admin/forms/${form.id}/responses`)} className="p-2.5 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-emerald-400 transition-colors" title="View Responses">
                                        <BarChart3 size={18} />
                                    </button>
                                    <button onClick={() => editForm(form)} className="p-2.5 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-primary transition-colors" title="Edit Form">
                                        <Pencil size={18} />
                                    </button>
                                    <button onClick={(e) => deleteForm(form.id, e)} className="p-2.5 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-destructive transition-colors" title="Delete Form">
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="w-[1px] bg-white/10 mx-1" />
                                    <button onClick={() => copyLink(form.id)} className="p-2.5 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-foreground transition-colors" title="Copy Link">
                                        <LinkIcon size={18} />
                                    </button>
                                    <a href={`/forms/${form.id}`} target="_blank" className="p-2.5 hover:bg-white/10 rounded-xl text-muted-foreground hover:text-foreground transition-colors" title="View Form">
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            </div>

                            <h3 className="font-black text-xl mb-2 line-clamp-1 tracking-tight">{form.title}</h3>
                            <p className="text-base text-muted-foreground line-clamp-3 mb-6 flex-1">{form.description || 'No description provided for this form.'}</p>

                            <div className="grid grid-cols-2 gap-4 py-4 border-t border-white/5 mt-auto">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Responses</p>
                                    <p className="text-2xl font-bold">{form.admin_form_responses[0]?.count || 0}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Created</p>
                                    <p className="text-sm font-medium">{new Date(form.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-2">
                                <span className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-background", form.is_active ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500")} />
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{form.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            {/* Top Navigation */}
            <div className="h-16 border-b border-white/5 bg-background/50 backdrop-blur-xl fixed top-0 w-full z-50 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-6 w-[1px] bg-white/10" />
                    <nav className="flex gap-1 bg-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => { setActiveTab('build'); resetBuilder(); }}
                            className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all", activeTab === 'build' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            Builder
                        </button>
                        <button
                            onClick={() => setActiveTab('my-forms')}
                            className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-all", activeTab === 'my-forms' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                            My Forms
                        </button>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    {activeTab === 'build' && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all disabled:opacity-50"
                        >
                            {isSaving ? <div className="animate-spin w-4 h-4 border-2 border-white/50 border-t-white rounded-full" /> : <Save size={16} />}
                            {editingFormId ? "Update Form" : "Publish Form"}
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="pt-24 pb-12 px-6 flex-1 max-w-7xl mx-auto w-full">
                {activeTab === 'build' ? (
                    <div className="flex gap-8 items-start">
                        {/* Sidebar: Components */}
                        <div className="w-72 sticky top-24 space-y-6">
                            <div className="glass-card bg-card/40 border-white/5 p-4 rounded-2xl">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Form Components</h3>
                                <div className="space-y-2">
                                    {FIELD_TYPES.map(t => (
                                        <button
                                            key={t.type}
                                            onClick={() => addField(t.type as FieldType)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-sm font-medium text-left group"
                                        >
                                            <div className="p-2 bg-background rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                                                <t.icon size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold">{t.label}</p>
                                                <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                                            </div>
                                            <Plus size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl border border-dashed border-white/10 text-center">
                                <p className="text-xs text-muted-foreground">Pro Tip: Drag fields to reorder them.</p>
                            </div>
                        </div>

                        {/* Builder Canvas */}
                        <div className="flex-1 space-y-6">
                            {/* Form Header */}
                            <div className="glass-card bg-card/40 border-white/5 p-8 rounded-2xl border-t-4 border-t-primary shadow-2xl">
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="text-4xl font-black bg-transparent border-none focus:ring-0 w-full placeholder:text-muted-foreground/20 leading-tight mb-2 p-0"
                                    placeholder="Untitled Form"
                                />
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-muted-foreground p-0 h-auto min-h-[40px] text-lg"
                                    placeholder="Add a description for your form..."
                                    rows={1}
                                />
                            </div>

                            {/* Droppable Area */}
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                                onDragStart={(event) => setActiveId(event.active.id as string)}
                            >
                                <SortableContext items={fields} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-4 pb-20">
                                        <AnimatePresence>
                                            {fields.length === 0 ? (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="py-20 flex flex-col items-center justify-center text-muted-foreground/30 border-2 border-dashed border-white/5 rounded-2xl bg-white/5"
                                                >
                                                    <div className="p-4 bg-white/5 rounded-full mb-4">
                                                        <Plus size={32} />
                                                    </div>
                                                    <p className="text-lg font-bold">Your form is empty</p>
                                                    <p className="text-sm">Click items on the sidebar to add questions</p>
                                                </motion.div>
                                            ) : (
                                                fields.map(field => (
                                                    <SortableField
                                                        key={field.id}
                                                        field={field}
                                                        activeId={activeId}
                                                        updateField={updateField}
                                                        removeField={removeField}
                                                        duplicateField={duplicateField}
                                                    />
                                                ))
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </SortableContext>

                                <DragOverlay>
                                    {activeId ? (
                                        <div className="bg-card glass-card border border-primary/50 shadow-2xl rounded-xl p-6 opacity-90 rotate-2 cursor-grabbing">
                                            <p className="font-bold text-lg">Question</p>
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-black mb-2">My Forms</h1>
                                <p className="text-muted-foreground">Manage and track your active forms</p>
                            </div>
                        </div>
                        <MyFormsList /> {/* Removed key prop from here, as it's handled by activeTab dependency in useEffect */}
                    </div>
                )}
            </div>
        </div>
    );
}

// Add global styles for dnd-kit accessibility if needed, usually handles itself.
