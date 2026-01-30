"use client";

import React, { useState } from 'react';
import styles from './ReconciliationReport.module.css';
import { Package, CheckCircle, AlertTriangle, Search, Info, Download, FileText, Table } from 'lucide-react';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';

import { SessionDetail, SessionItem } from '@/types/session';

interface ReconciliationReportProps {
    session: SessionDetail;
}

export default function ReconciliationReport({ session }: ReconciliationReportProps) {
    const [activeTab, setActiveTab] = useState<'SCANNED' | 'UNSCANNED'>('UNSCANNED');

    if (!session) return null;

    const { stats, items, name: sessionName, createdAt } = session;
    const filteredItems = items.filter((i: SessionItem) => i.status === activeTab);

    const exportToExcel = () => {
        const data = items.map((item: SessionItem) => ({
            'Tracking ID': item.trackingId,
            'Recipient': item.recipient || 'N/A',
            'Product Name': item.productName || 'N/A',
            'Status': item.status === 'SCANNED' ? 'SUDAH DISCAN' : 'BELUM DISCAN',
            'Waktu Scan': item.scannedAt ? new Date(item.scannedAt).toLocaleString('id-ID') : '-',
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Sesi');

        // Auto-size columns
        const max_width = data.reduce((w: number, r: any) => Math.max(w, r['Tracking ID'].length), 10);
        worksheet['!cols'] = [{ wch: max_width + 5 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 20 }];

        XLSX.writeFile(workbook, `Laporan_Sesi_${sessionName.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(128, 0, 0); // Maroon
        doc.text('Laporan Rekonsiliasi Paket', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Sesi: ${sessionName}`, 20, 35);
        doc.text(`Tanggal Sesi: ${new Date(createdAt).toLocaleString('id-ID')}`, 20, 42);
        doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 20, 49);

        // Summary Box
        doc.setDrawColor(200);
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(140, 32, 50, 25, 3, 3, 'FD');
        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.text('Ringkasan:', 145, 38);
        doc.setFontSize(9);
        doc.text(`Total: ${stats.total}`, 145, 44);
        doc.text(`Scan: ${stats.scannedCount}`, 145, 48);
        doc.text(`Hilang: ${stats.missingCount}`, 145, 52);

        // Table
        const tableData = items.map((item: SessionItem) => [
            item.trackingId,
            item.recipient || 'N/A',
            item.productName || 'N/A',
            item.status === 'SCANNED' ? 'OK' : 'MISSING',
            item.scannedAt ? new Date(item.scannedAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'
        ]);

        autoTable(doc, {
            startY: 60,
            head: [['Tracking ID', 'Recipient', 'Product Name', 'Status', 'Time']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [128, 0, 0], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 35 },
                2: { cellWidth: 60 },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' }
            },
            didParseCell: function (data: { section: string; column: { index: number }; cell: { raw: any; styles: any } }) {
                if (data.section === 'body' && data.column.index === 3) {
                    if (data.cell.raw === 'MISSING') {
                        data.cell.styles.textColor = [220, 53, 69]; // Error Red
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [40, 167, 69]; // Success Green
                    }
                }
            }
        });

        doc.save(`Laporan_Sesi_${sessionName.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className={clsx(styles.reportContainer, 'animate-fade-in')}>
            <div className={clsx(styles.statsGrid)}>
                <div className={clsx(styles.statCard, 'glass')}>
                    <span className={styles.statValue}>{stats.total}</span>
                    <span className={styles.statLabel}>Total Paket</span>
                </div>
                <div className={clsx(styles.statCard, 'glass')}>
                    <span className={styles.statValue} style={{ color: 'var(--success)' }}>{stats.scannedCount}</span>
                    <span className={styles.statLabel}>Berhasil Scan</span>
                </div>
                <div className={clsx(styles.statCard, 'glass')}>
                    <span className={styles.statValue} style={{ color: 'var(--error)' }}>{stats.missingCount}</span>
                    <span className={styles.statLabel}>Tertinggal</span>
                </div>
            </div>

            <div className="glass" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontWeight: 800 }}>Progres Rekonsiliasi</h3>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{stats.progress.toFixed(1)}%</span>
                </div>
                <div className={styles.progressBarContainer}>
                    <div className={styles.progressBar} style={{ width: `${stats.progress}%` }}></div>
                </div>

                <div className={styles.exportButtons}>
                    <button className={clsx(styles.exportBtn, styles.excelBtn)} onClick={exportToExcel}>
                        <Table size={18} /> Export Excel
                    </button>
                    <button className={clsx(styles.exportBtn, styles.pdfBtn)} onClick={exportToPDF}>
                        <FileText size={18} /> Export PDF
                    </button>
                </div>
            </div>

            <div className="glass" style={{ padding: 24, flex: 1 }}>
                <div className={styles.tabs}>
                    <button
                        className={clsx(styles.tab, activeTab === 'UNSCANNED' && styles.tabActive)}
                        onClick={() => setActiveTab('UNSCANNED')}
                    >
                        Belum Scan ({stats.missingCount})
                    </button>
                    <button
                        className={clsx(styles.tab, activeTab === 'SCANNED' && styles.tabActive)}
                        onClick={() => setActiveTab('SCANNED')}
                    >
                        Sudah Scan ({stats.scannedCount})
                    </button>
                </div>

                <div className={styles.list} style={{ marginTop: 24 }}>
                    {filteredItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                            <Info size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p>Tidak ada data untuk kategori ini.</p>
                        </div>
                    ) : (
                        filteredItems.map((item: SessionItem) => (
                            <div key={item.id} className={styles.itemCard}>
                                <div className={styles.itemInfo}>
                                    <h4>{item.trackingId}</h4>
                                    <p className={styles.itemSubtitle}>{item.recipient || 'No Name'} • {item.productName || 'No Product'}</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                    <span className={clsx(
                                        styles.badge,
                                        item.status === 'SCANNED' ? styles.badgeScanned : styles.badgeMissing
                                    )}>
                                        {item.status === 'SCANNED' ? 'OK' : 'MISSING'}
                                    </span>
                                    {item.scannedAt && (
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                                            {new Date(item.scannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
