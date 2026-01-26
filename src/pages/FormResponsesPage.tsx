
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { toast } from "sonner";

export default function FormResponsesPage() {
    const { formId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<any>(null);
    const [fields, setFields] = useState<any[]>([]);
    const [responses, setResponses] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [formId]);

    const loadData = async () => {
        try {
            if (!formId) return;
            // Fetch form details
            const { data: formData, error: formError } = await supabase
                .from('admin_forms')
                .select('*')
                .eq('id', formId)
                .single();

            if (formError) throw formError;
            setForm(formData);

            // Fetch fields
            const { data: fieldsData, error: fieldsError } = await supabase
                .from('admin_form_fields')
                .select('*')
                .eq('form_id', formId)
                .order('order_index', { ascending: true });

            if (fieldsError) throw fieldsError;
            setFields(fieldsData || []);

            // Fetch responses
            const { data: respData, error: respError } = await supabase
                .from('admin_form_responses')
                .select('*')
                .eq('form_id', formId)
                .order('created_at', { ascending: false });

            if (respError) throw respError;
            setResponses(respData || []);

        } catch (error) {
            console.error(error);
            toast.error("Failed to load responses");
        } finally {
            setLoading(false);
        }
    };

    const downloadCsv = () => {
        if (!responses.length || !fields.length) return;

        // Build CSV
        const headers = ["Submitted At", ...fields.map(f => f.label)];
        const csvRows = [headers.join(",")];

        for (const row of responses) {
            const values = [
                new Date(row.created_at).toLocaleString().replace(/,/g, ' '),
                ...fields.map(f => {
                    let val = row.response_data[f.id];

                    if (val && typeof val === 'object' && val.name) {
                        val = `File: ${val.name}`;
                    } else if (f.field_type === 'signature' && val) {
                        val = "Signed";
                    } else if (typeof val === 'boolean') {
                        val = val ? 'Yes' : 'No';
                    }

                    if (val === undefined || val === null) val = '';
                    const stringVal = String(val).replace(/"/g, '""'); // Escape double quotes
                    return `"${stringVal}"`; // Wrap in quotes
                })
            ];
            csvRows.push(values.join(","));
        }

        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${form.title.replace(/\s+/g, '_')}_responses.csv`;
        a.click();
        toast.success("CSV Downloaded");
    };

    const renderCellValue = (value: any, type: string) => {
        if (value === null || value === undefined || value === '') return <span className="text-muted-foreground/30 italic">-</span>;

        if (type === 'file' && typeof value === 'object' && value.name) {
            return (
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span className="font-medium">{value.name}</span>
                    <span className="text-xs text-muted-foreground">({(value.size / 1024).toFixed(1)} KB)</span>
                    {/* In a real app, this would be a download link to Storage */}
                </div>
            );
        }

        if (type === 'signature' && typeof value === 'string' && value.startsWith('data:image')) {
            return (
                <div className="h-10 border border-white/10 bg-white/5 rounded px-2 flex items-center">
                    <img src={value} alt="Signature" className="h-8 w-auto object-contain" />
                </div>
            );
        }

        if (typeof value === 'boolean') {
            return value ? <span className="text-emerald-400 font-bold">Yes</span> : <span className="text-red-400 font-bold">No</span>;
        }

        return <span className="line-clamp-2" title={String(value)}>{String(value)}</span>;
    };

    if (loading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading responses...</div>;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin/form-builder')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black">{form?.title}</h1>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText size={16} />
                                <span className="text-sm font-medium">Responses & Analytics</span>
                            </div>
                        </div>
                    </div>
                    {responses.length > 0 && (
                        <button
                            onClick={downloadCsv}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
                        >
                            <Download size={18} />
                            Export CSV
                        </button>
                    )}
                </div>

                {/* Content */}
                {responses.length === 0 ? (
                    <div className="py-20 text-center glass-card bg-card/30 border-white/5 rounded-2xl">
                        <p className="text-xl font-bold text-muted-foreground">No responses yet</p>
                        <p className="text-sm text-muted-foreground/50 mt-2">Responses will appear here once users submit your form.</p>
                    </div>
                ) : (
                    <div className="bg-card glass-card border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white/5 border-b border-white/5 text-muted-foreground font-bold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="p-4 w-48 whitespace-nowrap">Submitted At</th>
                                        {fields.map(f => (
                                            <th key={f.id} className="p-4 min-w-[200px] whitespace-nowrap">{f.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-muted-foreground">
                                    {responses.map((r) => (
                                        <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 whitespace-nowrap font-mono text-xs">
                                                {new Date(r.created_at).toLocaleString()}
                                            </td>
                                            {fields.map(f => (
                                                <td key={f.id} className="p-4 text-foreground/80">
                                                    {renderCellValue(r.response_data[f.id], f.field_type)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-white/5 bg-white/5 text-center text-xs text-muted-foreground">
                            Showing {responses.length} responses
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
