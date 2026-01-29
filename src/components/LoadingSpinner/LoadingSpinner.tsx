// src/components/LoadingSpinner/LoadingSpinner.tsx
// Reusable loading spinner component
"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './LoadingSpinner.module.css';

export interface LoadingSpinnerProps {
    size?: number;
    message?: string;
    fullScreen?: boolean;
}

export function LoadingSpinner({
    size = 32,
    message,
    fullScreen = false
}: LoadingSpinnerProps) {
    const content = (
        <>
            <Loader2 size={size} className={styles.spinner} />
            {message && <p className={styles.message}>{message}</p>}
        </>
    );

    if (fullScreen) {
        return (
            <div className={styles.fullScreen}>
                {content}
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {content}
        </div>
    );
}

export default LoadingSpinner;
