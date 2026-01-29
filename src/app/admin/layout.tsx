// src/app/admin/layout.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRequireAuth, useAuth } from '@/contexts/AuthContext';
import styles from './admin.module.css';
import { clsx } from 'clsx';
import {
    PackageSearch,
    LayoutDashboard,
    FolderOpen,
    LogOut,
    Loader2,
    Shield
} from 'lucide-react';

const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { href: '/admin/sessions', icon: FolderOpen, label: 'Sesi Scanning', exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isAuthorized } = useRequireAuth(['ADMIN', 'SUPER_ADMIN']);
    const { logout } = useAuth();
    const pathname = usePathname();

    if (loading) {
        return (
            <div className={styles.adminLayout}>
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

    const isActive = (href: string, exact: boolean) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <div className={styles.adminLayout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>
                            <PackageSearch size={20} />
                        </div>
                        <div>
                            <div className={styles.logoText}>Wijaya Tracking</div>
                            <div className={styles.logoSubtext}>Admin Solution</div>
                        </div>
                    </div>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                styles.navItem,
                                isActive(item.href, item.exact) && styles.navItemActive
                            )}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </Link>
                    ))}

                    {user?.role === 'SUPER_ADMIN' && (
                        <Link href="/superadmin" className={styles.navItem}>
                            <Shield size={20} />
                            Super Admin
                        </Link>
                    )}
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userCard}>
                        <div className={styles.userAvatar}>
                            {user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.userInfo}>
                            <div className={styles.userName}>{user?.name}</div>
                            <div className={styles.userRole}>
                                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                            </div>
                        </div>
                        <button onClick={logout} className={styles.logoutButton} title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
