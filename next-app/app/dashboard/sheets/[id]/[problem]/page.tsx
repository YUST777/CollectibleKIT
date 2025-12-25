'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Editor, OnMount } from '@monaco-editor/react';
import { useAuth } from '@/contexts/AuthContext';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    HardDrive,
    Play,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Copy,
    Check,
    FileText,
    History,
    Maximize2,
    Minimize2,
    BarChart2,
    Trophy,
    Sparkles,
    Database,
    Zap,
    X,
    Brain,
    Code2,
    Terminal,
    CloudUpload
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1a1a1a] border border-white/10 p-3 rounded-lg shadow-xl">
                <p className="text-white font-medium mb-1">{`Range: ${label}`}</p>
                <p className="text-[#E8C15A]">{`Count: ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};

interface Example {
    input: string;
    output: string;
}

interface Problem {
    id: string;
    title: string;
    timeLimit: number;
    memoryLimit: number;
    statement: string;
    inputFormat: string;
    outputFormat: string;
    examples: Example[];
    testCases?: Example[];
    note?: string;
}

interface SubmissionResult {
    submissionId?: number;
    verdict: string;
    passed: boolean;
    testsPassed: number;
    totalTests: number;
    time?: string;
    memory?: string;
    attemptNumber?: number;
    results: Array<{
        testCase: number;
        verdict: string;
        passed: boolean;
        time?: string;
        memory?: string;
        output?: string;
        compileError?: string;
        runtimeError?: string;
    }>;
}

const DEFAULT_CODE = `#include <iostream>
using namespace std;

int main() {
    // Your code here
    
    return 0;
}
`;

export default function ProblemPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const sheetId = params.id as string;
    const problemId = params.problem as string;

    const [problem, setProblem] = useState<Problem | null>(null);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState(DEFAULT_CODE);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<SubmissionResult | null>(null);
    const [copiedExample, setCopiedExample] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'description' | 'submissions' | 'analytics'>('description');
    const [hasSubmitted, setHasSubmitted] = useState(false); // Track if user has submitted at least once

    // Analytics State
    const [stats, setStats] = useState<{
        runtimeDistribution: any[];
        memoryDistribution: any[];
        totalSubmissions: number;
        userStats: {
            runtime: { value: number; percentile: number };
            memory: { value: number; percentile: number };
        } | null;
    } | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    // Complexity Analysis State
    const [complexityResult, setComplexityResult] = useState<{
        timeComplexity: string;
        spaceComplexity: string;
        explanation: string;
    } | null>(null);
    const [complexityLoading, setComplexityLoading] = useState(false);
    const [showComplexityModal, setShowComplexityModal] = useState(false);

    const [leftPanelWidth, setLeftPanelWidth] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const [mobileView, setMobileView] = useState<'problem' | 'code'>('problem');
    const [submissions, setSubmissions] = useState<Array<{
        id: number;
        verdict: string;
        timeMs: number;
        memoryKb: number;
        testsPassed: number;
        totalTests: number;
        submittedAt: string;
        attemptNumber: number;
        sourceCode?: string;
    }>>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<{
        id: number;
        verdict: string;
        sourceCode: string;
        submittedAt: string;
        attemptNumber: number;
    } | null>(null);
    const [loadingCode, setLoadingCode] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    // Vertical split panel state (Test Cases Panel)
    const [testPanelHeight, setTestPanelHeight] = useState(35); // percentage
    const [isTestPanelVisible, setIsTestPanelVisible] = useState(true); // Always visible
    const [isResizingVertical, setIsResizingVertical] = useState(false);
    const [testPanelTab, setTestPanelTab] = useState<'testcase' | 'result'>('testcase');
    const [selectedTestCase, setSelectedTestCase] = useState(0);
    const [testCases, setTestCases] = useState<Array<{ input: string; expectedOutput: string }>>([]);

    // Behavior tracking
    const [tabSwitches, setTabSwitches] = useState(0);
    const [pasteEvents, setPasteEvents] = useState(0);
    const problemOpenTime = useRef<number>(Date.now());
    const editorRef = useRef<any>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        editor.onDidPaste(() => {
            setPasteEvents(prev => prev + 1);
        });
    };

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                const res = await fetch(`/api/training-sheets/${sheetId}/${problemId}`);
                if (res.ok) {
                    const data = await res.json();
                    setProblem(data.problem);
                    // Populate test cases for the test panel
                    // Prefer full test cases if available, otherwise fallback to examples
                    const casesToDisplay = data.problem.testCases || data.problem.examples;
                    if (casesToDisplay) {
                        setTestCases(casesToDisplay.map((ex: any) => ({
                            input: ex.input,
                            expectedOutput: ex.output || ex.expectedOutput // Handle both naming conventions
                        })));
                    }
                } else {
                    router.push(`/dashboard/sheets/${sheetId}`);
                }
            } catch (error) {
                console.error('Failed to fetch problem:', error);
            } finally {
                setLoading(false);
            }
        };

        // Check if user has existing submissions for this problem
        const checkExistingSubmissions = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) return;

                const res = await fetch(`/api/submissions?sheetId=${sheetId}&problemId=${problemId}&limit=1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.submissions && data.submissions.length > 0) {
                        setHasSubmitted(true);
                    }
                }
            } catch (error) {
                console.error('Failed to check submissions:', error);
            }
        };

        const savedCode = localStorage.getItem(`code-${sheetId}-${problemId}`);
        if (savedCode) {
            setCode(savedCode);
        }

        problemOpenTime.current = Date.now();
        setTabSwitches(0);
        setPasteEvents(0);

        fetchProblem();
        checkExistingSubmissions();
    }, [sheetId, problemId, router]);

    // Fetch Stats
    useEffect(() => {
        if (activeTab === 'analytics' && user) {
            fetchStats();
        }
    }, [activeTab, user]);

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/stats/distribution?sheetId=${sheetId}&problemId=${problemId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const analyzeComplexity = async () => {
        setComplexityLoading(true);
        setShowComplexityModal(true);
        setComplexityResult(null);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/analyze-complexity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sheetId, problemId })
            });
            if (res.ok) {
                const data = await res.json();
                setComplexityResult(data);
            } else {
                const errorData = await res.json();
                console.error('Complexity analysis failed:', errorData);
                setComplexityResult({
                    timeComplexity: 'Error',
                    spaceComplexity: 'Error',
                    explanation: errorData.error || 'Failed to analyze complexity'
                });
            }
        } catch (error) {
            console.error('Failed to analyze complexity:', error);
            setComplexityResult({
                timeComplexity: 'Error',
                spaceComplexity: 'Error',
                explanation: 'Network error - please try again'
            });
        } finally {
            setComplexityLoading(false);
        }
    };

    // Track tab switches
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitches(prev => prev + 1);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    // Fetch submissions when tab changes to submissions
    useEffect(() => {
        if (activeTab === 'submissions' && user) {
            fetchSubmissions();
        }
    }, [activeTab, user]);

    const fetchSubmissions = async () => {
        setSubmissionsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/submissions?sheetId=${sheetId}&problemId=${problemId}`, {
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
                    attemptNumber: sub.attemptNumber
                });
            }
        } catch (error) {
            console.error('Failed to fetch submission code:', error);
        } finally {
            setLoadingCode(false);
        }
    };

    useEffect(() => {
        if (code !== DEFAULT_CODE) {
            localStorage.setItem(`code-${sheetId}-${problemId}`, code);
        }
    }, [code, sheetId, problemId]);

    // Resizer handlers
    const handleMouseDown = () => {
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            if (newWidth >= 25 && newWidth <= 75) {
                setLeftPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Vertical resize handlers (for test case panel)
    const handleVerticalMouseDown = () => {
        setIsResizingVertical(true);
    };

    useEffect(() => {
        const handleVerticalMouseMove = (e: MouseEvent) => {
            if (!isResizingVertical || !editorContainerRef.current) return;
            const containerRect = editorContainerRef.current.getBoundingClientRect();
            const newHeight = ((containerRect.bottom - e.clientY) / containerRect.height) * 100;
            if (newHeight >= 15 && newHeight <= 60) {
                setTestPanelHeight(newHeight);
            }
        };

        const handleVerticalMouseUp = () => {
            setIsResizingVertical(false);
        };

        if (isResizingVertical) {
            document.addEventListener('mousemove', handleVerticalMouseMove);
            document.addEventListener('mouseup', handleVerticalMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleVerticalMouseMove);
            document.removeEventListener('mouseup', handleVerticalMouseUp);
        };
    }, [isResizingVertical]);

    const handleSubmit = async () => {
        if (!code.trim() || submitting) return;

        setSubmitting(true);
        setResult(null);

        const timeToSolve = Math.round((Date.now() - problemOpenTime.current) / 1000);

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/judge/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    sheetId,
                    problemId,
                    sourceCode: code,
                    tabSwitches,
                    pasteEvents,
                    timeToSolve,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setResult(data);

                // Auto-open test panel and switch to result tab
                setIsTestPanelVisible(true);
                setTestPanelTab('result');

                if (data.passed) {
                    const key = `solved-${sheetId}`;
                    const saved = localStorage.getItem(key);
                    const solved = saved ? new Set(JSON.parse(saved)) : new Set();
                    solved.add(problemId);
                    localStorage.setItem(key, JSON.stringify([...solved]));
                }
            } else {
                setResult({
                    verdict: data.error || 'Submission Error',
                    passed: false,
                    testsPassed: 0,
                    totalTests: 0,
                    results: [],
                });
                // Also open panel on error to show verdict
                setIsTestPanelVisible(true);
                setTestPanelTab('result');
            }
        } catch (error) {
            console.error('Submission error:', error);
            setResult({
                verdict: 'Network Error',
                passed: false,
                testsPassed: 0,
                totalTests: 0,
                results: [],
            });
        } finally {
            setSubmitting(false);
            setHasSubmitted(true); // Mark that user has submitted at least once
        }
    };

    const copyToClipboard = async (text: string, index: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedExample(index);
        setTimeout(() => setCopiedExample(null), 2000);
    };

    const getVerdictColor = (verdict: string) => {
        if (verdict === 'Accepted') return 'text-green-400 bg-green-400/10 border-green-400/30';
        if (verdict.includes('Wrong')) return 'text-red-400 bg-red-400/10 border-red-400/30';
        if (verdict.includes('Time')) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
        if (verdict.includes('Memory')) return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
        if (verdict.includes('Compilation')) return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
        if (verdict.includes('Runtime')) return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    };

    const getVerdictIcon = (verdict: string) => {
        if (verdict === 'Accepted') return <CheckCircle2 size={18} className="text-green-400" />;
        if (verdict.includes('Wrong')) return <XCircle size={18} className="text-red-400" />;
        if (verdict.includes('Time')) return <Clock size={18} className="text-yellow-400" />;
        if (verdict.includes('Memory')) return <Database size={18} className="text-blue-400" />;
        if (verdict.includes('Compilation')) return <AlertTriangle size={18} className="text-orange-400" />;
        if (verdict.includes('Runtime')) return <Zap size={18} className="text-purple-400" />;
        return <AlertTriangle size={18} className="text-gray-400" />;
    };

    // Get short verdict code like Codeforces
    const getVerdictShort = (verdict: string) => {
        if (verdict === 'Accepted') return 'AC';
        if (verdict.includes('Wrong')) return 'WA';
        if (verdict.includes('Time')) return 'TLE';
        if (verdict.includes('Memory')) return 'MLE';
        if (verdict.includes('Compilation')) return 'CE';
        if (verdict.includes('Runtime')) return 'RE';
        return verdict;
    };

    if (authLoading || loading) {
        return (
            <div className="fixed inset-0 bg-[#0B0B0C] flex items-center justify-center z-50">
                <Loader2 className="animate-spin text-[#E8C15A]" size={48} />
            </div>
        );
    }

    if (!problem) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-[#0B0B0C] text-[#DCDCDC] z-50 flex flex-col">
            {/* Top Navbar - LeetCode Style */}
            <header className="h-10 bg-[#1a1a1a] border-b border-white/10 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/sheets/${sheetId}`} className="flex items-center gap-2 text-[#A0A0A0] hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                        <span className="text-sm font-medium hidden sm:inline">Back</span>
                    </Link>
                    <div className="h-5 w-px bg-white/10"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[#E8C15A] font-bold">{problem.id}.</span>
                        <span className="font-medium text-white hidden sm:inline">{problem.title}</span>
                        <span className="font-medium text-white sm:hidden">{problem.id}</span>
                    </div>
                    {/* Problem Navigation */}
                    <div className="flex items-center gap-1 ml-2">
                        {problem.id !== 'A' && (
                            <Link
                                href={`/dashboard/sheets/${sheetId}/${String.fromCharCode(problem.id.charCodeAt(0) - 1)}`}
                                className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-[#666] hover:text-white transition-colors"
                                title="Previous Problem"
                            >
                                <ChevronLeft size={18} />
                            </Link>
                        )}
                        {problem.id !== 'Z' && (
                            <Link
                                href={`/dashboard/sheets/${sheetId}/${String.fromCharCode(problem.id.charCodeAt(0) + 1)}`}
                                className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 text-[#666] hover:text-white transition-colors"
                                title="Next Problem"
                            >
                                <ChevronRight size={18} />
                            </Link>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-xs text-[#666]">
                        <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {problem.timeLimit / 1000}s
                        </span>
                        <span className="flex items-center gap-1">
                            <HardDrive size={12} />
                            {problem.memoryLimit}MB
                        </span>
                    </div>
                    <Link href={`/dashboard/sheets/${sheetId}`} className="flex items-center justify-center">
                        <Image src="/icpchue-logo.webp" alt="ICPCHUE" width={36} height={36} className="opacity-90 hover:opacity-100 transition-opacity" />
                    </Link>
                </div>
            </header>

            {/* Mobile View Toggle - Only visible on mobile */}
            <div className="md:hidden flex bg-[#1a1a1a] border-b border-white/10">
                <button
                    onClick={() => setMobileView('problem')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mobileView === 'problem'
                        ? 'text-white bg-[#121212] border-b-2 border-[#E8C15A]'
                        : 'text-[#666]'
                        }`}
                >
                    <FileText size={16} />
                    Problem
                </button>
                <button
                    onClick={() => setMobileView('code')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mobileView === 'code'
                        ? 'text-white bg-[#0a0a0a] border-b-2 border-[#E8C15A]'
                        : 'text-[#666]'
                        }`}
                >
                    <Code2 size={16} />
                    Code
                </button>
            </div>

            {/* Main Split Panel - Desktop: side-by-side, Mobile: toggle */}
            <div ref={containerRef} className="flex-1 flex overflow-hidden" style={{ cursor: isResizing ? 'col-resize' : 'auto' }}>
                {/* Left Panel - Problem Description (hidden on mobile when code view is active) */}
                <div
                    className={`problem-panel flex flex-col bg-[#121212] ${mobileView === 'code' ? 'hidden md:flex' : 'flex'}`}
                >
                    {/* Tabs - Description/Submissions/Analytics */}
                    <div className="flex border-b border-white/10 bg-[#1a1a1a] overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('description')}
                            className={`flex items-center gap-2 px-6 py-3 text-xs font-medium transition-colors ${activeTab === 'description'
                                ? 'text-white border-b-2 border-[#E8C15A] bg-[#121212]'
                                : 'text-[#666] hover:text-[#A0A0A0]'
                                }`}
                        >
                            <FileText size={14} />
                            Description
                        </button>
                        <button
                            onClick={() => setActiveTab('submissions')}
                            className={`flex items-center gap-2 px-6 py-3 text-xs font-medium transition-colors ${activeTab === 'submissions'
                                ? 'text-white border-b-2 border-[#E8C15A] bg-[#121212]'
                                : 'text-[#666] hover:text-[#A0A0A0]'
                                }`}
                        >
                            <History size={14} />
                            Submissions
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`flex items-center gap-2 px-6 py-3 text-xs font-medium transition-colors ${activeTab === 'analytics'
                                ? 'text-white border-b-2 border-[#E8C15A] bg-[#121212]'
                                : 'text-[#666] hover:text-[#A0A0A0]'
                                }`}
                        >
                            <BarChart2 size={14} />
                            Analytics
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                        {activeTab === 'description' ? (
                            <>
                                {/* Statement */}
                                <div>
                                    <h2 className="text-base font-bold text-[#F2F2F2] mb-3">Problem Statement</h2>
                                    <div className="text-sm text-[#A0A0A0] leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{
                                        __html: problem.statement
                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#F2F2F2]">$1</strong>')
                                            .replace(/```cpp([\s\S]*?)```/g, '<pre class="bg-black/50 rounded-lg p-3 text-green-400 text-xs overflow-x-auto my-2"><code>$1</code></pre>')
                                            .replace(/`(.*?)`/g, '<code class="bg-black/50 px-1.5 py-0.5 rounded text-[#E8C15A] text-xs">$1</code>')
                                    }} />
                                </div>

                                {/* Input/Output */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-[#1a1a1a] rounded-lg border border-white/5">
                                        <h3 className="text-xs font-bold text-[#E8C15A] mb-2">Input</h3>
                                        <p className="text-sm text-[#A0A0A0]">{problem.inputFormat}</p>
                                    </div>
                                    <div className="p-4 bg-[#1a1a1a] rounded-lg border border-white/5">
                                        <h3 className="text-xs font-bold text-[#E8C15A] mb-2">Output</h3>
                                        <p className="text-sm text-[#A0A0A0] whitespace-pre-wrap">{problem.outputFormat}</p>
                                    </div>
                                </div>

                                {/* Examples */}
                                {problem.examples.map((example, index) => (
                                    <div key={index} className="bg-[#1a1a1a] rounded-lg border border-white/5 overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                                            <span className="text-xs font-bold text-[#F2F2F2]">Example {index + 1}</span>
                                            <button
                                                onClick={() => copyToClipboard(example.input, index)}
                                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                            >
                                                {copiedExample === index ? (
                                                    <Check size={12} className="text-green-400" />
                                                ) : (
                                                    <Copy size={12} className="text-[#666]" />
                                                )}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 divide-x divide-white/5">
                                            <div className="p-3">
                                                <span className="text-[10px] font-bold text-[#666] block mb-1">INPUT</span>
                                                <pre className="font-mono text-xs text-[#A0A0A0]">{example.input}</pre>
                                            </div>
                                            <div className="p-3">
                                                <span className="text-[10px] font-bold text-[#666] block mb-1">OUTPUT</span>
                                                <pre className="font-mono text-xs text-[#A0A0A0]">{example.output}</pre>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Note */}
                                {problem.note && (
                                    <div className="p-4 bg-[#E8C15A]/10 rounded-lg border border-[#E8C15A]/20">
                                        <span className="text-xs font-bold text-[#E8C15A] block mb-1">Note</span>
                                        <p className="text-sm text-[#A0A0A0]">{problem.note}</p>
                                    </div>
                                )}
                            </>
                        ) : activeTab === 'submissions' ? (
                            submissionsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-[#E8C15A]" size={32} />
                                </div>
                            ) : submissions.length === 0 ? (
                                <div className="text-center py-12 text-[#666]">
                                    <History size={40} className="mx-auto mb-3 opacity-50" />
                                    <p>No submissions for this problem yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {submissions.map((sub) => (
                                        <div
                                            key={sub.id}
                                            onClick={() => viewSubmissionCode(sub.id)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${sub.verdict === 'Accepted'
                                                ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/15'
                                                : 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`font-medium text-sm ${sub.verdict === 'Accepted' ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                    {sub.verdict}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[#666]">
                                                        Attempt #{sub.attemptNumber}
                                                    </span>
                                                    <span className="text-xs text-[#E8C15A] hover:underline">View Code →</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-[#808080]">
                                                <span>{sub.timeMs ? `${sub.timeMs}ms` : '-'}</span>
                                                <span>{sub.memoryKb ? `${Math.round(sub.memoryKb / 1024)}KB` : '-'}</span>
                                                <span>{sub.testsPassed}/{sub.totalTests} passed</span>
                                                <span className="ml-auto">
                                                    {new Date(sub.submittedAt).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            statsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-[#E8C15A]" size={32} />
                                </div>
                            ) : !stats || stats.totalSubmissions === 0 ? (
                                <div className="text-center py-16 text-[#666]">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center border border-white/5">
                                        <BarChart2 size={32} className="opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">No accepted submissions to analyze yet</p>
                                    <p className="text-xs text-[#444] mt-1">Submit a solution to see your analytics</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Runtime Card */}
                                    <div className="relative rounded-2xl overflow-hidden">
                                        {/* Gradient Background */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />

                                        <div className="relative bg-[#1a1a1a]/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
                                                        <Clock size={20} className="text-emerald-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-white">Runtime</h3>
                                                        <p className="text-xs text-[#666]">{stats.totalSubmissions} submissions analyzed</p>
                                                    </div>
                                                </div>
                                                <button onClick={analyzeComplexity} disabled={complexityLoading} className="flex items-center gap-2 px-3 py-1.5 bg-[#E8C15A]/10 hover:bg-[#E8C15A]/20 border border-[#E8C15A]/20 rounded-lg text-xs font-medium text-[#E8C15A] transition-all hover:scale-105 disabled:opacity-50">
                                                    {complexityLoading ? <Loader2 size={12} className="animate-spin" /> : <div className="w-1.5 h-1.5 rounded-full bg-[#E8C15A] animate-pulse" />}
                                                    Analyze Complexity
                                                </button>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="flex items-end gap-4 mb-6">
                                                <div>
                                                    <span className="text-4xl font-bold text-white tracking-tight">
                                                        {stats.userStats?.runtime.value ?? 0}
                                                    </span>
                                                    <span className="text-lg text-[#666] ml-1">ms</span>
                                                </div>
                                                {stats.userStats?.runtime.percentile !== undefined && (
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="text-sm font-semibold text-emerald-400">
                                                            Beats {Math.round(stats.userStats.runtime.percentile)}%
                                                        </span>
                                                        <Sparkles size={16} className="text-emerald-400" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Progress Bar */}
                                            {stats.userStats?.runtime.percentile !== undefined && (
                                                <div className="mb-6">
                                                    <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                                                            style={{ width: `${Math.round(stats.userStats.runtime.percentile)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between mt-1 text-[10px] text-[#444]">
                                                        <span>Slower</span>
                                                        <span>Faster</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Chart */}
                                            <div className="h-32 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={stats.runtimeDistribution} margin={{ top: 5, right: 5, bottom: 20, left: -20 }}>
                                                        <XAxis
                                                            dataKey="label"
                                                            stroke="#444"
                                                            fontSize={9}
                                                            tickLine={false}
                                                            axisLine={false}
                                                            interval="preserveStartEnd"
                                                        />
                                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                                        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                                            {stats.runtimeDistribution.map((entry: any, index: number) => (
                                                                <Cell
                                                                    key={`cell-${index}`}
                                                                    fill={entry.isUser ? '#10B981' : '#10B981'}
                                                                    fillOpacity={entry.isUser ? 1 : 0.25}
                                                                    stroke={entry.isUser ? '#10B981' : 'transparent'}
                                                                    strokeWidth={entry.isUser ? 2 : 0}
                                                                />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Memory Card */}
                                    <div className="relative rounded-2xl overflow-hidden">
                                        {/* Gradient Background */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />

                                        <div className="relative bg-[#1a1a1a]/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center border border-blue-500/20">
                                                        <HardDrive size={20} className="text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-white">Memory</h3>
                                                        <p className="text-xs text-[#666]">Lower is better</p>
                                                    </div>
                                                </div>
                                                <button onClick={analyzeComplexity} disabled={complexityLoading} className="flex items-center gap-2 px-3 py-1.5 bg-[#E8C15A]/10 hover:bg-[#E8C15A]/20 border border-[#E8C15A]/20 rounded-lg text-xs font-medium text-[#E8C15A] transition-all hover:scale-105 disabled:opacity-50">
                                                    {complexityLoading ? <Loader2 size={12} className="animate-spin" /> : <div className="w-1.5 h-1.5 rounded-full bg-[#E8C15A] animate-pulse" />}
                                                    Analyze Complexity
                                                </button>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="flex items-end gap-4 mb-6">
                                                <div>
                                                    <span className="text-4xl font-bold text-white tracking-tight">
                                                        {stats.userStats?.memory.value ? Math.round(stats.userStats.memory.value / 1024 * 10) / 10 : 0}
                                                    </span>
                                                    <span className="text-lg text-[#666] ml-1">MB</span>
                                                </div>
                                                {stats.userStats?.memory.percentile !== undefined && (
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="text-sm font-semibold text-blue-400">
                                                            Beats {Math.round(stats.userStats.memory.percentile)}%
                                                        </span>
                                                        <Database size={16} className="text-blue-400" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Progress Bar */}
                                            {stats.userStats?.memory.percentile !== undefined && (
                                                <div className="mb-6">
                                                    <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                                                            style={{ width: `${Math.round(stats.userStats.memory.percentile)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between mt-1 text-[10px] text-[#444]">
                                                        <span>More Memory</span>
                                                        <span>Less Memory</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Chart */}
                                            <div className="h-32 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={stats.memoryDistribution} margin={{ top: 5, right: 5, bottom: 20, left: -20 }}>
                                                        <XAxis
                                                            dataKey="label"
                                                            stroke="#444"
                                                            fontSize={9}
                                                            tickLine={false}
                                                            axisLine={false}
                                                            interval="preserveStartEnd"
                                                        />
                                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                                        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                                            {stats.memoryDistribution.map((entry: any, index: number) => (
                                                                <Cell
                                                                    key={`cell-${index}`}
                                                                    fill={entry.isUser ? '#3B82F6' : '#3B82F6'}
                                                                    fillOpacity={entry.isUser ? 1 : 0.25}
                                                                    stroke={entry.isUser ? '#3B82F6' : 'transparent'}
                                                                    strokeWidth={entry.isUser ? 2 : 0}
                                                                />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Footer */}
                                    <div className="bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] rounded-xl border border-white/5 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-[#E8C15A]/10 flex items-center justify-center">
                                                    <BarChart2 size={16} className="text-[#E8C15A]" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-[#666]">Total Submissions Analyzed</p>
                                                    <p className="text-sm font-semibold text-white">{stats.totalSubmissions}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-[#666]">Your Position</p>
                                                <p className="text-sm font-semibold text-[#E8C15A] flex items-center gap-1">Top Performer <Trophy size={14} /></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Resizer - Hidden on mobile */}
                <div
                    className="hidden md:block w-1 bg-white/5 hover:bg-[#E8C15A]/50 cursor-col-resize transition-colors relative group shrink-0"
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute inset-y-0 -left-1 -right-1" />
                </div>

                {/* Right Panel - Code Editor + Test Cases */}
                <div
                    ref={editorContainerRef}
                    className={`flex-1 flex flex-col bg-[#1e1e1e] min-w-0 min-h-0 ${mobileView === 'problem' ? 'hidden md:flex' : 'flex'}`}
                    style={{ cursor: isResizingVertical ? 'row-resize' : 'auto' }}
                >
                    {/* Editor Header - LeetCode Style */}
                    <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">Code</span>
                                <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-[#A0A0A0]">C++</span>
                            </div>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => hasSubmitted && setIsTestPanelVisible(!isTestPanelVisible)}
                                disabled={!hasSubmitted}
                                title={hasSubmitted ? 'Toggle test panel' : 'Submit your code first to see test results'}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isTestPanelVisible
                                    ? 'bg-white/10 text-white'
                                    : hasSubmitted
                                        ? 'text-[#666] hover:bg-white/5 hover:text-[#A0A0A0]'
                                        : 'text-[#444] cursor-not-allowed opacity-50'
                                    }`}
                            >
                                <Terminal size={14} />
                                Testcase
                            </button>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !code.trim()}
                                className="px-4 py-1.5 bg-gradient-to-r from-[#E8C15A] to-[#CFA144] hover:from-[#CFA15A] hover:to-[#B8913A] disabled:from-[#333] disabled:to-[#333] disabled:text-[#666] text-black font-bold rounded-lg transition-all flex items-center gap-2 text-xs"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <CloudUpload size={16} />
                                        Submit
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Code Editor */}
                    <div className="relative min-h-0" style={{ flex: isTestPanelVisible ? `1 1 ${100 - testPanelHeight}%` : '1 1 100%' }}>
                        <div className="absolute inset-0">
                            <Editor
                                height="100%"
                                defaultLanguage="cpp"
                                theme="vs-dark"
                                value={code}
                                onChange={(value) => setCode(value || '')}
                                onMount={handleEditorDidMount}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    padding: { top: 12, bottom: 12 },
                                    fontLigatures: true,
                                    lineNumbers: 'on',
                                    renderLineHighlight: 'all',
                                    suggest: {
                                        filterGraceful: false,
                                        matchOnWordStartOnly: true,
                                        showWords: true,
                                        insertMode: 'replace',
                                    },
                                    quickSuggestions: {
                                        other: true,
                                        comments: false,
                                        strings: false
                                    },
                                }}
                                loading={
                                    <div className="flex items-center justify-center h-full text-[#666]">
                                        Loading Editor...
                                    </div>
                                }
                            />
                        </div>
                    </div>

                    {/* Test Panel Section (Conditional) */}
                    {isTestPanelVisible && (
                        <>
                            {/* Vertical Resizer Bar */}
                            <div
                                className="h-1.5 bg-[#1a1a1a] hover:bg-[#E8C15A]/50 cursor-row-resize transition-colors relative group shrink-0 border-y border-white/5"
                                onMouseDown={handleVerticalMouseDown}
                            >
                                <div className="absolute inset-x-0 -top-1 -bottom-1" />
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-1 bg-white/20 rounded-full group-hover:bg-[#E8C15A]/50 transition-colors" />
                            </div>

                            {/* Test Case Panel */}
                            <div
                                className="bg-[#1a1a1a] flex flex-col min-h-0 shrink-0"
                                style={{ height: `${testPanelHeight}%` }}
                            >
                                {/* Test Panel Tabs - Simplified */}
                                <div className="flex items-center justify-between border-b border-white/10 shrink-0 px-2 bg-[#252526]">
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => setTestPanelTab('testcase')}
                                            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors border-t-2 border-transparent ${testPanelTab === 'testcase'
                                                ? 'text-white border-t-[#E8C15A] bg-[#1e1e1e]'
                                                : 'text-[#666] hover:text-[#A0A0A0]'
                                                }`}
                                        >
                                            <CheckCircle2 size={12} />
                                            Testcase
                                        </button>
                                        <button
                                            onClick={() => setTestPanelTab('result')}
                                            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors border-t-2 border-transparent ${testPanelTab === 'result'
                                                ? 'text-white border-t-[#E8C15A] bg-[#1e1e1e]'
                                                : 'text-[#666] hover:text-[#A0A0A0]'
                                                }`}
                                        >
                                            <Play size={12} />
                                            Test Result
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setIsTestPanelVisible(false)}
                                        className="p-1 text-[#666] hover:text-white transition-colors"
                                    >
                                        <Minimize2 size={14} />
                                    </button>
                                </div>

                                {/* Test Panel Content */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1e1e1e]">
                                    {testPanelTab === 'testcase' ? (
                                        hasSubmitted ? (
                                            <>
                                                {/* Case Tabs */}
                                                <div className="flex items-center gap-2 flex-wrap mb-4">
                                                    {testCases.map((_, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => setSelectedTestCase(index)}
                                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${selectedTestCase === index
                                                                ? 'bg-[#2d2d2d] text-white shadow-sm'
                                                                : 'text-[#666] hover:text-[#A0A0A0] hover:bg-[#2d2d2d]/50'
                                                                }`}
                                                        >
                                                            {result && result.results[index] && (
                                                                result.results[index].passed
                                                                    ? <CheckCircle2 size={12} className="text-green-400" />
                                                                    : <XCircle size={12} className="text-red-400" />
                                                            )}
                                                            Case {index + 1}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Selected Test Case Details */}
                                                {testCases[selectedTestCase] && (
                                                    <div className="space-y-4 animate-fade-in">
                                                        {/* Input */}
                                                        <div>
                                                            <label className="text-xs font-medium text-[#888] mb-2 block uppercase tracking-wider">Input</label>
                                                            <div className="bg-[#2d2d2d] rounded-lg p-4 border border-white/5 font-mono text-sm text-[#d4d4d4] whitespace-pre-wrap leading-relaxed shadow-inner">
                                                                {testCases[selectedTestCase].input}
                                                            </div>
                                                        </div>

                                                        {/* Expected Output */}
                                                        <div>
                                                            <label className="text-xs font-medium text-[#888] mb-2 block uppercase tracking-wider">Expected Output</label>
                                                            <div className="bg-[#2d2d2d] rounded-lg p-4 border border-white/5 font-mono text-sm text-[#d4d4d4] whitespace-pre-wrap leading-relaxed shadow-inner">
                                                                {testCases[selectedTestCase].expectedOutput}
                                                            </div>
                                                        </div>

                                                        {/* Actual Output (from last run) */}
                                                        {result && result.results[selectedTestCase] && (
                                                            <div className="animate-fade-in border-t border-white/5 pt-4 mt-2">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <label className="text-xs font-medium text-[#888] block uppercase tracking-wider">Actual Output</label>
                                                                    <span className={`text-xs font-bold ${result.results[selectedTestCase].passed ? 'text-green-400' : 'text-red-400'}`}>
                                                                        {result.results[selectedTestCase].verdict}
                                                                    </span>
                                                                </div>
                                                                <div className={`bg-[#2d2d2d] rounded-lg p-4 border font-mono text-sm whitespace-pre-wrap leading-relaxed shadow-inner ${result.results[selectedTestCase].passed
                                                                    ? 'border-green-500/20 text-[#d4d4d4]'
                                                                    : 'border-red-500/20 text-red-300'
                                                                    }`}>
                                                                    {result.results[selectedTestCase].output || (
                                                                        <span className="italic opacity-50">No output captured</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            /* Placeholder - Run code first */
                                            <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                    <Play size={28} className="text-[#444]" />
                                                </div>
                                                <p className="text-[#666] text-sm">You must run your code first</p>
                                                <p className="text-[#444] text-xs mt-1">Submit your solution to see test results</p>
                                            </div>
                                        )
                                    ) : (
                                        /* Test Result Tab */
                                        result ? (
                                            <div className="space-y-4 animate-fade-in">
                                                {/* Verdict Header */}
                                                <div className={`flex items-center gap-3 p-4 rounded-xl border ${result.passed
                                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                                    }`}>
                                                    <div className={`p-2 rounded-full ${result.passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                                        {getVerdictIcon(result.verdict)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-lg">{result.verdict}</div>
                                                        <div className="text-xs opacity-70 mt-0.5 font-mono">
                                                            {result.testsPassed}/{result.totalTests} tests passed • {result.time || '0ms'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Compilation/Runtime Errors */}
                                                {result.results[0]?.compileError && (
                                                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg overflow-hidden">
                                                        <div className="px-3 py-2 text-orange-400 text-xs font-medium border-b border-orange-500/20">
                                                            Compilation Error
                                                        </div>
                                                        <pre className="p-3 text-[10px] text-orange-300 max-h-32 overflow-auto whitespace-pre-wrap font-mono">
                                                            {result.results[0].compileError}
                                                        </pre>
                                                    </div>
                                                )}
                                                {result.results[0]?.runtimeError && !result.results[0]?.compileError && (
                                                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg overflow-hidden">
                                                        <div className="px-3 py-2 text-purple-400 text-xs font-medium border-b border-purple-500/20">
                                                            Runtime Error
                                                        </div>
                                                        <pre className="p-3 text-[10px] text-purple-300 max-h-32 overflow-auto whitespace-pre-wrap font-mono">
                                                            {result.results[0].runtimeError}
                                                        </pre>
                                                    </div>
                                                )}

                                                {/* All Test Results List */}
                                                <div className="bg-[#252526] rounded-xl border border-white/5 overflow-hidden">
                                                    {result.results.map((r, i) => (
                                                        <div
                                                            key={r.testCase}
                                                            className={`flex items-center justify-between p-3 text-xs border-b border-white/5 last:border-0 hover:bg-[#2d2d2d] transition-colors ${!r.passed ? 'bg-red-500/5' : ''
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {r.passed
                                                                    ? <CheckCircle2 size={16} className="text-green-500" />
                                                                    : <XCircle size={16} className="text-red-500" />
                                                                }
                                                                <span className="font-medium text-[#d4d4d4]">Test Case {r.testCase}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4 font-mono text-[#888]">
                                                                <span>{r.time || '0ms'}</span>
                                                                <span>{r.memory || '0KB'}</span>
                                                                <span className={`font-bold w-12 text-right ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
                                                                    {getVerdictShort(r.verdict)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-[#666] gap-3">
                                                <div className="w-12 h-12 rounded-full bg-[#2d2d2d] flex items-center justify-center">
                                                    <CloudUpload size={24} className="opacity-50" />
                                                </div>
                                                <p className="text-sm font-medium">Run your code to see results</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Result modal removed - now integrated into test panel */}

            {/* Code Viewer Modal */}
            {
                (selectedSubmission || loadingCode) && (
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
                                    {/* Code Content */}
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
                                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 flex-shrink-0 bg-[#1a1a1a]">
                                        <button
                                            onClick={() => {
                                                setCode(selectedSubmission.sourceCode);
                                                setSelectedSubmission(null);
                                                setActiveTab('description');
                                            }}
                                            className="px-6 py-2.5 bg-[#E8C15A]/20 text-[#E8C15A] rounded-lg hover:bg-[#E8C15A]/30 transition-colors text-sm font-medium"
                                        >
                                            Load to Editor
                                        </button>
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
                )
            }

            {/* Complexity Analysis Modal */}
            {
                showComplexityModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                            onClick={() => setShowComplexityModal(false)}
                        />

                        {/* Modal Content */}
                        <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-slide-up">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8C15A]/20 to-[#CFA144]/10 flex items-center justify-center border border-[#E8C15A]/20">
                                        <Brain size={20} className="text-[#E8C15A]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Complexity Analysis</h3>
                                        <p className="text-xs text-[#666]">Powered by Gemini AI</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowComplexityModal(false)}
                                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                >
                                    <X size={16} className="text-[#888]" />
                                </button>
                            </div>

                            {/* Content */}
                            {complexityLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-[#E8C15A]/20 rounded-full" />
                                        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-[#E8C15A] rounded-full animate-spin" />
                                    </div>
                                    <p className="mt-4 text-[#888] text-sm">Analyzing your code...</p>
                                </div>
                            ) : complexityResult ? (
                                <div className="space-y-6">
                                    {/* Complexity Cards */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Time Complexity */}
                                        <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl" />
                                            <div className="relative">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock size={14} className="text-emerald-400" />
                                                    <span className="text-xs font-medium text-emerald-400/80">Time</span>
                                                </div>
                                                <p className="text-2xl font-bold text-white font-serif italic">
                                                    {complexityResult.timeComplexity}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Space Complexity */}
                                        <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl" />
                                            <div className="relative">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Database size={14} className="text-blue-400" />
                                                    <span className="text-xs font-medium text-blue-400/80">Space</span>
                                                </div>
                                                <p className="text-2xl font-bold text-white font-serif italic">
                                                    {complexityResult.spaceComplexity}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Explanation */}
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap size={14} className="text-yellow-400" />
                                            <span className="text-xs font-medium text-[#888]">Explanation</span>
                                        </div>
                                        <p className="text-sm text-[#ccc] leading-relaxed">
                                            {complexityResult.explanation}
                                        </p>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={() => setShowComplexityModal(false)}
                                        className="w-full py-3 bg-gradient-to-r from-[#E8C15A] to-[#CFA144] hover:from-[#CFA144] hover:to-[#B8913A] text-black font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-[#E8C15A]/20"
                                    >
                                        Got it!
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )
            }

            {/* Responsive styles for problem panel */}
            <style>{`
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up { animation: slide-up 0.2s ease-out forwards; }
                .scrollbar-thin::-webkit-scrollbar { width: 6px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
                .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                .problem-panel {
                    width: 100%;
                    flex: 1;
                }
                @media (min-width: 768px) {
                    .problem-panel {
                        width: ${leftPanelWidth}%;
                        flex: none;
                    }
                }
            `}</style>
        </div>
    );
}
