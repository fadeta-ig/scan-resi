"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import styles from './Scanner.module.css';
import { CheckCircle2, AlertCircle, Loader2, Camera, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/contexts/ToastContext';

interface ScannerProps {
    sessionId: string;
    onScanResult: () => void;
}

export default function Scanner({ sessionId, onScanResult }: ScannerProps) {
    const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR' | 'WARNING'>('IDLE');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<any>(null);
    const [isMounted, setIsMounted] = useState(false);

    const html5QrCode = useRef<Html5Qrcode | null>(null);
    const isScanning = useRef(false);

    const { success, error: toastError, warning } = useToast();

    useEffect(() => {
        setIsMounted(true);
        return () => {
            stopScanner();
        };
    }, []);

    useEffect(() => {
        if (isMounted) {
            startScanner();
        }
    }, [isMounted, sessionId]);

    const startScanner = async () => {
        try {
            // If already exists, stop it first
            await stopScanner();

            const element = document.getElementById("reader");
            if (!element) {
                console.error("Scanner element #reader not found");
                return;
            }

            html5QrCode.current = new Html5Qrcode("reader");

            const config = {
                fps: 15, // Optimized for mobile
                qrbox: { width: 260, height: 260 },
                aspectRatio: 1.0,
            };

            await html5QrCode.current.start(
                { facingMode: "environment" },
                config,
                onScan,
                () => { /* Silent frame error */ }
            );

            isScanning.current = true;
        } catch (err) {
            console.error("Failed to start scanner:", err);
            setErrorMsg("Gagal mengakses kamera. Pastikan izin diberikan.");
            setStatus('ERROR');
        }
    };

    const stopScanner = async () => {
        if (html5QrCode.current && isScanning.current) {
            try {
                await html5QrCode.current.stop();
                isScanning.current = false;
            } catch (err) {
                console.warn("Error stopping scanner", err);
            }
        }
    };

    const playSound = (type: 'success' | 'error' | 'warning') => {
        try {
            const audio = new Audio(
                type === 'success' ? 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' :
                    type === 'warning' ? 'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3' :
                        'https://assets.mixkit.co/active_storage/sfx/2873/2873-preview.mp3'
            );
            audio.play();
        } catch (e) { }
    };

    async function onScan(decodedText: string) {
        // Prevent multiple simultaneous processing
        if (status === 'SCANNING' || status === 'SUCCESS') return;

        setStatus('SCANNING');
        try {
            const response = await fetch(`/api/sessions/${sessionId}/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trackingId: decodedText }),
            });

            const result = await response.json();

            if (response.ok) {
                setLastScanned(result.item || { trackingId: decodedText });

                if (result.status === 'SUCCESS') {
                    setStatus('SUCCESS');
                    playSound('success');
                    success(`Paket ${decodedText} berhasil discan`, 'Scan Berhasil');
                    onScanResult();
                } else if (result.status === 'DUPLICATE') {
                    setStatus('WARNING');
                    setErrorMsg(result.message);
                    playSound('warning');
                    warning(result.message || 'Paket sudah pernah discan', 'Sudah Discan');
                } else {
                    setStatus('ERROR');
                    setErrorMsg(result.message);
                    playSound('error');
                    toastError(result.message || 'Paket tidak terdaftar', 'Gagal');
                }

                // Reset status to allow next scan after delay
                setTimeout(() => {
                    setStatus('IDLE');
                    setErrorMsg(null);
                }, 2000);
            } else {
                const msg = result.error || 'Gagal memproses scan';
                toastError(msg, 'Kesalahan');
                throw new Error(msg);
            }
        } catch (err: any) {
            setStatus('ERROR');
            setErrorMsg(err.message);
            playSound('error');
            setTimeout(() => setStatus('IDLE'), 3000);
        }
    }

    return (
        <div className={styles.scannerWrapper}>
            <div className={clsx(
                styles.statusIndicator,
                status === 'IDLE' && styles.statusWaiting,
                status === 'SCANNING' && styles.statusWaiting,
                status === 'SUCCESS' && styles.statusSuccess,
                status === 'ERROR' && styles.statusError,
                status === 'WARNING' && styles.statusError
            )}>
                {status === 'IDLE' && <><Camera size={18} /> Arahkan ke Barcode...</>}
                {status === 'SCANNING' && <><Loader2 size={18} className="spin" /> Checking...</>}
                {status === 'SUCCESS' && <><CheckCircle2 size={18} /> Berhasil!</>}
                {status === 'ERROR' && <><AlertCircle size={18} /> {errorMsg || 'Gagal'}</>}
                {status === 'WARNING' && <><AlertCircle size={18} /> {errorMsg || 'Duplicate'}</>}
            </div>

            <div className={styles.scannerContainer}>
                <div id="reader" className={styles.reader}></div>

                {/* Custom QRIS Overlay */}
                <div className={styles.overlay}>
                    <div className={styles.scanRegion}>
                        <div className={clsx(styles.corner, styles.topLeft)}></div>
                        <div className={clsx(styles.corner, styles.topRight)}></div>
                        <div className={clsx(styles.corner, styles.bottomLeft)}></div>
                        <div className={clsx(styles.corner, styles.bottomRight)}></div>
                        <div className={styles.scanLine}></div>
                    </div>
                </div>
            </div>

            <button
                className={clsx('btn-ghost', styles.retryBtn)}
                onClick={() => startScanner()}
                title="Restart Camera"
            >
                <RefreshCw size={16} /> Aktifkan Kamera
            </button>

            {lastScanned && (
                <div className={clsx(styles.resultCard, 'glass', 'animate-fade-in')}>
                    <div className={styles.resultInfo}>
                        <h3 style={{
                            color: status === 'SUCCESS' ? 'var(--success)' :
                                status === 'WARNING' ? '#f39c12' : 'var(--text-main)'
                        }}>
                            {lastScanned.trackingId}
                        </h3>
                        <p>{lastScanned.recipient || 'Tidak ada data penerima'}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
