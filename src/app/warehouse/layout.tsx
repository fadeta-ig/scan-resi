// src/app/warehouse/layout.tsx
"use client";

import React from 'react';
import { useRequireAuth, useAuth } from '@/contexts/AuthContext';
import styles from './warehouse.module.css';
import { PackageCheck, LogOut, Loader2 } from 'lucide-react';

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isAuthorized } = useRequireAuth(['WAREHOUSE', 'SUPER_ADMIN']);
    const { logout } = useAuth();

    if (loading) {
        return (
            <div className={styles.warehouseLayout}>
                <div className={styles.centerScreen}>
                    <Loader2 size={48} className={styles.spin} style={{ color: 'var(--primary)' }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Menautkan Sesi...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className={styles.warehouseLayout}>
            <header className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <PackageCheck size={22} color="white" />
                    </div>
                    <div>
                        <span className={styles.logoText}>Wijaya Tracking</span>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700, marginTop: -2, letterSpacing: '0.05em' }}>WAREHOUSE</div>
                    </div>
                </div>

                <div className={styles.userInfo}>
                    <div style={{ textAlign: 'right', marginRight: 8, display: 'none' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{user?.name}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-dim)' }}>Operator</div>
                    </div>
                    <div className={styles.userAvatar}>
                        {user?.name.charAt(0).toUpperCase()}
                    </div>
                    <button onClick={logout} className={styles.logoutButton} title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
