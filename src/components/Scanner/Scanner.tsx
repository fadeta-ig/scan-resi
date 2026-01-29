"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styles from './Scanner.module.css';
import { CheckCircle2, AlertCircle, Loader2, Camera } from 'lucide-react';
import { clsx } from 'clsx';

interface ScannerProps {
    sessionId: string;
    onScanResult: () => void;
}

export default function Scanner({ sessionId, onScanResult }: ScannerProps) {
    const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR' | 'WARNING'>('IDLE');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<any>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // We recreate the scanner if the sessionId changes
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 20,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            },
      /* verbose= */ false
        );

        scanner.render(onScan, (err) => {
            // Silent error for frame failures
        });
        scannerRef.current = scanner;

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [sessionId]);

    const playSound = (type: 'success' | 'error' | 'warning') => {
        // Using standard notification sounds if available or silent fallback
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
        if (status === 'SCANNING') return;

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
                    onScanResult();
                } else if (result.status === 'DUPLICATE') {
                    setStatus('WARNING');
                    setErrorMsg(result.message);
                    playSound('warning');
                } else {
                    setStatus('ERROR');
                    setErrorMsg(result.message);
                    playSound('error');
                }

                setTimeout(() => setStatus('IDLE'), 3000);
            } else {
                throw new Error(result.error || 'Scan failed');
            }
        } catch (err: any) {
            setStatus('ERROR');
            setErrorMsg(err.message);
            playSound('error');
            setTimeout(() => setStatus('IDLE'), 5000);
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
                status === 'WARNING' && styles.statusError // Simplified CSS reuse
            )}>
                {status === 'IDLE' && <><Camera size={18} /> Arahkan ke Barcode...</>}
                {status === 'SCANNING' && <><Loader2 size={18} className="spin" /> Checking...</>}
                {status === 'SUCCESS' && <><CheckCircle2 size={18} /> {lastScanned?.trackingId} OK!</>}
                {status === 'ERROR' && <><AlertCircle size={18} /> {errorMsg || 'Invalid ID'}</>}
                {status === 'WARNING' && <><AlertCircle size={18} /> {errorMsg || 'Sudah Discan'}</>}
            </div>

            <div className={styles.scannerContainer}>
                <div id="reader" className={styles.reader}></div>
            </div>

            {lastScanned && (
                <div className={clsx(styles.resultCard, 'glass', 'animate-fade-in')}>
                    <div className={styles.resultInfo}>
                        <h3 style={{
                            color: status === 'SUCCESS' ? 'var(--success)' :
                                status === 'WARNING' ? '#f39c12' : 'var(--text-main)'
                        }}>
                            {lastScanned.trackingId}
                        </h3>
                        <p>{lastScanned.recipient || 'No Recipient'}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
