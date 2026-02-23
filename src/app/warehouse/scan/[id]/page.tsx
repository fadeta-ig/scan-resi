// src/app/warehouse/scan/[id]/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import styles from '../../warehouse.module.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
    ArrowLeft01Icon,
    CheckmarkCircle02Icon,
    Alert02Icon,
    Loading03Icon,
    KeyboardIcon,
    Camera01Icon,
    Upload01Icon,
    RefreshIcon,
    Cancel01Icon,
    PackageIcon,
    ScanIcon,
    InformationCircleIcon,
    Time01Icon
} from 'hugeicons-react';

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
    const { user: authUser } = useAuth();
    const resolvedParams = use(params);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLDivElement>(null);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const isProcessingRef = useRef<boolean>(false);
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
            // Poll for the element to be ready before starting camera
            const checkElement = setInterval(() => {
                if (document.getElementById("camera-view")) {
                    setCameraReady(true);
                    clearInterval(checkElement);
                }
            }, 50);
            return () => clearInterval(checkElement);
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
            toast.error("Gagal memuat sesi");
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

            await html5QrCodeRef.current.start(
                { facingMode: { ideal: 'environment' } },
                {
                    fps: 20,
                    qrbox: { width: 260, height: 260 },
                    aspectRatio: 1.0,
                    videoConstraints: {
                        facingMode: { ideal: 'environment' },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ...({ zoom: { ideal: 1 } } as any)
                    } as MediaTrackConstraints
                },
                async (decodedText) => {
                    if (isProcessingRef.current) return;
                    isProcessingRef.current = true;

                    // Pause scanning immediately to prevent double scan
                    if (html5QrCodeRef.current) {
                        try { await html5QrCodeRef.current.pause(); } catch (e) { }
                    }

                    handleScan(decodedText);
                },
                () => { }
            );

            if (isMountedRef.current) setCameraActive(true);
        } catch (err: unknown) {
            console.error('Camera error:', err);
            if (isMountedRef.current) {
                const error = err as Error & { name?: string };
                const msg = error.name === 'NotAllowedError'
                    ? 'Akses kamera ditolak. Izinkan kamera di browser Anda.'
                    : `Gagal memulai kamera: ${error.message || 'Unknown error'}`;
                setCameraError(msg);
                setCameraActive(false);
                toast.error(msg);
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

        setTimeout(async () => {
            if (isMountedRef.current) {
                setFeedback(null);

                // Resume scanning and release lock
                if (html5QrCodeRef.current && scanMode === 'camera') {
                    try { await html5QrCodeRef.current.resume(); } catch (e) { }
                }
                isProcessingRef.current = false;

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
            toast.error("Koneksi gagal");
        } finally {
            setScanning(false);
            setInputValue('');
        }
    };

    if (loading) {
        return (
            <div className={styles.centerScreen}>
                <Loading03Icon size={48} className={styles.spin} style={{ color: 'var(--primary)' }} />
                <p className="mt-4 font-semibold text-muted-foreground">Menyiapkan Sesi Scan...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className={styles.centerScreen}>
                <div className="bg-destructive/10 p-8 rounded-full mb-4">
                    <Alert02Icon size={64} className="text-destructive" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Sesi Tidak Ditemukan</h2>
                <p className="text-muted-foreground mb-6">Mungkin sesi telah dihapus atau dinonaktifkan.</p>
                <Button onClick={() => router.push('/warehouse')} variant="default">
                    <ArrowLeft01Icon size={18} className="mr-2" /> Kembali ke Beranda
                </Button>
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
                <div className={cn(styles.feedbackOverlay, styles[`overlay${feedback}`])}>
                    <div className={styles.overlayIcon}>
                        {feedback === 'SUCCESS' ? (
                            <div className="bg-white/20 p-8 rounded-full">
                                <CheckmarkCircle02Icon size={100} strokeWidth={2.5} />
                            </div>
                        ) : feedback === 'DUPLICATE' ? (
                            <div className="bg-white/20 p-8 rounded-full">
                                <InformationCircleIcon size={100} strokeWidth={2.5} />
                            </div>
                        ) : (
                            <div className="bg-white/20 p-8 rounded-full">
                                <Alert02Icon size={100} strokeWidth={2.5} />
                            </div>
                        )}
                    </div>
                    <span className={styles.overlayText}>
                        {feedback === 'SUCCESS' ? 'Scan Berhasil' : feedback === 'DUPLICATE' ? 'Sudah Terdata' : 'Gagal / Invalid'}
                    </span>
                    <div className={styles.overlayId}>{feedbackTrackingId || '---'}</div>
                    <p className="mt-6 text-xl font-semibold opacity-90">{feedbackMessage}</p>
                </div>
            )}

            {/* Header */}
            <header className={styles.scanHeader}>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/warehouse')} className="text-primary hover:bg-primary/5">
                        <ArrowLeft01Icon size={24} />
                    </Button>
                    {authUser?.role === 'SUPER_ADMIN' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/superadmin')}
                            className="bg-primary/5 text-primary hover:bg-primary/10 rounded-full h-10 w-10 border border-primary/10"
                            title="Ke Dashboard Utama"
                        >
                            <ArrowLeft01Icon size={18} />
                        </Button>
                    )}
                </div>
                <div className={styles.headerInfo}>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Sesi Aktif</div>
                    <h1 className="text-xl font-bold text-primary tracking-tight">{session.name}</h1>
                </div>
            </header>

            {/* Stats Dashboard */}
            <Card className="mx-4 mb-4 border-none shadow-md bg-white/90 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-primary">{session.stats.scannedCount}</span>
                        <span className="text-xs font-medium text-muted-foreground uppercase">Terscan</span>
                    </div>
                    <div className="h-8 w-[1px] bg-border" />
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-muted-foreground">{session.stats.total}</span>
                        <span className="text-xs font-medium text-muted-foreground uppercase">Target</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ width: 60 }}>
                        <div className="relative w-full text-center">
                            <span className="text-lg font-bold text-primary">{progress}%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tab Navigation */}
            <div className={styles.tabs}>
                <button
                    className={cn(styles.tab, scanMode === 'manual' && styles.tabActive)}
                    onClick={() => setScanMode('manual')}
                >
                    <KeyboardIcon size={24} className={scanMode === 'manual' ? "text-white" : "text-primary"} />
                    <span>Keyboard</span>
                </button>
                <button
                    className={cn(styles.tab, scanMode === 'camera' && styles.tabActive)}
                    onClick={() => setScanMode('camera')}
                >
                    <Camera01Icon size={24} className={scanMode === 'camera' ? "text-white" : "text-primary"} />
                    <span>Kamera</span>
                </button>
                <button
                    className={cn(styles.tab, scanMode === 'upload' && styles.tabActive)}
                    onClick={() => setScanMode('upload')}
                >
                    <Upload01Icon size={24} className={scanMode === 'upload' ? "text-white" : "text-primary"} />
                    <span>File</span>
                </button>
            </div>

            {/* Interaction Area */}
            <div className={styles.scanContent}>
                {/* Manual Mode */}
                {scanMode === 'manual' && (
                    <div className={styles.manualMode}>
                        <div className="flex items-center gap-2 mb-4 text-primary">
                            <ScanIcon size={20} />
                            <span className="font-bold">Input Manual</span>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                type="text"
                                className="h-12 text-lg"
                                placeholder="Scan atau ketik nomor resi..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleScan(inputValue)}
                                autoComplete="off"
                                disabled={scanning}
                            />
                            <Button
                                className="h-12 w-20"
                                onClick={() => handleScan(inputValue)}
                                disabled={!inputValue.trim() || scanning}
                            >
                                {scanning ? <Loading03Icon size={24} className="animate-spin" /> : 'OK'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 text-center">Kompatibel dengan scanner barcode fisik (Bluetooth/USB)</p>
                    </div>
                )}

                {/* Camera Mode */}
                {scanMode === 'camera' && (
                    <div className={styles.cameraMode}>
                        {cameraError ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                                <div className="bg-destructive/10 p-4 rounded-full mb-4">
                                    <Alert02Icon size={32} className="text-destructive" />
                                </div>
                                <p className="font-medium mb-4">{cameraError}</p>
                                <Button
                                    variant="outline"
                                    onClick={() => { setCameraReady(false); setTimeout(() => setCameraReady(true), 100); }}
                                >
                                    <RefreshIcon size={16} className="mr-2" /> Coba Lagi
                                </Button>
                            </div>
                        ) : (
                            <div className={styles.scannerWrapper}>
                                <div className={styles.cameraView}>
                                    <div ref={cameraRef} id="camera-view" className={styles.reader}></div>
                                    <div className={styles.cameraOverlay}>
                                        <div className={styles.scanRegion}>
                                            <div className={cn(styles.corner, styles.topLeft)}></div>
                                            <div className={cn(styles.corner, styles.topRight)}></div>
                                            <div className={cn(styles.corner, styles.bottomLeft)}></div>
                                            <div className={cn(styles.corner, styles.bottomRight)}></div>
                                            <div className={styles.scanLine}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-2 mt-4">
                                    <div className={cn(styles.statusDot, cameraActive && styles.statusDotActive)}></div>
                                    <p className="text-sm text-muted-foreground">
                                        {cameraActive ? 'Kamera aktif - Siap memindai' : 'Sedang memuat kamera...'}
                                    </p>
                                </div>
                            </div>
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
                                <Loading03Icon size={64} className="animate-spin text-primary" />
                            ) : (
                                <>
                                    <div className="bg-primary/5 p-8 rounded-full mb-4">
                                        <PackageIcon size={64} className="text-primary" />
                                    </div>
                                    <div className="text-center mb-6">
                                        <div className="text-lg font-bold mb-1">Ambil Foto Barcode</div>
                                        <div className="text-sm text-muted-foreground">Sistem akan mendeteksi resi dari gambar</div>
                                    </div>
                                    <Button className="w-full max-w-xs pointer-events-none">
                                        <Camera01Icon size={20} className="mr-2" /> Pilih Foto
                                    </Button>
                                </>
                            )}
                        </label>
                    </div>
                )}
            </div>

            {/* History Section */}
            {recentScans.length > 0 && (
                <div className={styles.recentSection}>
                    <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                        <Time01Icon size={16} />
                        <h3 className="text-sm font-semibold uppercase tracking-wider">Riwayat Scan Terbaru</h3>
                    </div>
                    <div className={styles.recentList}>
                        {recentScans.map(scan => (
                            <div key={scan.id} className={styles.recentItem}>
                                <div className="bg-success/10 p-2 rounded-lg">
                                    <CheckmarkCircle02Icon size={18} className="text-success" />
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
