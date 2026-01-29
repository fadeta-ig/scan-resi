// src/app/admin/sessions/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from '../admin.module.css';
import {
    Plus,
    FileSpreadsheet,
    ChevronRight,
    Loader2,
    Upload,
    FolderOpen,
    Trash2,
    X
} from 'lucide-react';
import { clsx } from 'clsx';
import Modal from '@/components/Modal/Modal';

interface Session {
    id: string;
    name: string;
    createdAt: string;
    isActive: boolean;
    _count: { items: number };
    scannedCount: number;
    createdBy?: { name: string };
}

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [sessionName, setSessionName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [creating, setCreating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/sessions');
            if (res.ok) {
                setSessions(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionName || !file) return;

        setCreating(true);
        const formData = new FormData();
        formData.append('name', sessionName);
        formData.append('file', file);

        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setShowCreateModal(false);
                setSessionName('');
                setFile(null);
                fetchSessions();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal membuat sesi');
            }
        } catch (error) {
            alert('Terjadi kesalahan server');
        } finally {
            setCreating(false);
        }
    };

    const getProgress = (scanned: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((scanned / total) * 100);
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <Loader2 size={32} className={styles.spin} />
                <p style={{ marginTop: 16 }}>Memuat sesi...</p>
            </div>
        );
    }

    return (
        <>
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className={styles.pageTitle}>Sesi Scanning</h1>
                        <p className={styles.pageSubtitle}>Kelola sesi rekonsiliasi paket</p>
                    </div>
                    <button
                        className={clsx(styles.button, styles.buttonPrimary)}
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={18} />
                        Buat Sesi Baru
                    </button>
                </div>
            </header>

            {/* Sessions List */}
            <div className={styles.card}>
                <div className={styles.cardBody} style={{ padding: 0 }}>
                    {sessions.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
                            <FolderOpen size={64} style={{ marginBottom: 20, opacity: 0.3 }} />
                            <h3 style={{ marginBottom: 8, color: '#334155' }}>Belum Ada Sesi</h3>
                            <p style={{ marginBottom: 24 }}>Buat sesi baru untuk memulai scanning</p>
                            <button
                                className={clsx(styles.button, styles.buttonPrimary)}
                                onClick={() => setShowCreateModal(true)}
                            >
                                <Plus size={18} />
                                Buat Sesi Pertama
                            </button>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Nama Sesi</th>
                                    <th>Total Paket</th>
                                    <th>Progress</th>
                                    <th>Dibuat Oleh</th>
                                    <th>Tanggal</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((session) => {
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
                                            <td>{session.createdBy?.name || '-'}</td>
                                            <td>{new Date(session.createdAt).toLocaleDateString('id-ID')}</td>
                                            <td>
                                                {progress === 100 ? (
                                                    <span className={clsx(styles.badge, styles.badgeSuccess)}>Selesai</span>
                                                ) : session.isActive ? (
                                                    <span className={clsx(styles.badge, styles.badgeInfo)}>Aktif</span>
                                                ) : (
                                                    <span className={clsx(styles.badge, styles.badgeWarning)}>Nonaktif</span>
                                                )}
                                            </td>
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

            {/* Create Session Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Buat Sesi Baru"
                maxWidth={500}
            >
                <form onSubmit={handleCreateSession}>
                    <div className={styles.formGroup}>
                        <label>Nama Sesi</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            placeholder="Contoh: Sesi Pickup Siang"
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>File Excel Manifest</label>
                        <div
                            className={clsx(styles.uploadBox, file && styles.uploadBoxActive)}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <FileSpreadsheet size={40} className={styles.uploadIcon} style={{ color: file ? 'var(--primary)' : undefined }} />
                            <div className={styles.uploadText}>
                                {file ? file.name : 'Klik untuk upload file Excel'}
                            </div>
                            <div className={styles.uploadHint}>
                                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Format: .xlsx, .xls'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button
                            type="button"
                            className={clsx(styles.button, styles.buttonSecondary)}
                            onClick={() => setShowCreateModal(false)}
                            style={{ flex: 1 }}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className={clsx(styles.button, styles.buttonPrimary)}
                            disabled={creating || !sessionName || !file}
                            style={{ flex: 1 }}
                        >
                            {creating ? (
                                <>
                                    <Loader2 size={18} className={styles.spin} />
                                    Membuat...
                                </>
                            ) : (
                                <>
                                    <Upload size={18} />
                                    Buat & Import
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
