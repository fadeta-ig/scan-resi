// src/app/warehouse/scan/[id]/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import styles from '../../warehouse.module.css';
import {
    ArrowLeft,
    CheckCircle,
    AlertTriangle,
    Loader2,
    Keyboard,
    Camera,
    Upload,
    RotateCcw,
    X,
    PackageCheck,
    ScanLine,
    Info,
    History
} from 'lucide-react';

interface SessionDetail {
    id: string;
    name: string;
    stats: {
        total: number;
        scannedCount: number;
        missingCount: number;
        progress: number;
    };
}

interface ScanResult {
    id: string;
    trackingId: string;
    time: string;
}

type FeedbackType = 'SUCCESS' | 'DUPLICATE' | 'INVALID' | null;
type ScanMode = 'manual' | 'camera' | 'upload';

const BARCODE_FORMATS = [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.CODE_93,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.CODABAR,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
    Html5QrcodeSupportedFormats.PDF_417,
];

export default function WarehouseScanPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLDivElement>(null);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const scanCooldownRef = useRef<boolean>(false);
    const isMountedRef = useRef(true);

    const [session, setSession] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [feedback, setFeedback] = useState<FeedbackType>(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackTrackingId, setFeedbackTrackingId] = useState('');
    const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
    const [scanMode, setScanMode] = useState<ScanMode>('manual');
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraReady, setCameraReady] = useState(false);

    // Audio
    const playSound = useCallback((type: 'SUCCESS' | 'DUPLICATE' | 'INVALID') => {
        try {
            const urls: Record<string, string> = {
                SUCCESS: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
                DUPLICATE: 'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3',
                INVALID: 'https://assets.mixkit.co/active_storage/sfx/2873/2873-preview.mp3'
            };
            const audio = new Audio(urls[type]);
            audio.volume = 1;
            audio.play().catch(() => { });
        } catch (e) { }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        fetchSession();

        return () => {
            isMountedRef.current = false;
            stopCamera();
        };
    }, [resolvedParams.id]);

    useEffect(() => {
        if (scanMode === 'camera' && cameraReady) {
            startCamera();
        } else if (scanMode !== 'camera') {
            stopCamera();
            if (scanMode === 'manual') {
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        }
    }, [scanMode, cameraReady]);

    useEffect(() => {
        if (scanMode === 'camera') {
            const timer = setTimeout(() => {
                if (cameraRef.current) {
                    setCameraReady(true);
                }
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setCameraReady(false);
        }
    }, [scanMode]);

    const fetchSession = async () => {
        try {
            const res = await fetch(`/api/sessions/${resolvedParams.id}/scan`);
            if (res.ok && isMountedRef.current) {
                setSession(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch session:', error);
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const startCamera = async () => {
        if (!cameraRef.current) {
            setCameraError('Elemen kamera tidak ditemukan');
            return;
        }

        setCameraError(null);

        try {
            if (html5QrCodeRef.current) {
                try { await html5QrCodeRef.current.stop(); } catch (e) { }
            }

            html5QrCodeRef.current = new Html5Qrcode("camera-view", {
                formatsToSupport: BARCODE_FORMATS,
                verbose: false
            });

            const cameras = await Html5Qrcode.getCameras();
            if (!cameras || cameras.length === 0) {
                throw new Error('Tidak ada kamera yang ditemukan');
            }

            const backCamera = cameras.find(c =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('environment')
            );

            await html5QrCodeRef.current.start(
                backCamera?.id || cameras[0].id,
                { fps: 15, qrbox: { width: 280, height: 180 } },
                (decodedText) => {
                    if (!scanCooldownRef.current) {
                        scanCooldownRef.current = true;
                        handleScan(decodedText);
                        setTimeout(() => { scanCooldownRef.current = false; }, 2000);
                    }
                },
                () => { }
            );

            if (isMountedRef.current) setCameraActive(true);
        } catch (err: unknown) {
            console.error('Camera error:', err);
            if (isMountedRef.current) {
                const error = err as Error & { name?: string };
                setCameraError(
                    error.name === 'NotAllowedError'
                        ? 'Akses kamera ditolak. Izinkan kamera di browser Anda.'
                        : `Gagal memulai kamera: ${error.message || 'Unknown error'}`
                );
                setCameraActive(false);
            }
        }
    };

    const stopCamera = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (e) { }
            html5QrCodeRef.current = null;
        }
        setCameraActive(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanning(true);
        try {
            const tempScanner = new Html5Qrcode("temp-scanner", {
                formatsToSupport: BARCODE_FORMATS,
                verbose: false
            });
            const decodedText = await tempScanner.scanFile(file, true);
            await handleScan(decodedText);
            tempScanner.clear();
        } catch (err) {
            showFeedback('INVALID', 'Barcode tidak ditemukan dalam gambar', '');
        } finally {
            setScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const showFeedback = (type: FeedbackType, message: string, trackingId: string) => {
        setFeedback(type);
        setFeedbackMessage(message);
        setFeedbackTrackingId(trackingId);
        if (type) playSound(type);

        setTimeout(() => {
            if (isMountedRef.current) {
                setFeedback(null);
                if (scanMode === 'manual') inputRef.current?.focus();
            }
        }, type === 'SUCCESS' ? 1200 : 2000);
    };

    const handleScan = async (trackingId: string) => {
        if (scanning || !trackingId.trim()) return;

        setScanning(true);
        const cleanId = trackingId.trim();

        try {
            const res = await fetch(`/api/sessions/${resolvedParams.id}/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trackingId: cleanId })
            });

            const data = await res.json();

            if (res.ok) {
                const status = data.status as 'SUCCESS' | 'DUPLICATE' | 'INVALID';
                showFeedback(status, data.message || '', cleanId);

                if (status === 'SUCCESS') {
                    setSession(prev => prev ? {
                        ...prev,
                        stats: {
                            ...prev.stats,
                            scannedCount: prev.stats.scannedCount + 1,
                            missingCount: prev.stats.missingCount - 1,
                            progress: ((prev.stats.scannedCount + 1) / prev.stats.total) * 100
                        }
                    } : null);

                    setRecentScans(prev => [{
                        id: Date.now().toString(),
                        trackingId: cleanId,
                        time: new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' })
                    }, ...prev].slice(0, 5));
                }
            } else {
                showFeedback('INVALID', data.error || 'TIDAK TERDAFTAR', cleanId);
            }
        } catch (error) {
            showFeedback('INVALID', 'Koneksi gagal', cleanId);
        } finally {
            setScanning(false);
            setInputValue('');
        }
    };

    if (loading) {
        return (
            <div className={styles.centerScreen}>
                <Loader2 size={48} className={styles.spin} style={{ color: 'var(--primary)' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-dim)' }}>Menyiapkan Sesi Scan...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className={styles.centerScreen}>
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 32, borderRadius: 40, marginBottom: 16 }}>
                    <AlertTriangle size={64} style={{ color: 'var(--error)' }} />
                </div>
                <h2>Sesi Tidak Ditemukan</h2>
                <p>Mungkin sesi telah dihapus atau dinonaktifkan.</p>
                <button onClick={() => router.push('/warehouse')} className={styles.btn} style={{ marginTop: 20 }}>
                    <ArrowLeft size={18} /> Kembali ke Beranda
                </button>
            </div>
        );
    }

    const progress = Math.round(session.stats.progress);

    return (
        <div className={styles.scanContainer}>
            {/* Hidden elements for image scanning */}
            <div id="temp-scanner" style={{ display: 'none' }}></div>

            {/* Feedback Overlay */}
            {feedback && (
                <div className={`${styles.overlay} ${styles[`overlay${feedback}`]}`}>
                    <div className={styles.overlayIcon}>
                        {feedback === 'SUCCESS' ? (
                            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: 30, borderRadius: '50%' }}>
                                <CheckCircle size={100} strokeWidth={2.5} />
                            </div>
                        ) : feedback === 'DUPLICATE' ? (
                            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: 30, borderRadius: '50%' }}>
                                <Info size={100} strokeWidth={2.5} />
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: 30, borderRadius: '50%' }}>
                                <AlertTriangle size={100} strokeWidth={2.5} />
                            </div>
                        )}
                    </div>
                    <span className={styles.overlayText}>
                        {feedback === 'SUCCESS' ? 'Scan Berhasil' : feedback === 'DUPLICATE' ? 'Sudah Terdata' : 'Gagal / Invalid'}
                    </span>
                    <div className={styles.overlayId}>{feedbackTrackingId || '---'}</div>
                    <p style={{ marginTop: 24, fontSize: '1.1rem', fontWeight: 600, opacity: 0.9 }}>{feedbackMessage}</p>
                </div>
            )}

            {/* Header */}
            <header className={styles.scanHeader}>
                <button onClick={() => router.push('/warehouse')} className={styles.backBtn}>
                    <ArrowLeft size={24} />
                </button>
                <div className={styles.headerInfo}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sesi Aktif</div>
                    <h1>{session.name}</h1>
                </div>
            </header>

            {/* Stats Dashboard */}
            <div className={styles.statsBar}>
                <div className={styles.statItem}>
                    <span className={styles.statNum}>{session.stats.scannedCount}</span>
                    <span className={styles.statLabel}>Terscan</span>
                </div>
                <div className={styles.statDivider}>/</div>
                <div className={styles.statItem}>
                    <span className={styles.statNum}>{session.stats.total}</span>
                    <span className={styles.statLabel}>Target</span>
                </div>
                <div className={styles.progressWrap}>
                    <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                    </div>
                    <span>{progress}%</span>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${scanMode === 'manual' ? styles.tabActive : ''}`}
                    onClick={() => setScanMode('manual')}
                >
                    <Keyboard size={24} />
                    <span>Keyboard</span>
                </button>
                <button
                    className={`${styles.tab} ${scanMode === 'camera' ? styles.tabActive : ''}`}
                    onClick={() => setScanMode('camera')}
                >
                    <Camera size={24} />
                    <span>Kamera</span>
                </button>
                <button
                    className={`${styles.tab} ${scanMode === 'upload' ? styles.tabActive : ''}`}
                    onClick={() => setScanMode('upload')}
                >
                    <Upload size={24} />
                    <span>File</span>
                </button>
            </div>

            {/* Interaction Area */}
            <div className={styles.scanContent}>
                {/* Manual Mode */}
                {scanMode === 'manual' && (
                    <div className={styles.manualMode}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <ScanLine size={18} style={{ color: 'var(--primary)' }} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Input Manual</span>
                        </div>
                        <div className={styles.inputGroup}>
                            <input
                                ref={inputRef}
                                type="text"
                                className={styles.input}
                                placeholder="Scan atau ketik nomor resi..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleScan(inputValue)}
                                autoComplete="off"
                                disabled={scanning}
                            />
                            <button
                                className={styles.submitBtn}
                                onClick={() => handleScan(inputValue)}
                                disabled={!inputValue.trim() || scanning}
                            >
                                {scanning ? <Loader2 size={24} className={styles.spin} /> : 'OK'}
                            </button>
                        </div>
                        <p className={styles.hint}>Kompatibel dengan scanner barcode fisik (Bluetooth/USB)</p>
                    </div>
                )}

                {/* Camera Mode */}
                {scanMode === 'camera' && (
                    <div className={styles.cameraMode}>
                        {cameraError ? (
                            <div className={styles.errorBox}>
                                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 20, borderRadius: '50%' }}>
                                    <AlertTriangle size={40} />
                                </div>
                                <p style={{ fontWeight: 600 }}>{cameraError}</p>
                                <button
                                    onClick={() => { setCameraReady(false); setTimeout(() => setCameraReady(true), 100); }}
                                    className={styles.btn}
                                    style={{ padding: '12px 24px', fontSize: '0.9rem' }}
                                >
                                    <RotateCcw size={16} /> Coba Inisialisasi Ulang
                                </button>
                            </div>
                        ) : (
                            <>
                                <div ref={cameraRef} id="camera-view" className={styles.cameraView}></div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cameraActive ? 'var(--success)' : 'var(--text-dim)', animation: cameraActive ? 'pulse 2s infinite' : 'none' }}></div>
                                    <p className={styles.hint} style={{ margin: 0 }}>
                                        {cameraActive ? 'Kamera aktif - Siap memindai' : 'Sedang memuat kamera...'}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Upload Mode */}
                {scanMode === 'upload' && (
                    <div className={styles.uploadMode}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageUpload}
                            className={styles.hiddenInput}
                            id="file-upload"
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="file-upload" className={styles.uploadBox}>
                            {scanning ? (
                                <Loader2 size={64} className={styles.spin} style={{ color: 'var(--primary)' }} />
                            ) : (
                                <>
                                    <div style={{ background: 'rgba(128, 0, 0, 0.05)', padding: 30, borderRadius: '50%' }}>
                                        <PackageCheck size={64} style={{ color: 'var(--primary)' }} />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>Ambil Foto Barcode</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 500 }}>Sistem akan mendeteksi resi dari gambar</div>
                                    </div>
                                    <div className={styles.btn} style={{ width: '100%', maxWidth: 240 }}>
                                        <Camera size={20} /> Pilih Foto
                                    </div>
                                </>
                            )}
                        </label>
                    </div>
                )}
            </div>

            {/* History Section */}
            {recentScans.length > 0 && (
                <div className={styles.recentSection}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <History size={16} style={{ color: 'var(--text-dim)' }} />
                        <h3>Riwayat Scan Terbaru</h3>
                    </div>
                    <div className={styles.recentList}>
                        {recentScans.map(scan => (
                            <div key={scan.id} className={styles.recentItem}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 8, borderRadius: 10 }}>
                                    <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                                </div>
                                <span className={styles.recentId}>{scan.trackingId}</span>
                                <span className={styles.recentTime}>{scan.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
