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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Image src={logoImg} alt="Logo" width={24} height={24} />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary)' }}>Wijaya Tracking</span>
                </div>
                <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)' }}
                >
                    {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
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
                    isCollapsed={isCollapsed}
                    onToggle={setIsCollapsed}
                />
            </div>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
