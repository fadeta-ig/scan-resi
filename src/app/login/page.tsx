// src/app/login/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './login.module.css';
import { PackageSearch, User, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, loading: authLoading, login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && user) {
            // Redirect based on role
            if (user.role === 'SUPER_ADMIN') router.push('/superadmin');
            else if (user.role === 'ADMIN') router.push('/admin');
            else if (user.role === 'WAREHOUSE') router.push('/warehouse');
        }
    }, [user, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(username, password);

        if (!result.success) {
            setError(result.error || 'Login gagal');
            setLoading(false);
        }
        // If success, useEffect will handle redirect
    };

    if (authLoading) {
        return (
            <div className={styles.loginContainer}>
                <div className={styles.loginCard}>
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Loader2 size={32} className={styles.spin} />
                        <p style={{ marginTop: 16, color: '#6b7280' }}>Memuat...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <PackageSearch size={32} strokeWidth={1.5} />
                    </div>
                </div>

                <h1 className={styles.title}>Sistem Pelacakan Paket</h1>
                <p className={styles.subtitle}>PT Wijaya Inovasi Gemilang</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="username">Username</label>
                        <div className={styles.inputWrapper}>
                            <User size={18} className={styles.inputIcon} />
                            <input
                                id="username"
                                type="text"
                                placeholder="Masukkan username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <div className={styles.inputWrapper}>
                            <Lock size={18} className={styles.inputIcon} />
                            <input
                                id="password"
                                type="password"
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading || !username || !password}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className={styles.spin} />
                                Memproses...
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                Masuk
                            </>
                        )}
                    </button>
                </form>

                <div className={styles.demoCredentials}>
                    <p className={styles.demoTitle}>Demo Credentials</p>
                    <div className={styles.demoList}>
                        <div className={styles.demoItem}>
                            <span>Super Admin:</span>
                            <code>superadmin / super123</code>
                        </div>
                        <div className={styles.demoItem}>
                            <span>Admin:</span>
                            <code>admin / admin123</code>
                        </div>
                        <div className={styles.demoItem}>
                            <span>Warehouse:</span>
                            <code>staff / staff123</code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
