// src/app/superadmin/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../admin/admin.module.css';
import {
    Users,
    FolderOpen,
    Package,
    Activity,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import type { SessionListItem } from '@/types/session';
import type { ActivityLog } from '@/types/api';

interface DashboardStats {
    totalUsers: number;
    totalSessions: number;
    totalPackages: number;
    recentLogs: ActivityLog[];
}

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalSessions: 0,
        totalPackages: 0,
        recentLogs: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [usersRes, sessionsRes, logsRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/sessions'),
                fetch('/api/logs?limit=5')
            ]);

            const users = usersRes.ok ? await usersRes.json() : [];
            const sessions: SessionListItem[] = sessionsRes.ok ? await sessionsRes.json() : [];
            const logsData = logsRes.ok ? await logsRes.json() : { logs: [] };

            let totalPackages = 0;
            sessions.forEach((s) => {
                totalPackages += s._count?.items || 0;
            });

            setStats({
                totalUsers: users.length,
                totalSessions: sessions.length,
                totalPackages,
                recentLogs: logsData.logs || []
            });
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <Loader2 size={32} className={styles.spin} />
                <p style={{ marginTop: 16 }}>Memuat dashboard...</p>
            </div>
        );
    }

    return (
        <>
            <header className={styles.header}>
                <h1 className={styles.pageTitle}>Dashboard Utama</h1>
                <p className={styles.pageSubtitle}>Pusat Kontrol Sistem Pelacakan Paket</p>
            </header>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconBlue)}>
                        <Users size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.totalUsers}</div>
                        <div className={styles.statLabel}>Total User</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconPurple)}>
                        <FolderOpen size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.totalSessions}</div>
                        <div className={styles.statLabel}>Total Sesi</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconGreen)}>
                        <Package size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.totalPackages.toLocaleString()}</div>
                        <div className={styles.statLabel}>Total Paket</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconOrange)}>
                        <Activity size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.recentLogs.length}</div>
                        <div className={styles.statLabel}>Aktivitas Terbaru</div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
                <Link href="/superadmin/users" className={styles.card} style={{ textDecoration: 'none' }}>
                    <div className={styles.cardBody} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className={clsx(styles.statIcon, styles.statIconBlue)}>
                            <Users size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ color: '#1e293b', fontWeight: 700, marginBottom: 4 }}>User Management</h3>
                            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Tambah, edit, atau nonaktifkan user</p>
                        </div>
                        <ChevronRight size={20} style={{ color: '#94a3b8' }} />
                    </div>
                </Link>

                <Link href="/superadmin/logs" className={styles.card} style={{ textDecoration: 'none' }}>
                    <div className={styles.cardBody} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className={clsx(styles.statIcon, styles.statIconOrange)}>
                            <Activity size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ color: '#1e293b', fontWeight: 700, marginBottom: 4 }}>Activity Logs</h3>
                            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Lihat semua aktivitas sistem</p>
                        </div>
                        <ChevronRight size={20} style={{ color: '#94a3b8' }} />
                    </div>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Aktivitas Terbaru</h2>
                    <Link href="/superadmin/logs" className={clsx(styles.button, styles.buttonSecondary, styles.buttonSmall)}>
                        Lihat Semua
                    </Link>
                </div>

                <div className={styles.cardBody} style={{ padding: 0 }}>
                    {stats.recentLogs.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                            Belum ada aktivitas
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Waktu</th>
                                    <th>User</th>
                                    <th>Aksi</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {new Date(log.createdAt).toLocaleString('id-ID', {
                                                dateStyle: 'short',
                                                timeStyle: 'short'
                                            })}
                                        </td>
                                        <td>
                                            <strong>{log.user?.name}</strong>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>@{log.user?.username}</div>
                                        </td>
                                        <td>
                                            <span className={clsx(styles.badge, styles.badgeInfo)}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                            {log.ipAddress || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}
