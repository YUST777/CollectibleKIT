'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Radio, Calendar, ArrowRight } from 'lucide-react';

const newsItems = [
    {
        id: 'recap-2025',
        type: 'Recap',
        title: 'Your 2025 Wrapped is Here!',
        date: 'Dec 2025',
        body: 'The year is over, but the stats remain! Check out your personal coding journey, total problems solved, and achievements unlocked in 2025.',
        image: '/images/achievements/WELCOME.webp',
        featured: true,
        link: '/dashboard'
    },
    {
        id: 'dec-report',
        type: 'Community',
        title: 'December 2025 Report',
        date: 'Dec 2025',
        body: 'See how our community grew in our first month! 300+ students, 160+ live attendees, and 5+ hours of content delivered.',
        image: '/images/achievements/WELCOME.webp', // Placeholder since wide card needs image
        featured: true,
        link: '/2025/dec' // This is static, so it works.
    },
    {
        id: 1,
        type: 'Training',
        title: 'Sheet 1 Has Arrived!',
        date: 'Jan 2025',
        body: 'Sheet 1 - Say Hello With C++ is now live! Master the basics with 26 new problems. Go solve it now and climb the leaderboard!',
        image: '/images/sheet/sheet1.webp',
        featured: false, // Demoted to normal
        link: '/dashboard/sheets/sheet-1'
    },
    {
        id: 2,
        type: 'Announcement',
        title: 'Welcome to ICPC HUE!',
        date: 'Jan 2025',
        body: 'Welcome to our training platform! We are excited to have you here. Start with Sheet 1 and join our competitive programming journey.',
        featured: false
    }
];

function getTypeColor(type: string) {
    switch (type.toLowerCase()) {
        case 'training': return 'bg-[#E8C15A]/10 text-[#E8C15A] border-[#E8C15A]/30';
        case 'announcement': return 'bg-green-500/10 text-green-400 border-green-500/30';
        case 'feature': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
        case 'recap': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
        case 'community': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
        default: return 'bg-white/10 text-white border-white/30';
    }
}

export default function NewsPage() {
    const featuredNewsItems = newsItems.filter(n => n.featured);
    const otherNews = newsItems.filter(n => !n.featured);

    return (
        <>
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none">
                    <Link href="/" className="hover:text-[#F2F2F2] hidden md:flex items-center justify-center h-5"><ChevronLeft size={16} /></Link>
                    <span className="hidden sm:inline">TRAINING</span><span className="hidden sm:inline">/</span>
                    <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">Team News</span>
                </div>
            </header>

            <div className="space-y-8 animate-fade-in">
                {/* Page Title */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#E8C15A]/10">
                        <Radio className="text-[#E8C15A]" size={22} />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-[#F2F2F2]">Team News</h2>
                </div>

                {/* Featured News Cards */}
                <div className="space-y-6">
                    {featuredNewsItems.map((featuredNews) => (
                        <Link key={featuredNews.id} href={featuredNews.link || '#'} className="block group">
                            <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#121212] rounded-2xl border border-white/10 overflow-hidden hover:border-[#E8C15A]/40 transition-all duration-300">
                                <div className="grid md:grid-cols-2 gap-0">
                                    {/* Image Side */}
                                    <div className="relative h-48 md:h-72 overflow-hidden">
                                        <Image
                                            src={featuredNews.image || ''}
                                            alt={featuredNews.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#121212]/80 md:hidden" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent md:hidden" />
                                    </div>

                                    {/* Content Side */}
                                    <div className="p-6 md:p-8 flex flex-col justify-center">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${getTypeColor(featuredNews.type)}`}>
                                                {featuredNews.type}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs text-[#666]">
                                                <Calendar size={12} />
                                                {featuredNews.date}
                                            </span>
                                        </div>

                                        <h3 className="text-xl md:text-2xl font-bold text-white mb-3 group-hover:text-[#E8C15A] transition-colors">
                                            {featuredNews.title}
                                        </h3>

                                        <p className="text-sm md:text-base text-[#888] leading-relaxed mb-6">
                                            {featuredNews.body}
                                        </p>

                                        <div className="flex items-center gap-2 text-[#E8C15A] text-sm font-medium group-hover:gap-3 transition-all">
                                            <span>Read More</span>
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Other News Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {otherNews.map((news) => (
                        <div
                            key={news.id}
                            className="bg-[#121212] p-5 rounded-xl border border-white/5 hover:border-[#E8C15A]/30 transition-all group"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${getTypeColor(news.type)}`}>
                                    {news.type}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-[#555]">
                                    <Calendar size={11} />
                                    {news.date}
                                </span>
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#E8C15A] transition-colors">
                                {news.title}
                            </h3>
                            <p className="text-sm text-[#777] leading-relaxed">
                                {news.body}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { 
                    from { opacity: 0; transform: translateY(10px); } 
                    to { opacity: 1; transform: translateY(0); } 
                } 
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </>
    );
}
