'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
    ChevronLeft,
    Upload,
    FileCode,
    CheckCircle2,
    Loader2,
    X,
    AlertCircle,
    FileText,
    Check
} from 'lucide-react';

interface SubmissionState {
    file: File | null;
    status: 'pending' | 'ready' | 'success' | 'error';
    message: string;
    submissionId: number | null;
}

interface DifficultyState {
    easy: SubmissionState;
    medium: SubmissionState;
    hard: SubmissionState;
}

export default function DashboardSheetDetail() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated, loading } = useAuth();
    const sheetId = params.id as string;

    const [submissions, setSubmissions] = useState<DifficultyState>({
        easy: { file: null, status: 'pending', message: '', submissionId: null },
        medium: { file: null, status: 'pending', message: '', submissionId: null },
        hard: { file: null, status: 'pending', message: '', submissionId: null }
    });
    const [submitting, setSubmitting] = useState(false);
    const [fetching, setFetching] = useState(true);

    const easyRef = useRef<HTMLInputElement>(null);
    const mediumRef = useRef<HTMLInputElement>(null);
    const hardRef = useRef<HTMLInputElement>(null);

    const sheetInfo: Record<string, { title: string; subtitle: string }> = {
        '1': { title: 'Mini Quiz #1', subtitle: 'Basics & Syntax' },
        '2': { title: 'Mini Quiz #2', subtitle: 'Condition & Control Flow' },
        '3': { title: 'Mini Quiz #3', subtitle: 'Loops & Arrays' }
    };

    const currentSheet = sheetInfo[sheetId] || { title: `Sheet ${sheetId}`, subtitle: '' };

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    const fetchSubmissions = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/sheets/my-submissions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const mysubs = data.submissions || [];

                // Filter for this specific sheet
                const sheetSubmissions = mysubs.filter((s: any) => s.sheet_name === currentSheet.title);

                setSubmissions(prev => {
                    const nextState: DifficultyState = {
                        easy: { file: null, status: 'pending', message: '', submissionId: null },
                        medium: { file: null, status: 'pending', message: '', submissionId: null },
                        hard: { file: null, status: 'pending', message: '', submissionId: null }
                    };

                    sheetSubmissions.forEach((sub: any) => {
                        let difficulty: 'easy' | 'medium' | 'hard' | null = null;
                        const problemName = sub.problem_name.toLowerCase();

                        if (problemName.includes('easy')) difficulty = 'easy';
                        else if (problemName.includes('medium')) difficulty = 'medium';
                        else if (problemName.includes('hard')) difficulty = 'hard';
                        else {
                            const index = sheetSubmissions.indexOf(sub);
                            if (index === 0) difficulty = 'easy';
                            else if (index === 1) difficulty = 'medium';
                            else if (index === 2) difficulty = 'hard';
                        }

                        if (difficulty) {
                            nextState[difficulty] = {
                                file: { name: sub.file_name } as File,
                                status: 'success',
                                message: 'Submitted',
                                submissionId: sub.id
                            };
                        }
                    });

                    return nextState;
                });
            }
        } catch (error) {
            console.error('Error fetching submissions:', error);
        } finally {
            setFetching(false);
        }
    }, [currentSheet.title]);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchSubmissions();
    }, [isAuthenticated, fetchSubmissions]);

    const handleFileSelect = (difficulty: keyof DifficultyState, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file extension
        if (!file.name.endsWith('.cpp') && !file.name.endsWith('.c') && !file.name.endsWith('.txt')) {
            setSubmissions(prev => ({
                ...prev,
                [difficulty]: { ...prev[difficulty], file: null, status: 'error', message: 'Only .cpp, .c, or .txt files allowed' }
            }));
            return;
        }

        // Validate file size (max 100KB)
        if (file.size > 100 * 1024) {
            setSubmissions(prev => ({
                ...prev,
                [difficulty]: { ...prev[difficulty], file: null, status: 'error', message: 'File too large (max 100KB)' }
            }));
            return;
        }

        setSubmissions(prev => ({
            ...prev,
            [difficulty]: { file, status: 'ready', message: file.name, submissionId: null }
        }));
    };

    const removeFile = async (difficulty: keyof DifficultyState) => {
        const sub = submissions[difficulty];

        if (sub.status === 'success' && sub.submissionId) {
            if (!window.confirm('Are you sure you want to delete this submission? You will need to re-upload it.')) {
                return;
            }

            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`/api/sheets/submission/${sub.submissionId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    alert('Failed to delete submission');
                    return;
                }
            } catch (error) {
                console.error('Error deleting:', error);
                alert('Error deleting submission');
                return;
            }
        }

        setSubmissions(prev => ({
            ...prev,
            [difficulty]: { file: null, status: 'pending', message: '', submissionId: null }
        }));

        if (difficulty === 'easy' && easyRef.current) easyRef.current.value = '';
        if (difficulty === 'medium' && mediumRef.current) mediumRef.current.value = '';
        if (difficulty === 'hard' && hardRef.current) hardRef.current.value = '';
    };

    const handleSubmitAll = async () => {
        const readyFiles = Object.entries(submissions).filter(([_, data]) => data.status === 'ready' && data.file);
        if (readyFiles.length === 0) return;

        setSubmitting(true);

        try {
            const token = localStorage.getItem('authToken');

            for (const [difficulty, data] of readyFiles) {
                if (!data.file) continue;
                const content = await data.file.text();

                const response = await fetch('/api/sheets/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        sheet_name: currentSheet.title,
                        problem_name: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Problem`,
                        file_name: data.file.name,
                        file_content: content
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    setSubmissions(prev => ({
                        ...prev,
                        [difficulty as keyof DifficultyState]: { ...prev[difficulty as keyof DifficultyState], status: 'error', message: err.error || 'Failed' }
                    }));
                }
            }

            await fetchSubmissions();

        } catch (error) {
            console.error('Submission error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', accent: 'bg-green-500' };
            case 'medium': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', accent: 'bg-yellow-500' };
            case 'hard': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', accent: 'bg-red-500' };
            default: return { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white', accent: 'bg-white' };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle2 size={20} className="text-green-400" />;
            case 'error': return <AlertCircle size={20} className="text-red-400" />;
            case 'ready': return <FileCode size={20} className="text-[#E8C15A]" />;
            default: return <Upload size={20} className="text-[#666]" />;
        }
    };

    if (loading || fetching) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#E8C15A]" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-[#DCDCDC] font-sans">
            <header className="border-b border-white/10 bg-[#0B0B0C] sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        href="/dashboard/sheets"
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <ChevronLeft size={24} className="text-[#E8C15A]" />
                    </Link>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-[#F2F2F2]">{currentSheet.title}</h1>
                        {currentSheet.subtitle && (
                            <p className="text-sm text-[#A0A0A0]">{currentSheet.subtitle}</p>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 md:py-8">
                <div className="bg-[#121212] rounded-xl p-4 md:p-6 border border-white/10 mb-6">
                    <h2 className="text-base font-semibold text-[#E8C15A] mb-2 flex items-center gap-2">
                        <FileText size={18} /> Instructions
                    </h2>
                    <ul className="text-sm text-[#A0A0A0] space-y-1">
                        <li>• Upload your solution files (.cpp, .c, or .txt) for each difficulty level</li>
                        <li>• You can submit one or more problems at a time</li>
                        <li>• <span className="text-green-400 font-bold">Existing submissions are shown below.</span> Click X to delete and re-upload.</li>
                    </ul>
                </div>

                <div className="grid gap-4 md:gap-6">
                    {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
                        const colors = getDifficultyColor(difficulty);
                        const data = submissions[difficulty];
                        const inputRef = difficulty === 'easy' ? easyRef : difficulty === 'medium' ? mediumRef : hardRef;
                        const isSubmitted = data.status === 'success';

                        return (
                            <div
                                key={difficulty}
                                className={`relative bg-[#121212] rounded-xl p-5 md:p-6 border ${colors.border} ${colors.bg} transition-all`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${colors.accent}`}></div>
                                        <span className={`text-lg font-bold ${colors.text} uppercase`}>
                                            {difficulty}
                                        </span>
                                    </div>
                                    {getStatusIcon(data.status)}
                                </div>

                                <input
                                    type="file"
                                    accept=".cpp,.c,.txt"
                                    ref={inputRef}
                                    onChange={(e) => handleFileSelect(difficulty, e)}
                                    className="hidden"
                                    id={`file-${difficulty}`}
                                    disabled={isSubmitted}
                                />

                                {data.status === 'pending' ? (
                                    <label
                                        htmlFor={`file-${difficulty}`}
                                        className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
                                    >
                                        <Upload size={32} className="text-[#666] mb-2" />
                                        <span className="text-sm text-[#A0A0A0]">Click to upload .cpp, .c, or .txt file</span>
                                        <span className="text-xs text-[#666] mt-1">Max 100KB</span>
                                    </label>
                                ) : (
                                    <div className={`flex items-center justify-between p-4 rounded-lg ${data.status === 'success' ? 'bg-green-500/10 border border-green-500/20' : data.status === 'error' ? 'bg-red-500/10' : 'bg-[#1A1A1A]'}`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileCode size={24} className={data.status === 'success' ? 'text-green-400' : data.status === 'error' ? 'text-red-400' : 'text-[#E8C15A]'} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[#F2F2F2] truncate">
                                                    {data.file?.name || data.message}
                                                </p>
                                                {data.status === 'success' && (
                                                    <p className="text-xs text-green-400">
                                                        {data.submissionId ? <span className="flex items-center gap-1"><Check size={12} /> Submitted (Saved on Server)</span> : 'Submitted successfully!'}
                                                    </p>
                                                )}
                                                {data.status === 'error' && (
                                                    <p className="text-xs text-red-400">{data.message}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(difficulty)}
                                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors group"
                                            title={isSubmitted ? "Delete Submission" : "Remove File"}
                                        >
                                            <X size={18} className="text-[#666] group-hover:text-red-400" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6">
                    <button
                        onClick={handleSubmitAll}
                        disabled={submitting || !Object.values(submissions).some(s => s.status === 'ready')}
                        className="w-full py-4 bg-[#E8C15A] hover:bg-[#CFA144] disabled:bg-[#333] disabled:text-[#666] text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                Submit Solutions
                            </>
                        )}
                    </button>
                </div>

                <div className="mt-4 text-center">
                    <Link
                        href="/dashboard/sheets"
                        className="text-sm text-[#A0A0A0] hover:text-[#E8C15A] transition-colors"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>
            </main>
        </div>
    );
}
