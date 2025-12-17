'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, RefreshCw, Filter, Loader2, ExternalLink } from 'lucide-react';

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                const res = await fetch('/api/leaderboard');
                const data = await res.json();
                setLeaderboard(data.leaderboard || []);
            } catch (err) { console.error('Failed to fetch leaderboard:', err); }
            setLoading(false);
        }
        fetchLeaderboard();
    }, []);

    const getRatingColor = (rating: number) => {
        if (rating >= 2400) return 'text-red-500';
        if (rating >= 2100) return 'text-orange-400';
        if (rating >= 1900) return 'text-purple-400';
        if (rating >= 1600) return 'text-blue-400';
        if (rating >= 1400) return 'text-cyan-400';
        if (rating >= 1200) return 'text-green-400';
        return 'text-gray-400';
    };

    return (
        <>
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none">
                    <Link href="/" className="hover:text-[#F2F2F2] hidden md:flex items-center justify-center h-5"><ChevronLeft size={16} /></Link>
                    <span className="hidden sm:inline">TRAINING</span><span className="hidden sm:inline">/</span>
                    <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">Leaderboard</span>
                </div>
            </header>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div><h2 className="text-xl md:text-2xl font-bold text-[#F2F2F2]">Codeforces Leaderboard</h2><p className="text-sm text-[#A0A0A0]">Community rankings by Codeforces rating</p></div>
                    <div className="flex gap-2">
                        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F2F2F2] hover:bg-[#222] transition-colors"><RefreshCw size={16} />Refresh</button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-sm text-[#F2F2F2] hover:bg-[#222] transition-colors"><Filter size={16} />Filter</button>
                    </div>
                </div>
                <div className="bg-[#121212] rounded-xl border border-white/5 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs text-[#666] uppercase tracking-wider">
                        <div className="col-span-1">#</div><div className="col-span-5">Handle</div><div className="col-span-3">Rating</div><div className="col-span-3">Rank</div>
                    </div>
                    {loading ? (
                        <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-[#E8C15A]" size={32} /></div>
                    ) : leaderboard.length === 0 ? (
                        <div className="p-8 text-center text-[#666]">No leaderboard data available</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {leaderboard.map((user: any, index: number) => (
                                <div key={index} className="grid grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-colors items-center">
                                    <div className="col-span-1 text-sm font-bold text-[#E8C15A]">{index + 1}</div>
                                    <div className="col-span-5">
                                        <a href={`https://codeforces.com/profile/${user.handle}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#F2F2F2] hover:text-[#E8C15A] flex items-center gap-2">
                                            {user.handle}<ExternalLink size={12} className="text-[#666]" />
                                        </a>
                                        <p className="text-xs text-[#666]">{user.name}</p>
                                    </div>
                                    <div className={`col-span-3 text-sm font-bold ${getRatingColor(user.rating)}`}>{user.rating}</div>
                                    <div className="col-span-3 text-sm text-[#A0A0A0] capitalize">{user.rank}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
