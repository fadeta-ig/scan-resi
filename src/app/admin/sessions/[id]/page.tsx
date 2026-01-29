// src/app/admin/sessions/[id]/page.tsx
"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import styles from '../../admin.module.css';
import {
    ArrowLeft,
    Package,
    CheckCircle,
    AlertTriangle,
    Download,
    FileSpreadsheet,
    FileText,
    Loader2,
    RefreshCw,
    Search
} from 'lucide-react';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SessionItem {
    id: string;
    trackingId: string;
    recipient: string;
    productName: string;
    status: string;
    scannedAt: string | null;
    scannedBy?: { name: string };
}

interface SessionDetail {
    id: string;
    name: string;
    createdAt: string;
    items: SessionItem[];
    stats: {
        total: number;
        scannedCount: number;
        missingCount: number;
        progress: number;
    };
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [session, setSession] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'scanned' | 'unscanned'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(false);

    useEffect(() => {
        fetchSession();
    }, [resolvedParams.id]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchSession, 5000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, resolvedParams.id]);

    const fetchSession = async () => {
        try {
            const res = await fetch(`/api/sessions/${resolvedParams.id}/scan`);
            if (res.ok) {
                setSession(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch session:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = session?.items.filter(item => {
        const matchesFilter =
            filter === 'all' ||
            (filter === 'scanned' && item.status === 'SCANNED') ||
            (filter === 'unscanned' && item.status === 'UNSCANNED');

        const matchesSearch =
            !searchQuery ||
            item.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.recipient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.productName?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesSearch;
    }) || [];

    const exportToExcel = () => {
        if (!session) return;

        const scanned = session.items.filter(i => i.status === 'SCANNED');
        const unscanned = session.items.filter(i => i.status === 'UNSCANNED');

        const wb = XLSX.utils.book_new();

        // Scanned sheet
        const scannedData = scanned.map(item => ({
            'Tracking ID': item.trackingId,
            'Penerima': item.recipient || '-',
            'Produk': item.productName || '-',
            'Waktu Scan': item.scannedAt ? new Date(item.scannedAt).toLocaleString('id-ID') : '-'
        }));
        const ws1 = XLSX.utils.json_to_sheet(scannedData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Terkirim');

        // Unscanned sheet
        const unscannedData = unscanned.map(item => ({
            'Tracking ID': item.trackingId,
            'Penerima': item.recipient || '-',
            'Produk': item.productName || '-'
        }));
        const ws2 = XLSX.utils.json_to_sheet(unscannedData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Hilang-Tertinggal');

        XLSX.writeFile(wb, `Rekonsiliasi_${session.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        if (!session) return;

        const doc = new jsPDF();
        const scanned = session.items.filter(i => i.status === 'SCANNED');
        const unscanned = session.items.filter(i => i.status === 'UNSCANNED');

        // Title
        doc.setFontSize(18);
        doc.text('Laporan Rekonsiliasi', 14, 22);
        doc.setFontSize(12);
        doc.text(`Sesi: ${session.name}`, 14, 32);
        doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 40);

        // Summary
        doc.setFontSize(10);
        doc.text(`Total: ${session.stats.total} | Terkirim: ${session.stats.scannedCount} | Tertinggal: ${session.stats.missingCount}`, 14, 50);

        // Scanned table
        doc.setFontSize(14);
        doc.text('Paket Terkirim (Scanned)', 14, 65);

        autoTable(doc, {
            startY: 70,
            head: [['No', 'Tracking ID', 'Penerima', 'Waktu Scan']],
            body: scanned.map((item, idx) => [
                idx + 1,
                item.trackingId,
                item.recipient || '-',
                item.scannedAt ? new Date(item.scannedAt).toLocaleString('id-ID') : '-'
            ]),
            headStyles: { fillColor: [34, 197, 94] },
            styles: { fontSize: 8 }
        });

        // Unscanned table
        const finalY = (doc as any).lastAutoTable.finalY || 70;
        doc.setFontSize(14);
        doc.text('Paket Hilang/Tertinggal (Unscanned)', 14, finalY + 15);

        autoTable(doc, {
            startY: finalY + 20,
            head: [['No', 'Tracking ID', 'Penerima', 'Produk']],
            body: unscanned.map((item, idx) => [
                idx + 1,
                item.trackingId,
                item.recipient || '-',
                item.productName || '-'
            ]),
            headStyles: { fillColor: [239, 68, 68] },
            styles: { fontSize: 8 }
        });

        doc.save(`Rekonsiliasi_${session.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <Loader2 size={32} className={styles.spin} />
                <p style={{ marginTop: 16 }}>Memuat detail sesi...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className={styles.loading}>
                <AlertTriangle size={48} style={{ color: '#f59e0b', marginBottom: 16 }} />
                <p>Sesi tidak ditemukan</p>
                <Link href="/admin/sessions" className={clsx(styles.button, styles.buttonPrimary)} style={{ marginTop: 16 }}>
                    Kembali
                </Link>
            </div>
        );
    }

    const progress = Math.round(session.stats.progress);

    return (
        <>
            <header className={styles.header}>
                <Link
                    href="/admin/sessions"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--primary)',
                        marginBottom: 16,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '8px 16px',
                        background: 'white',
                        borderRadius: 12,
                        boxShadow: 'var(--glass-shadow)',
                        border: '1px solid rgba(128, 0, 0, 0.1)'
                    }}
                >
                    <ArrowLeft size={16} /> Kembali ke Daftar Sesi
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 className={styles.pageTitle}>{session.name}</h1>
                        <p className={styles.pageSubtitle}>
                            Dibuat {new Date(session.createdAt).toLocaleDateString('id-ID', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            className={clsx(styles.button, styles.buttonSecondary)}
                            onClick={() => setAutoRefresh(!autoRefresh)}
                        >
                            <RefreshCw size={18} className={autoRefresh ? styles.spin : ''} />
                            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh'}
                        </button>
                        <button className={clsx(styles.button, styles.buttonSecondary)} onClick={exportToExcel}>
                            <FileSpreadsheet size={18} /> Excel
                        </button>
                        <button className={clsx(styles.button, styles.buttonPrimary)} onClick={exportToPDF}>
                            <FileText size={18} /> PDF
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconPurple)}>
                        <Package size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{session.stats.total}</div>
                        <div className={styles.statLabel}>Total Paket</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconGreen)}>
                        <CheckCircle size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{session.stats.scannedCount}</div>
                        <div className={styles.statLabel}>Terkirim (Scanned)</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconOrange)}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{session.stats.missingCount}</div>
                        <div className={styles.statLabel}>Tertinggal (Unscanned)</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span className={styles.statLabel}>Progress</span>
                            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{progress}%</span>
                        </div>
                        <div className={styles.progressBar} style={{ height: 12, borderRadius: 100 }}>
                            <div className={styles.progressFill} style={{ width: `${progress}%`, borderRadius: 100 }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <h2 className={styles.cardTitle}>Daftar Paket</h2>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {(['all', 'scanned', 'unscanned'] as const).map(f => (
                                <button
                                    key={f}
                                    className={clsx(
                                        styles.button,
                                        styles.buttonSmall,
                                        filter === f ? styles.buttonPrimary : styles.buttonSecondary
                                    )}
                                    onClick={() => setFilter(f)}
                                >
                                    {f === 'all' ? 'Semua' : f === 'scanned' ? 'Terkirim' : 'Tertinggal'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Cari tracking ID, penerima..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: 40, width: 280 }}
                            className={styles.formInput}
                        />
                    </div>
                </div>

                <div className={styles.cardBody} style={{ padding: 0 }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Tracking ID</th>
                                <th>Penerima</th>
                                <th>Produk</th>
                                <th>Status</th>
                                <th>Waktu Scan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                                        Tidak ada data yang sesuai filter
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id}>
                                        <td><strong>{item.trackingId}</strong></td>
                                        <td>{item.recipient || '-'}</td>
                                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.productName || '-'}
                                        </td>
                                        <td>
                                            {item.status === 'SCANNED' ? (
                                                <span className={clsx(styles.badge, styles.badgeSuccess)}>
                                                    <CheckCircle size={12} /> Terkirim
                                                </span>
                                            ) : (
                                                <span className={clsx(styles.badge, styles.badgeWarning)}>
                                                    <AlertTriangle size={12} /> Tertinggal
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {item.scannedAt
                                                ? new Date(item.scannedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                                                : '-'
                                            }
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
