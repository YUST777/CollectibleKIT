'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CACHE_VERSION } from '@/lib/cache-version';

// Types
interface User {
    id: number;
    email: string;
    is_verified?: boolean;
    telegram_username?: string;
    is_public?: boolean;
    role?: string;
    profile_visibility?: 'public' | 'private';
    profile_picture?: string | null;
    created_at?: string;
}

interface Profile {
    id: number;
    name: string;
    faculty: string;
    student_id: string;
    student_level: string;
    telephone: string;
    codeforces_profile?: string;
    leetcode_profile?: string;
    telegram_username?: string;
    codeforces_data?: {
        rating?: number;
        maxRating?: number;
        rank?: string;
        handle?: string;
    };
    leetcode_data?: {
        totalSolved?: number;
        ranking?: number;
    };
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ token: string; user: User }>;
    register: (email: string, password: string) => Promise<{ token: string; user: User }>;
    checkEmail: (email: string) => Promise<{ exists: boolean; hasAccount: boolean }>;
    logout: () => void;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Cookie utilities
const setCookie = (name: string, value: string, days = 30): void => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
};

const deleteCookie = (name: string): void => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`;
};

// Token utilities
const getStoredToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken') || getCookie('authToken');
};

const storeToken = (token: string): void => {
    localStorage.setItem('authToken', token);
    setCookie('authToken', token, 30);
};

const clearToken = (): void => {
    localStorage.removeItem('authToken');
    deleteCookie('authToken');
};

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);

    const logout = useCallback(() => {
        clearToken();
        setToken(null);
        setUser(null);
        setProfile(null);
    }, []);

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = getStoredToken();

            if (storedToken) {
                setToken(storedToken);
                try {
                    // Add timeout to prevent infinite loading
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);

                    const response = await fetch(`/api/auth/me?_v=${CACHE_VERSION}`, {
                        headers: {
                            Authorization: `Bearer ${storedToken}`,
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache'
                        },
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        setUser(data.user);
                        setProfile(data.profile);
                    } else if (response.status === 401) {
                        // Token is definitely invalid
                        console.warn('[AuthContext] Token expired (401), clearing auth.');
                        logout();
                    } else {
                        // Server error or other issue - DON'T logout, just log error
                        console.error(`[AuthContext] Failed to verify token. Status: ${response.status}`);
                    }
                } catch (error) {
                    console.error('[AuthContext] Network error verifying token:', error);
                    // On network error or timeout, we might want to keep the token but maybe stop loading?
                    // For now, we proceed to setLoading(false) so the app renders
                }
            }

            setLoading(false);
        };

        initAuth();
    }, [logout]);

    const fetchUserProfile = useCallback(async () => {
        const currentToken = getStoredToken();
        if (!currentToken) return; // Don't set loading false here, it's global reload

        try {
            const response = await fetch(`/api/auth/me?_v=${CACHE_VERSION}`, {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                setProfile(data.profile);

                // Smart Refresh: Check if Codeforces data is stale (> 1 hour)
                const cfData = data.profile?.codeforces_data;
                if (cfData) {
                    const lastUpdated = cfData.lastUpdated ? new Date(cfData.lastUpdated).getTime() : 0;
                    const oneHour = 60 * 60 * 1000;
                    const now = Date.now();

                    if (!lastUpdated || (now - lastUpdated > oneHour)) {
                        console.log('[AuthContext] Codeforces data stale, refreshing in background...');
                        // Fire and forget - don't await
                        fetch('/api/user/refresh-cf', {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${currentToken}`
                            }
                        }).catch(err => console.error('Background refresh failed:', err));
                    }
                }
            } else if (response.status === 401) {
                logout();
            }
        } catch (error) {
            console.error('[AuthContext] Refresh profile error:', error);
        }
    }, [logout]);

    const login = async (email: string, password: string) => {
        // Sanitize inputs for mobile compatibility
        const sanitizedEmail = email.trim().toLowerCase();
        // We generally shouldn't trim passwords, but for mobile login forms, trailing scpace is a common error.
        // However, if a user actually HAS a space, this would break it. 
        // Let's safe-guard email only for now, as that's the primary "User not found" key.

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: sanitizedEmail, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        storeToken(data.token);
        setToken(data.token);
        setUser(data.user);

        // Fetch full profile immediately after login
        await fetchUserProfile();

        return data;
    };

    const register = async (email: string, password: string) => {
        const sanitizedEmail = email.trim().toLowerCase();

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: sanitizedEmail, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        storeToken(data.token);
        setToken(data.token);
        setUser(data.user);

        return data;
    };

    const checkEmail = async (email: string) => {
        const response = await fetch('/api/auth/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Email check failed');
        }

        return data;
    };

    const value: AuthContextType = {
        user,
        profile,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        checkEmail,
        logout,
        refreshProfile: fetchUserProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
