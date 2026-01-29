// src/contexts/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    username: string;
    name: string;
    role: 'ADMIN' | 'WAREHOUSE' | 'SUPER_ADMIN';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const refreshUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = async (username: string, password: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Login gagal' };
            }
        } catch {
            return { success: false, error: 'Terjadi kesalahan. Coba lagi.' };
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
            setUser(null);
            router.push('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Role-based access hooks
export function useRequireAuth(allowedRoles?: ('ADMIN' | 'WAREHOUSE' | 'SUPER_ADMIN')[]) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }

        if (!loading && user && allowedRoles) {
            if (!allowedRoles.includes(user.role)) {
                // Redirect to appropriate dashboard
                if (user.role === 'ADMIN') router.push('/admin');
                else if (user.role === 'WAREHOUSE') router.push('/warehouse');
                else if (user.role === 'SUPER_ADMIN') router.push('/superadmin');
            }
        }
    }, [user, loading, allowedRoles, router]);

    return { user, loading, isAuthorized: user && (!allowedRoles || allowedRoles.includes(user.role)) };
}
