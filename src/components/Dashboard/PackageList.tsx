// src/components/Dashboard/PackageList.tsx
"use client";

import React from 'react';
import styles from './PackageList.module.css';
import { Package } from '@/types/package';
import { Clock, MapPin, User, Package as PackageIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface PackageListProps {
    packages: Package[];
}

export default function PackageList({ packages }: PackageListProps) {
    return (
        <div className={styles.listContainer}>
            <div className={styles.header}>
                <h2>Daftar Paket</h2>
                <span className={styles.count}>{packages.length} Terdata</span>
            </div>

            <div className={styles.grid}>
                {packages.length === 0 ? (
                    <div className={clsx(styles.emptyState, 'glass')}>
                        <PackageIcon size={64} strokeWidth={1} style={{ marginBottom: 24, opacity: 0.2, color: 'var(--primary)' }} />
                        <p>Your warehouse is currently quiet. Start scanning to track packages.</p>
                    </div>
                ) : (
                    packages.map((pkg, idx) => (
                        <div
                            key={pkg.resiNumber}
                            className={clsx(styles.card, 'glass', 'animate-fade-in')}
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            <div className={styles.cardHeader}>
                                <span className={styles.resiNo}>{pkg.resiNumber}</span>
                                <span className={clsx(
                                    styles.statusBadge,
                                    pkg.status === 'COURIER' ? styles.statusCourier : styles.statusWarehouse
                                )}>
                                    {pkg.status === 'COURIER' ? 'DI KURIR' : 'WAREHOUSE'}
                                </span>
                            </div>

                            <div className={styles.recipientInfo}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <User size={14} color="var(--text-dim)" />
                                    <h4>{pkg.recipientName || 'Unknown Recipient'}</h4>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <MapPin size={14} color="var(--text-dim)" style={{ marginTop: 2 }} />
                                    <p>{pkg.address || 'Alamat tidak tersedia'}</p>
                                </div>
                            </div>

                            <div className={styles.footer}>
                                <Clock size={12} />
                                <span>
                                    {pkg.scannedAt
                                        ? `Discan: ${new Date(pkg.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : 'Menunggu scan'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
