'use client';

import { useState, useEffect, useRef } from 'react';
import {
    MessageCircle,
    X,
    Mail,
    ShieldCheck,
    TrendingUp,
    Headset,
    Send,
    Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import { getSocketIoUrl } from '@/lib/socket';

export default function SupportChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const { user, token } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Connection logic
    useEffect(() => {
        if (!token || !user) return;

        const socketUrl = getSocketIoUrl();
        const newSocket = io(`${socketUrl}/chat`, {
            auth: { token: `Bearer ${token}` },
        });

        newSocket.on('connect', () => {
            newSocket.emit('join_chat', { userId: user.id });
        });

        newSocket.on('new_message', (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [token, user]);

    // Load history logic
    useEffect(() => {
        if (isOpen && user && token) {
            loadHistory();
        }
    }, [isOpen, user, token]);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const history = await api.get(`/chat/messages/${user!.id}`, token!);
            setMessages(history);
            // Mark as read
            if (socket) {
                socket.emit('mark_read', { userId: user!.id, readerType: 'USER' });
            }
        } catch (err) {
            console.error('Failed to load chat history', err);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || !socket || !user) return;

        const msgData = {
            userId: user.id,
            content: inputValue,
            isAdmin: false
        };

        socket.emit('send_message', msgData);
        setInputValue('');
    };

    if (!user) return null;

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
                <div className="absolute bottom-16 right-0 w-[320px] sm:w-[350px] animate-scale-up origin-bottom-right">
                    <div className="bg-[#0B0E11] border border-white/10 rounded-[20px] shadow-2xl overflow-hidden flex flex-col h-[420px] sm:h-[480px]">
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-brand-gold/10 to-transparent flex items-center gap-3 border-b border-white/5 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold">
                                <Headset className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-xs tracking-tight uppercase">Terminal Support</h3>
                                <div className="flex items-center gap-1.5 ">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[10px] text-brand-text-secondary font-medium tracking-wide">Connected</span>
                                </div>
                            </div>
                        </div>

                        {/* Chat Body */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10"
                        >
                            {loading && messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full space-y-2">
                                    <Loader2 className="w-6 h-6 text-brand-gold animate-spin" />
                                    <p className="text-[10px] text-brand-text-secondary uppercase tracking-widest">Securing Connection...</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                        <MessageCircle className="w-6 h-6 text-brand-gold/50" />
                                    </div>
                                    <p className="text-xs text-white font-medium">Start a conversation</p>
                                    <p className="text-[10px] text-brand-text-secondary mt-1">Our support team is here to help.</p>
                                </div>
                            ) : (
                                messages.map((msg: any, i) => {
                                    const isAdminMsg = msg.isAdmin;
                                    const messageDate = new Date(msg.createdAt);
                                    return (
                                        <div
                                            key={msg._id || i}
                                            className={`flex ${!isAdminMsg ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[80%] p-3 rounded-2xl text-[11px] font-medium leading-relaxed ${!isAdminMsg
                                                ? 'bg-brand-gold text-brand-obsidian rounded-tr-none'
                                                : 'bg-white/10 text-white border border-white/5 rounded-tl-none'
                                                }`}>
                                                {msg.content}
                                                <div className={`text-[8px] mt-1 opacity-50 ${!isAdminMsg ? 'text-right' : 'text-left'}`}>
                                                    {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/5 bg-white/5 shrink-0">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type your message..."
                                    className="w-full bg-brand-obsidian border border-white/10 rounded-xl py-2.5 pl-4 pr-12 text-xs text-white placeholder:text-brand-text-secondary focus:border-brand-gold/50 outline-none transition-all"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!inputValue.trim()}
                                    className="absolute right-2 top-1.5 w-8 h-8 rounded-lg bg-brand-gold text-brand-obsidian flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-white/5 border-t border-white/10 flex items-center justify-center gap-4 shrink-0">
                            <div className="flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-brand-gold" />
                                <span className="text-[8px] text-brand-text-secondary uppercase tracking-widest font-medium">Secured</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-white/10"></div>
                            <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                <span className="text-[8px] text-brand-text-secondary uppercase tracking-widest font-medium">Precision</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
