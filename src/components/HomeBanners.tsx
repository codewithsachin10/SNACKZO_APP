import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Banner {
    id: string;
    title: string;
    image_url: string;
    link_url?: string;
    description?: string;
}

export default function HomeBanners() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        const now = new Date().toISOString();
        const { data } = await supabase
            .from("banners")
            .select("*")
            .eq("is_active", true)
            .order("priority", { ascending: true })
            // We process date filtering in JS if SQL logic is tricky with nulls, 
            // but simplistic approach for now:
            .order("created_at", { ascending: false });

        // Client side filtering for dates to handle nulls gracefully
        // (Start date IS NULL OR start_date <= now) AND (end_date IS NULL OR end_date >= now)
        const activeBanners = (data || []).filter((b: any) => {
            const startValid = !b.start_date || new Date(b.start_date) <= new Date();
            const endValid = !b.end_date || new Date(b.end_date) >= new Date();
            return startValid && endValid;
        });

        setBanners(activeBanners);
    };

    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [banners.length]);

    const handleBannerClick = (banner: Banner) => {
        if (banner.link_url) {
            if (banner.link_url.startsWith('http')) {
                window.open(banner.link_url, '_blank');
            } else {
                navigate(banner.link_url);
            }
        }
    };

    if (banners.length === 0) return null;

    return (
        <div className="relative w-full aspect-[21/9] md:aspect-[32/9] overflow-hidden rounded-xl shadow-lg my-4">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => handleBannerClick(banners[currentIndex])}
                >
                    <img
                        src={banners[currentIndex].image_url}
                        alt={banners[currentIndex].title}
                        className="w-full h-full object-cover"
                    />
                    {/* Optional Gradient Overlay for text readability if description exists */}
                    {(banners[currentIndex].description || banners[currentIndex].title) && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 md:p-6 text-white">
                            <h3 className="font-bold text-lg md:text-2xl drop-shadow-md">{banners[currentIndex].title}</h3>
                            {banners[currentIndex].description && (
                                <p className="text-sm md:text-base opacity-90 line-clamp-1">{banners[currentIndex].description}</p>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Navigation Indicators */}
            {banners.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? "bg-white w-4" : "bg-white/50 hover:bg-white/80"
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
