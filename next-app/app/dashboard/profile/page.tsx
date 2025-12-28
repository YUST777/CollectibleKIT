'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayName } from '@/lib/utils';
import { ChevronLeft, Pencil, Send, Check, ChevronDown, ExternalLink, Hexagon, BookOpen, Shield, Camera, Loader2, Trash2 } from 'lucide-react';
import AchievementsWidget from '@/components/AchievementsWidget';

export default function ProfilePage() {
    const { user, profile: authProfile, refreshProfile } = useAuth();
    const profile: any = authProfile || { name: user?.email?.split('@')[0] || 'User' };
    const [showEditModal, setShowEditModal] = useState(false);
    const [editField, setEditField] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isUserInfoOpen, setUserInfoOpen] = useState(false);
    const [approvalProgress, setApprovalProgress] = useState(0);
    const [uploadingPfp, setUploadingPfp] = useState(false);
    const [pfpError, setPfpError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const openEditModal = (field: string, currentValue: string) => { setEditField(field); setInputValue(currentValue || ''); setShowEditModal(true); };

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                const res = await fetch('/api/sheets/my-submissions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const submissions = data.submissions || [];

                    const sheet1Problems = new Set(
                        submissions
                            .filter((s: any) => (s.sheet_id === 'sheet-1' || (s.sheet_name && s.sheet_name.includes('Sheet 1'))))
                            .map((s: any) => s.problem_name)
                    );
                    setApprovalProgress(sheet1Problems.size);
                }
            } catch (err) {
                console.error('Failed to load stats', err);
            }
        };

        if (user) fetchStats();
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('authToken');
            const updateData: Record<string, string> = {};

            let finalValue = inputValue;
            if (editField === 'telegram') {
                finalValue = inputValue.replace('@', '').trim();
            } else if (editField === 'codeforces') {
                // Extract handle from URL if user pasted full URL
                if (inputValue.includes('codeforces.com/profile/')) {
                    const parts = inputValue.split('/');
                    finalValue = parts[parts.length - 1] || inputValue;
                }
            }

            if (editField === 'telegram') updateData.telegram_username = finalValue;
            if (editField === 'codeforces') updateData.codeforces_profile = finalValue;
            if (editField === 'leetcode') updateData.leetcode_profile = finalValue;

            await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(updateData)
            });

            // Trigger manual refresh if Codeforces handle was updated
            if (editField === 'codeforces') {
                try {
                    await fetch('/api/user/refresh-cf', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (cfError) {
                    console.error('Failed to refresh Codeforces data:', cfError);
                }
            }

            await refreshProfile();
            setSaved(true);
            setTimeout(() => { setSaved(false); setShowEditModal(false); }, 1500);
        } catch (err) { console.error('Save failed:', err); }
        setSaving(false);
    };

    const handleDelete = async (field: 'telegram' | 'codeforces') => {
        if (!window.confirm(`Are you sure you want to delete your ${field === 'telegram' ? 'Telegram' : 'Codeforces'} profile data?`)) return;
        try {
            const token = localStorage.getItem('authToken');
            await fetch('/api/user/delete-profile-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ field })
            });
            await refreshProfile();
        } catch (err) { console.error('Delete failed:', err); }
    };

    // Profile picture upload handler
    const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side validation
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setPfpError('File too large. Maximum size is 5MB.');
            setTimeout(() => setPfpError(''), 5000); // Auto-clear after 5s
            return;
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setPfpError('Only PNG, JPG, and WebP images are allowed.');
            setTimeout(() => setPfpError(''), 5000); // Auto-clear after 5s
            return;
        }

        setPfpError('');
        setUploadingPfp(true);

        try {
            const token = localStorage.getItem('authToken');
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch('/api/user/upload-pfp', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                setPfpError(data.error || 'Failed to upload image');
                setTimeout(() => setPfpError(''), 5000); // Auto-clear after 5s
            } else {
                await refreshProfile();
            }
        } catch (err) {
            console.error('Upload failed:', err);
            setPfpError('Failed to upload image');
            setTimeout(() => setPfpError(''), 5000); // Auto-clear after 5s
        } finally {
            setUploadingPfp(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Delete profile picture handler
    const handleDeletePfp = async () => {
        if (!window.confirm('Are you sure you want to delete your profile picture?')) return;

        setUploadingPfp(true);
        setPfpError('');

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/user/delete-pfp', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();

            if (res.ok) {
                await refreshProfile();
            } else {
                setPfpError(data.error || 'Failed to delete profile picture');
                setTimeout(() => setPfpError(''), 5000); // Auto-clear after 5s
            }
        } catch (err) {
            console.error('Delete pfp failed:', err);
            setPfpError('Failed to delete profile picture');
            setTimeout(() => setPfpError(''), 5000); // Auto-clear after 5s
        } finally {
            setUploadingPfp(false);
        }
    };

    const cfData = profile.codeforces_data || {};
    const rating = cfData.rating || 'N/A';
    const rank = cfData.rank || 'Unrated';

    // Profile picture URL - use uploaded picture or fallback to initial
    const profilePicture = user?.profile_picture ? `/pfps/${user.profile_picture}` : null;

    return (
        <>
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none">
                    <Link href="/" className="hover:text-[#F2F2F2] hidden md:flex items-center justify-center h-5"><ChevronLeft size={16} /></Link>
                    <span className="hidden sm:inline">TRAINING</span><span className="hidden sm:inline">/</span>
                    <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">My Profile</span>
                </div>
            </header>

            <div className="space-y-6 animate-fade-in">
                {/* Mobile User Info Accordion */}
                <div className="md:hidden bg-[#121212] rounded-xl border border-white/5 overflow-hidden">
                    <button onClick={() => setUserInfoOpen(!isUserInfoOpen)} className="w-full flex items-center justify-between p-4 text-left">
                        <div className="flex items-center gap-3"><Hexagon className="text-[#E8C15A]" size={20} /><span className="font-medium text-[#F2F2F2]">User Info</span></div>
                        <ChevronDown size={18} className={`text-[#A0A0A0] transition-transform ${isUserInfoOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isUserInfoOpen && (
                        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                            {[{ l: 'Telegram', v: profile.telegram_username, f: 'telegram' }, { l: 'Codeforces', v: profile.codeforces_profile, f: 'codeforces' }, { l: 'LeetCode', v: profile.leetcode_profile, f: 'leetcode' }].map(item => (
                                <div key={item.l} className="flex items-center justify-between">
                                    <span className="text-xs text-[#A0A0A0]">{item.l}</span>
                                    <div className="flex items-center gap-2">{item.v ? <span className="text-xs text-[#F2F2F2]">{item.v}</span> : <span className="text-xs text-[#666]">Not set</span>}<button onClick={() => openEditModal(item.f, item.v || '')} className="text-[#E8C15A] hover:text-[#E8C15A]/80"><Pencil size={12} /></button></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-6">
                    {/* Top Row: Identity + Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Identity Card */}
                        <div className="bg-[#121212] rounded-2xl border border-white/5 relative overflow-hidden h-full flex flex-col group hover:border-white/10 transition-colors">
                            {/* Decorative Cover */}
                            <div className="h-32 bg-gradient-to-r from-[#E8C15A]/20 via-[#B89830]/10 to-transparent relative">
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:10px_10px]"></div>
                                <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                                    <Shield size={12} className="text-[#E8C15A]" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#E8C15A]">
                                        {user?.role === 'instructor' || user?.role === 'owner' || profile?.role === 'instructor' || profile?.role === 'owner' ? 'Instructor' : 'Trainee'}
                                    </span>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="px-6 pb-6 flex-1 flex flex-col items-center -mt-12 relative z-10">
                                {/* Avatar with Upload Button */}
                                <div className="w-24 h-24 rounded-2xl bg-[#121212] p-1.5 shadow-2xl relative group/avatar">
                                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#E8C15A] to-[#B89830] flex items-center justify-center text-3xl font-bold text-black overflow-hidden relative">
                                        {profilePicture ? (
                                            <img
                                                src={profilePicture}
                                                alt={profile.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="absolute inset-0 flex items-center justify-center">
                                                {profile.name?.charAt(0).toUpperCase() || 'U'}
                                            </span>
                                        )}

                                        {/* Hover overlay with options */}
                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                            {uploadingPfp ? (
                                                <Loader2 size={24} className="text-white animate-spin" />
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="flex items-center gap-1 text-white hover:text-[#E8C15A] transition-colors"
                                                    >
                                                        <Camera size={16} />
                                                        <span className="text-[10px] font-medium">Change</span>
                                                    </button>
                                                    {profilePicture && (
                                                        <button
                                                            onClick={handleDeletePfp}
                                                            className="flex items-center gap-1 text-white/70 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                            <span className="text-[10px]">Remove</span>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    onChange={handlePfpUpload}
                                    className="hidden"
                                />

                                {/* Error message */}
                                {pfpError && (
                                    <p className="text-red-400 text-xs mt-2">{pfpError}</p>
                                )}

                                {/* Identity Info */}
                                <div className="mt-4 text-center space-y-1 w-full">
                                    <h2 className="text-2xl font-bold text-[#F2F2F2] tracking-tight truncate">{getDisplayName(profile.name) || 'Member'}</h2>
                                    <p className="text-xs text-[#666] font-mono">@{profile.student_id || user?.email?.split('@')[0]}</p>
                                </div>

                                {/* Stats Grid */}
                                <div className="w-full mt-8 grid grid-cols-2 gap-3">
                                    <div className="bg-[#1A1A1A]/50 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 group/stat hover:bg-[#1A1A1A] transition-colors">
                                        <span className="text-2xl font-bold text-[#E8C15A] group-hover/stat:scale-110 transition-transform">{rating}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-[#666]">Rating</span>
                                    </div>
                                    <div className="bg-[#1A1A1A]/50 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 group/stat hover:bg-[#1A1A1A] transition-colors">
                                        <span className="text-xl font-bold text-white capitalize group-hover/stat:scale-110 transition-transform">{rank}</span>
                                        <span className="text-[10px] uppercase tracking-wider text-[#666]">Rank</span>
                                    </div>
                                </div>


                            </div>
                        </div>

                        {/* Right: Active Training + Profiles */}
                        <div className="space-y-6 flex flex-col">
                            {/* Active Training */}
                            <div className="bg-[#121212] p-4 md:p-5 rounded-xl border border-white/5 flex-1 flex flex-col justify-center">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                                    <div className="flex gap-3">
                                        <div className="p-2 md:p-3 bg-[#E8C15A]/10 rounded-lg text-[#E8C15A] shrink-0"><BookOpen size={20} /></div>
                                        <div>
                                            <h4 className="font-bold text-[#F2F2F2] text-sm md:text-base">Sheet 1</h4>
                                            <p className="text-xs text-[#A0A0A0]">Say Hello With C++</p>
                                        </div>
                                    </div>
                                    <span className="bg-[#E8C15A]/20 text-[#E8C15A] text-xs font-bold px-2 py-1 rounded w-fit">IN PROGRESS</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-[#DCDCDC]"><span>Progress</span><span>{approvalProgress} / 26 Solved</span></div>
                                    <div className="w-full bg-[#1A1A1A] h-2 rounded-full overflow-hidden border border-white/5"><div className="bg-[#E8C15A] h-full transition-all duration-500" style={{ width: `${(approvalProgress / 26) * 100}%` }}></div></div>
                                </div>
                            </div>

                            {/* Profiles */}
                            <div className="hidden md:block bg-[#121212] rounded-xl border border-white/5 p-4">
                                <h4 className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-3">Profiles</h4>
                                <div className="space-y-3">
                                    {[{ l: 'Telegram', v: profile.telegram_username, f: 'telegram' }, { l: 'Codeforces', v: profile.codeforces_profile, f: 'codeforces' }, { l: 'LeetCode', v: profile.leetcode_profile, f: 'leetcode' }].map(item => (
                                        <div key={item.l} className="flex items-center justify-between">
                                            <span className="text-sm text-[#A0A0A0]">{item.l}</span>
                                            <div className="flex items-center gap-2">
                                                {item.v ? <a href={item.l === 'Telegram' ? `https://t.me/${item.v}` : item.l === 'Codeforces' ? `https://codeforces.com/profile/${item.v}` : `https://leetcode.com/${item.v}`} target="_blank" rel="noopener" className="text-sm text-[#F2F2F2] hover:text-[#E8C15A] flex items-center gap-1">{item.v}<ExternalLink size={12} /></a> : <span className="text-sm text-[#666]">Not set</span>}
                                                <button onClick={() => openEditModal(item.f, item.v || '')} className="text-[#E8C15A] hover:text-[#E8C15A]/80 p-1"><Pencil size={14} /></button>
                                                {item.v && (item.f === 'telegram' || item.f === 'codeforces') && (
                                                    <button onClick={() => handleDelete(item.f as 'telegram' | 'codeforces')} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14} /></button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Achievements */}
                    <div className="w-full">
                        <AchievementsWidget profile={profile} user={user} />
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-[#121212] rounded-2xl border border-white/10 p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-4">Edit {editField.charAt(0).toUpperCase() + editField.slice(1)}</h3>
                        <input value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={`Enter ${editField} username`} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#E8C15A]/50 mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-[#A0A0A0] hover:bg-white/5">Cancel</button>
                            <button onClick={handleSave} disabled={saving || saved} className="flex-1 py-2.5 rounded-lg bg-[#E8C15A] text-black font-bold hover:bg-[#D4AF37] disabled:opacity-50 flex items-center justify-center gap-2">
                                {saved ? <><Check size={18} />Saved</> : saving ? 'Saving...' : <><Send size={16} />Save</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
