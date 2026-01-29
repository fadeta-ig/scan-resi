// src/app/admin/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './admin.module.css';
import {
    FolderOpen,
    Package,
    CheckCircle,
    AlertTriangle,
    Plus,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import type { SessionListItem } from '@/types/session';
import { getProgress } from '@/lib/utils';

interface SessionStats {
    totalSessions: number;
    totalItems: number;
    scannedItems: number;
    unscannedItems: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<SessionStats>({
        totalSessions: 0,
        totalItems: 0,
        scannedItems: 0,
        unscannedItems: 0
    });
    const [recentSessions, setRecentSessions] = useState<SessionListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/sessions');
            if (res.ok) {
                const sessions: SessionListItem[] = await res.json();

                // Calculate stats
                let totalItems = 0;
                let scannedItems = 0;

                sessions.forEach((s) => {
                    totalItems += s._count?.items || 0;
                    scannedItems += s.scannedCount || 0;
                });

                setStats({
                    totalSessions: sessions.length,
                    totalItems,
                    scannedItems,
                    unscannedItems: totalItems - scannedItems
                });

                setRecentSessions(sessions.slice(0, 5));
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // getProgress imported from lib/utils

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
                <h1 className={styles.pageTitle}>Dashboard</h1>
                <p className={styles.pageSubtitle}>Overview rekonsiliasi logistik</p>
            </header>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconBlue)}>
                        <FolderOpen size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.totalSessions}</div>
                        <div className={styles.statLabel}>Total Sesi</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconPurple)}>
                        <Package size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.totalItems.toLocaleString()}</div>
                        <div className={styles.statLabel}>Total Paket</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconGreen)}>
                        <CheckCircle size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.scannedItems.toLocaleString()}</div>
                        <div className={styles.statLabel}>Sudah Discan</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconOrange)}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{stats.unscannedItems.toLocaleString()}</div>
                        <div className={styles.statLabel}>Belum Discan</div>
                    </div>
                </div>
            </div>

            {/* Recent Sessions */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Sesi Terbaru</h2>
                    <Link href="/admin/sessions" className={clsx(styles.button, styles.buttonPrimary)}>
                        <Plus size={18} />
                        Buat Sesi Baru
                    </Link>
                </div>

                <div className={styles.cardBody} style={{ padding: 0 }}>
                    {recentSessions.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                            <FolderOpen size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                            <p>Belum ada sesi scanning</p>
                            <Link
                                href="/admin/sessions"
                                className={clsx(styles.button, styles.buttonPrimary)}
                                style={{ marginTop: 16 }}
                            >
                                <Plus size={18} />
                                Buat Sesi Pertama
                            </Link>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Nama Sesi</th>
                                    <th>Total Paket</th>
                                    <th>Progress</th>
                                    <th>Tanggal</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSessions.map((session) => {
                                    const total = session._count?.items || 0;
                                    const scanned = session.scannedCount || 0;
                                    const progress = getProgress(scanned, total);

                                    return (
                                        <tr key={session.id}>
                                            <td>
                                                <strong>{session.name}</strong>
                                            </td>
                                            <td>{total} paket</td>
                                            <td>
                                                <div className={styles.progressWrapper}>
                                                    <div className={styles.progressBar}>
                                                        <div
                                                            className={styles.progressFill}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <span className={styles.progressText}>{progress}%</span>
                                                </div>
                                            </td>
                                            <td>{new Date(session.createdAt).toLocaleDateString('id-ID')}</td>
                                            <td>
                                                <Link
                                                    href={`/admin/sessions/${session.id}`}
                                                    className={clsx(styles.button, styles.buttonSecondary, styles.buttonSmall)}
                                                >
                                                    Detail <ChevronRight size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}
