'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

export default function Footer() {
    const { language } = useLanguage();
    const t = translations[language].footer;

    return (
        <footer className="border-t border-white/10 bg-black py-10">
            <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-white/60 text-sm">
                <p>© 2024 {t.copyright}</p>
                <p>{t.tagline}</p>
            </div>
        </footer>
    );
}
