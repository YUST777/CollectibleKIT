'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, BookOpen, Lock, Puzzle, Clock, CheckCircle2, FileCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Submission {
    id: number;
    sheet_name: string;
    problem_name: string;
    file_name: string;
    submitted_at: string;
}

export default function SheetsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    const [sheets, setSheets] = useState([
        { id: 1, title: 'Mini Quiz #1', problems: 3, difficulty: 'Easy', progress: 0, status: 'in_progress' },
        { id: 4, title: 'Approval Quiz', problems: 5, difficulty: 'Medium', progress: 0, status: 'locked' },
    ]);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                const res = await fetch('/api/sheets/my-submissions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const subs = data.submissions || [];
                    setSubmissions(subs);

                    // Calculate Progress
                    const quiz1Count = new Set(
                        subs.filter((s: any) => s.sheet_name === 'Mini Quiz #1').map((s: any) => s.problem_name)
                    ).size;

                    // Update sheets state
                    setSheets(prev => prev.map(sheet => {
                        if (sheet.title === 'Mini Quiz #1') {
                            return { ...sheet, progress: quiz1Count, status: quiz1Count >= 3 ? 'completed' : 'in_progress' };
                        }
                        if (sheet.title === 'Approval Quiz') {
                            return { ...sheet, status: 'locked' };
                        }
                        return sheet;
                    }));
                }
            } catch (error) {
                console.error('Failed to fetch submissions', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchData();
    }, [user]);

    const getStatusBadge = (status: string) => {
        if (status === 'in_progress') return { text: 'LIVE NOW', color: 'bg-[#E8C15A]/20 text-[#E8C15A] border-[#E8C15A]/30' };
        if (status === 'locked') return { text: 'LOCKED', color: 'bg-[#1a1a1a] text-[#444] border-white/5' };
        return { text: 'COMPLETED', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    };

    const handleContinue = (sheetId: number) => { router.push(`/dashboard/sheets/${sheetId}`); };

    return (
        <>
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none">
                    <Link href="/" className="hover:text-[#F2F2F2] hidden md:flex items-center justify-center h-5"><ChevronLeft size={16} /></Link>
                    <span className="hidden sm:inline">TRAINING</span><span className="hidden sm:inline">/</span>
                    <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">Training Sheets</span>
                </div>
            </header>

            <div className="space-y-8 animate-fade-in">
                {/* Sheets Grid */}
                <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col gap-2"><h2 className="text-xl md:text-2xl font-bold text-[#F2F2F2]">Training Sheets</h2><p className="text-sm text-[#A0A0A0]">Complete the quizzes to unlock more content.</p></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                        {sheets.map((sheet) => {
                            const isActive = sheet.status !== 'locked';
                            const badge = getStatusBadge(sheet.status);
                            return (
                                <div key={sheet.id} className={`bg-[#121212] p-5 md:p-6 rounded-2xl border ${isActive ? 'border-white/10' : 'border-white/5'}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 md:p-3 rounded-xl ${isActive ? 'bg-[#E8C15A]/10' : 'bg-[#1a1a1a]'}`}>
                                                {isActive ? <BookOpen className="text-[#E8C15A]" size={20} /> : <Puzzle className="text-[#444]" size={20} />}
                                            </div>
                                            <div><h4 className={`font-bold text-sm md:text-base ${isActive ? 'text-[#F2F2F2]' : 'text-[#666]'}`}>{sheet.title}</h4><p className={`text-xs ${isActive ? 'text-[#A0A0A0]' : 'text-[#444]'}`}>{sheet.problems} Problems • {sheet.difficulty}</p></div>
                                        </div>
                                        <span className={`text-[9px] md:text-[10px] font-bold px-2 py-1 rounded border ${badge.color}`}>{badge.text}</span>
                                    </div>
                                    <div className="mb-4"><div className="flex justify-between text-xs text-[#666] mb-1"><span>Progress</span><span>{sheet.progress}/{sheet.problems}</span></div><div className="w-full h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden"><div className={`h-full rounded-full ${isActive ? 'bg-[#E8C15A]' : 'bg-[#333]'}`} style={{ width: `${(sheet.progress / sheet.problems) * 100}%` }}></div></div></div>
                                    <button onClick={() => handleContinue(sheet.id)} disabled={!isActive} className={`w-full py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${isActive ? 'bg-[#1A1A1A] border border-white/10 text-[#F2F2F2] hover:bg-[#222]' : 'bg-[#161616] text-[#444] border border-white/5 cursor-not-allowed'}`}>
                                        {isActive ? 'Continue' : <><Lock size={16} /> Locked</>}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>


            </div>

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }`}</style>
        </>
    );
}
