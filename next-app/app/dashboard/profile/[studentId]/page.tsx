'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ChevronLeft, Trophy, Zap, Code, Calendar, Lock, Loader2 } from 'lucide-react';

// Dynamic import for 3D Badge to support SSR
const Badge3D = dynamic(() => import('@/components/Badge3D'), { ssr: false });

// Achievement 3D models mapping
const achievementModels: Record<string, string> = {
    welcome: '/3d/WELCOME.glb',
    approval: '/3d/done_approvalcamp.glb',
    '500pts': '/3d/500pts.glb',
    instructor: '/3d/instructor.glb',
};

// Achievement preview images mapping
const achievementImages: Record<string, string> = {
    welcome: '/images/WELCOME.webp',
    approval: '/images/done_approvalcamp.webp',
    '500pts': '/images/500pts.webp',
    instructor: '/images/instructor.webp',
};

interface Profile {
    name: string;
    role: string;
    faculty: string;
    studentLevel: string;
    joinedAt: string;
    codeforces?: {
        handle?: string;
        rating?: number;
        maxRating?: number;
        rank?: string;
        profile?: string;
    };
    leetcode?: {
        username?: string;
        profile?: string;
    };
    telegram?: {
        username?: string;
    };
    achievementsCount: number;
    achievements?: any[];
}

export default function PublicProfile() {
    const params = useParams();
    const studentId = params?.studentId as string;

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!studentId) return;

        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/profile/${studentId}`);
                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || 'Profile not found');
                    return;
                }

                setProfile(data.profile);
            } catch (err) {
                setError('Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [studentId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#E8C15A] animate-spin" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] flex flex-col items-center justify-center text-white">
                <Lock className="w-16 h-16 text-gray-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">{error || 'Profile Not Found'}</h1>
                <p className="text-gray-400 mb-6">This profile may be private or doesn't exist.</p>
                <Link href="/" className="px-6 py-2 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#CFA144]">
                    Go Home
                </Link>
            </div>
        );
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'owner': return { text: 'Owner', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
            case 'instructor': return { text: 'Instructor', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
            default: return { text: 'Trainee', color: 'bg-[#E8C15A]/20 text-[#E8C15A] border-[#E8C15A]/30' };
        }
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'legendary': return 'border-[#E8C15A]/50 shadow-[0_0_20px_rgba(232,193,90,0.2)]';
            case 'rare': return 'border-blue-500/30';
            default: return 'border-white/10';
        }
    };

    const roleBadge = getRoleBadge(profile.role);

    // Sort achievements: unlocked first, then by rarity (legendary > rare > common)
    const rarityOrder: Record<string, number> = { legendary: 3, rare: 2, common: 1 };
    const sortedAchievements = [...(profile.achievements || [])].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    });

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-white">
            <header className="p-6 flex items-center gap-4 border-b border-white/10 bg-[#121212]">
                <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white">
                    <ChevronLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-[#E8C15A]">Public Profile</h1>
                    <p className="text-sm text-gray-400">ID: {studentId}</p>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6 space-y-6">
                {/* Profile Card */}
                <div className="bg-[#121212] rounded-2xl border border-white/10 overflow-hidden">
                    <div className="p-6 md:p-8">
                        <div className="flex items-start gap-6 flex-col md:flex-row">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#E8C15A] to-[#CFA144] flex items-center justify-center text-4xl font-bold text-black shrink-0 overflow-hidden relative group">
                                {profile.telegram?.username ? (
                                    <img
                                        src={`https://unavatar.io/telegram/${profile.telegram.username}`}
                                        alt={profile.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                ) : null}
                                <span className={`${profile.telegram?.username ? 'hidden' : ''} absolute inset-0 flex items-center justify-center`}>
                                    {profile.name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h2 className="text-2xl font-bold">{profile.name}</h2>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${roleBadge.color}`}>
                                        {roleBadge.text}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 font-mono mb-2">@{studentId}</p>
                                <p className="text-gray-400 mb-4">Level {profile.studentLevel}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">

                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 border-t border-white/5">
                        <div className="p-4 text-center border-r border-white/5">
                            <div className="text-2xl font-bold text-[#E8C15A]">{profile.codeforces?.rating || '-'}</div>
                            <div className="text-xs text-gray-500">CF Rating</div>
                        </div>
                        <div className="p-4 text-center border-r border-white/5">
                            <div className="text-2xl font-bold text-[#E8C15A]">{profile.codeforces?.maxRating || '-'}</div>
                            <div className="text-xs text-gray-500">Max Rating</div>
                        </div>
                        <div className="p-4 text-center">
                            <div className="text-2xl font-bold text-[#E8C15A]">{profile.achievementsCount || 0}/4</div>
                            <div className="text-xs text-gray-500">Badges</div>
                        </div>
                    </div>
                </div>

                {/* Competitive Programming */}
                {(profile.codeforces?.profile || profile.leetcode?.profile) && (
                    <div className="bg-[#121212] rounded-2xl border border-white/10 p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Code size={18} className="text-[#E8C15A]" />
                            Competitive Programming
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {profile.codeforces?.profile && (
                                <a href={`https://codeforces.com/profile/${profile.codeforces.profile}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-4 bg-[#1A1A1A] rounded-xl hover:bg-[#222] transition-colors">
                                    <div className="p-2 bg-[#E8C15A]/10 rounded-lg"><Zap className="w-5 h-5 text-[#E8C15A]" /></div>
                                    <div>
                                        <div className="font-medium">Codeforces</div>
                                        <div className="text-sm text-gray-400">{profile.codeforces.rank || 'Unrated'}</div>
                                    </div>
                                </a>
                            )}
                            {profile.leetcode?.profile && (
                                <a href={`https://leetcode.com/${profile.leetcode.profile}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-4 bg-[#1A1A1A] rounded-xl hover:bg-[#222] transition-colors">
                                    <div className="p-2 bg-orange-500/10 rounded-lg"><Code className="w-5 h-5 text-orange-500" /></div>
                                    <div>
                                        <div className="font-medium">LeetCode</div>
                                        <div className="text-sm text-gray-400">{profile.leetcode.username || 'View Profile'}</div>
                                    </div>
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Achievements with 3D Models */}
                <div className="bg-[#121212] rounded-2xl border border-white/10 p-6">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Trophy size={18} className="text-[#E8C15A]" />
                        Achievements ({profile.achievementsCount}/4)
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {sortedAchievements.map((ach) => (
                            <div
                                key={ach.id}
                                className={`relative bg-[#0f0f0f] rounded-xl border overflow-hidden transition-all ${ach.unlocked ? getRarityColor(ach.rarity) : 'border-white/5 opacity-60'
                                    }`}
                            >
                                {/* 3D Model or Image */}
                                <div className={`h-32 relative ${!ach.unlocked ? 'blur-sm grayscale' : ''}`}>
                                    {ach.unlocked && achievementModels[ach.id] ? (
                                        <div className="w-full h-full">
                                            <Badge3D modelPath={achievementModels[ach.id]} unlocked={ach.unlocked} scale={1.2} />
                                        </div>
                                    ) : achievementImages[ach.id] ? (
                                        <img
                                            src={achievementImages[ach.id]}
                                            alt={ach.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                                            <Lock className="w-8 h-8 text-gray-600" />
                                        </div>
                                    )}
                                </div>

                                {/* Lock overlay */}
                                {!ach.unlocked && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <Lock className="w-8 h-8 text-white/50" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="p-3 text-center border-t border-white/5 bg-[#0f0f0f]">
                                    <div className={`text-sm font-medium ${ach.unlocked ? 'text-white' : 'text-gray-500'}`}>
                                        {ach.name}
                                    </div>
                                    <div className={`text-xs capitalize ${ach.rarity === 'legendary' ? 'text-[#E8C15A]' :
                                        ach.rarity === 'rare' ? 'text-blue-400' : 'text-gray-500'
                                        }`}>
                                        {ach.rarity}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
