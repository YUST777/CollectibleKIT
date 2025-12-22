'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayName } from '@/lib/utils';
import { ChevronLeft, Copy, Check, Settings, User, Mail, Shield, Loader2 } from 'lucide-react';

export default function SettingsPage() {
    const { user, profile: authProfile } = useAuth();
    const profile = authProfile || { name: user?.email?.split('@')[0] || 'User' };
    const [copied, setCopied] = useState(false);
    const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
    const [savingPrivacy, setSavingPrivacy] = useState(false);

    // ALWAYS use email prefix for profile URL (student_id in DB may have user typos)
    const studentId = user?.email?.split('@')[0] || 'unknown';
    const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile/${studentId}` : '';

    // Load current privacy setting on mount
    useEffect(() => {
        if (user?.profile_visibility) {
            setShowOnLeaderboard(user.profile_visibility === 'public');
        }
    }, [user]);

    const handleCopy = () => {
        navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrivacyChange = async (checked: boolean) => {
        setShowOnLeaderboard(checked);
        setSavingPrivacy(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/user/privacy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ visibility: checked ? 'public' : 'private' })
            });

            if (!res.ok) {
                // Revert on error
                setShowOnLeaderboard(!checked);
                console.error('Failed to update privacy setting');
            }
        } catch (error) {
            setShowOnLeaderboard(!checked);
            console.error('Error updating privacy:', error);
        } finally {
            setSavingPrivacy(false);
        }
    };

    return (
        <>
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none">
                    <Link href="/" className="hover:text-[#F2F2F2] hidden md:flex items-center justify-center h-5"><ChevronLeft size={16} /></Link>
                    <span className="hidden sm:inline">TRAINING</span><span className="hidden sm:inline">/</span>
                    <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">Settings</span>
                </div>
            </header>
            <div className="space-y-6 animate-fade-in max-w-4xl">
                <div className="flex items-center gap-3"><Settings className="text-[#E8C15A]" size={24} /><h2 className="text-xl md:text-2xl font-bold text-[#F2F2F2]">Settings</h2></div>

                {/* Profile Sharing */}
                <div className="bg-[#121212] rounded-xl border border-white/5 p-5 md:p-6">
                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-4 flex items-center gap-2"><User size={20} className="text-[#E8C15A]" />Profile Sharing</h3>
                    <p className="text-sm text-[#A0A0A0] mb-4">Share your public profile with others.</p>
                    <div className="flex items-center gap-2">
                        <input type="text" readOnly value={profileUrl} className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-[#A0A0A0] truncate" />
                        <button onClick={handleCopy} className="px-4 py-2.5 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#D4AF37] transition-colors flex items-center gap-2">
                            {copied ? <><Check size={16} />Copied</> : <><Copy size={16} />Copy</>}
                        </button>
                    </div>
                </div>

                {/* Privacy Settings */}
                <div className="bg-[#121212] rounded-xl border border-white/5 p-5 md:p-6">
                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-4 flex items-center gap-2"><Shield size={20} className="text-[#E8C15A]" />Privacy</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#F2F2F2]">Show on leaderboard</p>
                                <p className="text-xs text-[#666]">Display your name on the public leaderboard (both Codeforces & Sheets)</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {savingPrivacy && <Loader2 size={16} className="animate-spin text-[#E8C15A]" />}
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showOnLeaderboard}
                                        onChange={(e) => handlePrivacyChange(e.target.checked)}
                                        disabled={savingPrivacy}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E8C15A] peer-disabled:opacity-50"></div>
                                </label>
                            </div>
                        </div>
                        <div className="p-3 bg-[#1A1A1A] rounded-lg border border-white/5">
                            <p className="text-xs text-[#666]">
                                {showOnLeaderboard
                                    ? '✅ Your profile is public. You appear on leaderboards and can be found by others.'
                                    : '🔒 Your profile is private. You are hidden from leaderboards.'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Account Info */}
                <div className="bg-[#121212] rounded-xl border border-white/5 p-5 md:p-6">
                    <h3 className="text-lg font-bold text-[#F2F2F2] mb-4 flex items-center gap-2"><Mail size={20} className="text-[#E8C15A]" />Account</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between"><span className="text-sm text-[#A0A0A0]">Email</span><span className="text-sm text-[#F2F2F2]">{user?.email || 'Not available'}</span></div>
                        <div className="flex items-center justify-between"><span className="text-sm text-[#A0A0A0]">Name</span><span className="text-sm text-[#F2F2F2]">{getDisplayName(profile.name) || 'Not set'}</span></div>
                        <div className="flex items-center justify-between"><span className="text-sm text-[#A0A0A0]">Member since</span><span className="text-sm text-[#F2F2F2]">December 2024</span></div>
                    </div>
                </div>
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
