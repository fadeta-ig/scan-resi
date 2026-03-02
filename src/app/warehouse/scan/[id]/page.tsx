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
    ViewIcon,
    CheckmarkCircle02Icon as CheckedIcon,
    Tick02Icon,
    Time01Icon,
    CameraRotated01Icon
} from 'hugeicons-react';

interface SessionItem {
    id: string;
    trackingId: string;
    productName: string | null;
    variation: string | null;
    shippingProvider: string | null;
    deliveryOption: string | null;
    status: string;
    scannedAt: string | null;
}

interface SessionDetail {
    id: string;
    name: string;
    items?: SessionItem[];
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
    productName?: string | null;
    variation?: string | null;
    shippingProvider?: string | null;
    deliveryOption?: string | null;
    status?: string;
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
    const [selectedItem, setSelectedItem] = useState<ScanResult | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingItem, setPendingItem] = useState<ScanResult | null>(null);
    const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
    const [activeCameraIndex, setActiveCameraIndex] = useState(0);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                const data = await res.json();
                setSession(data);

                // Populate recent scans from already scanned items in the database
                if (data.items && Array.isArray(data.items)) {
                    const initialRecent = data.items
                        .filter((item: SessionItem) => item.status === 'SCANNED')
                        .sort((a: SessionItem, b: SessionItem) => {
                            const dateA = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
                            const dateB = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
                            return dateB - dateA;
                        })
                        .slice(0, 10)
                        .map((item: SessionItem) => ({
                            id: item.id,
                            trackingId: item.trackingId,
                            time: item.scannedAt ? new Date(item.scannedAt).toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '-',
                            productName: item.productName,
                            variation: item.variation,
                            shippingProvider: item.shippingProvider,
                            deliveryOption: item.deliveryOption,
                            status: item.status
                        }));

                    if (initialRecent.length > 0) {
                        setRecentScans(initialRecent);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch session:', error);
            toast.error("Gagal memuat sesi");
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const startCamera = async (overrideDeviceId?: string) => {
        if (!cameraRef.current) {
            setCameraError('Elemen kamera tidak ditemukan');
            return;
        }

        setCameraError(null);

        try {
            if (html5QrCodeRef.current) {
                try { await html5QrCodeRef.current.stop(); } catch (e) { }
                html5QrCodeRef.current = null;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cameraConfig: any = { facingMode: "environment" };

            // If a specific deviceId was requested (from switch camera), use it directly
            if (overrideDeviceId) {
                cameraConfig = overrideDeviceId;
            } else {
                try {
                    const devices = await Html5Qrcode.getCameras();
                    if (devices && devices.length > 0) {
                        // Store all cameras for switching
                        setAvailableCameras(devices.map(d => ({ id: d.id, label: d.label })));

                        // Try to find the best back camera
                        let selectedCamera = devices.find(device => {
                            const label = device.label.toLowerCase();
                            const isBack = label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('belakang');
                            const isNotWide = !label.includes('ultra') && !label.includes('wide') && !label.includes('0.5') && !label.includes('macro');
                            return isBack && isNotWide;
                        });

                        if (!selectedCamera) {
                            selectedCamera = devices.find(device => {
                                const label = device.label.toLowerCase();
                                return label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('belakang');
                            });
                        }

                        if (selectedCamera) {
                            cameraConfig = selectedCamera.id;
                            const idx = devices.findIndex(d => d.id === selectedCamera!.id);
                            setActiveCameraIndex(idx >= 0 ? idx : 0);
                        }
                    }
                } catch (e) {
                    console.warn("Gagal mengambil spesifik device ID, menggunakan fallback environment", e);
                }
            }

            html5QrCodeRef.current = new Html5Qrcode("camera-view", {
                formatsToSupport: BARCODE_FORMATS,
                verbose: false
            });

            await html5QrCodeRef.current.start(
                cameraConfig,
                {
                    fps: 20,
                    qrbox: { width: 260, height: 260 },
                    aspectRatio: 1.0,
                    videoConstraints: {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ...({ zoom: { ideal: 1 } } as any)
                    } as MediaTrackConstraints
                },
                async (decodedText) => {
                    if (isProcessingRef.current) return;
                    isProcessingRef.current = true;

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

    const switchCamera = async () => {
        if (availableCameras.length < 2) {
            toast.info('Hanya 1 kamera tersedia di perangkat ini');
            return;
        }

        const nextIndex = (activeCameraIndex + 1) % availableCameras.length;
        setActiveCameraIndex(nextIndex);
        setCameraActive(false);

        const nextCam = availableCameras[nextIndex];
        toast.info(`Beralih ke: ${nextCam.label || `Kamera ${nextIndex + 1}`}`);
        await startCamera(nextCam.id);
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

                // Resume scanning and release lock ONLY if not showing confirm modal
                if (!showConfirmModal && html5QrCodeRef.current && scanMode === 'camera') {
                    try { await html5QrCodeRef.current.resume(); } catch (e) { }
                }

                if (!showConfirmModal) {
                    isProcessingRef.current = false;
                }

                if (!showConfirmModal && scanMode === 'manual') inputRef.current?.focus();
            }
        }, type === 'SUCCESS' ? 1200 : 2000);
    };

    const handleScan = async (trackingId: string) => {
        if (scanning || !trackingId.trim()) return;

        setScanning(true);
        const cleanId = trackingId.trim();

        try {
            // New Workflow: First fetch details (Lookup)
            const res = await fetch(`/api/sessions/${resolvedParams.id}/scan?q=${cleanId}`);

            if (res.ok) {
                const itemData = await res.json();

                // If item found, show confirmation modal
                setPendingItem({
                    id: itemData.id,
                    trackingId: itemData.trackingId,
                    time: new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    productName: itemData.productName,
                    variation: itemData.variation,
                    shippingProvider: itemData.shippingProvider,
                    deliveryOption: itemData.deliveryOption,
                    status: itemData.status
                });
                setShowConfirmModal(true);

                // Pause camera while showing modal
                if (html5QrCodeRef.current && scanMode === 'camera') {
                    try { await html5QrCodeRef.current.pause(); } catch (e) { }
                }
            } else {
                // Not found in session
                showFeedback('INVALID', 'Nomor Resi Tidak Terdaftar', cleanId);
            }
        } catch (error) {
            showFeedback('INVALID', 'Koneksi gagal', cleanId);
        } finally {
            setScanning(false);
            setInputValue('');
        }
    };

    const confirmScan = async () => {
        if (!pendingItem) return;

        setScanning(true);
        const cleanId = pendingItem.trackingId;

        try {
            const res = await fetch(`/api/sessions/${resolvedParams.id}/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trackingId: cleanId })
            });

            const data = await res.json();

            if (res.ok) {
                const status = data.status as 'SUCCESS' | 'DUPLICATE' | 'INVALID';

                // Close modal and show success feedback
                setShowConfirmModal(false);
                setPendingItem(null);
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
                }

                if (status === 'SUCCESS' || status === 'DUPLICATE') {
                    setRecentScans(prev => {
                        const exists = prev.find(s => s.trackingId === cleanId);
                        if (exists) return prev;

                        return [{
                            id: Date.now().toString(),
                            trackingId: cleanId,
                            time: new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                            productName: data.item?.productName,
                            variation: data.item?.variation,
                            shippingProvider: data.item?.shippingProvider,
                            deliveryOption: data.item?.deliveryOption,
                            status: data.item?.status
                        }, ...prev].slice(0, 10);
                    });
                }
            } else {
                setShowConfirmModal(false);
                setPendingItem(null);
                showFeedback('INVALID', data.error || 'TIDAK TERDAFTAR', cleanId);
            }
        } catch (error) {
            setShowConfirmModal(false);
            setPendingItem(null);
            showFeedback('INVALID', 'Koneksi gagal', cleanId);
        } finally {
            setScanning(false);
            isProcessingRef.current = false; // Release lock after modal closed & feedback done
        }
    };

    const cancelScan = () => {
        setShowConfirmModal(false);
        setPendingItem(null);
        isProcessingRef.current = false;

        // Resume camera if was in camera mode
        if (html5QrCodeRef.current && scanMode === 'camera') {
            try { html5QrCodeRef.current.resume(); } catch (e) { }
        }

        if (scanMode === 'manual') inputRef.current?.focus();
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
                                <CheckedIcon size={100} strokeWidth={2.5} />
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
            )
            }

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

                                <div className="flex items-center justify-center gap-3 mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(styles.statusDot, cameraActive && styles.statusDotActive)}></div>
                                        <p className="text-sm text-muted-foreground">
                                            {cameraActive ? 'Kamera aktif - Siap memindai' : 'Sedang memuat kamera...'}
                                        </p>
                                    </div>
                                    {cameraActive && availableCameras.length > 1 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={switchCamera}
                                            className="gap-1.5 text-xs h-8 px-3 rounded-full border-primary/20 text-primary hover:bg-primary/5"
                                        >
                                            <CameraRotated01Icon size={16} />
                                            Ganti Kamera
                                        </Button>
                                    )}
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
            {
                recentScans.length > 0 && (
                    <div className={styles.recentSection}>
                        <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                            <Time01Icon size={16} />
                            <h3 className="text-sm font-semibold uppercase tracking-wider">Riwayat Scan Terbaru</h3>
                        </div>
                        <div className={styles.recentList}>
                            {recentScans.map(scan => (
                                <div
                                    key={scan.id}
                                    className={cn(styles.recentItem, "cursor-pointer hover:bg-black/5 transition-colors active:scale-95")}
                                    onClick={() => {
                                        setSelectedItem(scan);
                                        setShowDetailModal(true);
                                    }}
                                >
                                    <div className="bg-success/10 p-2 rounded-lg">
                                        <CheckedIcon size={18} className="text-success" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className={styles.recentId}>{scan.trackingId}</div>
                                        <div className="text-[10px] text-muted-foreground truncate">{scan.productName || 'Tanpa Nama Produk'}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={styles.recentTime}>{scan.time}</span>
                                        <ViewIcon size={14} className="text-primary/40" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Product Detail Modal */}
            {
                showDetailModal && selectedItem && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="bg-primary p-6 text-white relative">
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="absolute right-4 top-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <Cancel01Icon size={20} />
                                </button>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                        <PackageIcon size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">Detail Paket</h3>
                                </div>
                                <p className="text-white/60 text-[10px] uppercase tracking-widest font-black">Informasi Produk Warehouse</p>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">No Resi</label>
                                    <div className="font-mono font-bold text-lg text-primary bg-primary/5 p-3 rounded-xl border border-primary/10 select-all">
                                        {selectedItem.trackingId}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Status</label>
                                        <div className="flex items-center gap-1.5 text-success font-bold text-sm">
                                            <Tick02Icon size={16} /> Terscan
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Waktu</label>
                                        <div className="text-sm font-bold">{selectedItem.time}</div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Produk</label>
                                    <div className="text-sm font-bold leading-tight bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                                        {selectedItem.productName || 'N/A'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Variasi</label>
                                        <div className="text-sm font-bold">{selectedItem.variation || '-'}</div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Kurir</label>
                                        <div className="text-sm font-bold text-primary">{selectedItem.shippingProvider || '-'}</div>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => setShowDetailModal(false)}
                                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
                                >
                                    Tutup Perincian
                                </Button>
                            </div>
                        </div>
                    </div >
                )
            }

            {/* Confirmation Modal (New Workflow) */}
            {
                showConfirmModal && pendingItem && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20">
                            <div className="bg-gradient-to-br from-primary to-[#a00000] p-8 text-white relative">
                                <div className="flex flex-col items-center text-center gap-3">
                                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                                        <InformationCircleIcon size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">Konfirmasi Scan</h3>
                                        <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Verifikasi Data Paket</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-center">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block mb-1">No Resi Ditemukan</label>
                                        <div className="font-mono font-black text-xl text-primary">{pendingItem.trackingId}</div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Status Saat Ini</span>
                                            <span className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                                pendingItem.status === 'SCANNED' ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                                            )}>
                                                {pendingItem.status === 'SCANNED' ? 'SUDAH TERSCAN' : 'BELUM TERSCAN'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start py-2 border-b border-gray-50">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Produk</span>
                                            <span className="text-xs font-bold text-right max-w-[150px] leading-tight">{pendingItem.productName || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Variasi</span>
                                            <span className="text-xs font-bold">{pendingItem.variation || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Kurir</span>
                                            <span className="text-xs font-bold text-primary">{pendingItem.shippingProvider || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={cancelScan}
                                            className="h-14 rounded-2xl border-2 font-bold hover:bg-gray-50 active:scale-95 transition-all w-full"
                                        >
                                            Batalkan
                                        </Button>
                                        <Button
                                            onClick={confirmScan}
                                            disabled={scanning}
                                            className="h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all w-full"
                                        >
                                            {scanning ? <Loading03Icon className="animate-spin" size={20} /> : 'Lanjutkan'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
