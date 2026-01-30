import React from "react";
import { Shield, Lock, Eye, CreditCard, Server, Users, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { motion } from "framer-motion";

const SecurityTrust = () => {
    return (
        <div className="min-h-screen bg-black text-white">
            <Navbar />

            <main className="container mx-auto px-4 pt-24 pb-32">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-block p-3 rounded-full bg-green-500/10 mb-4"
                    >
                        <Shield className="text-green-500 w-12 h-12" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent mb-4"
                    >
                        Your Security is Our Priority
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-400 max-w-2xl mx-auto"
                    >
                        We use enterprise-grade encryption and security practices to ensure your data, money, and privacy are never compromised.
                    </motion.p>
                </div>

                {/* Security Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                    <TrustCard
                        icon={Lock}
                        color="text-blue-400"
                        title="End-to-End Encryption"
                        desc="All sensitive data, including passwords and personal details, are encrypted using industry-standard AES-256 protocols."
                    />
                    <TrustCard
                        icon={CreditCard}
                        color="text-orange-400"
                        title="Safe Payments"
                        desc="We do not store your card details. All transactions are processed via PCI-DSS compliant gateways."
                    />
                    <TrustCard
                        icon={Eye}
                        color="text-purple-400"
                        title="Private by Design"
                        desc="Your order history and messages are strictly private. Even our staff cannot view your personal messages."
                    />
                    <TrustCard
                        icon={Server}
                        color="text-green-400"
                        title="Secure Infrastructure"
                        desc="Our servers are protected by Cloudflare WAF, blocking thousands of cyber threats daily."
                    />
                    <TrustCard
                        icon={Users}
                        color="text-pink-400"
                        title="Strict Access Control"
                        desc="Our engineers follow strict 'Least Privilege' protocols. No manual edits are ever made to your wallet balance."
                    />
                    <TrustCard
                        icon={AlertTriangle}
                        color="text-yellow-400"
                        title="Fraud Protection"
                        desc="Our AI-driven active defense system monitors for suspicious activity to stop fraud before it happens."
                    />
                </div>

                {/* Certification / Badges */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-20 text-center">
                    <h2 className="text-2xl font-bold mb-8">Security Standards We Follow</h2>
                    <div className="flex flex-wrap justify-center gap-8 opacity-70">
                        <div className="flex items-center gap-2">
                            <Shield size={20} />
                            <span>OWASP Top 10 Protected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Lock size={20} />
                            <span>SOC2 Compliant Practices</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CreditCard size={20} />
                            <span>PCI-DSS Ready</span>
                        </div>
                    </div>
                </div>

                {/* Responsible Disclosure */}
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-4">Found a Vulnerability?</h2>
                    <p className="text-gray-400 mb-6">
                        We value the security community. If you believe you have found a security issue in Snackzo, please report it to us immediately.
                    </p>
                    <a href="mailto:security@snackzo.com" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors">
                        Report a Vulnerability
                    </a>
                </div>
            </main>

            <BottomNavigation />
        </div>
    );
};

const TrustCard = ({ icon: Icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
    >
        <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${color}`}>
            <Icon size={24} />
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
);

export default SecurityTrust;
