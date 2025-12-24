'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Editor } from '@monaco-editor/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Clock, HardDrive, CheckCircle2, Loader2, Lock, List, FileText, XCircle, AlertTriangle, Users, Filter, ArrowUpDown, ChevronDown } from 'lucide-react';
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

    // Use VS Code Dark+ colors
    html = html.replace(/(\/\/[^\n]*)/g, (m) => tokenize(m, '#6A9955')); // Comments
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => tokenize(m, '#6A9955')); // Block comments
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, (m) => tokenize(m, '#CE9178')); // Strings
    html = html.replace(/('#?.)/g, (m) => tokenize(m, '#b5cea8')); // Chars/Numbers

    // Control flow keywords (Purple)
    html = html.replace(/\b(if|else|for|while|return|switch|case|break|continue|do)\b/g, (m) => tokenize(m, '#C586C0'));

    // Types and definitions (Blue)
    html = html.replace(/\b(int|long|double|float|char|void|bool|auto|const|static|struct|class|namespace|using|template|typename|private|public|protected)\b/g, (m) => tokenize(m, '#569CD6'));

    // STL types (Teal)
    html = html.replace(/\b(vector|string|map|set|stack|queue|deque|pair|cin|cout|endl)\b/g, (m) => tokenize(m, '#4EC9B0'));

    // Macros (Blue/Purple mix)
    html = html.replace(/#\s*(include|define|ifdef|ifndef|endif)\b/g, (m) => tokenize(m, '#C586C0'));

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
    const [submissionsPage, setSubmissionsPage] = useState(1);
    const [hasMoreSubmissions, setHasMoreSubmissions] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<{
        id: number;
        verdict: string;
        sourceCode: string;
        submittedAt: string;
        attemptNumber: number;
        problemTitle: string;
    } | null>(null);
    const [loadingCode, setLoadingCode] = useState(false);

    // Filter and Sort state
    const [verdictFilter, setVerdictFilter] = useState<'all' | 'accepted' | 'wrong'>('all');
    const [problemFilter, setProblemFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'time' | 'memory' | 'problem'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Computed filtered and sorted submissions
    const filteredSubmissions = useMemo(() => {
        let result = [...submissions];

        // Apply verdict filter
        if (verdictFilter === 'accepted') {
            result = result.filter(s => s.verdict === 'Accepted');
        } else if (verdictFilter === 'wrong') {
            result = result.filter(s => s.verdict !== 'Accepted');
        }

        // Apply problem filter
        if (problemFilter !== 'all') {
            result = result.filter(s => s.problemId === problemFilter);
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
                    break;
                case 'time':
                    comparison = (a.timeMs || 0) - (b.timeMs || 0);
                    break;
                case 'memory':
                    comparison = (a.memoryKb || 0) - (b.memoryKb || 0);
                    break;
                case 'problem':
                    comparison = a.problemId.localeCompare(b.problemId);
                    break;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });

        return result;
    }, [submissions, verdictFilter, problemFilter, sortBy, sortOrder]);

    // Get unique problem IDs for filter dropdown
    const uniqueProblems = useMemo(() => {
        const ids = new Set(submissions.map(s => s.problemId));
        return Array.from(ids).sort();
    }, [submissions]);

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
    // Strategy: Show cached data instantly, then fetch fresh from smart endpoint
    useEffect(() => {
        const fetchSolvedProblems = async () => {
            if (!user) return;

            // Step 1: Load from localStorage immediately for instant UI
            const cachedSolved = localStorage.getItem(`solved-${sheetId}`);
            if (cachedSolved) {
                try {
                    setSolvedProblems(new Set(JSON.parse(cachedSolved)));
                } catch (e) {
                    console.error('Failed to parse cached solved problems:', e);
                }
            }

            // Step 2: Fetch solved problem IDs from SMART endpoint (efficient)
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch(`/api/sheets/solved?sheetId=${sheetId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store'
                });
                if (res.ok) {
                    const data = await res.json();
                    const solvedIds = new Set<string>(data.solvedProblemIds || []);
                    setSolvedProblems(solvedIds);
                    localStorage.setItem(`solved-${sheetId}`, JSON.stringify([...solvedIds]));
                }
            } catch (error) {
                console.error('Failed to fetch solved problems:', error);
            }
        };

        fetchSolvedProblems();
    }, [sheetId, user]);

    // Fetch submissions for the submissions tab (separate concern)
    useEffect(() => {
        const fetchSubmissions = async () => {
            if (!user) return;
            setSubmissionsLoading(true);
            setSubmissionsPage(1);
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch(`/api/submissions?sheetId=${sheetId}&limit=50&page=1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSubmissions(data.submissions || []);
                    setHasMoreSubmissions(data.pagination?.page < data.pagination?.totalPages);
                }
            } catch (error) {
                console.error('Failed to fetch submissions:', error);
            } finally {
                setSubmissionsLoading(false);
            }
        };

        fetchSubmissions();
    }, [sheetId, user]);

    // Load more submissions handler
    const loadMoreSubmissions = async () => {
        if (loadingMore || !hasMoreSubmissions) return;
        setLoadingMore(true);
        const nextPage = submissionsPage + 1;
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/submissions?sheetId=${sheetId}&limit=50&page=${nextPage}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSubmissions(prev => [...prev, ...(data.submissions || [])]);
                setSubmissionsPage(nextPage);
                setHasMoreSubmissions(data.pagination?.page < data.pagination?.totalPages);
            }
        } catch (error) {
            console.error('Failed to load more submissions:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    // Use cached submissions when switching to submissions tab (no refetch needed)
    useEffect(() => {
        // Data already loaded in the first useEffect above
        // No need to fetch again when switching tabs
    }, [activeTab]);

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
                                        prefetch={false}
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
                            <>
                                {/* Filter & Sort Toolbar */}
                                <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/10 bg-[#0d0d0d]">
                                    {/* Filter Icon */}
                                    <div className="flex items-center gap-2 text-[#666]">
                                        <Filter size={16} />
                                        <span className="text-xs font-medium">Filter:</span>
                                    </div>

                                    {/* Verdict Filter */}
                                    <select
                                        value={verdictFilter}
                                        onChange={(e) => setVerdictFilter(e.target.value as 'all' | 'accepted' | 'wrong')}
                                        className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E8C15A]/50 cursor-pointer"
                                    >
                                        <option value="all">All Verdicts</option>
                                        <option value="accepted">✓ Accepted</option>
                                        <option value="wrong">✗ Wrong</option>
                                    </select>

                                    {/* Problem Filter */}
                                    <select
                                        value={problemFilter}
                                        onChange={(e) => setProblemFilter(e.target.value)}
                                        className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E8C15A]/50 cursor-pointer"
                                    >
                                        <option value="all">All Problems</option>
                                        {uniqueProblems.map(p => (
                                            <option key={p} value={p}>Problem {p}</option>
                                        ))}
                                    </select>

                                    {/* Divider */}
                                    <div className="w-px h-6 bg-white/10 mx-1" />

                                    {/* Sort Icon */}
                                    <div className="flex items-center gap-2 text-[#666]">
                                        <ArrowUpDown size={16} />
                                        <span className="text-xs font-medium">Sort:</span>
                                    </div>

                                    {/* Sort By */}
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as 'date' | 'time' | 'memory' | 'problem')}
                                        className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E8C15A]/50 cursor-pointer"
                                    >
                                        <option value="date">Date</option>
                                        <option value="time">Runtime (ms)</option>
                                        <option value="memory">Memory (KB)</option>
                                        <option value="problem">Problem ID</option>
                                    </select>

                                    {/* Sort Order Toggle */}
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors text-xs ${sortOrder === 'desc'
                                            ? 'bg-[#E8C15A]/10 border-[#E8C15A]/30 text-[#E8C15A]'
                                            : 'bg-white/5 border-white/10 text-[#888]'
                                            }`}
                                    >
                                        {sortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
                                    </button>

                                    {/* Results Count */}
                                    <div className="ml-auto text-xs text-[#666]">
                                        {filteredSubmissions.length} of {submissions.length} submissions
                                    </div>
                                </div>

                                {/* Table */}
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
                                            {filteredSubmissions.map((sub) => (
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
                                    {/* Load More Button */}
                                    {hasMoreSubmissions && (
                                        <div className="flex justify-center py-4 border-t border-white/5">
                                            <button
                                                onClick={loadMoreSubmissions}
                                                disabled={loadingMore}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-[#888] hover:text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                                            >
                                                {loadingMore ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        Loading...
                                                    </>
                                                ) : (
                                                    'Load More Submissions'
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Code Viewer Modal */}
            {(selectedSubmission || loadingCode) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedSubmission(null)}>
                    <div
                        className="bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl w-[98%] h-[90vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {loadingCode ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[#888]">
                                <Loader2 className="animate-spin text-[#E8C15A]" size={40} />
                                <span className="text-sm">Fetching source code...</span>
                            </div>
                        ) : selectedSubmission && (
                            <>
                                {/* Modal Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-[#1a1a1a]">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Submission #{selectedSubmission.id}</h3>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-[#888]">
                                            <span>{selectedSubmission.problemTitle}</span>
                                            <span>•</span>
                                            <span>Attempt #{selectedSubmission.attemptNumber}</span>
                                            <span>•</span>
                                            <span>{new Date(selectedSubmission.submittedAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${selectedSubmission.verdict === 'Accepted'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {selectedSubmission.verdict}
                                        </span>
                                        <button
                                            onClick={() => setSelectedSubmission(null)}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[#888] hover:text-white"
                                        >
                                            <XCircle size={24} />
                                        </button>
                                    </div>
                                </div>

                                {/* Code Content - Monaco Editor */}
                                <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
                                    <Editor
                                        height="100%"
                                        defaultLanguage="cpp"
                                        theme="vs-dark"
                                        value={selectedSubmission.sourceCode}
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            renderLineHighlight: 'none',
                                            padding: { top: 32, bottom: 32 },
                                        }}
                                    />
                                </div>

                                {/* Modal Footer */}
                                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 flex-shrink-0 bg-[#1a1a1a]">
                                    <div className="text-sm text-[#666]">
                                        Read-only mode
                                    </div>
                                    <button
                                        onClick={() => setSelectedSubmission(null)}
                                        className="px-6 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
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
