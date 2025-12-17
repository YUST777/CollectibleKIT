'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Play, FileText, ArrowRight } from 'lucide-react';

export default function SessionsPage() {
    const sessions = [
        {
            id: 1,
            number: '01',
            title: 'Data Types & I/O',
            desc: 'Fundamentals of C++ Input/Output streams, arithmetic operators, and understanding basic data types and their limits.',
            thumbnail: '/images/datatypes.webp'
        },
        // Session 02 is skipped as per user request
        {
            id: 3,
            number: '03',
            title: 'Control Flow',
            desc: 'Mastering decision making with if-else statements, switch cases, and understanding program flow control.',
            thumbnail: '/images/controolflow.webp'
        },
        {
            id: 4,
            number: '04',
            title: 'Loops',
            desc: 'In-depth guide to for loops, while loops, and do-while loops for repetitive tasks and iteration.',
            thumbnail: '/images/revison.webp'
        },
    ];

    return (
        <div className="font-sans text-white">
            {/* Header / Breadcrumbs (kept minimal to fit dashboard) */}
            <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none mb-8">
                <Link href="/dashboard" className="hover:text-[#F2F2F2] flex items-center justify-center h-5"><ArrowLeft size={16} /></Link>
                <span className="hidden sm:inline">TRAINING</span><span className="hidden sm:inline">/</span>
                <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">Session Library</span>
            </div>

            <div className="max-w-7xl mx-auto animate-fade-in">
                {/* Hero Section */}
                <div className="mb-12 md:mb-16 text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight">
                        Session <span className="text-[#d59928]">Library</span>
                    </h1>
                    <p className="text-lg text-white/60 leading-relaxed">
                        Access our complete collection of training sessions, video episodes, and detailed study materials designed to master competitive programming.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {sessions.map((session) => (
                        <Link
                            key={session.id}
                            href={`/dashboard/sessions/${session.id}`}
                            className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#d59928]/50 transition-all duration-300 hover:-translate-y-1 block"
                        >
                            <div className="aspect-video relative overflow-hidden bg-[#1a1a1a]">
                                {/* Thumbnail */}
                                <Image
                                    src={session.thumbnail}
                                    alt={session.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"
                                />
                                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/50 to-[#050505]/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <Play className="w-12 h-12 text-white/20 group-hover:text-[#d59928] transition-colors" />
                                </div>
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="px-3 py-1 bg-[#d59928] text-black font-bold text-xs rounded-full uppercase tracking-wider shadow-lg">
                                        Session {session.number}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-[#d59928] transition-colors">
                                    {session.title}
                                </h3>
                                <p className="text-white/60 text-sm mb-6 line-clamp-2 min-h-[40px]">
                                    {session.desc}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex gap-4 text-xs text-white/40 font-mono">
                                        <span className="flex items-center gap-1.5">
                                            <Play className="w-3 h-3" /> Video
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <FileText className="w-3 h-3" /> PDF/Notes
                                        </span>
                                    </div>
                                    <span className="flex items-center gap-2 text-sm text-[#d59928] font-medium group-hover:translate-x-1 transition-transform">
                                        Start Learning <ArrowRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Coming Soon Card (Optional, purely decorative as per original design feel) */}
                    <div className="relative bg-[#050505] border border-white/5 rounded-2xl overflow-hidden opacity-50 cursor-not-allowed">
                        <div className="aspect-video relative bg-black/50 flex items-center justify-center">
                            <span className="text-white/20 font-bold uppercase tracking-widest">Coming Soon</span>
                        </div>
                        <div className="p-6">
                            <div className="h-6 w-3/4 bg-white/5 rounded mb-4"></div>
                            <div className="h-4 w-full bg-white/5 rounded mb-2"></div>
                            <div className="h-4 w-1/2 bg-white/5 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
}
