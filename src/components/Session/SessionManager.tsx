"use client";

import React, { useState, useEffect } from 'react';
import styles from './SessionManager.module.css';
import { Upload, Plus, FileSpreadsheet, ChevronRight, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SessionManagerProps {
    onSessionSelected: (sessionId: string) => void;
}

export default function SessionManager({ onSessionSelected }: SessionManagerProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sessionName, setSessionName] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/sessions');
            if (res.ok) setSessions(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionName || !file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('name', sessionName);
        formData.append('file', file);

        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const newSession = await res.json();
                setSessionName('');
                setFile(null);
                await fetchSessions();
                onSessionSelected(newSession.id);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create session');
            }
        } catch (e) {
            alert('Internal Server Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={clsx(styles.managerContainer, 'glass', 'animate-fade-in')}>
            <h2 className={styles.title}>Manajemen Sesi</h2>

            <form className={styles.inputGroup} onSubmit={handleCreateSession}>
                <div className={styles.inputGroup}>
                    <label>Nama Sesi (Contoh: Pengiriman Pagi)</label>
                    <input
                        type="text"
                        placeholder="Ketik nama sesi..."
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                    />
                </div>

                <div className={styles.uploadBox} onClick={() => document.getElementById('excel-upload')?.click()}>
                    <input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <FileSpreadsheet size={32} color={file ? 'var(--primary)' : 'var(--text-dim)'} style={{ marginBottom: 16 }} />
                    <h3>{file ? file.name : 'Upload File Excel Pesanan'}</h3>
                    <p>Klik untuk memilih file TikTok/Logistik (.xlsx)</p>
                </div>

                <button
                    className={styles.createButton}
                    disabled={loading || !sessionName || !file}
                    type="submit"
                >
                    {loading ? <Loader2 className="spin" /> : <Plus size={20} />}
                    Buat Sesi & Import Data
                </button>
            </form>

            <div className={styles.sessionList}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: 20 }}>Sesi Terbaru</h3>
                {sessions.length === 0 ? (
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Belum ada sesi scanning.</p>
                ) : (
                    sessions.map(s => (
                        <div key={s.id} className={clsx(styles.sessionCard, 'glass')}>
                            <div className={styles.sessionInfo}>
                                <h4>{s.name}</h4>
                                <p>{s._count.items} Paket • {new Date(s.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button className={styles.selectButton} onClick={() => onSessionSelected(s.id)}>
                                Pilih Sesi <ChevronRight size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
