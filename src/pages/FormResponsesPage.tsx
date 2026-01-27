
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, FileText, RefreshCcw, TrendingUp, Clock, Users } from "lucide-react";

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
            // toast.error("Failed to load responses"); // Suppress error for empty states or RLS silent failures
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
        // toast.success("CSV Downloaded");
    };

    const renderCellValue = (value: any, type: string) => {
        if (value === null || value === undefined || value === '') return <span className="text-muted-foreground/30 italic">-</span>;

        if (type === 'file' && typeof value === 'object' && value.name) {
            return (
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span className="font-medium">{value.name}</span>
                    <span className="text-xs text-muted-foreground">({(value.size / 1024).toFixed(1)} KB)</span>
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
                    <div className="flex gap-2">
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-foreground rounded-xl font-bold transition-all"
                        >
                            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                            Refresh
                        </button>
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
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-card bg-card/40 p-6 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/20 text-primary rounded-xl">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">Total Responses</p>
                                <p className="text-3xl font-black">{responses.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card bg-card/40 p-6 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-xl">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">Active Status</p>
                                <p className="text-3xl font-black">{form?.is_active ? 'Active' : 'Stopped'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card bg-card/40 p-6 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 text-blue-500 rounded-xl">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">Last Submission</p>
                                <p className="text-xl font-bold">
                                    {responses[0] ? new Date(responses[0].created_at).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
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
                                        {/* Active Fields */}
                                        {fields.map(f => (
                                            <th key={f.id} className="p-4 min-w-[200px] whitespace-nowrap">{f.label}</th>
                                        ))}
                                        {/* Legacy/Orphaned Fields (Data from previous versions of the form) */}
                                        {Array.from(new Set(responses.flatMap(r => Object.keys(r.response_data || {}))))
                                            .filter(key => !fields.find(f => f.id === key))
                                            .map(key => (
                                                <th key={key} className="p-4 min-w-[200px] whitespace-nowrap text-muted-foreground/50 border-l border-white/5">
                                                    Legacy Field
                                                    <span className="block text-[8px] font-normal lowercase opacity-50 truncate w-32">{key}</span>
                                                </th>
                                            ))
                                        }
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-muted-foreground">
                                    {responses.map((r) => {
                                        // Calculate legacy keys once per row or derived from above
                                        const legacyKeys = Array.from(new Set(responses.flatMap(resp => Object.keys(resp.response_data || {}))))
                                            .filter(key => !fields.find(f => f.id === key));

                                        return (
                                            <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 whitespace-nowrap font-mono text-xs">
                                                    {new Date(r.created_at).toLocaleString()}
                                                </td>
                                                {/* Active Fields Data */}
                                                {fields.map(f => (
                                                    <td key={f.id} className="p-4 text-foreground/80">
                                                        {renderCellValue(r.response_data[f.id], f.field_type)}
                                                    </td>
                                                ))}
                                                {/* Legacy Fields Data */}
                                                {legacyKeys.map(key => (
                                                    <td key={key} className="p-4 text-muted-foreground/50 border-l border-white/5 bg-black/10">
                                                        {renderCellValue(r.response_data[key], 'text')}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
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
