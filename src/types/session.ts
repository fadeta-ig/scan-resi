// src/types/session.ts
// Centralized session and scanning types

export type ItemStatus = 'UNSCANNED' | 'SCANNED';

export interface ExcelItem {
    trackingId: string;
    productName: string;
    recipient: string;
}

export interface SessionItem {
    id: string;
    sessionId: string;
    trackingId: string;
    recipient: string | null;
    productName: string | null;
    status: ItemStatus;
    scannedAt: Date | null;
    scannedById: string | null;
    scannedBy?: { name: string } | null;
    createdAt: Date;
}

export interface SessionStats {
    total: number;
    scannedCount: number;
    missingCount: number;
    progress: number;
}

export interface ScanResult {
    status: 'SUCCESS' | 'DUPLICATE' | 'INVALID';
    message: string;
    item?: SessionItem;
}

export interface ScanningSession {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdById: string | null;
    createdBy?: { name: string; username?: string } | null;
    items?: SessionItem[];
    _count?: { items: number };
}

export interface SessionWithStats extends ScanningSession {
    stats: SessionStats;
    scannedCount?: number;
}

export interface SessionListItem {
    id: string;
    name: string;
    createdAt: string;
    isActive: boolean;
    _count: { items: number };
    scannedCount: number;
    createdBy?: { name: string; username?: string } | null;
}

export interface SessionDetail {
    id: string;
    name: string;
    createdAt: string;
    items: SessionItem[];
    stats: SessionStats;
}

export interface ReportData {
    session: {
        id: string;
        name: string;
        createdAt: Date;
        createdBy: string;
    };
    stats: SessionStats;
    scanned: SessionItem[];
    unscanned: SessionItem[];
}
