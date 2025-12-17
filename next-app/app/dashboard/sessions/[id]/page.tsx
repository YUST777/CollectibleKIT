'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Terminal, Info, AlertTriangle, Loader2 } from 'lucide-react';
import Providers from '@/components/Providers';
import { useAuth } from '@/contexts/AuthContext';

// Session 1 Content
function Session1Content() {
    return (
        <div className="space-y-12 text-white/90">
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Terminal className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Standard I/O: iostream</h2>
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Console Output (cout)</h3>
                    <p className="text-white/70 mb-4 leading-relaxed">
                        The <code className="text-[#d59928] bg-white/5 px-1.5 py-0.5 rounded font-mono">cout</code> object is used for outputting data to the standard output device (usually your screen). It is buffered and type-safe.
                    </p>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 mb-6 overflow-x-auto">
                        <pre className="text-green-400">{`// Example of formatting with iomanip
cout << right << setw(5) << 122;
cout << setw(5) << 78 << '\\n';

// Basic Types
int num = 10;
string str = "Hello, CPP!";
cout << "Result: " << num << " - " << str << endl;`}</pre>
                    </div>
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Console Input (cin)</h3>
                    <p className="text-white/70 mb-4">Used for getting input from the user. Note that <code className="text-[#d59928]">cin</code> stops reading at whitespace (space, tab, newline).</p>
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 mb-6">
                        <h4 className="text-blue-400 font-bold mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Info className="w-4 h-4" /> Pro Tip: getline()
                        </h4>
                        <p className="text-sm text-white/80 mb-2">To read a full line of text including spaces, use <code className="font-mono bg-black/30 px-1 rounded">getline(cin, str)</code>.</p>
                        <div className="bg-black/30 p-2 rounded text-xs font-mono text-white/70">
                            <pre>{`string str;
// Reads until space
cin >> str; 

// Reads whole line until enter
getline(cin, str);

// Reads until custom delimiter ('.')
getline(cin, str, '.');`}</pre>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <AlertTriangle className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Error & Logging</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-[#1a1a1a] p-5 rounded-xl border border-white/5">
                        <h4 className="font-bold text-red-400 mb-2">cerr (Unbuffered)</h4>
                        <p className="text-sm text-white/60">Outputs immediately. Best for critical errors.</p>
                    </div>
                    <div className="bg-[#1a1a1a] p-5 rounded-xl border border-white/5">
                        <h4 className="font-bold text-yellow-400 mb-2">clog (Buffered)</h4>
                        <p className="text-sm text-white/60">Stores in buffer first. Best for non-critical logging.</p>
                    </div>
                </div>
            </section>

            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <FileText className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Data Types & Limits</h2>
                </div>
                <p className="text-white/70">Understanding the limits of data types is crucial in Competitive Programming to avoid Overflow and Underflow.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {['int', 'double', 'float', 'char', 'bool', 'long long', 'short', 'unsigned int'].map(type => (
                        <div key={type} className="bg-[#1a1a1a] p-3 rounded-lg border border-white/5 font-mono text-sm text-[#d59928]">{type}</div>
                    ))}
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
                    <h3 className="text-lg font-bold mb-3 text-white">How to check limits?</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <span className="text-xs text-white/40 uppercase font-bold block mb-2">Modern C++ (limits)</span>
                            <pre className="bg-black/50 p-3 rounded-lg text-xs font-mono text-green-400">{`#include <limits>
cout << numeric_limits<int>::max();`}</pre>
                        </div>
                        <div>
                            <span className="text-xs text-white/40 uppercase font-bold block mb-2">Simpler (climits)</span>
                            <pre className="bg-black/50 p-3 rounded-lg text-xs font-mono text-green-400">{`#include <climits>
cout << INT_MAX;`}</pre>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Session 3 Content
function Session3Content() {
    return (
        <div className="space-y-12 text-white/90">
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Terminal className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Control Flow</h2>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">if/else Statements</h3>
                    <p className="text-white/70 mb-4">Master conditional statements, logical operators, and control flow patterns.</p>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-black/30 p-4 rounded-lg">
                            <h4 className="text-sm font-bold text-white mb-2">Comparison Operators</h4>
                            <ul className="text-xs text-white/60 space-y-1 font-mono">
                                <li>a &lt; b : Less than</li>
                                <li>a &gt; b : Greater than</li>
                                <li>a == b : Equal to</li>
                                <li>a != b : Not equal to</li>
                            </ul>
                        </div>
                        <div className="bg-black/30 p-4 rounded-lg">
                            <h4 className="text-sm font-bold text-white mb-2">Ternary Operator</h4>
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{`variable = (condition) ? true : false;`}</pre>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Switch Statement</h3>
                    <div className="prose prose-invert max-w-none text-white/80 text-sm">
                        <p>Switch is a control structure that chooses one code path based on an integer-like value. When cases are dense numbers (1,2,3...), the compiler builds a jump table for instant <strong>O(1)</strong> lookup.</p>
                    </div>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto mt-4">
                        <pre className="text-green-400">{`switch (age) {
    case 0 ... 4:   // GCC extension
        cout << "Free";
        break;
    default:
        cout << "Paid";
}`}</pre>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500 bg-yellow-900/10 p-2 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Range syntax (0 ... 4) is a GCC extension.</span>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Session 4 Content (Revision)
function Session4Content() {
    return (
        <div className="space-y-12 text-white/90">
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Terminal className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Revision Session</h2>
                </div>
                <div className="mb-8">
                    <p className="text-white/70 text-lg">This session covers a comprehensive review of all topics from the previous sessions. Complete the 3 practice problems below to test your understanding.</p>
                </div>

                {/* Practice Problems */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white border-l-4 border-[#d59928] pl-3">Practice Problems</h3>

                    {/* Problem 1 */}
                    <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-[#d59928] text-black px-2.5 py-1 rounded-full text-xs font-bold">Problem 1</span>
                            <span className="text-white/40 text-sm">I/O & Data Types</span>
                        </div>
                        <h4 className="text-lg font-bold mb-3 text-white">Sum of Two Numbers</h4>
                        <p className="text-white/70 mb-4">Read two integers from the user and print their sum. Make sure to handle the case where the sum might overflow.</p>
                        <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto">
                            <pre className="text-green-400">{`// Sample Input:
5 7
// Sample Output:
12`}</pre>
                        </div>
                    </div>

                    {/* Problem 2 */}
                    <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-[#d59928] text-black px-2.5 py-1 rounded-full text-xs font-bold">Problem 2</span>
                            <span className="text-white/40 text-sm">Control Flow</span>
                        </div>
                        <h4 className="text-lg font-bold mb-3 text-white">Grade Calculator</h4>
                        <p className="text-white/70 mb-4">Given a score (0-100), print the corresponding grade: A (90-100), B (80-89), C (70-79), D (60-69), F (below 60).</p>
                        <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto">
                            <pre className="text-green-400">{`// Sample Input:
85
// Sample Output:
B`}</pre>
                        </div>
                    </div>

                    {/* Problem 3 */}
                    <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-[#d59928] text-black px-2.5 py-1 rounded-full text-xs font-bold">Problem 3</span>
                            <span className="text-white/40 text-sm">Loops</span>
                        </div>
                        <h4 className="text-lg font-bold mb-3 text-white">Factorial</h4>
                        <p className="text-white/70 mb-4">Given a non-negative integer n, print n! (n factorial). Remember: 0! = 1.</p>
                        <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto">
                            <pre className="text-green-400">{`// Sample Input:
5
// Sample Output:
120`}</pre>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function DashboardSessionContent() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated, loading } = useAuth();
    const sessionId = params.id as string;
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        if (!loading) {
            setAuthChecked(true);
            if (!isAuthenticated) {
                router.replace('/login');
            }
        }
    }, [loading, isAuthenticated, router]);

    const sessions: Record<string, { number: string; tag: string; title: string; description: string; videoId: string; content: React.ReactNode }> = {
        '1': {
            number: '01',
            tag: 'Fundamentals',
            title: 'Data Types, I/O & Arithmetic',
            description: 'Master the basics of C++, input/output streams, and understand how data is stored in memory. Essential first steps for any competitive programmer.',
            videoId: '1Ihh7e6pxPbu5L8RobscDgfSVv-WJEE6g',
            content: <Session1Content />
        },
        // Session 2 is skipped/missing in user request
        '3': {
            number: '03',
            tag: 'Control Flow',
            title: 'if/else & switch case',
            description: 'Master conditional statements, logical operators, and control flow patterns. Learn when to use if/else vs switch, and optimize your decision-making code.',
            videoId: '1rm9v66HZd-_bZ7Z9KrpPbIIubBaqIa14',
            content: <Session3Content />
        },
        '4': {
            number: '04',
            tag: 'Revision',
            title: 'Revision',
            description: 'Comprehensive review of all previous topics with 3 practice problems to solidify your understanding.',
            videoId: '1sQT2Uk9A0FdDqn1gzBgvl8zn2rge3fe0',
            content: <Session4Content />
        }
    };

    const session = sessions[sessionId] || sessions['1'];

    if (loading || !authChecked) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#d59928]" size={48} /></div>;
    if (!isAuthenticated) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#d59928]" size={48} /></div>;
    if (!session) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Session not found</div>;

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/dashboard/sessions" className="flex items-center gap-2 text-white/70 hover:text-white transition">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Back to Dashboard</span>
                    </Link>
                    <div className="font-bold text-lg">Session <span className="text-[#d59928]">{session.number}</span></div>
                    <div className="w-20"></div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
                <div className="mb-8 sm:mb-12">
                    <span className="inline-block px-3 py-1 bg-[#d59928]/10 text-[#d59928] border border-[#d59928]/20 rounded-full text-xs font-bold uppercase tracking-wider mb-4">{session.tag}</span>
                    <h1 className="text-3xl sm:text-5xl font-black mb-4">{session.title}</h1>
                    <p className="text-lg text-white/60 max-w-2xl">{session.description}</p>
                </div>

                <div className="mb-12 sm:mb-16">
                    <div className="aspect-video w-full bg-[#111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                        <iframe src={`https://drive.google.com/file/d/${session.videoId}/preview`} width="100%" height="100%" allow="autoplay" className="w-full h-full"></iframe>
                    </div>
                    <div className="mt-4 px-2">
                        <p className="text-sm text-white/40 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            If video doesn&apos;t load, <a href={`https://drive.google.com/file/d/${session.videoId}/view?usp=sharing`} target="_blank" rel="noopener noreferrer" className="text-[#d59928] hover:underline">watch on Drive</a>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-12">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <span className="text-white/30 text-sm font-mono uppercase tracking-widest">Session Notes</span>
                    <div className="h-px bg-white/10 flex-1"></div>
                </div>

                <article className="prose prose-invert prose-lg max-w-none">{session.content}</article>
            </div>
        </div>
    );
}

export default function DashboardSessionDetail() {
    return <Providers><DashboardSessionContent /></Providers>;
}
