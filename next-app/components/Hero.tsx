'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import Counter from './Counter';

export default function Hero() {
    const { language } = useLanguage();
    const t = translations[language].hero;
    const [statsActive, setStatsActive] = useState(false);
    const statsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setStatsActive(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.3 }
        );
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section className="relative h-auto max-h-[70vh] min-h-[400px] sm:min-h-[450px] md:min-h-[500px] w-full overflow-hidden bg-black">
            {/* Background Video + Overlay */}
            <div
                className={`absolute ${language === 'ar' ? '-left-32' : '-right-32'
                    } top-1/2 -translate-y-1/2 z-0 w-[min(800px,90vw)] h-[min(800px,90vh)] opacity-60`}
            >
                <video autoPlay loop muted playsInline preload="none" className="w-full h-full object-contain">
                    <source src="/videos/headervid.webm" type="video/webm" />
                </video>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 h-full pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-6 sm:pb-8 md:pb-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-8 h-full flex items-center">
                    <div className="max-w-2xl w-full">
                        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                            {t.title}
                        </h1>
                        <p className="mt-3 sm:mt-4 md:mt-6 text-sm sm:text-base md:text-lg text-white/80 max-w-xl leading-relaxed">
                            {t.description}
                        </p>

                        <div className="mt-5 sm:mt-6 md:mt-8 flex flex-col xs:flex-row gap-2.5 sm:gap-3 relative">
                            <a
                                href="#contact"
                                className="inline-flex justify-center rounded-lg bg-white px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 font-semibold hover:bg-white/90 transition z-10"
                            >
                                {t.requestQuote}
                            </a>
                            <a
                                href="#services"
                                className="inline-flex justify-center rounded-lg border border-white/20 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-white hover:bg-white/10 transition z-10"
                            >
                                {t.exploreSolutions}
                            </a>
                        </div>

                        <div ref={statsRef} className="mt-6 sm:mt-8 md:mt-10 grid grid-cols-1 xs:grid-cols-3 gap-4 text-white/70">
                            <div className="flex flex-col">
                                <div className="flex items-end gap-2 text-white font-bold text-2xl">
                                    <Counter value={statsActive ? 12 : 0} places={[10, 1]} /> <span>+</span>
                                </div>
                                <p className="text-xs uppercase tracking-wide text-white/60">{t.stats.onTimeDeliveries}</p>
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-end gap-2 text-white font-bold text-2xl">
                                    <Counter value={statsActive ? 15 : 0} places={[10, 1]} /> <span>+</span>
                                </div>
                                <p className="text-xs uppercase tracking-wide text-white/60">{t.stats.countriesCovered}</p>
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-end gap-2 text-white font-bold text-2xl">
                                    <Counter value={statsActive ? 99 : 0} places={[10, 1]} /> <span>+</span>
                                </div>
                                <p className="text-xs uppercase tracking-wide text-white/60">{t.stats.tonsShipped}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
