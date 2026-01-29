// src/components/Stats/StatCard.tsx
// Reusable stat card component
"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './StatCard.module.css';

export type StatCardColor = 'blue' | 'purple' | 'green' | 'orange' | 'red';

export interface StatCardProps {
    icon: LucideIcon;
    value: string | number;
    label: string;
    color?: StatCardColor;
}

export function StatCard({ icon: Icon, value, label, color = 'blue' }: StatCardProps) {
    return (
        <div className={styles.card}>
            <div className={`${styles.icon} ${styles[color]}`}>
                <Icon size={24} />
            </div>
            <div className={styles.content}>
                <div className={styles.value}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                <div className={styles.label}>{label}</div>
            </div>
        </div>
    );
}

export default StatCard;
