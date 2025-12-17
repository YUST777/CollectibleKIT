'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Terminal, Info, AlertTriangle, AlertOctagon, CheckCircle2, XCircle } from 'lucide-react';
import Providers from '@/components/Providers';

// Session 1 Content - Data Types & I/O
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
                    <div className="grid md:grid-cols-2 gap-6 mt-6">
                        <div className="bg-white/5 rounded-lg p-4">
                            <h4 className="font-bold mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>cout (C++)
                            </h4>
                            <ul className="text-sm text-white/60 space-y-2 list-disc list-inside">
                                <li>Type-safe & Modern</li>
                                <li>Supports object overloading</li>
                                <li>Uses stream operators</li>
                            </ul>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                            <h4 className="font-bold mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>printf (C)
                            </h4>
                            <ul className="text-sm text-white/60 space-y-2 list-disc list-inside">
                                <li>Faster but older</li>
                                <li>Uses format specifiers (%d, %s)</li>
                                <li>Does not support objects</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Console Input (cin)</h3>
                    <p className="text-white/70 mb-4 leading-relaxed">
                        Used for getting input from the user. Note that <code className="text-[#d59928] font-mono">cin</code> stops reading at whitespace.
                    </p>
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 mb-6">
                        <h4 className="text-blue-400 font-bold mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                            <Info className="w-4 h-4" /> Pro Tip: getline()
                        </h4>
                        <p className="text-sm text-white/80">
                            To read a full line of text including spaces, use <code className="font-mono bg-black/30 px-1 rounded">getline(cin, str)</code>.
                        </p>
                    </div>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 overflow-x-auto">
                        <pre className="text-blue-300">{`string str;
// Reads until space
cin >> str; 

// Reads whole line until enter
getline(cin, str);

// Reads until custom delimiter ('.')
getline(cin, str, '.');`}</pre>
                    </div>
                </div>
            </section>

            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <FileText className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Data Types & Limits</h2>
                </div>
                <p className="text-white/70 text-lg">
                    Understanding the limits of data types is crucial in Competitive Programming to avoid
                    <span className="text-red-400 font-bold mx-1">Overflow</span> and
                    <span className="text-red-400 font-bold mx-1">Underflow</span>.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-center">
                    {['int', 'double', 'float', 'char', 'bool', 'long long', 'short', 'unsigned int'].map(type => (
                        <div key={type} className="bg-[#1a1a1a] p-3 rounded-lg border border-white/5 font-mono text-sm text-[#d59928] hover:bg-white/5 transition-colors">{type}</div>
                    ))}
                </div>
            </section>
        </div>
    );
}

// Session 3 Content - Control Flow
function Session3Content() {
    return (
        <div className="space-y-12 text-white/90">
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <Terminal className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Control Flow with if/else & switch</h2>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Comparison Operators</h3>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        {[
                            { op: 'a < b', desc: 'Less than' },
                            { op: 'a <= b', desc: 'Less than or equal to' },
                            { op: 'a > b', desc: 'Greater than' },
                            { op: 'a >= b', desc: 'Greater than or equal to' },
                            { op: 'a == b', desc: 'Equal to' },
                            { op: 'a != b', desc: 'Not equal to' }
                        ].map((item, i) => (
                            <div key={i} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                                <code className="text-[#d59928] font-mono text-sm">{item.op}</code>
                                <span className="text-sm text-white/60">{item.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">if/else Statements</h3>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 mb-6 overflow-x-auto">
                        <pre className="text-green-400">{`if (condition) {
    // Execute if condition is true
} else {
    // Execute if condition is false
}`}</pre>
                    </div>
                </div>

                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <h3 className="text-xl font-bold mb-4 text-white">Ternary Operator</h3>
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 mb-6 overflow-x-auto">
                        <pre className="text-[#d59928]">variable = (condition) ? expressionTrue : expressionFalse;</pre>
                    </div>
                </div>
            </section>

            <section className="space-y-6 pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 text-[#d59928] mb-6">
                    <FileText className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Switch Statement</h2>
                </div>
                <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8">
                    <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-white/5 mb-6 overflow-x-auto">
                        <pre className="text-green-400">{`switch(expression) {
    case x:
        // code block
        break;
    case y:
        // code block
        break;
    default:
        // code block
}`}</pre>
                    </div>
                    <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4">
                        <h4 className="text-yellow-400 font-bold mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Performance: Jump Table (O(1))
                        </h4>
                        <p className="text-sm text-white/80">
                            When cases are dense numbers, the compiler builds a jump table for instant O(1) lookup — much faster than multiple if/else!
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Session 4 Content - Coming Soon
function Session4Content() {
    return (
        <div className="space-y-12 text-white/90">
            <div className="bg-[#111] rounded-2xl border border-white/10 p-6 sm:p-8 text-center">
                <div className="flex items-center justify-center gap-3 text-[#d59928] mb-4">
                    <FileText className="w-6 h-6" />
                    <h2 className="text-2xl sm:text-3xl font-bold">Session Materials</h2>
                </div>
                <p className="text-white/70 text-lg mb-6">
                    Materials for this session are coming soon. Check back later for problem sets, solutions, and additional resources.
                </p>
                <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-4 inline-block">
                    <p className="text-yellow-400 font-semibold flex items-center gap-2">
                        <Info className="w-5 h-5" /> Materials Coming Soon
                    </p>
                </div>
            </div>
        </div>
    );
}

function SessionDetailContent() {
    const params = useParams();
    const sessionId = params.id as string;

    const sessions: Record<string, { number: string; tag: string; title: string; description: string; videoId: string; content: React.ReactNode }> = {
        '1': {
            number: '01',
            tag: 'Fundamentals',
            title: 'Data Types, I/O & Arithmetic',
            description: 'Master the basics of C++, input/output streams, and understand how data is stored in memory.',
            videoId: '1Ihh7e6pxPbu5L8RobscDgfSVv-WJEE6g',
            content: <Session1Content />
        },
        '3': {
            number: '03',
            tag: 'Control Flow',
            title: 'if/else & switch case',
            description: 'Master conditional statements, logical operators, and control flow patterns.',
            videoId: '1rm9v66HZd-_bZ7Z9KrpPbIIubBaqIa14',
            content: <Session3Content />
        },
        '4': {
            number: '04',
            tag: 'Revision & Practice',
            title: 'Revision + 3 Problem Solving',
            description: "Review key concepts and solve 3 challenging problems to reinforce your understanding.",
            videoId: '1sQT2Uk9A0FdDqn1gzBgvl8zn2rge3fe0',
            content: <Session4Content />
        }
    };

    const session = sessions[sessionId] || sessions['1'];

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            {/* Navigation Bar */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/sessions" className="flex items-center gap-2 text-white/70 hover:text-white transition">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Back to Library</span>
                    </Link>
                    <div className="font-bold text-lg">
                        Session <span className="text-[#d59928]">{session.number}</span>
                    </div>
                    <div className="w-20"></div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
                {/* Header Info */}
                <div className="mb-8 sm:mb-12">
                    <span className="inline-block px-3 py-1 bg-[#d59928]/10 text-[#d59928] border border-[#d59928]/20 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                        {session.tag}
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">{session.title}</h1>
                    <p className="text-lg text-white/60 max-w-2xl">{session.description}</p>
                </div>

                {/* Video Section */}
                <div className="mb-12 sm:mb-16">
                    <div className="aspect-video w-full bg-[#111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
                        <iframe
                            src={`https://drive.google.com/file/d/${session.videoId}/preview`}
                            width="100%"
                            height="100%"
                            allow="autoplay"
                            className="w-full h-full"
                        ></iframe>
                    </div>
                    <div className="mt-4 flex justify-between items-center px-2">
                        <p className="text-sm text-white/40 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            If video doesn&apos;t load, <a href={`https://drive.google.com/file/d/${session.videoId}/view?usp=sharing`} target="_blank" rel="noopener noreferrer" className="text-[#d59928] hover:underline">watch on Drive</a>
                        </p>
                    </div>
                </div>

                {/* Content Separator */}
                <div className="flex items-center gap-4 mb-12">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <span className="text-white/30 text-sm font-mono uppercase tracking-widest">Session Notes</span>
                    <div className="h-px bg-white/10 flex-1"></div>
                </div>

                {/* Content */}
                <article className="prose prose-invert prose-lg max-w-none">
                    {session.content}
                </article>
            </div>
        </div>
    );
}

export default function SessionDetail() {
    return <Providers><SessionDetailContent /></Providers>;
}
