'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, Check, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { executeRecaptcha, loadRecaptcha } from '@/lib/recaptcha';
import TrainerIcon from '@/components/TrainerIcon';
import TraineeIcon from '@/components/TraineeIcon';
import Providers from '@/components/Providers';

const API_BASE = '';
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LdBYRQsAAAAAOsYGXNhnrklR_iS6hQN_OalQ2NF';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'K8mN2pQ5rT7vW9xY1zA3bC4dE5fG6hI7j';

const facultyOptions = [
    { value: 'ai', label: 'كلية الذكاء الاصطناعي / AI Faculty' },
    { value: 'medicine', label: 'كلية الطب / Faculty of Medicine' },
    { value: 'dentistry', label: 'كلية طب الأسنان / Faculty of Dentistry' },
    { value: 'pharmacy', label: 'كلية الصيدلة / Faculty of Pharmacy' },
    { value: 'physiotherapy', label: 'كلية العلاج الطبيعي / Faculty of Physical Therapy' },
    { value: 'nursing', label: 'كلية التمريض / Faculty of Nursing' }
];

const levelOptions = [
    { value: '1', label: 'المستوى الأول / Level 1' },
    { value: '2', label: 'المستوى الثاني / Level 2' },
    { value: '3', label: 'المستوى الثالث / Level 3' },
    { value: '4', label: 'المستوى الرابع / Level 4' },
    { value: '5', label: 'المستوى الخامس / Level 5' }
];

interface FormData {
    name: string;
    faculty: string;
    id: string;
    nationalId: string;
    studentLevel: string;
    telephone: string;
    hasLaptop: boolean | string;
    codeforces: string;
    leetcode: string;
    email: string;
}

interface Errors {
    [key: string]: string;
}

function ApplicationFormContent() {
    const [currentStep, setCurrentStep] = useState(1);
    const [applicationType, setApplicationType] = useState<'trainee' | 'trainer'>('trainee');
    const [formData, setFormData] = useState<FormData>({
        name: '',
        faculty: 'ai',
        id: '',
        nationalId: '',
        studentLevel: '',
        telephone: '',
        hasLaptop: '',
        codeforces: '',
        leetcode: '',
        email: ''
    });
    const [errors, setErrors] = useState<Errors>({});
    const [status, setStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { language, toggleLanguage } = useLanguage();
    const t = translations[language].contact;

    const totalSteps = 3;

    useEffect(() => {
        const siteKey = SITE_KEY;
        if (!siteKey) {
            console.error('NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set in environment variables');
        }
        loadRecaptcha(siteKey).catch((error) => {
            console.warn('reCAPTCHA loading warning:', error);
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let newValue: string | boolean = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        if (name === 'id' || name === 'nationalId') {
            newValue = value.replace(/\D/g, '');
        }

        if (name === 'telephone') {
            newValue = value.replace(/[^\d+]/g, '');
            if (newValue && !newValue.startsWith('+20')) {
                if (newValue.startsWith('20')) {
                    newValue = '+' + newValue;
                } else if (newValue.startsWith('0')) {
                    newValue = '+20' + newValue.substring(1);
                } else if (!newValue.startsWith('+')) {
                    newValue = '+20' + newValue;
                }
            }
            if (typeof newValue === 'string' && newValue.length > 13) {
                newValue = newValue.substring(0, 13);
            }
        }

        if (name === 'hasLaptop') {
            newValue = value === 'true' ? true : value === 'false' ? false : '';
        }

        setFormData({
            ...formData,
            [name]: newValue
        });

        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ''
            });
        }
    };

    const validateStep = (step: number) => {
        const newErrors: Errors = {};

        if (step === 1) {
            if (!formData.name.trim()) {
                newErrors.name = 'الاسم مطلوب';
            }
            if (!formData.telephone.trim()) {
                newErrors.telephone = 'رقم الهاتف مطلوب';
            } else if (!/^\+20\d{10}$/.test(formData.telephone.replace(/\s/g, ''))) {
                newErrors.telephone = 'رقم الهاتف يجب أن يكون بصيغة +20XXXXXXXXXX';
            }
        }

        if (step === 2) {
            if (!formData.id.trim()) {
                newErrors.id = 'رقم الطالب مطلوب';
            } else if (!/^\d{7}$/.test(formData.id)) {
                newErrors.id = 'رقم الطالب يجب أن يكون 7 أرقام';
            }

            if (!formData.nationalId.trim()) {
                newErrors.nationalId = 'الرقم القومي مطلوب';
            } else if (!/^\d{14}$/.test(formData.nationalId)) {
                newErrors.nationalId = 'الرقم القومي يجب أن يكون 14 رقم';
            }

            if (!formData.studentLevel) {
                newErrors.studentLevel = 'المستوى الدراسي مطلوب';
            }

            if (applicationType === 'trainee') {
                if (formData.hasLaptop === '' || formData.hasLaptop === null || formData.hasLaptop === undefined) {
                    newErrors.hasLaptop = language === 'ar' ? 'يرجى الإجابة على السؤال' : 'Please answer the question';
                }
            }
        }

        if (step === 3) {
            if (!formData.email.trim()) {
                newErrors.email = language === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required';
            } else if (!/^[^\s@]+@horus\.edu\.eg$/i.test(formData.email.trim())) {
                newErrors.email = language === 'ar' ? 'يجب أن يكون البريد الإلكتروني من جامعة حورس (@horus.edu.eg)' : 'Email must be from Horus University (@horus.edu.eg)';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (validateStep(currentStep)) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateStep(currentStep)) {
            return;
        }

        setIsSubmitting(true);
        setStatus('');

        try {
            let recaptchaToken: string | null = null;
            const siteKey = SITE_KEY;
            if (siteKey && siteKey.trim() !== '') {
                try {
                    recaptchaToken = await executeRecaptcha('submit');
                } catch (recaptchaError) {
                    console.warn('reCAPTCHA execution warning:', recaptchaError);
                }
            }

            const apiKey = API_KEY;
            if (!apiKey) {
                setErrors({ submit: language === 'ar' ? 'خطأ في التكوين. يرجى الاتصال بالدعم.' : 'Configuration error. Please contact support.' });
                setIsSubmitting(false);
                return;
            }

            const submissionData = {
                applicationType,
                name: formData.name,
                faculty: formData.faculty,
                id: formData.id,
                nationalId: formData.nationalId,
                studentLevel: formData.studentLevel,
                telephone: formData.telephone,
                hasLaptop: applicationType === 'trainee' ? (formData.hasLaptop === true || formData.hasLaptop === 'true') : null,
                codeforcesProfile: applicationType === 'trainer' ? (formData.codeforces || '') : '',
                leetcodeProfile: applicationType === 'trainer' ? (formData.leetcode || '') : '',
                email: formData.email,
                recaptchaToken
            };

            const response = await fetch(`${API_BASE}/api/submit-application`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                body: JSON.stringify(submissionData)
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setFormData({
                    name: '',
                    faculty: 'ai',
                    id: '',
                    nationalId: '',
                    studentLevel: '',
                    telephone: '',
                    hasLaptop: '',
                    codeforces: '',
                    leetcode: '',
                    email: '',
                });
                setCurrentStep(1);
                setErrors({});
            } else {
                setStatus('error');
                if (data.error) {
                    setErrors({ submit: data.error });
                } else {
                    setErrors({ submit: 'حدث خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى' });
                }
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setStatus('error');
            setErrors({ submit: 'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen relative bg-black">
            {/* Video background */}
            <div className="fixed inset-0 !z-0 overflow-hidden">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-20 md:opacity-15 lg:opacity-20"
                >
                    <source src="/videos/applynow.webm" type="video/webm" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
            </div>

            {/* Header */}
            <header className="relative border-b border-white/20 bg-black/80 backdrop-blur-xl sticky top-0 z-[9999] md:border-white/10 md:bg-black/70">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-8 py-4 sm:py-4">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-white hover:text-white/80 transition text-base sm:text-base font-medium"
                        >
                            <ArrowLeft className="h-5 w-5 sm:h-5 sm:w-5 rtl:rotate-180" />
                            {t.backToHome}
                        </Link>

                        <button
                            onClick={toggleLanguage}
                            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm sm:text-base font-medium transition-all min-h-[40px] sm:min-h-[44px]"
                            aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
                        >
                            <span className="text-sm sm:text-base font-bold">
                                {language === 'ar' ? 'EN' : 'AR'}
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Form Section */}
            <section className="relative z-10 py-8 sm:py-12 md:py-16 lg:py-20">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8 lg:px-8">
                    <div className="text-center mb-8 sm:mb-10 md:mb-12">
                        <h1 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-black text-white mb-4 sm:mb-4 leading-tight drop-shadow-lg">
                            {t.title}
                        </h1>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6 sm:mb-8 bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-white/20 relative">
                        <div className={`absolute top-3 sm:top-4 ${language === 'ar' ? 'left-3 sm:left-4' : 'right-3 sm:right-4'}`}>
                            {applicationType === 'trainer' ? (
                                <TrainerIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" color="#d59928" />
                            ) : (
                                <TraineeIcon className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" color="#60a5fa" />
                            )}
                        </div>

                        <div className="flex justify-between items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                            {[1, 2, 3].map((step) => (
                                <div key={step} className="flex items-center flex-1">
                                    <div className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full border-2 transition-all font-bold text-base sm:text-lg ${currentStep >= step
                                        ? 'bg-gradient-to-r from-[#d59928] to-[#e6b04a] border-[#d59928] text-white shadow-lg shadow-[#d59928]/30'
                                        : 'bg-white/10 border-white/30 text-white/50'
                                        }`}>
                                        {currentStep > step ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : step}
                                    </div>
                                    {step < 3 && (
                                        <div className={`flex-1 h-1 mx-1.5 sm:mx-2 md:mx-3 rounded transition-all ${currentStep > step ? 'bg-gradient-to-r from-[#d59928] to-[#e6b04a]' : 'bg-white/20'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center pr-10 sm:pr-12 md:pr-16">
                            <div className="flex-1 text-center">
                                <span className={`text-xs sm:text-sm font-semibold block ${currentStep >= 1 ? 'text-white' : 'text-white/50'}`}>
                                    Personal Info
                                </span>
                            </div>
                            <div className="flex-1 text-center">
                                <span className={`text-xs sm:text-sm font-semibold block ${currentStep >= 2 ? 'text-white' : 'text-white/50'}`}>
                                    Academic Details
                                </span>
                            </div>
                            <div className="flex-1 text-center">
                                <span className={`text-xs sm:text-sm font-semibold block ${currentStep >= 3 ? 'text-white' : 'text-white/50'}`}>
                                    Email
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Application Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-xl sm:rounded-2xl border-2 border-white/70 bg-[#333333] backdrop-blur-xl p-4 sm:p-5 md:p-6 lg:p-8 shadow-2xl md:bg-white/10 md:border-white/20"
                    >
                        {/* Step 1: Personal Information */}
                        {currentStep === 1 && (
                            <div className="space-y-4 sm:space-y-5">
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Personal Information</h2>

                                {/* Application Type Toggle */}
                                <div>
                                    <label className="block text-sm font-semibold text-white mb-3">Application Type</label>
                                    <div className="flex gap-3 bg-white/10 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setApplicationType('trainee')}
                                            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${applicationType === 'trainee'
                                                ? 'bg-gradient-to-r from-[#d59928] to-[#e6b04a] text-white'
                                                : 'bg-transparent text-white/60 hover:text-white'
                                                }`}
                                        >
                                            Trainee
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setApplicationType('trainer')}
                                            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${applicationType === 'trainer'
                                                ? 'bg-gradient-to-r from-[#d59928] to-[#e6b04a] text-white'
                                                : 'bg-transparent text-white/60 hover:text-white'
                                                }`}
                                        >
                                            Trainer
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-white mb-2">
                                        الاسم / Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        dir="auto"
                                        className="w-full rounded-lg bg-[#3a3a3a] border-2 border-white/50 px-4 py-3 text-base text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#d59928] focus:border-[#d59928] focus:bg-[#404040] transition"
                                        placeholder="يوسف / Yousef"
                                    />
                                    <p className="text-xs text-white/60 mt-1">Enter your full name as it appears on official documents</p>
                                    {errors.name && <span className="text-red-400 text-sm mt-1.5 block">{errors.name}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-white mb-2">
                                        رقم الهاتف / Telephone *
                                    </label>
                                    <input
                                        type="tel"
                                        name="telephone"
                                        value={formData.telephone}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-lg bg-[#3a3a3a] border-2 border-white/50 px-4 py-3 text-base text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#d59928] focus:border-[#d59928] focus:bg-[#404040] transition"
                                        placeholder="+201234567890"
                                    />
                                    <p className="text-xs text-white/60 mt-1">Format: +20 XXX XXX XXXX. We&apos;ll use this for updates</p>
                                    {errors.telephone && <span className="text-red-400 text-sm mt-1.5 block">{errors.telephone}</span>}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Academic Details */}
                        {currentStep === 2 && (
                            <div className="space-y-4 sm:space-y-5">
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Academic Details</h2>

                                <div>
                                    <label className="block text-sm font-semibold text-white mb-2">
                                        الكلية / Faculty *
                                    </label>
                                    <select
                                        name="faculty"
                                        value={formData.faculty}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-lg bg-[#3a3a3a] border-2 border-white/50 px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#d59928] focus:border-[#d59928] focus:bg-[#404040] transition"
                                    >
                                        {facultyOptions.map((option) => (
                                            <option key={option.value} value={option.value} className="bg-[#1a1a1a] text-white">
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">
                                            رقم الطالب / Student ID *
                                        </label>
                                        <input
                                            type="text"
                                            name="id"
                                            value={formData.id}
                                            onChange={handleChange}
                                            required
                                            maxLength={7}
                                            className="w-full rounded-lg bg-[#3a3a3a] border-2 border-white/50 px-4 py-3 text-base text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#d59928] focus:border-[#d59928] focus:bg-[#404040] transition"
                                            placeholder="8241043"
                                        />
                                        <p className="text-xs text-white/60 mt-1">Your university-issued ID number</p>
                                        {errors.id && <span className="text-red-400 text-sm mt-1.5 block">{errors.id}</span>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-white mb-2">
                                            الرقم القومي / National ID *
                                        </label>
                                        <input
                                            type="text"
                                            name="nationalId"
                                            value={formData.nationalId}
                                            onChange={handleChange}
                                            required
                                            maxLength={14}
                                            className="w-full rounded-lg bg-[#3a3a3a] border-2 border-white/50 px-4 py-3 text-base text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#d59928] focus:border-[#d59928] focus:bg-[#404040] transition"
                                            placeholder="12345678901234"
                                        />
                                        <p className="text-xs text-white/60 mt-1">14-digit Egyptian National ID</p>
                                        {errors.nationalId && <span className="text-red-400 text-sm mt-1.5 block">{errors.nationalId}</span>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-white mb-2">
                                        المستوى الدراسي / Student Level *
                                    </label>
                                    <select
                                        name="studentLevel"
                                        value={formData.studentLevel}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-lg bg-[#3a3a3a] border-2 border-white/50 px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#d59928] focus:border-[#d59928] focus:bg-[#404040] transition"
                                    >
                                        <option value="" className="bg-[#1a1a1a] text-white">اختر المستوى / Select Level</option>
                                        {levelOptions.map((option) => (
                                            <option key={option.value} value={option.value} className="bg-[#1a1a1a] text-white">
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-white/60 mt-1">Select your current academic year</p>
                                    {errors.studentLevel && <span className="text-red-400 text-sm mt-1.5 block">{errors.studentLevel}</span>}
                                </div>

                                {/* Laptop Yes/No - only for trainees */}
                                {applicationType === 'trainee' && (
                                    <div>
                                        <label className="block text-base font-semibold text-white mb-3">
                                            {language === 'ar' ? 'هل لديك لابتوب؟' : 'Do you have a laptop?'}
                                        </label>
                                        <div className="flex gap-4">
                                            <label className={`flex items-center gap-2 p-4 rounded-lg cursor-pointer transition flex-1 border border-transparent ${formData.hasLaptop === true || formData.hasLaptop === 'true'
                                                ? 'bg-[#E8C15A] text-black border-[#E8C15A] shadow-lg shadow-[#E8C15A]/20'
                                                : 'bg-white/10 hover:bg-white/20 text-white border-white/5'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="hasLaptop"
                                                    value="true"
                                                    checked={formData.hasLaptop === true || formData.hasLaptop === 'true'}
                                                    onChange={handleChange}
                                                    className="w-5 h-5 accent-black"
                                                />
                                                <span className="font-bold">Yes</span>
                                            </label>
                                            <label className={`flex items-center gap-2 p-4 rounded-lg cursor-pointer transition flex-1 border border-transparent ${formData.hasLaptop === false || formData.hasLaptop === 'false'
                                                ? 'bg-[#E8C15A] text-black border-[#E8C15A] shadow-lg shadow-[#E8C15A]/20'
                                                : 'bg-white/10 hover:bg-white/20 text-white border-white/5'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="hasLaptop"
                                                    value="false"
                                                    checked={formData.hasLaptop === false || formData.hasLaptop === 'false'}
                                                    onChange={handleChange}
                                                    className="w-5 h-5 accent-black"
                                                />
                                                <span className="font-bold">No</span>
                                            </label>
                                        </div>
                                        {errors.hasLaptop && <span className="text-red-400 text-sm mt-1.5 block">{errors.hasLaptop}</span>}
                                        <p className="text-xs text-white/60 mt-2">Required for hands-on sessions.</p>
                                    </div>
                                )}

                                {/* Trainer profiles - only for trainers */}
                                {applicationType === 'trainer' && (
                                    <div className="bg-white/5 p-5 rounded-lg border border-white/20 space-y-4">
                                        <h3 className="text-lg font-bold text-white mb-3">Trainer Profiles</h3>
                                        <p className="text-sm text-white/70 mb-4">You can add Codeforces and LeetCode or both</p>

                                        <div>
                                            <label className="block text-sm font-semibold text-white mb-2">
                                                Codeforces Profile
                                            </label>
                                            <input
                                                type="text"
                                                name="codeforces"
                                                value={formData.codeforces}
                                                onChange={handleChange}
                                                className="w-full rounded-lg bg-[#3a3a3a] border-2 border-white/50 px-4 py-3 text-base text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#d59928] focus:border-[#d59928] focus:bg-[#404040] transition"
                                                placeholder="https://codeforces.com/profile/username"
                                            />
                                            <p className="text-xs text-white/60 mt-1">Enter your Codeforces profile URL. At least one profile (Codeforces or LeetCode) is required</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-white mb-2">
                                                LeetCode Profile
                                            </label>
                                            <input
                                                type="text"
                                                name="leetcode"
                                                value={formData.leetcode}
                                                onChange={handleChange}
                                                className="w-full rounded-lg bg-[#3a3a3a] border-2 border-white/50 px-4 py-3 text-base text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-[#d59928] focus:border-[#d59928] focus:bg-[#404040] transition"
                                                placeholder="https://leetcode.com/username"
                                            />
                                            <p className="text-xs text-white/60 mt-1">Enter your LeetCode profile URL. At least one profile (Codeforces or LeetCode) is required</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Email */}
                        {currentStep === 3 && (
                            <div className="space-y-4 sm:space-y-5">
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                                    {language === 'ar' ? 'البريد الإلكتروني / Email' : 'Email'}
                                </h2>
                                <p className="text-sm text-white/70 mb-6">
                                    {language === 'ar'
                                        ? 'يرجى إدخال بريدك الإلكتروني الجامعي (@horus.edu.eg)'
                                        : 'Please enter your university email (@horus.edu.eg)'}
                                </p>

                                <div>
                                    <label className="block text-sm font-semibold text-white mb-2">
                                        {language === 'ar' ? 'البريد الإلكتروني الجامعي / University Email' : 'University Email'} *
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="flex-1 rounded-lg px-4 py-3 text-base text-white placeholder-white/70 focus:outline-none focus:ring-2 transition bg-[#3a3a3a] border-2 border-white/50 focus:ring-[#d59928] focus:border-[#d59928] focus:bg-[#404040]"
                                            placeholder="username@horus.edu.eg"
                                        />
                                    </div>
                                    {errors.email && <span className="text-red-400 text-sm mt-1.5 block">{errors.email}</span>}
                                </div>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="mt-4 sm:mt-6 text-center text-sm sm:text-base text-red-400 bg-red-400/20 rounded-lg p-3 sm:p-4 border border-red-400/40 font-medium">
                                <XCircle className="inline-block w-5 h-5 mr-2 -mt-1" /> حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-6 sm:mt-8 gap-3 sm:gap-4">
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={currentStep === 1}
                                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3 rounded-lg bg-white/10 border border-white/30 text-white text-sm sm:text-base font-semibold hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                            >
                                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden xs:inline">Previous</span>
                                <span className="xs:hidden">Prev</span>
                            </button>

                            {currentStep < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3 rounded-lg bg-gradient-to-r from-[#d59928] to-[#e6b04a] text-white text-sm sm:text-base font-bold hover:shadow-2xl hover:shadow-[#d59928]/40 transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[48px]"
                                >
                                    Next
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    onClick={(e) => {
                                        const confirmMessage = language === 'ar'
                                            ? 'هل أنت متأكد من إرسال الطلب؟'
                                            : 'Are you sure you want to submit your application?';
                                        if (!window.confirm(confirmMessage)) {
                                            e.preventDefault();
                                            return;
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3 rounded-lg bg-gradient-to-r from-[#d59928] to-[#e6b04a] text-white text-sm sm:text-base font-bold hover:shadow-2xl hover:shadow-[#d59928]/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                                >
                                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                                    {isSubmitting ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (language === 'ar' ? 'إرسال الطلب' : 'Submit')}
                                </button>
                            )}
                        </div>

                        {/* Error message display */}
                        {errors.submit && (
                            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                                <p className="text-red-300 text-sm font-medium">{errors.submit}</p>
                            </div>
                        )}

                        {/* Success message display */}
                        {status === 'success' && (
                            <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                                <p className="text-green-300 text-sm font-medium">
                                    {language === 'ar'
                                        ? 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.'
                                        : 'Application submitted successfully! We will contact you soon.'}
                                </p>
                            </div>
                        )}
                    </form>
                </div>
            </section>
        </div>
    );
}

export default function ApplicationForm() {
    return (
        <Providers>
            <ApplicationFormContent />
        </Providers>
    );
}
