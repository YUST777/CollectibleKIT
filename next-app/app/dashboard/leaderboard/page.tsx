'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, RefreshCw, Loader2, ExternalLink, Trophy, Code, Eye, EyeOff } from 'lucide-react';

// Dynamic import for Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// Medal animation component
const MedalAnimation = ({ place }: { place: 1 | 2 | 3 }) => {
    const [animationData, setAnimationData] = useState<any>(null);

    useEffect(() => {
        const files = {
            1: '/tgs/1st Place Medal.json',
            2: '/tgs/2nd Place Medal.json',
            3: '/tgs/3rd Place Medal.json'
        };
        fetch(files[place])
            .then(res => res.json())
            .then(data => setAnimationData(data))
            .catch(err => console.error('Failed to load medal animation:', err));
    }, [place]);

    if (!animationData) return <span className="text-[#E8C15A] font-bold">{place}</span>;

    return (
        <Lottie
            animationData={animationData}
            loop={true}
            style={{ width: 32, height: 32 }}
        />
    );
};

interface CFUser {
    handle: string;
    name: string;
    rating: number;
    rank: string;
}

interface SheetUser {
    userId: number;
    username: string;
    solvedCount: number;
    totalSubmissions: number;
    acceptedCount: number;
}

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'codeforces' | 'sheets'>('codeforces');
    const [cfLeaderboard, setCfLeaderboard] = useState<CFUser[]>([]);
    const [sheetsLeaderboard, setSheetsLeaderboard] = useState<SheetUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [dataFetched, setDataFetched] = useState({ codeforces: false, sheets: false });

    // Per-tab privacy state
    const [showOnCfLeaderboard, setShowOnCfLeaderboard] = useState(true);
    const [showOnSheetsLeaderboard, setShowOnSheetsLeaderboard] = useState(true);
    const [savingPrivacy, setSavingPrivacy] = useState(false);

    // Get current tab's visibility
    const isVisible = activeTab === 'codeforces' ? showOnCfLeaderboard : showOnSheetsLeaderboard;

    // Fetch privacy settings on mount
    useEffect(() => {
        const fetchPrivacy = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) return;

                const res = await fetch('/api/user/privacy', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setShowOnCfLeaderboard(data.showOnCfLeaderboard ?? true);
                    setShowOnSheetsLeaderboard(data.showOnSheetsLeaderboard ?? true);
                }
            } catch (error) {
                console.error('Error fetching privacy:', error);
            }
        };

        fetchPrivacy();
    }, []);

    useEffect(() => {
        // Only fetch if not already cached
        if (activeTab === 'codeforces' && !dataFetched.codeforces) {
            fetchLeaderboard();
        } else if (activeTab === 'sheets' && !dataFetched.sheets) {
            fetchLeaderboard();
        } else {
            // Data already cached, just hide loading
            setLoading(false);
        }
    }, [activeTab]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            if (activeTab === 'codeforces') {
                const res = await fetch('/api/leaderboard');
                const data = await res.json();
                setCfLeaderboard(data.leaderboard || []);
                setDataFetched(prev => ({ ...prev, codeforces: true }));
            } else {
                // Include auth token for shadow ban detection
                const token = localStorage.getItem('authToken');
                const headers: HeadersInit = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const res = await fetch('/api/leaderboard/sheets', { headers });
                const data = await res.json();
                setSheetsLeaderboard(data.leaderboard || []);
                setDataFetched(prev => ({ ...prev, sheets: true }));
            }
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        }
        setLoading(false);
    };

    const handlePrivacyToggle = async () => {
        if (!user) return;
        setSavingPrivacy(true);

        const field = activeTab === 'codeforces' ? 'showOnCfLeaderboard' : 'showOnSheetsLeaderboard';
        const currentValue = activeTab === 'codeforces' ? showOnCfLeaderboard : showOnSheetsLeaderboard;
        const newValue = !currentValue;

        // Optimistic update
        if (activeTab === 'codeforces') {
            setShowOnCfLeaderboard(newValue);
        } else {
            setShowOnSheetsLeaderboard(newValue);
        }

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/user/privacy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ [field]: newValue })
            });

            if (!res.ok) {
                // Revert on error
                if (activeTab === 'codeforces') {
                    setShowOnCfLeaderboard(currentValue);
                } else {
                    setShowOnSheetsLeaderboard(currentValue);
                }
            }
        } catch (error) {
            // Revert on error
            if (activeTab === 'codeforces') {
                setShowOnCfLeaderboard(currentValue);
            } else {
                setShowOnSheetsLeaderboard(currentValue);
            }
        } finally {
            setSavingPrivacy(false);
        }
    };

    const getRatingColor = (rating: number) => {
        if (rating >= 2400) return 'text-red-500';
        if (rating >= 2100) return 'text-orange-400';
        if (rating >= 1900) return 'text-purple-400';
        if (rating >= 1600) return 'text-blue-400';
        if (rating >= 1400) return 'text-cyan-400';
        if (rating >= 1200) return 'text-green-400';
        return 'text-gray-400';
    };

    const getSolvedBadge = (count: number) => {
        if (count >= 20) return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black';
        if (count >= 10) return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
        if (count >= 5) return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
        return 'bg-[#333] text-[#A0A0A0]';
    };

    return (
        <>
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none">
                    <Link href="/" className="hover:text-[#F2F2F2] hidden md:flex items-center justify-center h-5">
                        <ChevronLeft size={16} />
                    </Link>
                    <span className="hidden sm:inline">TRAINING</span>
                    <span className="hidden sm:inline">/</span>
                    <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">Leaderboard</span>
                </div>
            </header>

            <div className="space-y-6 animate-fade-in">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-[#F2F2F2] flex items-center gap-3">
                            <Trophy className="text-[#E8C15A]" size={28} />
                            Leaderboard
                        </h2>
                        <p className="text-[#A0A0A0] mt-1 ml-10">
                            Compare your progress with the community
                        </p>
                    </div>

                    <div className="flex items-center gap-2 ml-10 md:ml-0">
                        {/* Privacy Control - Toggles visibility for current tab */}
                        {user && (
                            <button
                                onClick={handlePrivacyToggle}
                                disabled={savingPrivacy}
                                className={`p-2 rounded-lg border transition-all flex items-center gap-2 ${isVisible
                                    ? 'bg-[#1A1A1A] border-white/10 text-green-400 hover:bg-[#222]'
                                    : 'bg-[#1A1A1A] border-white/10 text-[#666] hover:text-[#A0A0A0] hover:bg-[#222]'
                                    } ${savingPrivacy ? 'opacity-50' : ''}`}
                                title={isVisible
                                    ? `You are visible on the ${activeTab === 'codeforces' ? 'Codeforces' : 'Sheets'} leaderboard`
                                    : `You are hidden from the ${activeTab === 'codeforces' ? 'Codeforces' : 'Sheets'} leaderboard`}
                            >
                                {savingPrivacy ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : isVisible ? (
                                    <Eye size={20} />
                                ) : (
                                    <EyeOff size={20} />
                                )}
                                <span className="text-sm font-medium hidden sm:inline">
                                    {isVisible ? 'Visible' : 'Hidden'}
                                </span>
                            </button>
                        )}

                        <button
                            onClick={fetchLeaderboard}
                            disabled={loading}
                            className="p-2 bg-[#1A1A1A] border border-white/10 rounded-lg text-[#F2F2F2] hover:bg-[#222] hover:text-[#E8C15A] transition-all"
                            title="Refresh"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-white/10">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('codeforces')}
                            className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'codeforces'
                                ? 'text-[#E8C15A]'
                                : 'text-[#A0A0A0] hover:text-[#F2F2F2]'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <ExternalLink size={16} />
                                Codeforces Rating
                            </div>
                            {activeTab === 'codeforces' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#E8C15A] rounded-t-full shadow-[0_-2px_8px_rgba(232,193,90,0.3)]" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('sheets')}
                            className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'sheets'
                                ? 'text-[#E8C15A]'
                                : 'text-[#A0A0A0] hover:text-[#F2F2F2]'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Code size={16} />
                                Training Sheets
                            </div>
                            {activeTab === 'sheets' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#E8C15A] rounded-t-full shadow-[0_-2px_8px_rgba(232,193,90,0.3)]" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Leaderboard Table */}
                <div className="bg-[#121212] rounded-xl border border-white/5 overflow-hidden">
                    {activeTab === 'codeforces' ? (
                        <>
                            {/* CF Header */}
                            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs text-[#666] uppercase tracking-wider">
                                <div className="col-span-1">#</div>
                                <div className="col-span-5">Handle</div>
                                <div className="col-span-3">Rating</div>
                                <div className="col-span-3">Rank</div>
                            </div>
                            {loading ? (
                                <div className="p-8 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-[#E8C15A]" size={32} />
                                </div>
                            ) : cfLeaderboard.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4 border border-white/5">
                                        <Trophy className="text-[#E8C15A]" size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-2">No rated users yet</h3>
                                    <p className="text-sm text-[#A0A0A0] max-w-md mx-auto mb-6">
                                        To appear on this leaderboard, you need to compete in a rated Codeforces contest.
                                        Your rating will be calculated after your first rated participation.
                                    </p>
                                    <a
                                        href="https://codeforces.com/contests"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-2.5 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#D4AF37] transition-all transform hover:scale-105 flex items-center gap-2"
                                    >
                                        <ExternalLink size={16} />
                                        View Upcoming Contests
                                    </a>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {cfLeaderboard.map((user, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-colors items-center">
                                            <div className="col-span-1 flex items-center justify-center">
                                                {index < 3 ? (
                                                    <MedalAnimation place={(index + 1) as 1 | 2 | 3} />
                                                ) : (
                                                    <span className="text-sm font-bold text-[#666]">{index + 1}</span>
                                                )}
                                            </div>
                                            <div className="col-span-5">
                                                <a
                                                    href={`https://codeforces.com/profile/${user.handle}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-medium text-[#F2F2F2] hover:text-[#E8C15A] flex items-center gap-2"
                                                >
                                                    {user.handle}
                                                    <ExternalLink size={12} className="text-[#666]" />
                                                </a>
                                                <p className="text-xs text-[#666]">{user.name}</p>
                                            </div>
                                            <div className={`col-span-3 text-sm font-bold ${getRatingColor(user.rating)}`}>
                                                {user.rating}
                                            </div>
                                            <div className="col-span-3 text-sm text-[#A0A0A0] capitalize">{user.rank}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* CF Ranking Info Box */}
                            <div className="p-4 bg-[#0A0A0A] border-t border-white/5">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-[#1A1A1A] rounded-lg">
                                        <Trophy className="text-[#E8C15A]" size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#A0A0A0]">
                                            <span className="text-[#F2F2F2] font-medium">How to get ranked?</span>{' '}
                                            Compete in any rated Codeforces contest. Your rating will be calculated after your first participation.
                                        </p>
                                        <a
                                            href="https://codeforces.com/contests"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#E8C15A] text-sm hover:underline inline-flex items-center gap-1 mt-1"
                                        >
                                            View Upcoming Contests <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Sheets Header */}
                            <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 text-xs text-[#666] uppercase tracking-wider">
                                <div className="col-span-1">#</div>
                                <div className="col-span-4">Username</div>
                                <div className="col-span-3">Problems Solved</div>
                                <div className="col-span-2">Accepted</div>
                                <div className="col-span-2">Submissions</div>
                            </div>
                            {loading ? (
                                <div className="p-8 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-[#E8C15A]" size={32} />
                                </div>
                            ) : sheetsLeaderboard.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4 border border-white/5">
                                        <Code className="text-[#E8C15A]" size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-2">No submissions yet</h3>
                                    <p className="text-sm text-[#A0A0A0] max-w-xs mx-auto mb-6">
                                        Be the first to solve a problem and claim your spot on the leaderboard!
                                    </p>
                                    <Link
                                        href="/dashboard/sheets"
                                        className="px-6 py-2.5 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#D4AF37] transition-all transform hover:scale-105"
                                    >
                                        Start Solving
                                    </Link>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {sheetsLeaderboard.map((user, index) => (
                                        <div key={user.userId} className="grid grid-cols-12 gap-4 p-4 hover:bg-white/5 transition-colors items-center">
                                            <div className="col-span-1 flex items-center justify-center">
                                                {index < 3 ? (
                                                    <MedalAnimation place={(index + 1) as 1 | 2 | 3} />
                                                ) : (
                                                    <span className="text-sm font-bold text-[#666]">{index + 1}</span>
                                                )}
                                            </div>
                                            <div className="col-span-4">
                                                <span className="text-sm font-medium text-[#F2F2F2]">{user.username}</span>
                                            </div>
                                            <div className="col-span-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${getSolvedBadge(user.solvedCount)}`}>
                                                    {user.solvedCount} solved
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-sm text-green-400 font-medium">
                                                {user.acceptedCount}
                                            </div>
                                            <div className="col-span-2 text-sm text-[#666]">
                                                {user.totalSubmissions}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
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
