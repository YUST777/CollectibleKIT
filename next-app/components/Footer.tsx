'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

export default function Footer() {
    const { language } = useLanguage();
    const t = translations[language].footer;

    return (
        <footer className="border-t border-white/10 bg-black pt-16 pb-8">
            <div className="mx-auto max-w-7xl px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-2 md:col-span-1">
                        <h3 className="text-white font-bold text-lg mb-4">ICPC HUE</h3>
                        <p className="text-white/60 text-sm leading-relaxed mb-4">
                            The premier competitive programming community at Horus University.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li><Link href="/" className="hover:text-[#E8C15A] transition-colors">Home</Link></li>
                            <li><Link href="/sessions" className="hover:text-[#E8C15A] transition-colors">Sessions</Link></li>
                            <li><Link href="/login" className="hover:text-[#E8C15A] transition-colors">Login</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Resources</h4>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li><Link href="/devlog" className="hover:text-[#E8C15A] transition-colors">Development Log</Link></li>
                            <li><Link href="/apply" className="hover:text-[#E8C15A] transition-colors">Apply Now</Link></li>
                            <li><Link href="/sitemap.xml" className="hover:text-[#E8C15A] transition-colors">Sitemap</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li><Link href="/security.txt" className="hover:text-[#E8C15A] transition-colors">Security</Link></li>
                            <li><span className="cursor-not-allowed">Privacy Policy</span></li>
                            <li><span className="cursor-not-allowed">Terms of Service</span></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-xs">
                    <p>© 2026 {t.copyright}</p>
                    <p className="text-center md:text-right max-w-md">
                        This is a student-led competitive programming community at Horus University, Egypt.
                        ICPC HUE is not affiliated with, endorsed by, or the official global ICPC organization (icpc.global).
                    </p>
                </div>
            </div>
        </footer>
    );
}
