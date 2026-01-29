// src/app/warehouse/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './warehouse.module.css';
import { FolderOpen, Loader2, Package, ChevronRight, Hash, CheckCircle2 } from 'lucide-react';

interface Session {
    id: string;
    name: string;
    createdAt: string;
    isActive: boolean;
    _count: { items: number };
    scannedCount: number;
}

export default function WarehousePage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data.filter((s: Session) => s.isActive));
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.centerScreen}>
                <Loader2 size={40} className={styles.spin} style={{ color: 'var(--primary)' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Memuat Sesi Aktif...</p>
            </div>
        );
    }

    return (
        <div className={styles.sessionSelector}>
            <h2 className={styles.selectorTitle}>
                <div style={{ background: 'rgba(128, 0, 0, 0.08)', padding: 10, borderRadius: 12, display: 'flex' }}>
                    <FolderOpen size={24} style={{ color: 'var(--primary)' }} />
                </div>
                Pilih Sesi Scan
            </h2>

            {sessions.length === 0 ? (
                <div className={styles.centerScreen}>
                    <div style={{ background: 'rgba(128, 0, 0, 0.05)', padding: 32, borderRadius: 40, marginBottom: 16 }}>
                        <Package size={64} style={{ color: 'rgba(128, 0, 0, 0.2)' }} />
                    </div>
                    <h2>Tidak Ada Sesi Aktif</h2>
                    <p style={{ maxWidth: 300, margin: '0 auto' }}>Belum ada sesi pemindaian yang aktif saat ini. Silakan hubungi admin.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {sessions.map((session) => {
                        const total = session._count?.items || 0;
                        const scanned = session.scannedCount || 0;
                        const progress = total > 0 ? Math.round((scanned / total) * 100) : 0;

                        return (
                            <div
                                key={session.id}
                                className={styles.sessionCard}
                                onClick={() => router.push(`/warehouse/scan/${session.id}`)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                    <div style={{ flex: 1 }}>
                                        <div className={styles.sessionName}>{session.name}</div>
                                        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                                                <Hash size={14} /> {total} Paket
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700 }}>
                                                <CheckCircle2 size={14} /> {scanned} Terscan
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(128, 0, 0, 0.05)', padding: 8, borderRadius: 12 }}>
                                        <ChevronRight size={20} style={{ color: 'var(--primary)' }} />
                                    </div>
                                </div>

                                <div className={styles.progressBarWrapper}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Progres</span>
                                        <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{progress}%</span>
                                    </div>
                                    <div className={styles.progressBar}>
                                        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
