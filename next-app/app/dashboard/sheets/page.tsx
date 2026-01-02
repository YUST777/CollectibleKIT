'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, BookOpen, FileCode2, ChevronRight, Loader2, Info, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Sheet {
    id: string;
    title: string;
    description: string;
    totalProblems: number;
}

import { addCacheBust } from '@/lib/cache-version';

export default function SheetsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [sheets, setSheets] = useState<Sheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCredits, setShowCredits] = useState(false);

    useEffect(() => {
        const fetchSheets = async () => {
            try {
                const res = await fetch(addCacheBust('/api/training-sheets'));
                if (res.ok) {
                    const data = await res.json();
                    setSheets(data.sheets || []);
                }
            } catch (error) {
                console.error('Failed to fetch sheets:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSheets();
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-[#E8C15A]" size={48} />
            </div>
        );
    }

    return (
        <>
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none">
                    <Link href="/dashboard" className="hover:text-[#F2F2F2] hidden md:flex items-center justify-center h-5">
                        <ChevronLeft size={16} />
                    </Link>
                    <span className="hidden sm:inline">TRAINING</span>
                    <span className="hidden sm:inline">/</span>
                    <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">Training Sheets</span>
                </div>
                <button
                    onClick={() => setShowCredits(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] hover:bg-[#E8C15A]/20 transition-colors text-xs font-bold"
                >
                    <Info size={16} />
                    <span>CREDITS</span>
                </button>
            </header>

            <div className="space-y-8 animate-fade-in">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 md:p-8 border border-white/10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-[#E8C15A]/10">
                            <FileCode2 className="text-[#E8C15A]" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[#F2F2F2]">Training Sheets</h1>
                            <p className="text-[#A0A0A0] text-sm mt-1">Your Roadmap to Competitive Programming</p>
                        </div>
                    </div>
                    <p className="text-[#808080] text-sm leading-relaxed max-w-2xl">
                        Access a curated collection of problem sheets designed to build your skills from the ground up.
                        Write code, submit solutions, and get instant feedback to accelerate your learning.
                    </p>
                </div>

                {/* Sheets Grid */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-[#F2F2F2]">Available Sheets</h2>

                    {sheets.length === 0 ? (
                        <div className="bg-[#121212] rounded-xl p-8 border border-white/5 text-center">
                            <BookOpen className="mx-auto text-[#444] mb-3" size={40} />
                            <p className="text-[#666]">No training sheets available yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sheets.map((sheet) => (
                                <Link
                                    key={sheet.id}
                                    href={`/dashboard/sheets/${sheet.id}`}
                                    className={`group bg-[#121212] rounded-xl border border-white/10 hover:border-[#E8C15A]/30 hover:bg-[#161616] transition-all relative overflow-hidden ${sheet.id === 'sheet-1' ? 'p-8 min-h-[260px] flex flex-col justify-between' : 'p-5'
                                        }`}
                                >
                                    {/* Custom Image for Sheet 1 */}
                                    {sheet.id === 'sheet-1' && (
                                        <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-30 transition-opacity">
                                            <Image
                                                src="/images/sheet/sheet1.webp"
                                                alt={sheet.title}
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent" />
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2.5 rounded-lg transition-colors ${sheet.id === 'sheet-1' ? 'bg-[#E8C15A]/20' : 'bg-[#E8C15A]/10 group-hover:bg-[#E8C15A]/20'}`}>
                                                <BookOpen className="text-[#E8C15A]" size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-[#F2F2F2] group-hover:text-[#E8C15A] transition-colors">
                                                    {sheet.title}
                                                </h3>
                                                <p className="text-xs text-[#666]">{sheet.totalProblems} Problems</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-[#444] group-hover:text-[#E8C15A] transition-colors" size={20} />
                                    </div>
                                    <p className="text-sm text-[#808080] line-clamp-2 relative z-10">{sheet.description}</p>

                                    {/* Problem Letters Preview */}
                                    <div className="flex flex-wrap gap-1.5 mt-4">
                                        {['A', 'B', 'C', 'D', 'E', 'F'].map((letter) => (
                                            <span
                                                key={letter}
                                                className="w-6 h-6 flex items-center justify-center text-xs font-bold bg-[#1a1a1a] text-[#666] rounded"
                                            >
                                                {letter}
                                            </span>
                                        ))}
                                        <span className="w-6 h-6 flex items-center justify-center text-xs text-[#444]">...</span>
                                        <span className="w-6 h-6 flex items-center justify-center text-xs font-bold bg-[#1a1a1a] text-[#666] rounded">Z</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Credits Modal */}
            {showCredits && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowCredits(false)}>
                    <div className="bg-[#181818] border border-white/10 p-6 rounded-2xl max-w-md w-full relative transform scale-100 transition-all shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-[#666] hover:text-white transition-colors" onClick={() => setShowCredits(false)}>
                            <X size={20} />
                        </button>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-[#E8C15A]/10 rounded-full flex items-center justify-center text-[#E8C15A] mb-4">
                                <Info size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Acknowledgement</h3>
                            <p className="text-[#A0A0A0] text-sm leading-relaxed mb-4">
                                These training sheets are based on the excellent curriculum provided by:
                            </p>
                            <a
                                href="https://www.facebook.com/icpcassiutt/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-[#E8C15A] font-bold hover:underline bg-[#E8C15A]/10 px-4 py-2 rounded-lg transition-colors hover:bg-[#E8C15A]/20"
                            >
                                ICPC Assiut University Community
                            </a>
                        </div>
                    </div>
                </div>
            )}

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
