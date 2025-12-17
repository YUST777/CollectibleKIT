'use client';

import Link from 'next/link';
import { ChevronLeft, Radio, Sparkles } from 'lucide-react';

function NewsCard({ type, title, date, body }: { type: string; title: string; date: string; body: string }) {
    return (
        <div className="bg-[#121212] p-4 md:p-5 rounded-xl border border-white/5 hover:border-[#E8C15A]/30 transition-all">
            <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                <span className="text-xs font-bold text-[#E8C15A] uppercase border border-[#E8C15A]/30 px-2 py-0.5 rounded">{type}</span>
                <span className="text-xs text-[#666]">{date}</span>
            </div>
            <h3 className="text-base md:text-lg font-bold text-[#F2F2F2] mb-2">{title}</h3>
            <p className="text-xs md:text-sm text-[#A0A0A0] leading-relaxed">{body}</p>
        </div>
    );
}

export default function NewsPage() {
    return (
        <>
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none">
                    <Link href="/" className="hover:text-[#F2F2F2] hidden md:flex items-center justify-center h-5"><ChevronLeft size={16} /></Link>
                    <span className="hidden sm:inline">TRAINING</span><span className="hidden sm:inline">/</span>
                    <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">Team News</span>
                </div>
            </header>
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3"><Radio className="text-[#E8C15A]" size={24} /><h2 className="text-xl md:text-2xl font-bold text-[#F2F2F2]">Team News</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <NewsCard type="Announcement" title="Welcome to ICPC HUE!" date="Dec 2024" body="Welcome to our training platform. Complete the approval camp sessions to unlock more features and join our competitive programming journey." />
                    <NewsCard type="Feature" title="Platform Features" date="Dec 2024" body="Track your progress, compete on the leaderboard, earn achievements, and access exclusive training materials. More features coming soon!" />
                </div>
                <div className="bg-[#121212] rounded-xl border border-white/5 p-6 text-center">
                    <Sparkles className="w-12 h-12 text-[#E8C15A]/50 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-2">More Updates Coming</h3>
                    <p className="text-sm text-[#A0A0A0]">Stay tuned for more announcements, contests, and community events.</p>
                </div>
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
