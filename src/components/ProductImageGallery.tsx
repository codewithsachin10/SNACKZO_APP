import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
}

interface ProductImageGalleryProps {
  images: ProductImage[] | string[];
  productName: string;
  className?: string;
}

export function ProductImageGallery({ images, productName, className }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Normalize images to array of strings
  const imageUrls = images.map(img => 
    typeof img === "string" ? img : img.image_url
  );

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + imageUrls.length) % imageUrls.length);
    setIsZoomed(false);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % imageUrls.length);
    setIsZoomed(false);
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
    setIsZoomed(false);
  };

  const handleZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) {
      setIsZoomed(true);
    }
    
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    if (isZoomed && !isFullscreen) {
      setIsZoomed(false);
    }
  };

  // Touch handling for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    // Only handle horizontal swipes
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      
      switch (e.key) {
        case "ArrowLeft":
          handlePrev();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "Escape":
          setIsFullscreen(false);
          setIsZoomed(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Prevent body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  if (imageUrls.length === 0) {
    return (
      <div className={cn("bg-muted rounded-xl aspect-square flex items-center justify-center", className)}>
        <span className="text-muted-foreground">No image</span>
      </div>
    );
  }

  return (
    <>
      {/* Main Gallery */}
      <div className={cn("space-y-3", className)}>
        {/* Main Image */}
        <div
          ref={imageRef}
          className="relative aspect-square rounded-xl overflow-hidden bg-muted group cursor-zoom-in"
          onClick={handleZoom}
          onMouseMove={isZoomed ? handleZoom : undefined}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={imageUrls[currentIndex]}
              alt={`${productName} - Image ${currentIndex + 1}`}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ 
                opacity: 1, 
                scale: isZoomed ? 2 : 1,
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </AnimatePresence>

          {/* Navigation arrows */}
          {imageUrls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Fullscreen button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(true);
            }}
            className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Maximize2 size={18} />
          </button>

          {/* Zoom indicator */}
          {isZoomed && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-lg text-xs flex items-center gap-1">
              <ZoomIn size={12} />
              Zoomed
            </div>
          )}

          {/* Image counter */}
          {imageUrls.length > 1 && (
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-lg text-xs font-medium">
              {currentIndex + 1} / {imageUrls.length}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {imageUrls.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {imageUrls.map((url, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={cn(
                  "relative w-16 h-16 rounded-lg overflow-hidden shrink-0 transition-all",
                  index === currentIndex
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "opacity-60 hover:opacity-100"
                )}
              >
                <img
                  src={url}
                  alt={`${productName} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Dots indicator (mobile) */}
        {imageUrls.length > 1 && (
          <div className="flex justify-center gap-1.5 md:hidden">
            {imageUrls.map((_, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentIndex
                    ? "bg-primary w-4"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="text-sm text-muted-foreground">
                {currentIndex + 1} / {imageUrls.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isZoomed ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {isZoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                </button>
                <button
                  onClick={() => {
                    setIsFullscreen(false);
                    setIsZoomed(false);
                  }}
                  className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main image */}
            <div
              className="flex-1 flex items-center justify-center p-4 overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <motion.div
                className="relative max-w-full max-h-full"
                animate={{
                  scale: isZoomed ? 2 : 1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                drag={isZoomed}
                dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentIndex}
                    src={imageUrls[currentIndex]}
                    alt={`${productName} - Image ${currentIndex + 1}`}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="max-w-full max-h-[70vh] object-contain"
                    draggable={false}
                  />
                </AnimatePresence>
              </motion.div>

              {/* Navigation arrows */}
              {imageUrls.length > 1 && !isZoomed && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {imageUrls.length > 1 && (
              <div className="p-4 border-t border-border">
                <div className="flex justify-center gap-2 overflow-x-auto">
                  {imageUrls.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => handleThumbnailClick(index)}
                      className={cn(
                        "relative w-16 h-16 rounded-lg overflow-hidden shrink-0 transition-all",
                        index === currentIndex
                          ? "ring-2 ring-primary"
                          : "opacity-50 hover:opacity-100"
                      )}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================
// MINI IMAGE CAROUSEL (For Product Cards)
// ============================================

interface MiniImageCarouselProps {
  images: string[];
  className?: string;
}

export function MiniImageCarousel({ images, className }: MiniImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const startAutoPlay = () => {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 2000);
  };

  const stopAutoPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={startAutoPlay}
      onMouseLeave={() => {
        stopAutoPlay();
        setCurrentIndex(0);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex] || images[0]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover"
          alt=""
        />
      </AnimatePresence>

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {images.map((_, i) => (
            <span
              key={i}
              className={cn(
                "w-1 h-1 rounded-full transition-all",
                i === currentIndex ? "bg-white w-2" : "bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
