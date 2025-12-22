'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, Share2, Facebook, Linkedin, Instagram, Send, User, X, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { translations } from '@/lib/translations';

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [socialOpen, setSocialOpen] = useState(false);
    const { language, toggleLanguage } = useLanguage();
    const { isAuthenticated } = useAuth();
    const t = translations[language].nav;

    const socialLinks = [
        { name: 'Facebook', url: 'https://www.facebook.com/icpchue/', icon: Facebook },
        { name: 'LinkedIn', url: 'https://www.linkedin.com/in/icpchue/', icon: Linkedin },
        { name: 'Instagram', url: 'https://www.instagram.com/icpchue/', icon: Instagram },
        { name: 'Telegram', url: 'https://t.me/ICPCHUE', icon: Send },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full px-4 pt-4 md:px-6 md:pt-6">
            <div className="mx-auto max-w-7xl">
                <div className="relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
                        {/* Logo */}
                        <Link href="/" className="flex items-center shrink-0 opacity-90 hover:opacity-100 transition-opacity">
                            <Image
                                src="/images/ui/navlogo.webp"
                                alt="ICPC HUE Logo"
                                width={180}
                                height={60}
                                className="h-8 w-auto md:h-10 object-contain"
                                priority
                            />
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8" dir="ltr">
                            {/* Links removed as per request */}

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleLanguage}
                                    className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                    title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                                >
                                    <Globe size={20} />
                                </button>

                                <button
                                    onClick={() => setSocialOpen(true)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <Share2 size={18} />
                                    <span>{t.phone}</span>
                                </button>

                                {isAuthenticated ? (
                                    <Link
                                        href="/dashboard"
                                        className="flex items-center gap-2 bg-[#E8C15A] hover:bg-[#D4AF37] text-black px-4 py-2 rounded-lg font-bold text-sm transition-transform active:scale-95"
                                    >
                                        <User size={18} />
                                        <span>Profile</span>
                                    </Link>
                                ) : (
                                    <Link
                                        href="/login"
                                        className="bg-[#E8C15A] hover:bg-[#D4AF37] text-black px-5 py-2 rounded-lg font-bold text-sm transition-transform active:scale-95"
                                    >
                                        Login
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex md:hidden items-center gap-3">
                            {/* Login/Profile visible on Mobile Header */}
                            {isAuthenticated ? (
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-2 bg-[#E8C15A] text-black px-3 py-1.5 rounded-lg font-bold text-xs transition-transform active:scale-95"
                                >
                                    <User size={16} />
                                    <span>Profile</span>
                                </Link>
                            ) : (
                                <Link
                                    href="/login"
                                    className="bg-[#E8C15A] text-black px-4 py-1.5 rounded-lg font-bold text-xs transition-transform active:scale-95"
                                >
                                    Login
                                </Link>
                            )}

                            <button
                                onClick={() => setOpen(!open)}
                                className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                                aria-label="Toggle menu"
                            >
                                {open ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu */}
                    {open && (
                        <div className="md:hidden border-t border-white/10 bg-black/40 backdrop-blur-xl">
                            <div className="px-4 py-4 space-y-2">
                                <button
                                    onClick={() => { toggleLanguage(); setOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors font-medium"
                                >
                                    <Globe size={18} />
                                    <span>{language === 'en' ? 'Switch to Arabic' : 'Switch to English'}</span>
                                </button>

                                <button
                                    onClick={() => { setSocialOpen(true); setOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors font-medium"
                                >
                                    <Share2 size={18} />
                                    <span>Social Media</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Social Media Drawer */}
            {socialOpen && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSocialOpen(false)} />
                    <div className="absolute right-0 top-0 h-full w-80 bg-[#121212] border-l border-white/10 shadow-2xl p-6 flex flex-col animate-slide-in">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-white">Connect With Us</h3>
                            <button onClick={() => setSocialOpen(false)} className="p-2 text-white/50 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 flex-1">
                            {socialLinks.map((social) => {
                                const Icon = social.icon;
                                return (
                                    <a
                                        key={social.name}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group"
                                    >
                                        <div className="p-2.5 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] group-hover:scale-110 transition-transform">
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{social.name}</h4>
                                            <p className="text-xs text-white/50">Follow on {social.name}</p>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>

                        <p className="text-center text-xs text-white/30 mt-8">
                            © 2024 ICPC HUE Community
                        </p>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                
                @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .animate-slide-in { animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </header>
    );
}
