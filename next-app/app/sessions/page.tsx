'use client';

import Link from 'next/link';
import { ArrowLeft, Play, FileText, ArrowRight } from 'lucide-react';
import Providers from '@/components/Providers';

function SessionLibraryContent() {
    const sessions = [
        { id: 1, number: '01', title: 'Data Types & I/O', desc: 'Fundamentals of C++ Input/Output streams, arithmetic operators, and understanding basic data types and their limits.' },
        { id: 3, number: '03', title: 'if/else & switch case', desc: 'Master conditional statements, logical operators, and control flow patterns.' },
        { id: 4, number: '04', title: 'Revision + 3 Problem Solving', desc: 'Review key concepts and solve 3 challenging problems to reinforce your understanding.' },
    ];

    return (
        <div className="min-h-screen bg-black text-white font-sans p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-12 sm:mb-16">
                    <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-[#d59928] to-[#e6b04a] bg-clip-text text-transparent">ICPC HUE</h1>
                    </div>
                </header>

                {/* Hero Section */}
                <div className="mb-16 text-center max-w-3xl mx-auto">
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
                        <Link key={session.id} href={`/sessions/${session.id}`} className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#d59928]/50 transition-all duration-300 hover:-translate-y-1 block">
                            <div className="aspect-video relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#050505] flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <Play className="w-12 h-12 text-white/20 group-hover:text-[#d59928] transition-colors" />
                                </div>
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 bg-[#d59928] text-black font-bold text-xs rounded-full uppercase tracking-wider">Session {session.number}</span>
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-2xl font-bold mb-3 group-hover:text-[#d59928] transition-colors">{session.title}</h3>
                                <p className="text-white/60 text-sm mb-6 line-clamp-2">{session.desc}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex gap-4 text-xs text-white/40 font-mono">
                                        <span className="flex items-center gap-1.5"><Play className="w-3 h-3" /> Video</span>
                                        <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> PDF/Notes</span>
                                    </div>
                                    <span className="flex items-center gap-2 text-sm text-[#d59928] font-medium group-hover:translate-x-1 transition-transform">
                                        Start Learning <ArrowRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Coming Soon Card */}
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
        </div>
    );
}

export default function SessionLibrary() {
    return <Providers><SessionLibraryContent /></Providers>;
}
