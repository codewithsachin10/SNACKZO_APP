import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    MapPin, Search, LocateFixed, Navigation, Home, Briefcase, Plus,
    ArrowLeft, MoreVertical, MessageCircle, Clock, Trash2, Check, X, Share2, RefreshCw, AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from "@/integrations/supabase/client";

// Leaflet Icons Setup
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface AddressSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface UserAddress {
    id: string;
    label: string;
    house_no: string;
    area: string;
    directions?: string;
    latitude?: number;
    longitude?: number;
    user_id: string;
    is_default?: boolean;
}

interface RecentSearch {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    timestamp: number;
}

const RECENT_SEARCHES_KEY = 'snackzo_recent_searches';
const MAX_RECENT_SEARCHES = 5;

// LocalStorage helpers for recent searches
const getRecentSearches = (): RecentSearch[] => {
    try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveRecentSearch = (search: Omit<RecentSearch, 'id' | 'timestamp'>) => {
    try {
        const existing = getRecentSearches();
        const newSearch: RecentSearch = {
            ...search,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
        };
        // Remove duplicates (same lat/lng)
        const filtered = existing.filter(s =>
            Math.abs(s.lat - search.lat) > 0.0001 || Math.abs(s.lng - search.lng) > 0.0001
        );
        const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        return updated;
    } catch {
        return [];
    }
};

const clearRecentSearches = () => {
    try {
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch { }
};

// Map Controller
function MapController({ onMoveEnd, center }: { onMoveEnd: (lat: number, lng: number) => void, center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 16, { animate: true, duration: 1 });
    }, [center, map]);

    useMapEvents({
        moveend: () => {
            const c = map.getCenter();
            onMoveEnd(c.lat, c.lng);
        }
    });
    return null;
}

// Users Icon
const UsersIcon = ({ size, className }: { size?: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const AddressSelectorModal = ({ isOpen, onClose }: AddressSelectorModalProps) => {
    const { user, profile, updateProfile } = useAuth();
    const [view, setView] = useState<"list" | "map" | "details">("list");

    // State
    const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 79.1594]);
    const [formattedAddress, setFormattedAddress] = useState("Rajalakshmi Engineering College");

    // Form State
    const [houseNo, setHouseNo] = useState("");
    const [area, setArea] = useState("");
    const [directions, setDirections] = useState("");
    const [addressLabel, setAddressLabel] = useState<"Home" | "Work" | "Friends" | "Other">("Home");
    const [isSaving, setIsSaving] = useState(false);

    // Data State
    const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);

    // GPS State
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);

    // Load recent searches on mount
    useEffect(() => {
        setRecentSearches(getRecentSearches());
    }, []);

    // Fetch Addresses
    const fetchAddresses = async () => {
        if (!user) return;
        setIsLoadingAddresses(true);
        try {
            const { data, error } = await supabase
                .from('user_addresses' as any)
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setSavedAddresses(data as unknown as UserAddress[]);
            }
        } catch (err) {
            console.error("Failed to fetch addresses:", err);
        } finally {
            setIsLoadingAddresses(false);
        }
    };

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setView("list");
            setSearchQuery("");
            setSearchResults([]);
            setSearchError(null);
            setGpsError(null);
            fetchAddresses();
            setRecentSearches(getRecentSearches());
        }
    }, [isOpen, user]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length > 2) {
                handleSearch(searchQuery);
            } else {
                setSearchResults([]);
                setSearchError(null);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = async (query: string) => {
        setIsSearching(true);
        setSearchError(null);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`,
                {
                    headers: { 'Accept': 'application/json' }
                }
            );
            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();
            setSearchResults(data);
            if (data.length === 0) {
                setSearchError("No results found. Try a different search.");
            }
        } catch (error) {
            console.error("Search failed:", error);
            setSearchError("Search failed. Please try again.");
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                {
                    headers: { 'Accept': 'application/json' }
                }
            );
            if (!response.ok) throw new Error('Geocoding failed');
            const data = await response.json();
            if (data && data.display_name) {
                const parts = data.display_name.split(',');
                const shortAddress = parts.slice(0, 3).join(', ');
                setFormattedAddress(shortAddress);

                if (data.address) {
                    const road = data.address.road || data.address.pedestrian || "";
                    const suburb = data.address.suburb || data.address.neighbourhood || "";
                    const city = data.address.city || data.address.town || data.address.village || "";
                    const areaStr = [road, suburb, city].filter(Boolean).join(', ');
                    if (areaStr) setArea(areaStr);
                }
            }
        } catch (error) {
            console.error("Reverse geocode failed:", error);
            setFormattedAddress("Location selected");
        }
    };

    const handleSelectSearchResult = (result: any) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const name = result.display_name.split(',')[0];
        const address = result.display_name.split(',').slice(0, 3).join(', ');

        setMapCenter([lat, lon]);
        setFormattedAddress(address);
        setArea(address);
        setSearchResults([]);
        setSearchQuery("");

        // Save to recent searches
        const updated = saveRecentSearch({ name, address, lat, lng: lon });
        setRecentSearches(updated);

        setView("map");
    };

    const handleSelectRecentSearch = (search: RecentSearch) => {
        setMapCenter([search.lat, search.lng]);
        setFormattedAddress(search.address);
        setArea(search.address);
        setView("map");
    };

    const handleClearRecentSearches = () => {
        clearRecentSearches();
        setRecentSearches([]);
        toast.success("Recent searches cleared");
    };

    const handleGetCurrentLocation = () => {
        if (!("geolocation" in navigator)) {
            toast.error("GPS not supported on this device");
            return;
        }

        setIsGettingLocation(true);
        setGpsError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setMapCenter([latitude, longitude]);
                reverseGeocode(latitude, longitude);
                setIsGettingLocation(false);
                setView("map");
                toast.success("Location found!");
            },
            (error) => {
                setIsGettingLocation(false);
                let errorMsg = "Unable to get location";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = "Location permission denied. Please enable in browser settings.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = "Location unavailable. Please try again.";
                        break;
                    case error.TIMEOUT:
                        errorMsg = "Location request timed out. Please try again.";
                        break;
                }
                setGpsError(errorMsg);
                toast.error(errorMsg);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    const handleRequestPin = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Share my delivery location',
                text: `I need help setting my delivery location for Snackzo. Can you share a Google Maps pin?`,
            }).catch(() => { });
        } else {
            // Fallback: copy a message to clipboard
            const msg = "I need help setting my delivery location for Snackzo. Can you share a Google Maps pin?";
            navigator.clipboard.writeText(msg);
            toast.success("Message copied! Share with someone to get their location pin.");
        }
    };

    const handleMapMoveEnd = (lat: number, lng: number) => {
        setMapCenter([lat, lng]);
        reverseGeocode(lat, lng);
    };

    const handleConfirmLocation = () => {
        if (!area) setArea(formattedAddress);

        // Save to recent searches when confirming
        const name = formattedAddress.split(',')[0];
        const updated = saveRecentSearch({
            name,
            address: formattedAddress,
            lat: mapCenter[0],
            lng: mapCenter[1]
        });
        setRecentSearches(updated);

        setView("details");
    };

    const handleSaveNewAddress = async () => {
        if (!user) return;
        if (!houseNo || !area) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSaving(true);
        try {
            const { data: newAddr, error: insertError } = await supabase
                .from('user_addresses' as any)
                .insert({
                    user_id: user.id,
                    label: addressLabel,
                    house_no: houseNo,
                    area: area,
                    directions: directions,
                    latitude: mapCenter[0],
                    longitude: mapCenter[1],
                    is_default: true
                })
                .select()
                .single();

            if (insertError) throw insertError;

            await updateProfile({
                hostel_block: area,
                room_number: houseNo,
            });

            toast.success("Address saved successfully!");
            setSavedAddresses(prev => [newAddr as unknown as UserAddress, ...prev]);

            // Reset form
            setHouseNo("");
            setDirections("");

            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to save address");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectAddress = async (addr: UserAddress) => {
        setIsSaving(true);
        try {
            const { error } = await updateProfile({
                hostel_block: addr.area,
                room_number: addr.house_no,
            });
            if (error) throw error;
            toast.success(`Delivering to: ${addr.label}`);
            onClose();
        } catch (err) {
            toast.error("Failed to set address");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAddress = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Remove this address?")) return;

        const { error } = await supabase
            .from('user_addresses' as any)
            .delete()
            .eq('id', id);

        if (error) {
            toast.error("Delete failed");
        } else {
            setSavedAddresses(prev => prev.filter(a => a.id !== id));
            toast.success("Address removed");
        }
    };

    const renderSearchInput = (isMap = false) => (
        <div className={`relative ${isMap ? "flex-1" : "w-full"}`}>
            <div className="relative group">
                {!isMap && <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary w-5 h-5 z-10 transition-colors" />}
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full bg-card/50 border border-white/5 rounded-2xl py-4 pl-12 pr-10 outline-none text-sm font-medium focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/40 ${isMap ? "h-11 py-0 pl-4 border-none bg-transparent focus:ring-0 text-base" : ""}`}
                    placeholder={isMap ? "Search location..." : "Search an area or address"}
                />
                {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                {searchQuery && !isSearching && (
                    <button
                        onClick={() => { setSearchQuery(""); setSearchError(null); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={16} className="text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Search Error */}
            {searchError && !isSearching && searchQuery.length > 2 && (
                <div className="absolute left-0 right-0 top-full mt-3 bg-card/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-lg z-[600] p-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <AlertCircle size={18} />
                        <span className="text-sm">{searchError}</span>
                    </div>
                </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className={`absolute left-0 right-0 top-full mt-3 bg-card/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[600] overflow-hidden ${isMap ? "w-[90vw] -ml-12 sm:w-[400px]" : ""}`}>
                    {searchResults.map((result, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelectSearchResult(result)}
                            className="w-full text-left p-4 hover:bg-white/5 flex items-start gap-4 border-b border-white/5 last:border-0 transition-all active:scale-[0.98]"
                        >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <MapPin size={20} className="text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-foreground line-clamp-1">{result.display_name.split(',')[0]}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{result.display_name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose} modal>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-background gap-0 rounded-none sm:rounded-[2rem] h-[100dvh] sm:h-[750px] flex flex-col border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.8)] outline-none">
                <DialogTitle className="sr-only">Select Location</DialogTitle>
                <DialogDescription className="sr-only">Delivering to your doorstep in minutes</DialogDescription>

                {/* VIEW: LIST */}
                {view === "list" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col h-full overflow-hidden"
                    >
                        <div className="p-6 bg-background space-y-6">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={onClose}
                                    className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-primary/20 hover:text-primary rounded-full transition-all border border-white/5"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                                <h1 className="text-2xl font-black italic tracking-tight">SELECT LOCATION</h1>
                            </div>

                            {renderSearchInput(false)}
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-8 scrollbar-none">
                            {/* Quick Actions Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={handleGetCurrentLocation}
                                    disabled={isGettingLocation}
                                    className="group flex flex-col items-center justify-center gap-3 p-4 aspect-square bg-card/40 rounded-3xl border border-white/5 hover:border-primary/50 transition-all hover:bg-primary/5 active:scale-95 shadow-lg disabled:opacity-50"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                        {isGettingLocation ? (
                                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <LocateFixed size={24} />
                                        )}
                                    </div>
                                    <span className="text-[11px] font-bold text-center leading-tight uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Current<br />GPS</span>
                                </button>
                                <button onClick={() => setView("map")} className="group flex flex-col items-center justify-center gap-3 p-4 aspect-square bg-card/40 rounded-3xl border border-white/5 hover:border-accent/50 transition-all hover:bg-accent/5 active:scale-95 shadow-lg">
                                    <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus size={24} />
                                    </div>
                                    <span className="text-[11px] font-bold text-center leading-tight uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Manual<br />Add</span>
                                </button>
                                <button
                                    onClick={handleRequestPin}
                                    className="group flex flex-col items-center justify-center gap-3 p-4 aspect-square bg-card/40 rounded-3xl border border-white/5 hover:border-secondary/50 transition-all hover:bg-secondary/5 active:scale-95 shadow-lg"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Share2 size={24} />
                                    </div>
                                    <span className="text-[11px] font-bold text-center leading-tight uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Request<br />Pin</span>
                                </button>
                            </div>

                            {/* GPS Error Alert */}
                            {gpsError && (
                                <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl">
                                    <AlertCircle size={20} className="text-destructive shrink-0" />
                                    <p className="text-sm text-destructive">{gpsError}</p>
                                    <button onClick={handleGetCurrentLocation} className="ml-auto p-2 hover:bg-white/10 rounded-xl">
                                        <RefreshCw size={16} className="text-destructive" />
                                    </button>
                                </div>
                            )}

                            {/* Saved Addresses */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Saved Addresses</h3>
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{savedAddresses.length}</Badge>
                                </div>

                                {isLoadingAddresses ? (
                                    <div className="space-y-4">
                                        {[1, 2].map(i => <div key={i} className="h-24 bg-card animate-pulse rounded-3xl border border-white/5" />)}
                                    </div>
                                ) : savedAddresses.length === 0 ? (
                                    <div className="glass-card p-10 text-center space-y-3">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                            <MapPin size={32} className="text-muted-foreground/30" />
                                        </div>
                                        <p className="text-sm font-bold text-muted-foreground">No addresses saved yet.</p>
                                        <p className="text-xs text-muted-foreground/60">Use GPS or search to add your first address</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {savedAddresses.map((addr) => {
                                            const isActive = profile?.hostel_block === addr.area && profile?.room_number === addr.house_no;
                                            const Icon = addr.label === 'Home' ? Home : addr.label === 'Work' ? Briefcase : MapPin;

                                            return (
                                                <div
                                                    key={addr.id}
                                                    onClick={() => handleSelectAddress(addr)}
                                                    className={`relative flex items-center gap-5 p-5 rounded-[2rem] border transition-all cursor-pointer group overflow-hidden ${isActive
                                                        ? "bg-primary/20 border-primary/50 shadow-[0_15px_40px_rgba(168,85,247,0.3)]"
                                                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
                                                        }`}
                                                >
                                                    {isActive && (
                                                        <div className="absolute top-0 right-0 bg-primary px-4 py-1.5 rounded-bl-2xl text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg">
                                                            ACTIVE
                                                        </div>
                                                    )}
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 ${isActive ? "bg-primary text-white scale-110 shadow-lg" : "bg-white/10 text-primary group-hover:bg-primary group-hover:text-white"}`}>
                                                        <Icon size={28} />
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-6">
                                                        <h4 className={`font-black text-base italic uppercase tracking-tight truncate ${isActive ? "text-white" : "text-foreground"}`}>
                                                            {addr.label}
                                                        </h4>
                                                        <p className={`text-sm font-bold leading-tight line-clamp-1 mt-1 ${isActive ? "text-white" : "text-foreground/90"}`}>
                                                            {addr.house_no}
                                                        </p>
                                                        <p className={`text-[11px] font-black uppercase tracking-widest mt-1.5 truncate ${isActive ? "text-white/60" : "text-muted-foreground/80"}`}>
                                                            {addr.area}
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={(e) => handleDeleteAddress(addr.id, e)}
                                                        className={`p-2 rounded-xl transition-all ${isActive ? "text-white/40 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Recently Searched */}
                            {recentSearches.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Recently Searched</h3>
                                        <button
                                            onClick={handleClearRecentSearches}
                                            className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors uppercase tracking-wider"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {recentSearches.map((search) => (
                                            <button
                                                key={search.id}
                                                onClick={() => handleSelectRecentSearch(search)}
                                                className="w-full flex items-center gap-5 p-5 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group text-left"
                                            >
                                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors shrink-0">
                                                    <Clock size={22} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-sm text-foreground truncate uppercase tracking-tight">{search.name}</h4>
                                                    <p className="text-xs font-medium text-muted-foreground truncate italic mt-0.5">{search.address}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* VIEW: MAP */}
                {view === "map" && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col h-full bg-background relative"
                    >
                        <div className="absolute top-0 left-0 right-0 z-[500] p-6 pointer-events-none">
                            <div className="bg-card/90 backdrop-blur-2xl shadow-2xl rounded-[1.5rem] flex items-center p-2 gap-2 pointer-events-auto border border-white/10 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-xl hover:bg-white/10 shrink-0 text-foreground"
                                    onClick={() => setView("list")}
                                >
                                    <ArrowLeft size={20} />
                                </Button>
                                {renderSearchInput(true)}
                            </div>
                        </div>

                        <div className="flex-1 relative z-0">
                            <MapContainer
                                center={mapCenter}
                                zoom={16}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                            >
                                <TileLayer
                                    attribution='&copy; OSM'
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
                                />
                                <MapController
                                    center={mapCenter}
                                    onMoveEnd={handleMapMoveEnd}
                                />
                            </MapContainer>

                            {/* Center Pin */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[400] pb-[60px]">
                                <div className="relative flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full border-2 border-primary/30 animate-ping absolute" />
                                    <div className="w-8 h-8 rounded-full border-4 border-primary bg-white shadow-[0_0_20px_rgba(168,85,247,0.6)] z-10" />
                                    <div className="w-1 h-12 bg-primary absolute -bottom-10 rounded-full shadow-lg" />
                                    <div className="w-4 h-4 bg-black/40 rounded-full blur-[4px] absolute -bottom-11" />
                                </div>
                            </div>

                            <button
                                onClick={handleGetCurrentLocation}
                                disabled={isGettingLocation}
                                className="absolute bottom-[320px] right-6 z-[400] w-14 h-14 bg-white text-primary rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
                            >
                                {isGettingLocation ? (
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <LocateFixed size={24} />
                                )}
                            </button>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-[500] p-8 pb-10 border-t border-white/5 space-y-6">
                            <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto" />

                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
                                    <span className="text-[10px] font-black text-lime uppercase tracking-widest">Delivering to</span>
                                </div>
                                <div className="flex items-start gap-5">
                                    <div className="w-14 h-14 bg-primary/10 rounded-[1.25rem] flex items-center justify-center shrink-0">
                                        <MapPin className="text-primary" size={32} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="font-black text-2xl tracking-tight leading-tight uppercase italic mb-1">{formattedAddress.split(',')[0]}</h2>
                                        <p className="text-sm font-medium text-muted-foreground leading-snug line-clamp-2">
                                            {formattedAddress}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-primary hover:bg-primary/90 text-white font-black h-16 text-lg rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all uppercase tracking-wider"
                                onClick={handleConfirmLocation}
                            >
                                Confirm Location
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* VIEW: DETAILS */}
                {view === "details" && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col h-full bg-background"
                    >
                        <div className="p-6 flex items-center gap-4 bg-background border-b border-white/5">
                            <button
                                onClick={() => setView("map")}
                                className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h1 className="text-xl font-black uppercase italic tracking-tighter">Enter Details</h1>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-none">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 bg-accent/10 rounded-[1.5rem] flex items-center justify-center shrink-0">
                                    <MapPin className="text-accent" size={30} />
                                </div>
                                <div>
                                    <h2 className="font-black text-xl leading-none uppercase italic tracking-tighter mb-2">Area Overview</h2>
                                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                                        {formattedAddress}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-2 group">
                                    <Label className="text-[10px] font-black text-primary uppercase tracking-[0.3em] group-focus-within:text-lime transition-colors">House / Block / Flat No. *</Label>
                                    <Input
                                        value={houseNo}
                                        onChange={e => setHouseNo(e.target.value)}
                                        className="h-14 bg-white/5 border-none rounded-2xl px-5 text-base font-bold focus-visible:ring-2 focus-visible:ring-primary/50 transition-all placeholder:text-white/10"
                                        placeholder="Ex: #404, Block-H"
                                    />
                                </div>

                                <div className="space-y-2 group">
                                    <Label className="text-[10px] font-black text-primary uppercase tracking-[0.3em] group-focus-within:text-lime transition-colors">Area / Locality Name *</Label>
                                    <Input
                                        value={area}
                                        onChange={e => setArea(e.target.value)}
                                        className="h-14 bg-white/5 border-none rounded-2xl px-5 text-base font-bold focus-visible:ring-2 focus-visible:ring-primary/50 transition-all placeholder:text-white/10"
                                        placeholder="Ex: HSR Layout Sector 2"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Nearby Landmark / Instructions (Optional)</Label>
                                    <div className="relative">
                                        <textarea
                                            value={directions}
                                            onChange={e => setDirections(e.target.value)}
                                            className="w-full h-32 bg-white/5 p-5 rounded-[2rem] text-sm font-medium border-none focus:ring-2 focus:ring-primary/30 resize-none outline-none transition-all placeholder:text-white/10"
                                            placeholder="Ex: Opposite the main gate, ring the bell."
                                            maxLength={200}
                                        />
                                        <div className="absolute bottom-4 right-6 text-[10px] font-mono text-muted-foreground/40">
                                            {directions.length}/200
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Tag this location as</Label>
                                    <div className="flex gap-3 flex-wrap">
                                        {[
                                            { key: 'Home', icon: Home, color: 'text-primary', bg: 'bg-primary/10' },
                                            { key: 'Work', icon: Briefcase, color: 'text-secondary', bg: 'bg-secondary/10' },
                                            { key: 'Friends', icon: UsersIcon, color: 'text-accent', bg: 'bg-accent/10' },
                                            { key: 'Other', icon: MapPin, color: 'text-lime', bg: 'bg-lime/10' }
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                onClick={() => setAddressLabel(item.key as any)}
                                                className={`flex items-center gap-3 px-5 py-3.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${addressLabel === item.key
                                                    ? `bg-white text-black border-white shadow-xl`
                                                    : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10'
                                                    }`}
                                            >
                                                <item.icon size={16} className={addressLabel === item.key ? 'text-black' : item.color} />
                                                {item.key}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-background/80 backdrop-blur-xl">
                            <Button
                                className={`w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl ${houseNo && area ? 'bg-primary text-white shadow-primary/20' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                                onClick={handleSaveNewAddress}
                                disabled={isSaving || !houseNo || !area}
                            >
                                {isSaving ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        SAVING...
                                    </div>
                                ) : "Deliver Here"}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AddressSelectorModal;
