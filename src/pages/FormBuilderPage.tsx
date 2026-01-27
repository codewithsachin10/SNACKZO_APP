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
    Type, AlignLeft, Hash, Star, List, Calendar,
    MoveVertical, Trash2, Copy, Plus, Save, Eye, Settings, ArrowLeft, Pencil, X, Globe, Link as LinkIcon, ExternalLink, BarChart3,
    Mail, Phone, Clock, LogIn, Upload, PenTool, Image as ImageIcon, Heading, CheckSquare
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
    const [themeTab, setThemeTab] = useState<'presets' | 'custom'>('presets');

    // Theme State
    const [themeColor, setThemeColor] = useState("#7c3aed");
    const [bgColor, setBgColor] = useState("#ffffff");
    const [borderRadius, setBorderRadius] = useState("0.75rem");

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

            const themeData = {
                primaryColor: themeColor,
                backgroundColor: bgColor,
                borderRadius: borderRadius
            };

            let currentFormId = editingFormId;

            if (editingFormId) {
                // UPDATE existing form
                const { error: updateError } = await supabase
                    .from('admin_forms')
                    .update({
                        title,
                        description,
                        is_active: true, // Ensure it stays active on edit
                        theme: themeData
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
                        is_active: true,
                        theme: themeData
                    })
                    .select()
                    .single();

                if (formError) throw formError;
                currentFormId = form.id;
            }

            // Insert Fields (for both create and update flows)
            if (fields.length > 0 && currentFormId) {
                const fieldData = fields.map((f, index) => ({
                    id: f.id, // PERSIST ID to maintain link with response_data
                    form_id: currentFormId,
                    label: f.label,
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
        setThemeColor("#7c3aed");
        setBgColor("#ffffff");
        setBorderRadius("0.75rem");
        setFields([]);
        setEditingFormId(null);
    };

    const editForm = async (form: any) => {
        setIsSaving(true);
        try {
            setEditingFormId(form.id);
            setTitle(form.title);
            setDescription(form.description || "");

            // Load theme if exists
            if (form.theme) {
                setThemeColor(form.theme.primaryColor || "#7c3aed");
                setBgColor(form.theme.backgroundColor || "#ffffff");
                setBorderRadius(form.theme.borderRadius || "0.75rem");
            } else {
                setThemeColor("#7c3aed");
                setBgColor("#ffffff");
                setBorderRadius("0.75rem");
            }

            // Fetch fields
            const { data: formFields, error } = await supabase
                .from('admin_form_fields')
                .select('*')
                .eq('form_id', form.id)
                .order('order_index', { ascending: true });

            if (error) throw error;

            // Map DB fields back to UI fields
            const mappedFields: FormField[] = (formFields || []).map(f => ({
                id: f.id, // Use actual DB ID to preserve history
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

            if (activeTab === 'my-forms') {
                setActiveTab('build'); // Temporarily switch tab
                setTimeout(() => setActiveTab('my-forms'), 0); // Switch back to force re-mount
            }
        }
    };

    // My Forms List Component (Internal)
    const MyFormsList = () => {
        const [forms, setForms] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);
        const [searchQuery, setSearchQuery] = useState("");
        const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

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
        }, [activeTab]);

        const copyLink = (id: string) => {
            const url = `${window.location.origin}/forms/${id}`;
            navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard");
        };

        const filteredForms = forms.filter(form => {
            const matchesSearch = form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (form.description || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filter === 'all' ? true :
                filter === 'active' ? form.is_active : !form.is_active;
            return matchesSearch && matchesFilter;
        });

        if (loading) return <div className="p-12 text-center text-muted-foreground"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />Loading forms...</div>;


        const toggleStatus = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
            e.stopPropagation();
            try {
                const { error } = await supabase
                    .from('admin_forms')
                    .update({ is_active: !currentStatus })
                    .eq('id', id);

                if (error) throw error;

                // Optimistic update
                setForms(forms.map(f => f.id === id ? { ...f, is_active: !currentStatus } : f));
                toast.success(`Form ${!currentStatus ? 'activated' : 'deactivated'}`);
            } catch (err) {
                toast.error("Failed to update status");
            }
        };

        return (
            <div className="space-y-6">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4 rounded-xl border-white/5 bg-card/20 sticky top-20 z-10 backdrop-blur-md">
                    <div className="relative w-full md:w-96">
                        <input
                            placeholder="Search forms..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/20 border border-white/10 focus:border-primary/50 outline-none text-sm transition-all"
                        />
                        <div className="absolute left-3 top-2.5 text-muted-foreground">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>
                    </div>

                    <div className="flex bg-black/20 p-1 rounded-lg border border-white/5 w-full md:w-auto">
                        {(['all', 'active', 'inactive'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                                    filter === f ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredForms.length === 0 ? (
                        <div className="col-span-full py-20 text-center glass-card rounded-2xl border-white/5 bg-white/5">
                            <p className="text-xl font-bold text-muted-foreground">No forms match your search</p>
                            <button onClick={() => { setSearchQuery(''); setFilter('all'); }} className="mt-2 text-primary text-sm hover:underline">Clear filters</button>
                        </div>
                    ) : (
                        filteredForms.map(form => (
                            <div
                                key={form.id}
                                className="glass-card bg-card/40 border-white/5 p-6 rounded-3xl hover:border-primary/20 transition-all group flex flex-col hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 relative overflow-hidden"
                            >
                                {/* Decorative Gradient bg */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-1"
                                    style={{ background: form.theme?.primaryColor || '#7c3aed' }}
                                />

                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white/5 rounded-xl text-primary" style={{ color: form.theme?.primaryColor || 'inherit' }}>
                                        <Globe size={20} />
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => navigate(`/admin/forms/${form.id}/responses`)} className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-emerald-400 transition-colors" title="View Responses">
                                            <BarChart3 size={16} />
                                        </button>
                                        <button onClick={() => editForm(form)} className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-primary transition-colors" title="Edit Form">
                                            <Pencil size={16} />
                                        </button>
                                        <a href={`/forms/${form.id}`} target="_blank" className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="View Form">
                                            <ExternalLink size={16} />
                                        </a>
                                        <div className="w-[1px] bg-white/10 mx-1" />
                                        <button onClick={(e) => deleteForm(form.id, e)} className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title="Delete Form">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="font-black text-lg mb-1 line-clamp-1 tracking-tight">{form.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1 h-10">{form.description || 'No description provided.'}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Responses</span>
                                        <span className="text-xl font-bold">{form.admin_form_responses[0]?.count || 0}</span>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Status</span>
                                        <button
                                            onClick={(e) => toggleStatus(form.id, form.is_active, e)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all hover:scale-105 active:scale-95",
                                                form.is_active
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                                                    : "bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20"
                                            )}
                                        >
                                            <span className={cn("w-1.5 h-1.5 rounded-full", form.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{form.is_active ? 'Active' : 'Inactive'}</span>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => copyLink(form.id)}
                                    className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                                >
                                    <LinkIcon size={14} /> Copy Public Link
                                </button>
                            </div>
                        ))
                    )}
                </div>
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

                            {/* Advanced Design Studio (New) */}
                            <div className="glass-card bg-card/40 border-white/5 p-5 rounded-2xl overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Design Studio
                                    </h3>
                                    <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5">
                                        <button
                                            onClick={() => setThemeTab('presets')}
                                            className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all", themeTab === 'presets' ? "bg-white/10 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                                        >
                                            Presets
                                        </button>
                                        <button
                                            onClick={() => setThemeTab('custom')}
                                            className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all", themeTab === 'custom' ? "bg-white/10 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {themeTab === 'presets' ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { name: "Snackzo", primary: "#7c3aed", bg: "#ffffff" },
                                                { name: "Ocean", primary: "#0ea5e9", bg: "#f0f9ff" },
                                                { name: "Midnight", primary: "#6366f1", bg: "#0f172a" },
                                                { name: "Forest", primary: "#10b981", bg: "#ecfdf5" },
                                                { name: "Sunset", primary: "#f97316", bg: "#fff7ed" },
                                                { name: "Rose", primary: "#ec4899", bg: "#fff1f2" },
                                            ].map((preset) => (
                                                <button
                                                    key={preset.name}
                                                    onClick={() => { setThemeColor(preset.primary); setBgColor(preset.bg); }}
                                                    className="group/preset relative flex flex-col gap-2 p-2 rounded-xl border border-white/5 hover:border-primary/30 bg-black/5 transition-all hover:bg-black/10 text-left"
                                                >
                                                    <div className="h-12 w-full rounded-lg shadow-inner relative overflow-hidden transition-all group-hover/preset:shadow-md" style={{ background: preset.bg }}>
                                                        <div className="absolute top-2 left-2 w-6 h-6 rounded-md shadow-lg transform -rotate-12 group-hover/preset:scale-110 transition-transform" style={{ background: preset.primary }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider pl-1">{preset.name}</span>
                                                    {themeColor === preset.primary && bgColor === preset.bg && (
                                                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center animate-in zoom-in duration-200">
                                                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                                            {/* Primary Color */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                                                    Brand Color
                                                    <span className="text-foreground">{themeColor}</span>
                                                </label>
                                                <div className="flex gap-2 items-center">
                                                    <div className="h-10 w-10 rounded-xl border-2 border-white/20 shadow-lg shrink-0 overflow-hidden relative group/picker">
                                                        <div className="absolute inset-0 bg-checkerboard opacity-10" />
                                                        <input
                                                            type="color"
                                                            value={themeColor}
                                                            onChange={e => setThemeColor(e.target.value)}
                                                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0 opacity-0"
                                                        />
                                                        <div className="w-full h-full" style={{ background: themeColor }} />
                                                    </div>
                                                    <div className="flex-1 overflow-x-auto pb-2 flex gap-1.5 scrollbar-none mask-fade-right">
                                                        {["#7c3aed", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#6366f1", "#14b8a6"].map(c => (
                                                            <button
                                                                key={c}
                                                                onClick={() => setThemeColor(c)}
                                                                className={cn("w-6 h-6 rounded-lg transition-all border border-white/10 shrink-0", themeColor === c ? "ring-2 ring-offset-2 ring-offset-black ring-white scale-110" : "hover:scale-110")}
                                                                style={{ background: c }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="h-[1px] w-full bg-white/5" />

                                            {/* Background Color */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                                                    Canvas Tone
                                                    <span className="text-foreground">{bgColor}</span>
                                                </label>
                                                <div className="flex gap-2 items-center">
                                                    <div className="h-10 w-10 rounded-xl border-2 border-white/20 shadow-lg shrink-0 overflow-hidden relative group/picker">
                                                        <input
                                                            type="color"
                                                            value={bgColor}
                                                            onChange={e => setBgColor(e.target.value)}
                                                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0 opacity-0"
                                                        />
                                                        <div className="w-full h-full" style={{ background: bgColor }} />
                                                    </div>
                                                    <div className="flex-1 overflow-x-auto pb-2 flex gap-1.5 scrollbar-none mask-fade-right">
                                                        {["#ffffff", "#f8fafc", "#f3f4f6", "#fff1f2", "#ecfdf5", "#eff6ff", "#0f172a", "#18181b"].map(c => (
                                                            <button
                                                                key={c}
                                                                onClick={() => setBgColor(c)}
                                                                className={cn("w-6 h-6 rounded-lg transition-all border border-white/10 shrink-0", bgColor === c ? "ring-2 ring-offset-2 ring-offset-black ring-white scale-110" : "hover:scale-110")}
                                                                style={{ background: c }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="h-[1px] w-full bg-white/5" />

                                            {/* Border Radius */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                                                    Corner Style
                                                    <span className="text-foreground">
                                                        {borderRadius === '0rem' ? 'Sharp' : borderRadius === '0.75rem' ? 'Soft' : 'Round'}
                                                    </span>
                                                </label>
                                                <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                                                    <button
                                                        onClick={() => setBorderRadius('0rem')}
                                                        className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors", borderRadius === '0rem' ? "bg-white/10 shadow-sm text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}
                                                    >
                                                        Sharp
                                                    </button>
                                                    <button
                                                        onClick={() => setBorderRadius('0.75rem')}
                                                        className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors", borderRadius === '0.75rem' ? "bg-white/10 shadow-sm text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}
                                                    >
                                                        Soft
                                                    </button>
                                                    <button
                                                        onClick={() => setBorderRadius('2rem')}
                                                        className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors", borderRadius === '2rem' ? "bg-white/10 shadow-sm text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}
                                                    >
                                                        Round
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="glass-card bg-card/40 border-white/5 p-4 rounded-2xl">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-2">Form Components</h3>
                                <div className="space-y-2">
                                    {FIELD_TYPES.map(t => (
                                        <button
                                            key={t.type}
                                            onClick={() => addField(t.type as FieldType)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-sm font-medium text-left group"
                                        >
                                            <div className="p-2 bg-background rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm" style={{ color: themeColor }}>
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

                        {/* Builder Canvas with Live Preview */}
                        <div className="flex-1 space-y-6">
                            {/* Form Preview Container */}
                            <div className="border border-dashed border-white/10 rounded-3xl p-8 bg-black/20 min-h-[calc(100vh-12rem)] relative overflow-hidden transition-all duration-500">
                                {/* Simulated Background */}
                                <div
                                    className="absolute inset-0 transition-colors duration-500 -z-10"
                                    style={{ background: bgColor }}
                                />

                                {/* Form Header */}
                                <div
                                    className="border border-black/5 shadow-xl p-8 mb-6 transition-all duration-300 bg-white"
                                    style={{
                                        borderTop: `8px solid ${themeColor}`,
                                        borderRadius: borderRadius
                                    }}
                                >
                                    <input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="text-4xl font-black bg-transparent border-none focus:ring-0 w-full placeholder:text-gray-300 leading-tight mb-2 p-0 text-gray-900"
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
                                            <div className="bg-card glass-card border rounded-xl p-6 opacity-90 rotate-2 cursor-grabbing" style={{ borderColor: themeColor }}>
                                                <p className="font-bold text-lg">Question</p>
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h1 className="text-3xl font-black mb-2">My Forms</h1>
                                <p className="text-muted-foreground">Manage and track your active forms</p>
                            </div>
                            <button onClick={() => { setActiveTab('build'); resetBuilder(); }} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 flex items-center gap-2">
                                <Plus size={16} /> Create New
                            </button>
                        </div>
                        <MyFormsList />
                    </div>
                )}
            </div>
        </div>
    );
}

// Add global styles for dnd-kit accessibility if needed, usually handles itself.
