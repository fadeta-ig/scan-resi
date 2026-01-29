// src/app/superadmin/logs/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import styles from '../../admin/admin.module.css';
import {
    FileText,
    Search,
    Filter,
    Download,
    Loader2,
    RefreshCw,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';

interface ActivityLog {
    id: string;
    userId: string;
    user: { username: string; name: string };
    action: string;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

const actionLabels: Record<string, { label: string; color: string }> = {
    LOGIN: { label: 'Login', color: 'badgeInfo' },
    LOGOUT: { label: 'Logout', color: 'badgeWarning' },
    CREATE_SESSION: { label: 'Buat Sesi', color: 'badgeSuccess' },
    UPLOAD_EXCEL: { label: 'Upload Excel', color: 'badgeSuccess' },
    SCAN_ITEM: { label: 'Scan Paket', color: 'badgeInfo' },
    CREATE_USER: { label: 'Buat User', color: 'badgeSuccess' },
    UPDATE_USER: { label: 'Update User', color: 'badgeWarning' },
    DEACTIVATE_USER: { label: 'Nonaktifkan User', color: 'badgeDanger' }
};

export default function LogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const limit = 20;

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchLogs, 10000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, page, actionFilter]);

    const fetchLogs = async () => {
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: (page * limit).toString()
            });
            if (actionFilter) params.append('action', actionFilter);

            const res = await fetch(`/api/logs?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            log.user?.name?.toLowerCase().includes(query) ||
            log.user?.username?.toLowerCase().includes(query) ||
            log.action.toLowerCase().includes(query) ||
            log.ipAddress?.toLowerCase().includes(query)
        );
    });

    const exportToExcel = () => {
        const data = logs.map(log => ({
            'Waktu': new Date(log.createdAt).toLocaleString('id-ID'),
            'User': log.user?.name,
            'Username': log.user?.username,
            'Aksi': log.action,
            'Detail': log.details ? JSON.stringify(JSON.parse(log.details)) : '-',
            'IP Address': log.ipAddress || '-',
            'User Agent': log.userAgent || '-'
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs');
        XLSX.writeFile(wb, `Activity_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const totalPages = Math.ceil(total / limit);

    if (loading && logs.length === 0) {
        return (
            <div className={styles.loading}>
                <Loader2 size={32} className={styles.spin} />
                <p style={{ marginTop: 16 }}>Memuat log aktivitas...</p>
            </div>
        );
    }

    return (
        <>
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 className={styles.pageTitle}>Activity Logs</h1>
                        <p className={styles.pageSubtitle}>Audit trail semua aktivitas sistem</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            className={clsx(styles.button, styles.buttonSecondary)}
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            style={{ background: 'white' }}
                        >
                            <RefreshCw size={18} className={autoRefresh ? styles.spin : ''} />
                            {autoRefresh ? 'Auto ON' : 'Auto-Refresh'}
                        </button>
                        <button
                            className={clsx(styles.button, styles.buttonPrimary)}
                            onClick={exportToExcel}
                        >
                            <Download size={18} />
                            Export Excel
                        </button>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className={styles.card} style={{ marginBottom: 20 }}>
                <div className={styles.cardBody} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 250px' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Cari user, aksi, IP..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.formInput}
                            style={{ paddingLeft: 40 }}
                        />
                    </div>
                    <select
                        className={styles.formInput}
                        style={{ flex: '0 0 200px' }}
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
                    >
                        <option value="">Semua Aksi</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGOUT">Logout</option>
                        <option value="CREATE_SESSION">Buat Sesi</option>
                        <option value="SCAN_ITEM">Scan Paket</option>
                        <option value="CREATE_USER">Buat User</option>
                        <option value="UPDATE_USER">Update User</option>
                        <option value="DEACTIVATE_USER">Nonaktifkan User</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className={styles.card}>
                <div className={styles.cardBody} style={{ padding: 0 }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>User</th>
                                <th>Aksi</th>
                                <th>Detail</th>
                                <th>IP Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                                        Tidak ada log yang ditemukan
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const actionInfo = actionLabels[log.action] || { label: log.action, color: 'badgeInfo' };
                                    let details = '-';
                                    try {
                                        if (log.details) {
                                            const parsed = JSON.parse(log.details);
                                            details = Object.entries(parsed)
                                                .map(([k, v]) => `${k}: ${v}`)
                                                .join(', ');
                                        }
                                    } catch {
                                        details = log.details || '-';
                                    }

                                    return (
                                        <tr key={log.id}>
                                            <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                                {new Date(log.createdAt).toLocaleString('id-ID', {
                                                    dateStyle: 'short',
                                                    timeStyle: 'medium'
                                                })}
                                            </td>
                                            <td>
                                                <strong>{log.user?.name}</strong>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>@{log.user?.username}</div>
                                            </td>
                                            <td>
                                                <span className={clsx(styles.badge, styles[actionInfo.color])}>
                                                    {actionInfo.label}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {details}
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                                {log.ipAddress || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--glass-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                            Halaman {page + 1} dari {totalPages} ({total} total)
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className={clsx(styles.button, styles.buttonSecondary, styles.buttonSmall)}
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <button
                                className={clsx(styles.button, styles.buttonSecondary, styles.buttonSmall)}
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
