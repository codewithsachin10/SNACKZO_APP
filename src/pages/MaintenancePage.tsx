import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Construction, LifeBuoy, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const MaintenancePage = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Particle effect
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const createParticle = () => {
            const particle = document.createElement("div");
            particle.className = "absolute rounded-full bg-primary/20 pointer-events-none";
            const size = Math.random() * 10 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.opacity = "0";

            const duration = Math.random() * 3 + 2;
            particle.style.animation = `float ${duration}s ease-in-out infinite`;

            container.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, duration * 1000);
        };

        const interval = setInterval(createParticle, 200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div ref={containerRef} className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 max-w-2xl w-full text-center"
            >
                <div className="mb-8 relative inline-block">
                    <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full animate-pulse" />
                    <div className="relative bg-slate-900/50 p-6 rounded-3xl border border-yellow-500/30 backdrop-blur-sm">
                        <Construction className="w-20 h-20 text-yellow-500" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-yellow-500 text-slate-950 font-bold px-3 py-1 rounded-full text-xs">
                        REL 2.0
                    </div>
                </div>

                <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                    System <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Upgrade</span>
                </h1>

                <p className="text-lg md:text-xl text-slate-400 mb-8 leading-relaxed max-w-lg mx-auto">
                    We are currently performing scheduled maintenance to improve your experience.
                    Snackzo will be back online shortly.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto mb-12">
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <LifeBuoy size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
                            <p className="text-sm font-medium text-blue-400">Upgrading Databases...</p>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                            <Lock size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-slate-500 uppercase font-bold">Security</p>
                            <p className="text-sm font-medium text-green-400">System Secure</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button variant="outline" className="gap-2 border-slate-700 hover:bg-slate-800 text-slate-300">
                        <Mail size={16} /> Contact Support
                    </Button>
                    {/* Secret Admin Override Button (Hidden logic to be added if needed) */}
                    <Button
                        variant="ghost"
                        className="text-slate-600 hover:text-slate-400 hover:bg-transparent text-xs"
                        onClick={() => window.location.href = '/admin'}
                    >
                        Admin Login &rarr;
                    </Button>
                </div>
            </motion.div>

            <div className="absolute bottom-8 text-slate-600 text-sm font-medium">
                &copy; {new Date().getFullYear()} Snackzo Inc. All systems operational.
            </div>

            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateY(-100px); opacity: 0; }
        }
      `}</style>
        </div>
    );
};

export default MaintenancePage;
