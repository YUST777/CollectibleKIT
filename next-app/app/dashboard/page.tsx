'use client';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayName } from '@/lib/utils';
import {
    BookOpen,
    Flame,
    Target,
    Trophy,
    Zap,
    Calendar,
    MoreHorizontal,
    Hand,
    Sparkles,
    Globe
} from 'lucide-react';

import { addCacheBust } from '@/lib/cache-version';

function StatCard({ icon: Icon, title, value, subtext, color = "text-[#E8C15A]" }: any) {
    // Map text colors to background colors with opacity
    const bgColorMap: Record<string, string> = {
        'text-orange-500': 'bg-orange-500/10',
        'text-blue-500': 'bg-blue-500/10',
        'text-[#E8C15A]': 'bg-[#E8C15A]/10',
        'text-green-500': 'bg-green-500/10',
        'text-purple-500': 'bg-purple-500/10',
    };
    const bgColor = bgColorMap[color] || 'bg-white/10';

    return (
        <div className="bg-[#121212] rounded-xl border border-white/5 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${bgColor}`}>
                    <Icon size={20} className={color} />
                </div>
                <MoreHorizontal size={16} className="text-[#404040]" />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
                <p className="text-xs text-[#A0A0A0]">{title}</p>
            </div>
            {subtext && <p className="text-[10px] text-[#666] mt-2">{subtext}</p>}
        </div>
    );
}

function WelcomeBanner({ name }: { name: string }) {
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
    }, []);

    // Prevent hydration mismatch by rendering a generic greeting or nothing initially
    // Or just render the container and wait for client.
    // Here we'll start empty to avoid flash of wrong time, or use a default.
    // Since it's behind a loading state usually, empty is fine, but name is passed.
    if (!greeting) return (
        <div className="bg-gradient-to-r from-[#E8C15A] to-[#B89830] rounded-2xl p-6 md:p-8 relative overflow-hidden mb-6 h-[104px] animate-pulse"></div>
    );

    return (
        <div className="bg-gradient-to-r from-[#E8C15A] to-[#B89830] rounded-2xl p-6 md:p-8 relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 text-[#0f0f0f]">
                <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">{greeting}, {name}! <Hand size={28} className="text-[#0f0f0f] animate-wave" /></h1>
                <p className="text-sm md:text-base opacity-80 max-w-lg font-medium">
                    Ready to crush some problems today? consistency is the key to mastery.
                </p>
            </div>
        </div>
    );
}

function ConsistencyCalendar({ data }: { data: Record<string, number> }) {
    const [days, setDays] = useState<string[]>([]);

    useEffect(() => {
        const generatedDays = Array.from({ length: 28 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (27 - i)); // Go back from today
            return d.toISOString().split('T')[0];
        });
        setDays(generatedDays);
    }, []);

    if (days.length === 0) return (
        <div className="bg-[#121212] rounded-xl border border-white/5 p-5 h-[200px] animate-pulse"></div>
    );

    return (
        <div className="bg-[#121212] rounded-xl border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-[#E8C15A]" />
                    <h3 className="font-bold text-[#F2F2F2]">Consistency</h3>
                </div>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-sm bg-[#222]"></div>
                    <div className="w-2 h-2 rounded-sm bg-[#E8C15A]/40"></div>
                    <div className="w-2 h-2 rounded-sm bg-[#E8C15A]/70"></div>
                    <div className="w-2 h-2 rounded-sm bg-[#E8C15A]"></div>
                </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg border border-white/5 p-3 overflow-hidden">
                <div className="grid grid-cols-7 mb-2">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (<div key={i} className="text-center text-[10px] font-bold text-[#666]">{day}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((date, i) => {
                        const count = data ? (data[date] || 0) : 0;
                        let bgColor = 'bg-[#1A1A1A] text-[#333]';
                        if (count > 0) bgColor = 'bg-[#E8C15A]/40 text-[#E8C15A]';
                        if (count > 2) bgColor = 'bg-[#E8C15A]/70 text-black';
                        if (count > 4) bgColor = 'bg-[#E8C15A] text-black font-bold shadow-[0_0_8px_rgba(234,179,8,0.4)]';

                        return (
                            <div
                                key={date}
                                title={`${date}: ${count} problems`}
                                className={`aspect-square rounded-sm flex items-center justify-center text-[10px] transition-colors ${bgColor}`}
                            >
                                {i + 1}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function DashboardHome() {
    const { user, profile } = useAuth();
    const displayName = getDisplayName(profile?.name) || user?.email?.split('@')[0] || 'Member';

    // Stats State
    const [stats, setStats] = useState({
        streak: 0,
        totalSolved: 0,
        consistencyMap: {},
        approvalProgress: 0,
        sheet1Solved: 0
    });
    const [loadingStats, setLoadingStats] = useState(true);

    // Fetch Stats & Submissions
    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                // Fetch raw submissions
                const res = await fetch(addCacheBust('/api/sheets/my-submissions'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const submissions = data.submissions || [];

                    // --- Client-Side Stats Calculation ---

                    // Helper to safely parse date
                    const safeGetDate = (dateStr: any) => {
                        if (!dateStr) return null;
                        try {
                            const d = new Date(dateStr);
                            // Check if valid date
                            if (isNaN(d.getTime())) return null;
                            return d.toISOString().split('T')[0];
                        } catch (e) {
                            return null;
                        }
                    };

                    // 1. Total Problems Solved (Unique)
                    const uniqueProblems = new Set(submissions.map((s: any) => `${s.sheet_name}/${s.problem_name}`));
                    const totalSolved = uniqueProblems.size;

                    // 2. Streak Calculation
                    const validDates = submissions
                        .map((s: any) => safeGetDate(s.submitted_at))
                        .filter((d: string | null) => d !== null) as string[];

                    const uniqueDates = Array.from(new Set(validDates)).sort().reverse();

                    let streak = 0;
                    const today = new Date().toISOString().split('T')[0];
                    const yesterdayDate = new Date();
                    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                    const yesterday = yesterdayDate.toISOString().split('T')[0];

                    let currentDateCheck = today;
                    if (!uniqueDates.includes(today)) {
                        if (uniqueDates.includes(yesterday)) {
                            currentDateCheck = yesterday;
                        } else {
                            streak = 0;
                        }
                    }

                    if (uniqueDates.includes(currentDateCheck)) {
                        streak = 1;
                        let checkDate = new Date(currentDateCheck);
                        // Iterate backwards
                        for (let i = 1; i < uniqueDates.length; i++) {
                            checkDate.setDate(checkDate.getDate() - 1);
                            const checkString = checkDate.toISOString().split('T')[0];
                            if (uniqueDates.includes(checkString)) {
                                streak++;
                            } else {
                                break;
                            }
                        }
                    }

                    // 3. Consistency Map
                    const consistencyMap: Record<string, number> = {};
                    submissions.forEach((s: any) => {
                        const date = safeGetDate(s.submitted_at);
                        if (date) {
                            consistencyMap[date] = (consistencyMap[date] || 0) + 1;
                        }
                    });

                    // 4. Sheet 1 Progress
                    const sheet1Problems = new Set(
                        submissions
                            .filter((s: any) => (s.sheet_id === 'sheet-1' || (s.sheet_name && s.sheet_name.includes('Sheet 1'))))
                            .map((s: any) => s.problem_name)
                    );
                    const sheet1Solved = sheet1Problems.size;
                    const isSheet1Complete = sheet1Solved >= 26;

                    // 5. Approval Progress
                    const approvalProgress = isSheet1Complete ? 1 : 0;

                    setStats({
                        streak,
                        totalSolved,
                        consistencyMap,
                        approvalProgress,
                        sheet1Solved
                    });
                }
            } catch (err) {
                console.error('Failed to load stats', err);
            } finally {
                setLoadingStats(false);
            }
        };

        if (user) {
            fetchStats();
        }
    }, [user]);

    // Derived values
    const rank = profile?.codeforces_data?.rank || 'Unrated';
    const rating = profile?.codeforces_data?.rating || 'N/A';

    return (
        <>
            <div className="animate-fade-in space-y-8 max-w-5xl mx-auto">
                <WelcomeBanner name={displayName} />

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <StatCard
                        icon={Flame}
                        title="Day Streak"
                        value={loadingStats ? '-' : stats.streak}
                        subtext="Keep it burning!"
                        color="text-orange-500"
                    />
                    <StatCard
                        icon={Target}
                        title="Problems Solved"
                        value={loadingStats ? '-' : stats.totalSolved}
                        subtext="Total unique AC"
                        color="text-blue-500"
                    />
                    <div className="col-span-2 md:col-span-1">
                        <StatCard
                            icon={Trophy}
                            title="Current Rank"
                            value={rank}
                            subtext={rating !== 'N/A' ? `${rating} Rating` : 'Not rated yet'}
                            color="text-[#E8C15A]"
                        />
                    </div>
                </div>

                {/* Core Activities */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <div className="bg-[#121212] rounded-xl border border-white/5 p-5 flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap size={18} className="text-[#E8C15A]" />
                                    <h3 className="font-bold text-[#F2F2F2]">Current Focus</h3>
                                </div>
                                <div className="bg-[#1A1A1A] p-4 rounded-lg border border-white/5 mb-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-[#E8C15A]/10 rounded text-[#E8C15A]">
                                            <BookOpen size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-bold text-white">Sheet 1 - Say Hello With C++</h4>
                                            <span className="text-[10px] text-[#E8C15A] bg-[#E8C15A]/10 px-2 py-0.5 rounded-full">RECOMMENDED</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[#A0A0A0] mb-3">Master the basics of C++ input/output and data types.</p>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] text-[#A0A0A0]">
                                            <span>Progress</span>
                                            <span>{loadingStats ? '-' : (stats as any).sheet1Solved || 0}/26</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[#222] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#E8C15A] transition-all duration-1000 ease-out"
                                                style={{ width: `${Math.min(((stats as any).sheet1Solved || 0) / 26 * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                <Link href={`/2025/${profile?.student_id || 'user'}`} className="block mb-3 group">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-[#E8C15A]/10 to-transparent border border-[#E8C15A]/20 hover:border-[#E8C15A]/50 transition-all">
                                        <div className="p-2 bg-[#E8C15A]/20 rounded-md text-[#E8C15A]">
                                            <Sparkles size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white group-hover:text-[#E8C15A] transition-colors">See Your 2025 Recap</div>
                                            <div className="text-[10px] text-[#A0A0A0]">Check out your coding journey!</div>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/2025/dec" className="block mb-4 group">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 hover:border-blue-500/50 transition-all">
                                        <div className="p-2 bg-blue-500/20 rounded-md text-blue-500">
                                            <Globe size={18} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white group-hover:text-blue-500 transition-colors">Community Achievements</div>
                                            <div className="text-[10px] text-[#A0A0A0]">December 2025 Report & Stats</div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                            <Link href="/dashboard/sheets/sheet-1">
                                <button className="w-full py-2.5 bg-[#E8C15A] hover:bg-[#D4AF37] text-black font-bold text-sm rounded-lg transition-colors">
                                    Continue Solving
                                </button>
                            </Link>
                        </div>
                    </div>

                    <div className="h-full">
                        <ConsistencyCalendar data={stats.consistencyMap} />
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes wave { 
                    0%, 100% { transform: rotate(0deg); } 
                    10% { transform: rotate(14deg); } 
                    20% { transform: rotate(-8deg); } 
                    30% { transform: rotate(14deg); } 
                    40% { transform: rotate(-4deg); } 
                    50% { transform: rotate(10deg); } 
                    60% { transform: rotate(0deg); } 
                }
                .animate-wave { animation: wave 2.5s ease-in-out infinite; transform-origin: 70% 70%; display: inline-block; }
            `}</style>
        </>
    );
}

