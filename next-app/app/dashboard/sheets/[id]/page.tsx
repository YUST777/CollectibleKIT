'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Clock, HardDrive, CheckCircle2, Loader2, Lock, List, FileText, XCircle, AlertTriangle, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Problem {
    id: string;
    title: string;
    available: boolean;
    timeLimit?: number;
    memoryLimit?: number;
    solvedCount?: number;
}

interface Sheet {
    id: string;
    title: string;
    description: string;
    totalProblems: number;
    problems: Problem[];
}

interface Submission {
    id: number;
    sheetId: string;
    problemId: string;
    problemTitle: string;
    verdict: string;
    timeMs: number;
    memoryKb: number;
    testsPassed: number;
    totalTests: number;
    submittedAt: string;
    attemptNumber: number;
    language: string;
    sourceCode?: string;
}

// C++ Syntax Highlighting Function
function highlightCpp(code: string): string {
    if (!code) return '';
    let html = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const tokenMap = new Map<string, string>();
    let tokenId = 0;
    const tokenize = (match: string, color: string): string => {
        const id = `__TOKEN_${tokenId++}__`;
        tokenMap.set(id, `<span style="color:${color}">${match}</span>`);
        return id;
    };

    html = html.replace(/(\/\/[^\n]*)/g, (m) => tokenize(m, '#6A9955'));
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => tokenize(m, '#6A9955'));
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, (m) => tokenize(m, '#CE9178'));
    html = html.replace(/('(?:[^'\\]|\\.)*')/g, (m) => tokenize(m, '#CE9178'));
    html = html.replace(/(&lt;[a-zA-Z_][a-zA-Z0-9_]*&gt;)/g, (m) => tokenize(m, '#CE9178'));
    html = html.replace(/(#\w+)/g, '<span style="color:#C586C0">$1</span>');

    const keywords = ['using', 'namespace', 'class', 'struct', 'void', 'int', 'long', 'char', 'float', 'double', 'bool', 'true', 'false', 'if', 'else', 'for', 'while', 'return', 'const', 'auto', 'cin', 'cout', 'endl', 'std', 'string', 'vector'];
    html = html.replace(new RegExp(`\\b(${keywords.join('|')})\\b`, 'g'), '<span style="color:#569CD6">$1</span>');
    html = html.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span style="color:#DCDCAA">$1</span>(');
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#B5CEA8">$1</span>');

    tokenMap.forEach((value, key) => { html = html.split(key).join(value); });
    return html;
}

export default function SheetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const sheetId = params.id as string;

    const [sheet, setSheet] = useState<Sheet | null>(null);
    const [loading, setLoading] = useState(true);
    const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'problems' | 'submissions'>('problems');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<{
        id: number;
        verdict: string;
        sourceCode: string;
        submittedAt: string;
        attemptNumber: number;
        problemTitle: string;
    } | null>(null);
    const [loadingCode, setLoadingCode] = useState(false);

    useEffect(() => {
        const fetchSheet = async () => {
            try {
                const res = await fetch(`/api/training-sheets/${sheetId}`);
                if (res.ok) {
                    const data = await res.json();
                    setSheet(data.sheet);
                } else {
                    router.push('/dashboard/sheets');
                }
            } catch (error) {
                console.error('Failed to fetch sheet:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSheet();
    }, [sheetId, router]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    // Fetch solved problems from database on page load
    useEffect(() => {
        const fetchSolvedProblems = async () => {
            if (!user) return;
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch(`/api/submissions?sheetId=${sheetId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Get unique problem IDs that have "Accepted" verdict
                    const acceptedProblems = new Set<string>();
                    (data.submissions || []).forEach((sub: Submission) => {
                        if (sub.verdict === 'Accepted') {
                            acceptedProblems.add(sub.problemId);
                        }
                    });
                    setSolvedProblems(acceptedProblems);
                }
            } catch (error) {
                console.error('Failed to fetch solved problems:', error);
            }
        };

        fetchSolvedProblems();
    }, [sheetId, user]);

    // Fetch submissions when tab changes
    useEffect(() => {
        if (activeTab === 'submissions' && user) {
            fetchSubmissions();
        }
    }, [activeTab, user]);

    const fetchSubmissions = async () => {
        setSubmissionsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/submissions?sheetId=${sheetId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSubmissions(data.submissions || []);
            }
        } catch (error) {
            console.error('Failed to fetch submissions:', error);
        } finally {
            setSubmissionsLoading(false);
        }
    };

    const viewSubmissionCode = async (submissionId: number) => {
        setLoadingCode(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/submissions/${submissionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const sub = data.submission;
                setSelectedSubmission({
                    id: sub.id,
                    verdict: sub.verdict,
                    sourceCode: sub.sourceCode,
                    submittedAt: sub.submittedAt,
                    attemptNumber: sub.attemptNumber,
                    problemTitle: sub.problemTitle
                });
            }
        } catch (error) {
            console.error('Failed to fetch submission code:', error);
        } finally {
            setLoadingCode(false);
        }
    };

    const getVerdictStyle = (verdict: string) => {
        if (verdict === 'Accepted') return 'text-green-400';
        if (verdict.includes('Wrong')) return 'text-red-400';
        if (verdict.includes('Time')) return 'text-yellow-400';
        if (verdict.includes('Compilation')) return 'text-orange-400';
        if (verdict.includes('Runtime')) return 'text-purple-400';
        return 'text-gray-400';
    };

    const getVerdictIcon = (verdict: string) => {
        if (verdict === 'Accepted') return <CheckCircle2 size={14} className="text-green-400" />;
        if (verdict.includes('Wrong') || verdict.includes('Runtime')) return <XCircle size={14} className="text-red-400" />;
        return <AlertTriangle size={14} className="text-yellow-400" />;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-[#E8C15A]" size={48} />
            </div>
        );
    }

    if (!sheet) {
        return null;
    }

    const availableProblems = sheet.problems.filter(p => p.available);
    const solvedCount = [...solvedProblems].filter(id => availableProblems.some(p => p.id === id)).length;

    return (
        <>
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <div className="flex items-center gap-2 text-sm text-[#A0A0A0] leading-none">
                    <Link href="/dashboard/sheets" className="hover:text-[#F2F2F2] hidden md:flex items-center justify-center h-5">
                        <ChevronLeft size={16} />
                    </Link>
                    <span className="hidden sm:inline">TRAINING</span>
                    <span className="hidden sm:inline">/</span>
                    <span className="text-[#DCDCDC] uppercase text-xs sm:text-sm">{sheet.title}</span>
                </div>
            </header>

            <div className="space-y-6 animate-fade-in">
                {/* Sheet Header */}
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-white/10">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[#F2F2F2] mb-2">{sheet.title}</h1>
                            <p className="text-[#808080] text-sm">{sheet.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#E8C15A]">{solvedCount}</div>
                                <div className="text-xs text-[#666]">Solved</div>
                            </div>
                            <div className="w-px h-10 bg-white/10"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#F2F2F2]">{availableProblems.length}</div>
                                <div className="text-xs text-[#666]">Available</div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-[#666] mb-1">
                            <span>Progress</span>
                            <span>{Math.round((solvedCount / Math.max(availableProblems.length, 1)) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#E8C15A] to-[#CFA144] rounded-full transition-all duration-500"
                                style={{ width: `${(solvedCount / Math.max(availableProblems.length, 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('problems')}
                        className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'problems'
                            ? 'text-[#E8C15A] border-[#E8C15A]'
                            : 'text-[#666] border-transparent hover:text-[#A0A0A0]'
                            }`}
                    >
                        <List size={16} />
                        Problems
                    </button>
                    <button
                        onClick={() => setActiveTab('submissions')}
                        className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'submissions'
                            ? 'text-[#E8C15A] border-[#E8C15A]'
                            : 'text-[#666] border-transparent hover:text-[#A0A0A0]'
                            }`}
                    >
                        <FileText size={16} />
                        My Submissions
                        {submissions.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/10 rounded">
                                {submissions.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Problems Tab */}
                {activeTab === 'problems' && (
                    <>
                        {/* Problems Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {sheet.problems.map((problem) => {
                                const isSolved = solvedProblems.has(problem.id);
                                const isAvailable = problem.available;

                                return (
                                    <Link
                                        key={problem.id}
                                        href={isAvailable ? `/dashboard/sheets/${sheetId}/${problem.id}` : '#'}
                                        className={`
                                            relative group rounded-xl p-4 border transition-all text-center
                                            ${isAvailable
                                                ? isSolved
                                                    ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                                                    : 'bg-[#121212] border-white/10 hover:border-[#E8C15A]/30 hover:bg-[#161616]'
                                                : 'bg-[#0d0d0d] border-white/5 cursor-not-allowed opacity-50'
                                            }
                                        `}
                                        onClick={(e) => !isAvailable && e.preventDefault()}
                                    >
                                        <div className={`
                                            text-2xl font-bold mb-1
                                            ${isAvailable
                                                ? isSolved ? 'text-green-400' : 'text-[#F2F2F2] group-hover:text-[#E8C15A]'
                                                : 'text-[#444]'
                                            }
                                        `}>
                                            {problem.id}
                                        </div>

                                        <div className="absolute top-2 right-2">
                                            {!isAvailable ? (
                                                <Lock size={12} className="text-[#444]" />
                                            ) : isSolved ? (
                                                <CheckCircle2 size={14} className="text-green-400" />
                                            ) : null}
                                        </div>

                                        <div className={`
                                            text-[10px] truncate
                                            ${isAvailable ? 'text-[#808080]' : 'text-[#333]'}
                                        `}>
                                            {problem.title}
                                        </div>

                                        {isAvailable && (
                                            <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-[#666]" title="Users solved">
                                                <Users size={12} />
                                                <span className="font-medium">x{problem.solvedCount || 0}</span>
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-center gap-6 text-xs text-[#666]">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-[#121212] border border-white/10"></div>
                                <span>Unsolved</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-green-500/10 border border-green-500/30"></div>
                                <span>Solved</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-[#0d0d0d] border border-white/5 opacity-50"></div>
                                <span>Coming Soon</span>
                            </div>
                        </div>
                    </>
                )}

                {/* Submissions Tab */}
                {activeTab === 'submissions' && (
                    <div className="bg-[#121212] rounded-xl border border-white/10 overflow-hidden">
                        {submissionsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-[#E8C15A]" size={32} />
                            </div>
                        ) : submissions.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="mx-auto text-[#333] mb-3" size={48} />
                                <p className="text-[#666]">No submissions yet</p>
                                <p className="text-[#444] text-sm mt-1">Solve a problem to see your submission history</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-[#666] text-left">
                                            <th className="px-4 py-3 font-medium">#</th>
                                            <th className="px-4 py-3 font-medium">When</th>
                                            <th className="px-4 py-3 font-medium">Problem</th>
                                            <th className="px-4 py-3 font-medium">Lang</th>
                                            <th className="px-4 py-3 font-medium">Verdict</th>
                                            <th className="px-4 py-3 font-medium">Time</th>
                                            <th className="px-4 py-3 font-medium">Memory</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.map((sub) => (
                                            <tr
                                                key={sub.id}
                                                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                                onClick={() => viewSubmissionCode(sub.id)}
                                            >
                                                <td className="px-4 py-3 text-[#666]">{sub.id}</td>
                                                <td className="px-4 py-3 text-[#808080] whitespace-nowrap">
                                                    {formatDate(sub.submittedAt)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[#E8C15A] font-medium">{sub.problemId}</span>
                                                    <span className="text-[#808080] ml-2">- {sub.problemTitle}</span>
                                                </td>
                                                <td className="px-4 py-3 text-[#666] text-xs">{sub.language}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`flex items-center gap-1.5 font-medium ${getVerdictStyle(sub.verdict)}`}>
                                                        {getVerdictIcon(sub.verdict)}
                                                        {sub.verdict}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[#808080]">
                                                    {sub.timeMs ? `${sub.timeMs} ms` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-[#808080]">
                                                    {sub.memoryKb ? `${Math.round(sub.memoryKb / 1024)} KB` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Code Viewer Modal */}
            {(selectedSubmission || loadingCode) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedSubmission(null)}>
                    <div
                        className="bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl w-[90%] max-w-3xl max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {loadingCode ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="animate-spin text-[#E8C15A]" size={40} />
                            </div>
                        ) : selectedSubmission && (
                            <>
                                {/* Modal Header */}
                                <div className="flex items-center justify-between p-4 border-b border-white/10">
                                    <div>
                                        <h3 className="font-bold text-white">Submission #{selectedSubmission.id}</h3>
                                        <p className="text-xs text-[#666] mt-1">
                                            {selectedSubmission.problemTitle} • Attempt #{selectedSubmission.attemptNumber}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedSubmission.verdict === 'Accepted'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {selectedSubmission.verdict}
                                        </span>
                                        <button
                                            onClick={() => setSelectedSubmission(null)}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[#666] hover:text-white"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                {/* Code Content */}
                                <div className="flex-1 overflow-auto p-4 bg-[#0a0a0a]">
                                    <pre
                                        className="font-mono text-sm leading-6 text-[#D4D4D4]"
                                        dangerouslySetInnerHTML={{ __html: highlightCpp(selectedSubmission.sourceCode) }}
                                    />
                                </div>
                                {/* Modal Footer */}
                                <div className="flex items-center justify-between p-4 border-t border-white/10">
                                    <span className="text-xs text-[#666]">
                                        {new Date(selectedSubmission.submittedAt).toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => setSelectedSubmission(null)}
                                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
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
