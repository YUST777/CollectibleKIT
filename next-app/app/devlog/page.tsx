'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Rocket,
    Terminal,
    Clock,
    Activity,
    Server,
    Monitor,
    ShieldCheck,
    Trophy,
    Zap,
    BookOpen,
    UserCheck,
    EyeOff,
    Layout,
    ArrowLeft
} from 'lucide-react';

interface Version {
    id: string;
    tag: string;
    stage: string;
    date: string;
    title: string;
    desc: string;
    details: string[];
    color: string;
    icon: React.ComponentType<{ className?: string }>;
}

export default function DevLogPage() {
    const [selectedVersion, setSelectedVersion] = useState(0);

    const versions: Version[] = [
        {
            id: "v2.0.0",
            tag: "RECAP",
            stage: "Stage 4: The Judge",
            date: "DEC 31, 2025",
            title: "The 2025 Recap",
            desc: "Launch of the December Snapshot system—a personalized year-end recap showcasing solving milestones and achievements for every student in the community.",
            details: ["Personalized Solve Snapshots", "Community Growth Report", "Milestone Visualization"],
            color: "from-blue-500/20",
            icon: Activity
        },
        {
            id: "v1.9.0",
            tag: "CURRICULUM",
            stage: "Stage 4: The Judge",
            date: "DEC 28, 2025",
            title: "Sheet-1 Launch",
            desc: "Activation of the 26-problem C++ fundamental curriculum with precision judging and leaderboard synchronization.",
            details: ["26 Fundamental Problems", "Precision Judging (BigInt/Epsilon)", "Leaderboard Sync", "Problem Difficulty Tiers"],
            color: "from-red-500/20",
            icon: EyeOff
        },
        {
            id: "v1.8.0",
            tag: "ENGINE",
            stage: "Stage 4: The Judge",
            date: "DEC 25, 2025",
            title: "The Execution Engine",
            desc: "Deployment of the core custom judge engine. Built with a proprietary sandbox and compiler pipeline for secure code execution on SSH nodes.",
            details: ["Proprietary Sandbox", "Custom Compiler Pipeline", "Secure Execution Environment", "Memory/Time Limit Isolation"],
            color: "from-red-500/30",
            icon: Terminal
        },
        {
            id: "v1.7.0",
            tag: "LEARN",
            stage: "Stage 3: The Hub",
            date: "DEC 18, 2025",
            title: "The Digital Curriculum",
            desc: "Launch of the Session Library, delivering structured C++ lessons and embedded video tutorials directly within the platform.",
            details: ["Video Tutorial Integration", "C++ Lesson Library", "Resource Download System"],
            color: "from-purple-500/20",
            icon: BookOpen
        },
        {
            id: "v1.6.0",
            tag: "AI",
            stage: "Stage 3: The Hub",
            date: "DEC 15, 2025",
            title: "AI Complexity Guru",
            desc: "Integrated Gemini AI to provide students with real-time O(N) complexity analysis and automated performance feedback on submissions.",
            details: ["Gemini AI Analysis", "Complexity Prediction", "Performance Optimization Tips"],
            color: "from-yellow-500/20",
            icon: Zap
        },
        {
            id: "v1.5.0",
            tag: "REWARD",
            stage: "Stage 3: The Hub",
            date: "DEC 12, 2025",
            title: "Achievement System",
            desc: "Gamification launch featuring 3D Rotating Trophies powered by Three.js for milestones like Approval Camp.",
            details: ["3D Trophies (Three.js)", "Approval Camp Badges", "Interactive Showcase"],
            color: "from-[#E8C15A]/20",
            icon: Trophy
        },
        {
            id: "v1.4.0",
            tag: "HUB",
            stage: "Stage 3: The Hub",
            date: "DEC 10, 2025",
            title: "Dashboard Launch",
            desc: "Transition to Next.js (ICPCHUE-NEXT) on SSH. Implementation of the bento-grid profile view and student ecosystem hub.",
            details: ["Bento-Grid Dashboard", "Identity Card System", "Next.js App Router Transition"],
            color: "from-green-500/20",
            icon: Layout
        },
        {
            id: "v1.3.0",
            tag: "SECURITY",
            stage: "Stage 2: Recruitment",
            date: "DEC 5, 2025",
            title: "Triple-Layer Auth",
            desc: "Hardening admin security with a Triple-Layer handshake: Secret-Token + Basic-Auth + TOTP (Google Authenticator).",
            details: ["TOTP Integration", "AES-256 Encryption", "Admin Security Handshake"],
            color: "from-orange-500/20",
            icon: ShieldCheck
        },
        {
            id: "v1.2.0",
            tag: "FORMS",
            stage: "Stage 2: Recruitment",
            date: "NOV 30, 2025",
            title: "The Registration Form",
            desc: "Launched on Vercel (ICPCHUE-Lime). Multi-step system to organize the first batch of trainees at Horus University.",
            details: ["Horus Univ. Recruitment", "Multi-step Form Logic", "Vercel Deployment"],
            color: "from-cyan-500/20",
            icon: UserCheck
        },
        {
            id: "v1.1.0",
            tag: "STYLE",
            stage: "Stage 1: Identity",
            date: "NOV 28, 2025",
            title: "Visual Refinement",
            desc: "Enhancing the brand with 3D graphics, CSS sticker peel effects, and performance-optimized WebM backgrounds.",
            details: ["3D CSS Sticker Peel", "WebM Hero Video", "Branding Assets"],
            color: "from-pink-500/20",
            icon: Monitor
        },
        {
            id: "v1.0.0",
            tag: "GENESIS",
            stage: "Stage 1: Identity",
            date: "NOV 27, 2025",
            title: "The Digital Identity",
            desc: "The project's birth as ICPCHUE-Lime on Vite, deployed via SSH. Signature moon-glow hero section launch.",
            details: ["Vite/SSH Foundation", "Moon-Glow Hero Section", "Glassmorphism UI"],
            color: "from-green-500/20",
            icon: Rocket
        }
    ];

    const current = versions[selectedVersion];
    const IconComponent = current.icon;

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden selection:bg-[#E8C15A] selection:text-black">
            {/* Header */}
            <header className="sticky top-0 h-16 border-b border-white/10 bg-black/90 backdrop-blur-xl z-50 flex items-center px-4 md:px-8">
                <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/news" className="flex items-center gap-2 text-white/50 hover:text-white transition">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm hidden sm:inline">Back to News</span>
                        </Link>
                    </div>


                    <Link href="/dashboard" className="flex items-center">
                        <Image
                            src="/favicon.webp"
                            alt="ICPC HUE"
                            width={32}
                            height={32}
                            className="rounded-lg"
                        />
                    </Link>
                </div>
            </header>

            {/* Main Container */}
            <main className="max-w-6xl mx-auto p-4 md:p-8 pt-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                            <span className="w-8 md:w-12 h-[2px] bg-[#E8C15A]" />
                            Development Log
                        </h2>
                        <p className="text-[10px] text-white/40 ml-11 md:ml-16 uppercase tracking-widest">35 Days of Development</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Navigation */}
                    <div className="lg:col-span-4 space-y-2 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {versions.map((v, i) => (
                            <button
                                key={v.id}
                                onClick={() => setSelectedVersion(i)}
                                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 relative group overflow-hidden ${selectedVersion === i
                                    ? 'bg-[#121212] border-[#E8C15A] shadow-[0_0_15px_rgba(232,193,90,0.1)]'
                                    : 'bg-[#0a0a0a] border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-500 ${v.color} group-hover:opacity-10`} />
                                <div className="relative z-10">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${selectedVersion === i ? 'bg-[#E8C15A] text-black' : 'bg-white/10 text-white/40'}`}>
                                            {v.id}
                                        </span>
                                        <span className="text-[8px] text-white/20 uppercase tracking-widest">{v.date}</span>
                                    </div>
                                    <h3 className={`font-bold text-sm leading-tight ${selectedVersion === i ? 'text-[#E8C15A]' : 'text-white/60'}`}>{v.title}</h3>
                                    <p className="text-[9px] text-white/30 mt-1 uppercase tracking-tighter">{v.stage}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Details */}
                    <div className="lg:col-span-8 lg:sticky lg:top-24">
                        <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 md:p-8 min-h-[400px] relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-gradient-to-br transition-all duration-1000 blur-[120px] opacity-20 -mr-32 -mt-32 ${current.color}`} />

                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 md:p-4 bg-white/5 rounded-xl border border-white/10">
                                            <IconComponent className="w-6 h-6 md:w-8 md:h-8 text-[#E8C15A]" />
                                        </div>
                                        <div>
                                            <p className="text-[#E8C15A] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{current.stage}</p>
                                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{current.title}</h2>
                                        </div>
                                    </div>
                                    <div className="text-left md:text-right">
                                        <span className="text-[10px] text-white/20 uppercase tracking-[0.15em]">{current.tag}</span>
                                        <p className="text-white/50 text-xs mt-1">{current.date}</p>
                                    </div>
                                </div>

                                <p className="text-white/70 text-base md:text-lg leading-relaxed mb-8 border-l-4 border-[#E8C15A] pl-4 md:pl-6 py-3 bg-white/[0.02] rounded-r-lg">
                                    {current.desc}
                                </p>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-[#E8C15A] font-bold border-b border-[#E8C15A]/20 pb-2">Technical Implementation</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                        {current.details.map((detail, idx) => (
                                            <div key={idx} className="flex items-center gap-3 group/item">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#E8C15A] group-hover/item:scale-150 transition-transform shadow-[0_0_6px_#E8C15A]" />
                                                <span className="text-sm text-white/60 group-hover/item:text-white transition-colors">{detail}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #E8C15A; }
      `}</style>
        </div>
    );
}
