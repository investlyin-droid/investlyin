'use client';

import { useState } from 'react';
import {
    MessageCircle,
    X,
    Send,
    Mail,
    Phone,
    ShieldCheck,
    TrendingUp,
    Headset
} from 'lucide-react';

export default function SupportChat() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-gradient-to-br from-brand-gold to-[#B8860B] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-110 active:scale-95 transition-all duration-300 group"
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-brand-obsidian" />
                ) : (
                    <div className="relative">
                        <MessageCircle className="w-6 h-6 text-brand-obsidian" />
                        <span className="absolute top-[-4px] right-[-4px] flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                    </div>
                )}
            </button>

            {/* Chat Menu / Widget Window */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-[350px] animate-scale-up origin-bottom-right">
                    <div className="bg-brand-obsidian border border-white/10 rounded-[24px] shadow-2xl overflow-hidden glass-panel">
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-brand-gold/10 to-transparent flex items-center gap-4 border-b border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center text-brand-gold">
                                <Headset className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm tracking-tight uppercase">Trading Support</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[10px] text-brand-text-secondary font-medium tracking-wide">Agents Online</span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <p className="text-brand-text-secondary text-xs leading-relaxed">
                                Connect with our team for priority support regarding account verification, deposits, or technical terminal issues.
                            </p>

                            <div className="grid gap-3">
                                <a
                                    href="https://wa.me/yournumber"
                                    target="_blank"
                                    className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-brand-gold/30 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                                        <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[11px] font-bold text-white leading-none">WhatsApp High-Priority</div>
                                        <div className="text-[9px] text-brand-text-secondary mt-1 tracking-tight">Average response: 5 mins</div>
                                    </div>
                                </a>

                                <a
                                    href="mailto:support@investlyin.com"
                                    className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-brand-gold/30 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[11px] font-bold text-white leading-none">Official Desk Support</div>
                                        <div className="text-[9px] text-brand-text-secondary mt-1 tracking-tight">Email us for documentation</div>
                                    </div>
                                </a>

                                <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl opacity-60">
                                    <div className="w-8 h-8 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[11px] font-bold text-white leading-none">Callback Service</div>
                                        <div className="text-[9px] text-brand-text-secondary mt-1 tracking-tight">VIP / Gold Accounts only</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-center gap-4">
                            <div className="flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-brand-gold" />
                                <span className="text-[8px] text-brand-text-secondary uppercase tracking-widest font-medium">Secured Terminal</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-white/10"></div>
                            <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                <span className="text-[8px] text-brand-text-secondary uppercase tracking-widest font-medium">Realtime Match</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
