import { ArrowRight, Clock, Zap, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-lime/10 border border-lime/30 text-lime px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-lime rounded-full" />
            <span className="text-sm font-bold uppercase tracking-wider">Open Now • 24/7 Delivery</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Late Night</span>
            <br />
            Cravings?
            <br />
            <span className="text-secondary">We Deliver!</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-xl mx-auto">
            Snacks, drinks & essentials delivered right to your <span className="text-foreground font-bold">doorstep</span> in
            <span className="text-accent font-bold"> minutes.</span>
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative max-w-lg mx-auto mb-10 group">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-all opacity-50" />
            <div className="relative flex items-center bg-card/ border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <input
                type="text"
                placeholder="Search 'Chips', 'Coke', 'Milk'..."
                className="w-full bg-background/80 backdrop-blur-md px-6 py-4 text-lg outline-none placeholder:text-muted-foreground/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white px-6 py-4 transition-colors"
                aria-label="Search"
              >
                <Search size={24} />
              </button>
            </div>
          </form>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href="/products"
              className="glass-card px-8 py-4 text-lg flex items-center gap-2 w-full sm:w-auto justify-center hover:border-primary/50 transition-colors"
            >
              <Zap size={20} className="text-secondary" />
              View Menu
            </a>
          </div>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock size={18} className="text-secondary" />
              <span>15 min avg. delivery</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-lg">🏠</span>
              <span>No Minimum Order</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-lg">💳</span>
              <span>UPI & Cash accepted</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
