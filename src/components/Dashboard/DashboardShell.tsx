/* src/components/Dashboard/DashboardShell.tsx */
"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import styles from '@/components/Sidebar/Sidebar.module.css';
import { useRequireAuth } from '@/contexts/AuthContext';
import { Loader2, LucideIcon, Menu, X } from 'lucide-react';
import Image from 'next/image';
import logoImg from '@/assets/Logo WIG.png';
import { clsx } from 'clsx';
import { usePathname } from 'next/navigation';

interface NavItem {
    href: string;
    icon: LucideIcon;
    label: string;
    exact?: boolean;
}

interface DashboardShellProps {
    children: React.ReactNode;
    navItems: NavItem[];
    roleLabel: string;
    requiredRoles: ('ADMIN' | 'WAREHOUSE' | 'SUPER_ADMIN')[];
}

export default function DashboardShell({
    children,
    navItems,
    roleLabel,
    requiredRoles
}: DashboardShellProps) {
    const { loading, isAuthorized } = useRequireAuth(requiredRoles);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const pathname = usePathname();

    // Auto-close mobile menu on navigation
    React.useEffect(() => {
        setShowMobileMenu(false);
    }, [pathname]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loading}>
                    <Loader2 size={32} className={styles.spin} />
                    <p style={{ marginTop: 16 }}>Memuat...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <div
            className={styles.adminLayout}
            style={{ "--sidebar-width": isCollapsed ? "80px" : "280px" } as React.CSSProperties}
        >
            {/* Mobile Header */}
            <header className={styles.mobileHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        background: 'white',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 4,
                        border: '1px solid rgba(128, 0, 0, 0.05)'
                    }}>
                        <Image src={logoImg} alt="Logo" width={24} height={24} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>Wijaya Tracking</span>
                </div>
                <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className={styles.mobileCloseBtn}
                >
                    {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
                </button>
            </header>

            {/* Backdrop */}
            {showMobileMenu && (
                <div className={styles.sidebarOverlay} onClick={() => setShowMobileMenu(false)} />
            )}

            <div className={clsx(showMobileMenu && styles.sidebarOpenMobile)}>
                <Sidebar
                    navItems={navItems}
                    roleLabel={roleLabel}
                    isCollapsed={showMobileMenu ? false : isCollapsed}
                    onToggle={setIsCollapsed}
                />
            </div>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div >
    );
}
