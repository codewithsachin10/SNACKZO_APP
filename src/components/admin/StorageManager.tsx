import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Trash2, Folder, FileImage, Copy, Search, RefreshCw, ChevronRight, Download, Grid, List as ListIcon, Loader2, X, Eye, FolderPlus, ArrowUpDown, Edit3, RotateCw, MoveHorizontal, Check, Sliders, Sun, Contrast, Droplet, Layers, Sparkles, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";

const PRESET_IMAGES = [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80", // Burger
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80", // Pizza
    "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80", // Pizza 2 (Verified)
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80", // Burger 2
    "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80", // Burger 3
    "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80", // Club Sandwich
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80", // Cocktail
    "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=800&q=80", // Iced Tea
    "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80", // Choco Donut
    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80", // Biryani (Verified)
    "https://images.unsplash.com/photo-1573080496987-a199f8cd4054?auto=format&fit=crop&w=800&q=80", // Fries (Verified)
    "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80", // Fried Chicken
    "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80", // Coffee
    "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80"  // Cake
];

const FESTIVAL_IMAGES = [
    "https://images.unsplash.com/photo-1510137600163-2729bc699960?auto=format&fit=crop&w=1200&q=80", // Diwali Lamps
    "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?auto=format&fit=crop&w=1200&q=80", // Feast (New Verified)
    "https://images.unsplash.com/photo-1585832779471-a83d3ce3d27c?auto=format&fit=crop&w=1200&q=80", // Holi Colors
    "https://images.unsplash.com/photo-1582234563855-333f2e7c4f44?auto=format&fit=crop&w=1200&q=80", // Ganesh
    "https://images.unsplash.com/photo-1615557960916-5f4791ea19d4?auto=format&fit=crop&w=1200&q=80", // Indian Sweets (New)
    "https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&w=1200&q=80", // Gold/Fireworks
    "https://images.unsplash.com/photo-1609838706348-18544ea17666?auto=format&fit=crop&w=1200&q=80", // Flower Rangoli
    "https://images.unsplash.com/photo-1605307307616-52c6f3762699?auto=format&fit=crop&w=1200&q=80", // Diya
    "https://images.unsplash.com/photo-1596707328114-6d9b13928120?auto=format&fit=crop&w=1200&q=80", // Traditional Dress
    "https://images.unsplash.com/photo-1623488827725-b4676572e96d?auto=format&fit=crop&w=1200&q=80"  // Temple (New Verified)
];


// File Object Interface
interface FileObject {
    id: string;
    name: string;
    size: number;
    created_at: string;
    updated_at: string;
    last_accessed_at: string;
    metadata: Record<string, any>;
    mimetype?: string;
}

type SortOption = "name" | "date" | "size";

export default function StorageManager() {
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [filesTab, setFilesTab] = useState<'files' | 'stock'>('files');
    const [files, setFiles] = useState<FileObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [selection, setSelection] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("date");
    const [previewFile, setPreviewFile] = useState<FileObject | null>(null);
    const [editingFile, setEditingFile] = useState<FileObject | null>(null);

    // Drag and Drop
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Local storage for hidden system assets
    const [hiddenAssets, setHiddenAssets] = useState<string[]>(() => {
        const saved = localStorage.getItem('hidden_system_assets');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('hidden_system_assets', JSON.stringify(hiddenAssets));
        fetchFiles(); // Refresh view when hidden assets change
    }, [hiddenAssets]);

    useEffect(() => {
        fetchFiles();
        setSelection([]);
    }, [currentPath]);

    const fetchFiles = async () => {
        setIsLoading(true);
        const folder = currentPath.length > 0 ? currentPath.join('/') : undefined;

        // --- VIRTUAL FOLDER LOGIC: MainBanner ---
        if (currentPath.length > 0 && currentPath[currentPath.length - 1] === 'MainBanner') {
            const stockFiles: FileObject[] = [
                ...FESTIVAL_IMAGES.map((url, i) => ({
                    id: `fest-${i}`,
                    name: `Festival_Banner_${i + 1}.jpg`,
                    size: 1024 * 1024 * 2, // Mock 2MB
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    last_accessed_at: new Date().toISOString(),
                    metadata: { mimetype: 'image/jpeg', isVirtual: true, url: url },
                    mimetype: 'image/jpeg'
                })),
                ...PRESET_IMAGES.map((url, i) => ({
                    id: `food-${i}`,
                    name: `Food_Asset_${i + 1}.jpg`,
                    size: 1024 * 1024 * 2,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    last_accessed_at: new Date().toISOString(),
                    metadata: { mimetype: 'image/jpeg', isVirtual: true, url: url },
                    mimetype: 'image/jpeg'
                }))
            ].filter(f => !hiddenAssets.includes(f.id)); // Filter hidden assets
            setFiles(stockFiles);
            setIsLoading(false);
            return;
        }

        const { data, error } = await supabase.storage
            .from('public-assets')
            .list(folder, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' },
            });

        if (error) {
            toast.error("Failed to load files");
        } else {
            const mappedFiles: FileObject[] = data.map(item => ({
                id: item.id || item.name,
                name: item.name,
                size: item.metadata?.size || 0,
                created_at: item.created_at || new Date().toISOString(),
                updated_at: item.updated_at || new Date().toISOString(),
                last_accessed_at: item.last_accessed_at || new Date().toISOString(),
                metadata: item.metadata || {},
                mimetype: item.metadata?.mimetype
            }));

            // INJECT VIRTUAL FOLDER AT ROOT
            if (currentPath.length === 0) {
                mappedFiles.unshift({
                    id: 'virt-main-banner',
                    name: 'MainBanner',
                    size: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    last_accessed_at: new Date().toISOString(),
                    metadata: { isVirtualFolder: true },
                    mimetype: undefined
                });
            }

            setFiles(mappedFiles);
        }
        setIsLoading(false);
    };

    // --- Sorting Logic ---
    const sortedFiles = [...files]
        .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            const isFolderA = !a.metadata.size;
            const isFolderB = !b.metadata.size;
            if (isFolderA && !isFolderB) return -1;
            if (!isFolderA && isFolderB) return 1;

            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'size') return b.size - a.size;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

    // --- Actions ---

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement> | File[]) => {
        let fileList: File[] = [];
        if (Array.isArray(event)) fileList = event;
        else if (event.target.files) fileList = Array.from(event.target.files);

        if (fileList.length === 0) return;

        setIsUploading(true);
        let successCount = 0;

        for (const file of fileList) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`Skipped ${file.name}: Too large (>5MB)`);
                continue;
            }

            const pathPrefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
            const cleanName = file.name.replace(/\s+/g, '-').toLowerCase();
            const fullPath = `${pathPrefix}${cleanName}`;

            const { error } = await supabase.storage.from('public-assets').upload(fullPath, file, { cacheControl: '3600', upsert: false });

            if (error) {
                if (error.message.includes('exists')) toast.error(`Skipped ${file.name}: Exists`);
                else toast.error(`Failed to upload ${file.name}`);
            } else {
                successCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`Uploaded ${successCount} files`);
            fetchFiles();
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDelete = async () => {
        if (selection.length === 0) return;

        // Filter out virtual files
        const selectedFiles = files.filter(f => selection.includes(f.name));
        const virtualFiles = selectedFiles.filter(f => f.metadata?.isVirtual || f.metadata?.isVirtualFolder);
        const realFiles = selectedFiles.filter(f => !f.metadata?.isVirtual && !f.metadata?.isVirtualFolder);

        // Handle Virtual Deletion (Hide them)
        if (virtualFiles.length > 0) {
            const idsToHide = virtualFiles.map(f => f.id);
            setHiddenAssets(prev => [...prev, ...idsToHide]);
            toast.success(`Removed ${virtualFiles.length} System Assets from view`);
        }

        if (realFiles.length === 0) {
            setSelection([]);
            return; // Only virtual files were selected
        }

        if (!confirm(`Delete ${realFiles.length} uploaded items? Irreversible.`)) return;

        const pathPrefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
        const pathsToDelete = realFiles.map(f => `${pathPrefix}${f.name}`);

        const { error } = await supabase.storage.from('public-assets').remove(pathsToDelete);

        if (error) toast.error("Failed to delete real files");
        else {
            toast.success("Uploaded items deleted");
            setSelection([]);
            fetchFiles();
        }
    };

    const copyUrl = (fileName: string) => {
        const pathPrefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
        const { data } = supabase.storage.from('public-assets').getPublicUrl(`${pathPrefix}${fileName}`);
        navigator.clipboard.writeText(data.publicUrl);
        toast.success("URL copied");
    };

    const handleDownload = async () => {
        if (selection.length > 5) {
            if (!confirm(`Open ${selection.length} tabs to download?`)) return;
        }

        selection.forEach(name => {
            const pathPrefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
            const { data } = supabase.storage.from('public-assets').getPublicUrl(`${pathPrefix}${name}`);

            const a = document.createElement('a');
            a.href = data.publicUrl + '?download=';
            a.target = '_blank';
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
        toast.success("Started downloads");
    };

    const createFolder = async () => {
        const name = prompt("Folder Name:");
        if (!name) return;

        // Sanitize: lowercase, replace spaces with hyphens, remove special chars
        const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        if (!cleanName) {
            toast.error("Invalid folder name");
            return;
        }

        const pathPrefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
        const fullPath = `${pathPrefix}${cleanName}/.keep`;

        // Use a non-empty blob and mock MIME type to 'image/png' to bypass bucket restrictions.
        const { error } = await supabase.storage.from('public-assets').upload(fullPath, new Blob([' '], { type: 'image/png' }), { upsert: false });

        if (error) {
            console.error(error);
            toast.error("Could not create folder. Check console.");
        } else {
            toast.success("Folder created");
            fetchFiles();
        }
    };

    // --- Helpers ---
    const getFileUrl = (name: string) => {
        // Handle Virtual Files
        const file = files.find(f => f.name === name);
        if (file?.metadata?.isVirtual) return file.metadata.url;

        const pathPrefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
        return supabase.storage.from('public-assets').getPublicUrl(`${pathPrefix}${name}`).data.publicUrl;
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const index = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, index)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][index];
    };

    const isFolder = (file: FileObject) => !file.metadata.mimetype;

    // Improved Selection Toggle
    const toggleSelection = (fileName: string, multi: boolean) => {
        if (multi) {
            setSelection(prev =>
                prev.includes(fileName)
                    ? prev.filter(n => n !== fileName)
                    : [...prev, fileName]
            );
        } else {
            // New logic: If already selected, do nothing (wait for double click). 
            // If another is selected, replace. 
            // If just clicking to adding to selection without CTRL, behavior is standard OS select.
            setSelection([fileName]);
        }
    };

    return (
        <div
            className="h-full flex flex-col space-y-4 animate-in fade-in duration-500 relative"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUpload(Array.from(e.dataTransfer.files)); }}
        >
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-card border border-border/50 rounded-3xl shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Media Library
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        {files.length} items • {formatSize(files.reduce((a, b) => a + (b.size || 0), 0))} used
                    </p>
                </div>

                <div className="flex gap-2">
                    <button onClick={createFolder} className="px-4 py-2 bg-secondary/50 text-secondary-foreground font-medium rounded-xl hover:bg-secondary transition-all flex items-center gap-2">
                        <FolderPlus size={18} /> New Folder
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleUpload} />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95"
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                        Upload
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-10 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1 bg-muted/40 p-1.5 rounded-xl border border-border/40 overflow-x-auto max-w-full md:max-w-md no-scrollbar">
                    <button onClick={() => setCurrentPath([])} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-background", currentPath.length === 0 && "bg-background shadow-sm")}>Root</button>
                    {currentPath.map((folder, index) => (
                        <div key={folder} className="flex items-center shrink-0">
                            <ChevronRight size={14} className="text-muted-foreground mx-1" />
                            <button onClick={() => setCurrentPath(currentPath.slice(0, index + 1))} className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-background">{folder}</button>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <input
                            placeholder="Search..."
                            className="w-full pl-9 pr-4 py-2 bg-card border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2.5 bg-card border border-input rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ArrowUpDown size={16} /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSortBy('date')}>Date (Newest)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('name')}>Name (A-Z)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('size')}>Size (Largest)</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex border border-input rounded-xl bg-card p-1">
                        <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-primary/10 text-primary" : "text-muted-foreground")}><Grid size={16} /></button>
                        <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-primary/10 text-primary" : "text-muted-foreground")}><ListIcon size={16} /></button>
                    </div>
                </div>
            </div>

            {/* File Grid */}
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                    <Loader2 size={40} className="animate-spin mb-4 text-primary" />
                    <p>Loading assets...</p>
                </div>
            ) : sortedFiles.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground border-2 border-dashed border-muted rounded-3xl m-4">
                    <Folder size={64} className="mb-4 opacity-20" />
                    <p className="font-medium text-lg">Empty Folder</p>
                    <p className="text-sm opacity-60">Drag files here to upload</p>
                </div>
            ) : (
                <div className={cn("grid gap-4 pb-32 animate-in fade-in slide-in-from-bottom-4", viewMode === 'grid' ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-1")}>
                    {sortedFiles.map((file) => {
                        const isSelected = selection.includes(file.name);
                        const isDir = isFolder(file);

                        return (
                            <div
                                key={file.id}
                                onClick={(e) => {
                                    if (e.metaKey || e.ctrlKey || e.shiftKey) {
                                        // Force multi-select behavior
                                        toggleSelection(file.name, true);
                                    } else if (isDir) {
                                        setCurrentPath([...currentPath, file.name]);
                                        setSelection([]); // Clear on nav
                                    } else {
                                        // Standard click: Select ONE.
                                        toggleSelection(file.name, false);
                                    }
                                }}
                                onDoubleClick={() => !isDir && setPreviewFile(file)}
                                onContextMenu={(e) => { e.preventDefault(); if (!isDir && !isSelected) setSelection([file.name]); }}
                                className={cn(
                                    "group relative rounded-2xl border transition-all cursor-pointer overflow-hidden backdrop-blur-sm select-none",
                                    viewMode === 'grid' ? "aspect-square flex flex-col hover:shadow-lg hover:-translate-y-1" : "flex items-center p-3 h-16 hover:bg-muted/50",
                                    isSelected ? "ring-2 ring-primary border-primary bg-primary/5 shadow-md" : "bg-card/50 border-border"
                                )}
                            >
                                {/* Thumbnail */}
                                <div className={cn("relative overflow-hidden flex items-center justify-center", viewMode === 'grid' ? "flex-1 w-full bg-muted/20" : "w-12 h-12 rounded-lg mr-4 bg-muted/20")}>

                                    {/* Selection Checkbox */}
                                    <div
                                        onClick={(e) => { e.stopPropagation(); toggleSelection(file.name, true); }}
                                        className={cn(
                                            "absolute top-2 left-2 z-30 w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all hover:scale-110",
                                            isSelected ? "bg-primary border-primary text-primary-foreground shadow-md scale-100" : "bg-black/20 border-white/50 hover:bg-black/40 hover:border-white scale-0 group-hover:scale-100"
                                        )}
                                    >
                                        {isSelected && <Check size={10} strokeWidth={4} />}
                                    </div>

                                    {isDir ? (
                                        <Folder className="text-amber-400 fill-amber-400/20" size={viewMode === 'grid' ? 48 : 24} />
                                    ) : file.mimetype?.startsWith('image/') ? (
                                        <div className="w-full h-full relative">
                                            <div className={cn("absolute inset-0 bg-black/10 transition-colors z-10", isSelected ? "bg-primary/10" : "group-hover:bg-transparent")} />
                                            <img src={getFileUrl(file.name)} alt={file.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                        </div>
                                    ) : (
                                        <FileImage className="text-slate-400" size={viewMode === 'grid' ? 48 : 24} />
                                    )}
                                </div>

                                {/* Overlay Controls */}
                                {viewMode === 'grid' && !isDir && (
                                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }} className="p-1.5 bg-black/50 hover:bg-black text-white rounded-lg backdrop-blur-md transition-colors"><Eye size={12} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingFile(file); }} className="p-1.5 bg-black/50 hover:bg-primary text-white rounded-lg backdrop-blur-md transition-colors"><Edit3 size={12} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); copyUrl(file.name); }} className="p-1.5 bg-black/50 hover:bg-primary text-white rounded-lg backdrop-blur-md transition-colors"><Copy size={12} /></button>
                                    </div>
                                )}

                                {/* Info */}
                                <div className={cn("px-3 py-2 text-xs font-medium flex justify-between items-center w-full z-20", viewMode === 'grid' ? "bg-background/90 backdrop-blur-sm border-t border-border" : "")}>
                                    <span className="truncate flex-1 max-w-[80%]">{file.name}</span>
                                    {!isDir && <span className="text-muted-foreground">{formatSize(file.size)}</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Selection Drawer */}
            {selection.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-12 fade-in max-w-[90vw]">
                    <div className="flex items-center gap-3">
                        <span className="bg-background text-foreground text-xs font-bold px-2 py-0.5 rounded-md">{selection.length}</span>
                        <span className="font-medium text-sm">Selected</span>
                    </div>
                    <div className="h-6 w-px bg-background/20" />
                    <div className="flex items-center gap-2">
                        <button onClick={handleDownload} className="p-2 hover:bg-background/20 rounded-xl transition-colors tooltip-trigger relative group">
                            <Download size={18} />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Download</span>
                        </button>
                        {selection.length === 1 && (
                            <button onClick={() => {
                                const file = files.find(f => f.name === selection[0]);
                                if (file) setEditingFile(file);
                            }} className="p-2 hover:bg-background/20 rounded-xl transition-colors group relative">
                                <Edit3 size={18} />
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Edit</span>
                            </button>
                        )}
                        <button onClick={() => {
                            if (selection.length === 1) copyUrl(selection[0]);
                            else toast.info("Copying multiple not supported yet");
                        }} className="p-2 hover:bg-background/20 rounded-xl transition-colors group relative">
                            <Copy size={18} />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Copy Link</span>
                        </button>
                    </div>
                    <div className="h-6 w-px bg-background/20" />
                    <button onClick={handleDelete} className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-500 rounded-xl transition-colors">
                        <Trash2 size={18} />
                    </button>
                    <button onClick={() => setSelection([])} className="ml-2 p-1 hover:bg-background/20 rounded-full">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Lightbox */}
            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none text-white">
                    {previewFile && (
                        <div className="relative flex flex-col h-[80vh]">
                            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
                                <div><h3 className="font-bold text-lg">{previewFile.name}</h3></div>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingFile(previewFile)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors"><Edit3 size={20} /></button>
                                    <button onClick={() => setPreviewFile(null)} className="p-2 bg-white/10 hover:bg-red-500/20 rounded-full backdrop-blur-md transition-colors"><X size={20} /></button>
                                </div>
                            </div>
                            <div className="flex-1 flex items-center justify-center p-4">
                                <img src={getFileUrl(previewFile.name)} className="max-w-full max-h-full object-contain shadow-2xl" />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Image Editor */}
            {editingFile && (
                <ImageEditor
                    file={editingFile}
                    imageUrl={getFileUrl(editingFile.name)}
                    onClose={() => setEditingFile(null)}
                    onSave={() => { setEditingFile(null); fetchFiles(); }}
                />
            )}

            {/* Drag Overlay */}
            {isDragging && (
                <div className="fixed inset-0 z-50 bg-primary/20 backdrop-blur-sm border-4 border-primary border-dashed m-4 rounded-3xl flex items-center justify-center pointer-events-none animate-pulse">
                    <div className="bg-background/90 p-12 rounded-3xl shadow-2xl flex flex-col items-center border border-border">
                        <Upload size={64} className="text-primary mb-6" />
                        <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Drop to Upload</h3>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Sub-Component: Enhanced Image Editor ---
function ImageEditor({ file, imageUrl, onClose, onSave }: { file: FileObject; imageUrl: string; onClose: () => void; onSave: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Filters
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [grayscale, setGrayscale] = useState(0);
    const [sepia, setSepia] = useState(0);

    const resetFilters = () => {
        setRotation(0); setFlipH(false);
        setBrightness(100); setContrast(100); setSaturation(100);
        setGrayscale(0); setSepia(0);
    };

    // Render loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        img.onload = () => {
            // Calculate dimensions
            const rads = rotation * Math.PI / 180;
            const sin = Math.abs(Math.sin(rads));
            const cos = Math.abs(Math.cos(rads));

            canvas.width = img.width * cos + img.height * sin;
            canvas.height = img.width * sin + img.height * cos;

            // Filters Application
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%)`;

            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rads);
            if (flipH) ctx.scale(-1, 1);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
        };
    }, [rotation, flipH, brightness, contrast, saturation, grayscale, sepia]);

    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsSaving(true);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            const ext = file.name.split('.').pop();
            const nameWithoutExt = file.name.replace(`.${ext}`, '');
            const newName = `${nameWithoutExt}_edited_${Date.now()}.${ext}`;

            const { error } = await supabase.storage.from('public-assets').upload(newName, blob);
            if (error) toast.error("Failed to save edit");
            else toast.success("Saved as new copy");
            setIsSaving(false);
            onSave();
        }, 'image/png');
    };

    return (
        <Dialog open={true} onOpenChange={() => onClose()}>
            <DialogContent className="max-w-[1200px] w-full h-[90vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-none">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900">
                    <div>
                        <h3 className="text-white font-bold text-lg">Editor Suite</h3>
                        <p className="text-xs text-zinc-400">{file.name}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={resetFilters} className="px-3 py-2 text-xs bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 mr-2 flex items-center gap-1">
                            <RefreshCw size={12} /> Reset
                        </button>
                        <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-sm hover:brightness-110 flex items-center gap-2">
                            {isSaving && <Loader2 size={14} className="animate-spin" />} Save Copy
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Main Canvas */}
                    <div className="flex-1 bg-zinc-950 flex items-center justify-center p-8 overflow-auto relative">
                        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-2xl border border-white/5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-zinc-900" />
                    </div>

                    {/* Sidebar Tools */}
                    <div className="w-80 bg-zinc-900 border-l border-white/10 p-6 overflow-y-auto space-y-8">
                        <div>
                            <h4 className="text-white text-sm font-semibold mb-4 flex items-center gap-2"><ToolsLabel icon={RotateCw} label="Transform" /></h4>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setRotation(r => r - 90)} className="tool-btn">Rotate Left</button>
                                <button onClick={() => setRotation(r => r + 90)} className="tool-btn">Rotate Right</button>
                                <button onClick={() => setFlipH(!flipH)} className="tool-btn col-span-2">Flip Horizontal</button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-white text-sm font-semibold flex items-center gap-2"><ToolsLabel icon={Sun} label="Light" /></h4>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-zinc-400"><span>Brightness</span><span>{brightness}%</span></div>
                                <Slider value={[brightness]} min={0} max={200} step={5} onValueChange={([v]) => setBrightness(v)} />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-zinc-400"><span>Contrast</span><span>{contrast}%</span></div>
                                <Slider value={[contrast]} min={0} max={200} step={5} onValueChange={([v]) => setContrast(v)} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-white text-sm font-semibold flex items-center gap-2"><ToolsLabel icon={Droplet} label="Color" /></h4>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-zinc-400"><span>Saturation</span><span>{saturation}%</span></div>
                                <Slider value={[saturation]} min={0} max={200} step={5} onValueChange={([v]) => setSaturation(v)} />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-zinc-400"><span>Grayscale</span><span>{grayscale}%</span></div>
                                <Slider value={[grayscale]} min={0} max={100} step={5} onValueChange={([v]) => setGrayscale(v)} />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-zinc-400"><span>Sepia</span><span>{sepia}%</span></div>
                                <Slider value={[sepia]} min={0} max={100} step={5} onValueChange={([v]) => setSepia(v)} />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const ToolsLabel = ({ icon: Icon, label }: { icon: any, label: string }) => (
    <>
        <div className="p-1.5 bg-zinc-800 rounded-md"><Icon size={14} className="text-zinc-300" /></div>
        {label}
    </>
);

const StockCard = ({ url, label }: { url: string, label: string }) => (
    <div className="group relative aspect-video md:aspect-square rounded-3xl border border-border/50 bg-muted/20 overflow-hidden hover:shadow-xl hover:border-primary/50 transition-all duration-300">
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10" />
        <img src={url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />

        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20">
            <button
                onClick={() => { navigator.clipboard.writeText(url); toast.success("URL copied"); }}
                className="p-2.5 bg-black/60 text-white rounded-xl backdrop-blur-md hover:bg-black hover:scale-110 transition-all shadow-lg"
                title="Copy URL"
            >
                <Copy size={16} />
            </button>
            <button
                onClick={() => window.open(url, '_blank')}
                className="p-2.5 bg-black/60 text-white rounded-xl backdrop-blur-md hover:bg-primary hover:scale-110 transition-all shadow-lg"
                title="View Original"
            >
                <Eye size={16} />
            </button>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex justify-center z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <span className="bg-black/70 text-white text-[10px] px-3 py-1.5 rounded-full backdrop-blur-md font-bold flex items-center gap-1.5 shadow-lg border border-white/10 whitespace-nowrap">
                <Sparkles size={12} className="text-purple-400 fill-purple-400" /> {label}
            </span>
        </div>
    </div>
);
