/* src/components/Sidebar/Sidebar.tsx */
"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';
import { clsx } from 'clsx';
import logoImg from '@/assets/Logo WIG.png';
import {
    ChevronLeft,
    ChevronRight,
    LogOut,
    LucideIcon
} from 'lucide-react';

interface NavItem {
    href: string;
    icon: LucideIcon;
    label: string;
    exact?: boolean;
}

interface SidebarProps {
    navItems: NavItem[];
    roleLabel: string;
    isCollapsed: boolean;
    onToggle: (collapsed: boolean) => void;
}

export default function Sidebar({ navItems, roleLabel, isCollapsed, onToggle }: SidebarProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    // Auto-collapse logic
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                onToggle(true);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Run on mount

        return () => window.removeEventListener('resize', handleResize);
    }, [onToggle]);

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <aside className={clsx(styles.sidebar, isCollapsed && styles.sidebarCollapsed)}>
            <button
                className={styles.toggleBtn}
                onClick={() => onToggle(!isCollapsed)}
                aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <div className={styles.sidebarHeader}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <Image src={logoImg} alt="Logo" width={32} height={32} />
                    </div>
                    {!isCollapsed && (
                        <div className={styles.logoText}>Wijaya Tracking</div>
                    )}
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
                        title={isCollapsed ? item.label : ""}
                    >
                        <item.icon size={22} className={styles.navIcon} />
                        {!isCollapsed && <span className={styles.navLabel}>{item.label}</span>}
                    </Link>
                ))}
            </nav>

            <div className={styles.footer}>
                <div className={clsx(styles.userCard, isCollapsed && styles.userCardCollapsed)}>
                    <div className={styles.avatar}>
                        {user?.name.charAt(0).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className={styles.userInfo}>
                                <div className={styles.userName}>{user?.name}</div>
                                <div className={styles.userRole}>{roleLabel}</div>
                            </div>
                            <button onClick={logout} className={styles.logoutBtn} title="Logout">
                                <LogOut size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}
