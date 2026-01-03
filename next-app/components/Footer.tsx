'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

export default function Footer() {
    const { language } = useLanguage();
    const t = translations[language].footer;

    return (
        <footer className="border-t border-white/10 bg-black py-10">
            <div className="mx-auto max-w-7xl px-4 flex flex-col gap-4 text-white/60 text-sm">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p>© 2026 {t.copyright}</p>
                    <p>{t.tagline}</p>
                </div>
                <p className="text-center text-[10px] text-white/30 leading-relaxed">
                    This is a student-led competitive programming community at Horus University, Egypt.
                    ICPC HUE is not affiliated with, endorsed by, or the official global ICPC organization (icpc.global).
                </p>
            </div>
        </footer>
    );
}
