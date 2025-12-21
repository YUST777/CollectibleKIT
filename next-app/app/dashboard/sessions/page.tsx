'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Play, FileText, ArrowRight, Folder } from 'lucide-react';

export default function SessionsPage() {
    const [activeGroupTitle, setActiveGroupTitle] = useState<string | null>(null);

    const sessionGroups = [
        {
            title: "Approval Camp",
            description: "Fundamental C++ concepts including Data Types, I/O, Control Flow, and Loops.",
            image: '/images/approvalcamp.webp',
            sessions: [
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
                    title: 'Revision',
                    desc: 'Comprehensive review covering all previous topics with 3 practice problems to solidify your understanding.',
                    thumbnail: '/images/revison.webp'
                },
            ]
        },
        {
            title: "Winter Camp",
            description: "Advanced topics and algorithms starting with Time Complexity analysis.",
            image: '/images/wintercamp.webp',
            sessions: [
                {
                    id: 5,
                    number: '01',
                    title: 'Time Complexity',
                    desc: 'Introduction to Algorithms, Instructions, and Time Complexity analysis (O(n), O(1), O(n²)).',
                    thumbnail: '/images/complexicty.webp'
                }
            ]
        }
    ];

    const activeGroup = sessionGroups.find(g => g.title === activeGroupTitle);

    return (
        <div className="font-sans text-white">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none mb-8">
                <Link href="/dashboard" className="hover:text-[#F2F2F2] flex items-center justify-center h-5"><ArrowLeft size={16} /></Link>
                <span className="hidden sm:inline">TRAINING</span><span className="hidden sm:inline">/</span>
                <span
                    className={`uppercase text-xs sm:text-sm ${activeGroup ? 'text-[#A0A0A0] cursor-pointer hover:text-white' : 'text-[#DCDCDC]'}`}
                    onClick={() => setActiveGroupTitle(null)}
                >
                    Session Library
                </span>
                {activeGroup && (
                    <>
                        <span className="hidden sm:inline">/</span>
                        <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">{activeGroup.title}</span>
                    </>
                )}
            </div>

            <div className="max-w-7xl mx-auto animate-fade-in">
                {/* Hero Section */}
                <div className="mb-12 md:mb-16 text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight">
                        {activeGroup ? (
                            <>
                                <span className="text-[#d59928]">{activeGroup.title}</span> Sessions
                            </>
                        ) : (
                            <>
                                Session <span className="text-[#d59928]">Library</span>
                            </>
                        )}
                    </h1>
                </div>

                {!activeGroup ? (
                    /* Folder View */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {sessionGroups.map((group) => (
                            <button
                                key={group.title}
                                onClick={() => setActiveGroupTitle(group.title)}
                                className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#d59928]/50 transition-all duration-300 hover:-translate-y-1 text-left w-full block"
                            >
                                <div className="aspect-video relative overflow-hidden bg-[#1a1a1a]">
                                    {group.image && (
                                        <Image
                                            src={group.image}
                                            alt={group.title}
                                            fill
                                            className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/50 to-[#050505]/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                        <Folder className="w-12 h-12 text-white/20 group-hover:text-[#d59928] transition-colors" />
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-[#d59928] transition-colors">
                                        {group.title}
                                    </h3>
                                    <p className="text-white/60 text-sm mb-6 line-clamp-2 min-h-[40px]">
                                        {group.description}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex gap-4 text-xs text-white/40 font-mono">
                                            <span className="flex items-center gap-1.5">
                                                {group.sessions.length} Session{group.sessions.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <span className="flex items-center gap-2 text-sm text-[#d59928] font-medium group-hover:translate-x-1 transition-transform">
                                            Open Folder <ArrowRight className="w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    /* Sessions View */
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button
                            onClick={() => setActiveGroupTitle(null)}
                            className="flex items-center gap-2 text-[#d59928] hover:text-[#e5a938] transition-colors font-medium mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Folders
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {activeGroup.sessions.map((session) => (
                                <Link
                                    key={session.id}
                                    href={`/dashboard/sessions/${session.id}`}
                                    className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#d59928]/50 transition-all duration-300 hover:-translate-y-1 block"
                                >
                                    <div className="aspect-video relative overflow-hidden bg-[#1a1a1a]">
                                        {/* Thumbnail */}
                                        {session.thumbnail && (
                                            <Image
                                                src={session.thumbnail}
                                                alt={session.title}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"
                                            />
                                        )}
                                        {/* Fallback pattern if no image */}
                                        {!session.thumbnail && (
                                            <div className="absolute inset-0 bg-[#111] opacity-60"></div>
                                        )}

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
                        </div>
                    </div>
                )}
            </div>

            {/* Coming Soon Section (Hidden when active group is selected to reduce scrolling) */}
            {!activeGroup && (
                <div className="max-w-7xl mx-auto mt-16 animate-fade-in opacity-50">
                    <div className="relative bg-[#050505] border border-white/5 rounded-2xl overflow-hidden cursor-not-allowed max-w-sm mx-auto">
                        <div className="aspect-video relative bg-black/50 flex items-center justify-center">
                            <span className="text-white/20 font-bold uppercase tracking-widest">More Coming Soon</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
