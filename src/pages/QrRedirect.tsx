import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const QrRedirect = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const resolveQr = async () => {
            if (!code) return;

            try {
                const { data, error } = await supabase
                    .from("qr_codes")
                    .select("id, target_url, type, expires_at, scan_count")
                    .eq("short_code", code)
                    .maybeSingle();

                if (error || !data) {
                    console.error("QR Fetch Error:", error);
                    setError("Invalid or deleted QR Code");
                    return;
                }

                if (data.expires_at && new Date(data.expires_at) < new Date()) {
                    setError("This QR Code has expired.");
                    return;
                }

                // Attempt to increment scan count (fire and forget)
                // We use an RPC call if available, or simple update if RLS permits
                // For safety in this environment, we try RPC first
                const { error: rpcError } = await supabase.rpc('increment_qr_scan', { qr_id: data.id });

                if (rpcError) {
                    // Fallback: try direct update (might fail due to RLS but worth a try if policy allows)
                    await supabase
                        .from("qr_codes")
                        .update({ scan_count: (data.scan_count || 0) + 1 })
                        .eq("id", data.id);
                }

                // Redirect
                // Check if target_url is relative or absolute
                let target = data.target_url;
                if (!target.startsWith("http") && !target.startsWith("/")) {
                    target = "https://" + target;
                }

                window.location.href = target;
            } catch (err) {
                setError("An unexpected error occurred");
            }
        };

        resolveQr();
    }, [code]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center pb-20">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">⚠️</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">QR Code Issue</h2>
                <p className="text-zinc-400 max-w-xs mx-auto mb-8">{error}</p>
                <button
                    onClick={() => navigate("/")}
                    className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors"
                >
                    Go to Homepage
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-zinc-800 rounded-full" />
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-sm font-bold tracking-widest uppercase text-zinc-500 animate-pulse">Redirecting...</p>
            </div>
        </div>
    );
};

export default QrRedirect;
