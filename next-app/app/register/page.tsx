'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, UserPlus, ArrowRight, Loader2, CheckCircle2, XCircle, AlertCircle, Mail } from 'lucide-react';
import Providers from '@/components/Providers';

function RegisterContent() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailInfo, setEmailInfo] = useState<any>(null);

    const { checkEmail, register, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, router]);

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { strength: 0, label: '', color: '' };
        if (/^\d+$/.test(pwd)) return { strength: 10, label: 'Weak', color: 'bg-red-500' };
        if (/^[a-zA-Z]+$/.test(pwd)) return { strength: 20, label: 'Weak', color: 'bg-red-500' };
        if (/(.)\1{2,}/.test(pwd)) return { strength: 10, label: 'Weak', color: 'bg-red-500' };

        let score = 0;
        if (pwd.length >= 8) score += 1;
        if (pwd.length >= 12) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[a-z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

        if (score < 3) return { strength: 30, label: 'Weak', color: 'bg-red-500' };
        if (score < 4) return { strength: 60, label: 'Good', color: 'bg-yellow-500' };
        if (score < 5) return { strength: 80, label: 'Strong', color: 'bg-green-400' };
        return { strength: 100, label: 'Very Strong', color: 'bg-green-500' };
    };

    const passwordStrength = getPasswordStrength(password);
    const passwordsMatch = password && confirmPassword && password === confirmPassword;

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail) { setError('Please enter your email address'); return; }
        if (!isValidEmail(trimmedEmail)) { setError('Please enter a valid email address'); return; }

        setLoading(true);
        try {
            const result = await checkEmail(trimmedEmail);
            if (result.exists && !result.hasAccount) {
                setEmail(trimmedEmail);
                setEmailInfo(result);
                setError('');
                setStep(2);
            } else if (result.exists && result.hasAccount) {
                setError('An account with this email already exists. Please sign in instead.');
            } else {
                setError('notfound');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!password) { setError('Please enter a password'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters long'); return; }
        if (!confirmPassword) { setError('Please confirm your password'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match. Please try again.'); return; }

        setLoading(true);
        try {
            await register(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            if (err.message?.includes('already exists')) {
                setError('An account with this email already exists. Please sign in.');
            } else {
                setError(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoBack = () => {
        setStep(1);
        setPassword('');
        setConfirmPassword('');
        setError('');
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#d59928]/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[#d59928]/5 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block">
                        <Image src="/images/navlogo.webp" alt="ICPC HUE" width={64} height={64} className="h-16 w-auto mx-auto" />
                    </Link>
                    <p className="text-white/60 mt-4 text-sm">Create your account</p>
                </div>

                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#d59928]' : 'text-white/30'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-[#d59928]/20 border border-[#d59928]' : 'bg-white/5 border border-white/20'}`}>
                            {step > 1 ? <CheckCircle2 size={16} /> : '1'}
                        </div>
                        <span className="text-sm hidden sm:inline">Verify</span>
                    </div>
                    <div className={`w-12 h-px ${step >= 2 ? 'bg-[#d59928]' : 'bg-white/20'}`}></div>
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#d59928]' : 'text-white/30'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-[#d59928]/20 border border-[#d59928]' : 'bg-white/5 border border-white/20'}`}>2</div>
                        <span className="text-sm hidden sm:inline">Password</span>
                    </div>
                </div>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {step === 1 && (
                        <form onSubmit={handleCheckEmail} className="space-y-6">
                            {error && error !== 'notfound' && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex items-start gap-2">
                                    <XCircle size={18} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
                                </div>
                            )}

                            {error === 'notfound' && (
                                <div className="bg-[#d59928]/10 border border-[#d59928]/30 rounded-xl p-5">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle size={24} className="text-[#d59928] flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="text-[#d59928] font-bold mb-2">Email Not Found</h3>
                                            <p className="text-white/70 text-sm mb-4">This email is not in our application records. You need to submit an application first to join ICPC HUE.</p>
                                            <Link href="/apply" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#d59928] hover:bg-[#c08820] text-black font-semibold rounded-lg transition-all">Apply Now<ArrowRight size={18} /></Link>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">Email used in your application</label>
                                <div className="relative">
                                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 pl-11 bg-black/50 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#d59928]/50 focus:border-[#d59928]/50 transition-all" required autoComplete="email" dir="ltr" />
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                </div>
                                <p className="text-white/40 text-xs mt-2">Must be the same email from your application form</p>
                            </div>

                            <button type="submit" disabled={loading || !email.trim()} className="w-full py-3 px-4 bg-[#d59928] hover:bg-[#c08820] text-black font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#d59928]/20">
                                {loading ? <><Loader2 className="animate-spin" size={20} />Verifying...</> : <>Verify Email<ArrowRight size={20} /></>}
                            </button>

                            <div className="text-center pt-4 border-t border-white/10">
                                <p className="text-white/60 text-sm">Haven&apos;t applied yet? <Link href="/apply" className="text-[#d59928] hover:text-[#e5a938] font-medium">Apply Now</Link></p>
                            </div>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm text-center flex items-center justify-center gap-2">
                                <CheckCircle2 size={18} />Email verified! Create your password
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex items-start gap-2">
                                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
                                </div>
                            )}

                            <div className="bg-white/5 rounded-lg p-3 text-white/60 text-sm flex items-center gap-2" dir="ltr"><Mail size={16} />{email}</div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">Create Password</label>
                                <div className="relative">
                                    <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#d59928]/50 focus:border-[#d59928]/50 transition-all pr-12" required minLength={6} autoComplete="new-password" dir="ltr" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                                </div>
                                {password && (
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between text-xs mb-1"><span className="text-white/40">Password strength</span><span className={`${passwordStrength.strength >= 60 ? 'text-green-400' : 'text-white/60'}`}>{passwordStrength.label}</span></div>
                                        <div className="w-full bg-white/10 rounded-full h-1.5"><div className={`h-1.5 rounded-full transition-all ${passwordStrength.color}`} style={{ width: `${passwordStrength.strength}%` }}></div></div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">Confirm Password</label>
                                <div className="relative">
                                    <input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className={`w-full px-4 py-3 bg-black/50 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#d59928]/50 transition-all ${confirmPassword && !passwordsMatch ? 'border-red-500/50' : confirmPassword && passwordsMatch ? 'border-green-500/50' : 'border-white/10'}`} required autoComplete="new-password" dir="ltr" />
                                    {confirmPassword && (<span className="absolute right-3 top-1/2 -translate-y-1/2">{passwordsMatch ? <CheckCircle2 size={20} className="text-green-400" /> : <XCircle size={20} className="text-red-400" />}</span>)}
                                </div>
                                {confirmPassword && !passwordsMatch && <p className="text-red-400 text-xs mt-1">Passwords do not match</p>}
                            </div>

                            <button type="submit" disabled={loading || !password || !confirmPassword || !passwordsMatch || password.length < 6} className="w-full py-3 px-4 bg-[#d59928] hover:bg-[#c08820] text-black font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#d59928]/20">
                                {loading ? <><Loader2 className="animate-spin" size={20} />Creating Account...</> : <><UserPlus size={20} />Create Account</>}
                            </button>

                            <button type="button" onClick={handleGoBack} className="w-full py-2 text-white/40 hover:text-white text-sm transition-colors">← Use a different email</button>
                        </form>
                    )}

                    <div className="flex items-center gap-4 my-6"><div className="flex-1 h-px bg-white/10"></div><span className="text-white/30 text-sm">or</span><div className="flex-1 h-px bg-white/10"></div></div>
                    <div className="text-center"><p className="text-white/60 text-sm">Already have an account? <Link href="/login" className="text-[#d59928] hover:text-[#e5a938] font-medium inline-flex items-center gap-1">Sign In<ArrowRight size={16} /></Link></p></div>
                </div>

                <div className="text-center mt-6"><Link href="/" className="text-white/40 hover:text-white/60 text-sm transition-colors">← Back to Home</Link></div>
            </div>
        </div>
    );
}

export default function Register() {
    return <Providers><RegisterContent /></Providers>;
}
