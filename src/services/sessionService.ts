// src/services/sessionService.ts
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import type {
    ExcelItem,
    SessionStats,
    ScanResult,
    SessionItem,
    ReportData
} from '@/types/session';

// Header patterns for dynamic detection
const HEADER_PATTERNS = {
    tracking: ['tracking id', 'resi', 'barcode', 'no resi', 'nomor resi', 'awb'],
    product: ['product name', 'nama produk', 'produk', 'item', 'barang'],
    variation: ['variation', 'variasi', 'varian'],
    deliveryOption: ['delivery option', 'opsi pengiriman', 'tipe pengiriman'],
    shippingProvider: ['shipping provider name', 'shipping provider', 'kurir', 'ekspedisi'],
    substatus: ['order substatus', 'substatus', 'sub status', 'sub-status']
};

// Status filter: hanya import baris dengan substatus ini
const REQUIRED_SUBSTATUS = 'menunggu pengambilan';

/**
 * Session Service - Handles all session and scanning operations
 */
export class SessionService {

    // ========================================
    // Excel Parsing
    // ========================================

    /**
     * Parse Excel buffer and extract items
     */
    private static parseExcel(buffer: Buffer): ExcelItem[] {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) {
            throw new Error('File Excel kosong atau tidak memiliki data.');
        }

        // Cari baris header yang sebenarnya (skip baris deskripsi di bawah header)
        // Header biasanya baris pertama yang mengandung kata kunci kolom tracking
        let headerRowIdx = 0;
        let headers: string[] = [];
        for (let i = 0; i < Math.min(5, rows.length); i++) {
            const candidate = rows[i].map((h) => String(h || '').toLowerCase().trim());
            if (this.findHeaderIndex(candidate, HEADER_PATTERNS.tracking) !== -1) {
                headerRowIdx = i;
                headers = candidate;
                break;
            }
        }

        if (headers.length === 0) {
            throw new Error('Baris header tidak ditemukan dalam file Excel.');
        }

        // Find column indices
        const trackingIdx = this.findHeaderIndex(headers, HEADER_PATTERNS.tracking);
        const productIdx = this.findHeaderIndex(headers, HEADER_PATTERNS.product);
        const variationIdx = this.findHeaderIndex(headers, HEADER_PATTERNS.variation);
        const deliveryOptionIdx = this.findHeaderIndex(headers, HEADER_PATTERNS.deliveryOption);
        const shippingProviderIdx = this.findHeaderIndex(headers, HEADER_PATTERNS.shippingProvider);
        const substatusIdx = this.findHeaderIndex(headers, HEADER_PATTERNS.substatus);

        if (trackingIdx === -1) {
            throw new Error('Kolom "Order ID" / "Tracking ID" / "Resi" tidak ditemukan dalam file Excel.');
        }

        // Parse rows, filter by substatus, and deduplicate
        const itemMap = new Map<string, ExcelItem>();
        let skippedCount = 0;

        for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.every(cell => !cell)) continue; // skip empty rows

            const trackingId = String(row[trackingIdx] || '').trim();
            if (!trackingId) continue;

            // Filter berdasarkan Order Substatus jika kolom ada
            if (substatusIdx !== -1) {
                const substatus = String(row[substatusIdx] || '').toLowerCase().trim();
                if (substatus !== REQUIRED_SUBSTATUS) {
                    skippedCount++;
                    continue; // lewati baris yang bukan "Menunggu pengambilan"
                }
            }

            if (!itemMap.has(trackingId)) {
                itemMap.set(trackingId, {
                    trackingId,
                    productName: productIdx !== -1 ? String(row[productIdx] || '').trim() : 'N/A',
                    variation: variationIdx !== -1 ? String(row[variationIdx] || '').trim() : 'N/A',
                    deliveryOption: deliveryOptionIdx !== -1 ? String(row[deliveryOptionIdx] || '').trim() : 'N/A',
                    shippingProvider: shippingProviderIdx !== -1 ? String(row[shippingProviderIdx] || '').trim() : 'N/A',
                });
            }
        }

        const items = Array.from(itemMap.values());

        if (items.length === 0) {
            if (substatusIdx !== -1 && skippedCount > 0) {
                throw new Error(
                    `Tidak ada data dengan status "Menunggu pengambilan" dalam file Excel. ` +
                    `(${skippedCount} baris dilewati karena substatus berbeda)`
                );
            }
            throw new Error('Tidak ada Tracking ID yang valid dalam file Excel.');
        }

        return items;
    }

    /**
     * Find header index by matching patterns
     */
    private static findHeaderIndex(headers: string[], patterns: string[]): number {
        return headers.findIndex(h => patterns.some(p => h.includes(p)));
    }

    // ========================================
    // Session CRUD
    // ========================================

    /**
     * Create session from Excel file
     */
    static async createSession(name: string, buffer: Buffer, userId?: string) {
        const items = this.parseExcel(buffer);

        return prisma.scanningSession.create({
            data: {
                name,
                createdById: userId || null,
                items: {
                    createMany: { data: items }
                }
            },
            include: {
                _count: { select: { items: true } }
            }
        });
    }

    /**
     * Get session by ID with stats - Optimized for large datasets
     */
    static async getSession(sessionId: string) {
        const session = await prisma.scanningSession.findUnique({
            where: { id: sessionId },
            select: {
                id: true,
                name: true,
                isActive: true,
                createdAt: true,
                items: {
                    orderBy: [{ status: 'asc' }, { scannedAt: 'desc' }],
                    include: {
                        scannedBy: { select: { name: true } }
                    }
                }
            }
        });

        if (!session) return null;

        const statsData = await prisma.sessionItem.aggregate({
            where: { sessionId },
            _count: {
                id: true,
                status: true
            }
        });

        const scannedCount = await prisma.sessionItem.count({
            where: { sessionId, status: 'SCANNED' }
        });

        const total = statsData._count.id;
        const missingCount = total - scannedCount;
        const progress = total > 0 ? (scannedCount / total) * 100 : 0;

        return {
            ...session,
            stats: { total, scannedCount, missingCount, progress }
        };
    }

    /**
     * List all sessions with summary data
     */
    static async listSessions() {
        const sessions = await prisma.scanningSession.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { items: true } },
                createdBy: { select: { name: true, username: true } }
            }
        });

        // Get scanned counts efficiently
        const scannedCounts = await prisma.sessionItem.groupBy({
            by: ['sessionId'],
            where: { status: 'SCANNED' },
            _count: { id: true }
        });

        const countMap = new Map(scannedCounts.map(s => [s.sessionId, s._count.id]));

        return sessions.map(session => ({
            ...session,
            totalItems: session._count.items,
            scannedCount: countMap.get(session.id) || 0
        }));
    }

    /**
     * Delete session and all items
     */
    static async deleteSession(sessionId: string) {
        return prisma.scanningSession.delete({
            where: { id: sessionId }
        });
    }

    /**
     * Update session name
     */
    static async updateSession(sessionId: string, name: string) {
        return prisma.scanningSession.update({
            where: { id: sessionId },
            data: { name }
        });
    }

    /**
     * Toggle session active status
     */
    static async toggleSessionActive(sessionId: string) {
        const session = await prisma.scanningSession.findUnique({
            where: { id: sessionId },
            select: { isActive: true }
        });

        if (!session) throw new Error('Session not found');

        return prisma.scanningSession.update({
            where: { id: sessionId },
            data: { isActive: !session.isActive }
        });
    }

    /**
     * Get a specific item in a session by tracking ID (Lookup)
     */
    static async getItem(sessionId: string, trackingId: string) {
        return prisma.sessionItem.findUnique({
            where: {
                sessionId_trackingId: { sessionId, trackingId }
            }
        });
    }

    // ========================================
    // Scanning
    // ========================================

    /**
     * Scan an item in a session - Optimized for high concurrency
     */
    static async scanItem(sessionId: string, trackingId: string, userId?: string): Promise<ScanResult> {
        try {
            // Atomic update: only update if currently UNSCANNED
            const updated = await prisma.sessionItem.update({
                where: {
                    sessionId_trackingId: { sessionId, trackingId },
                    status: 'UNSCANNED'
                },
                data: {
                    status: 'SCANNED',
                    scannedAt: new Date(),
                    scannedById: userId || null
                }
            });

            return {
                status: 'SUCCESS',
                message: 'Berhasil Discan',
                item: updated as unknown as SessionItem
            };
        } catch (error: any) {
            // Prisma error P2025: Record to update not found
            // This happens if trackingId is invalid OR status is already SCANNED
            if (error.code === 'P2025') {
                const item = await prisma.sessionItem.findUnique({
                    where: { sessionId_trackingId: { sessionId, trackingId } }
                });

                if (!item) {
                    return { status: 'INVALID', message: 'Paket Tidak Terdaftar' };
                }

                if (item.status === 'SCANNED') {
                    return {
                        status: 'DUPLICATE',
                        message: 'Paket Sudah Discan',
                        item: item as unknown as SessionItem
                    };
                }
            }

            throw error;
        }
    }

    /**
     * Update a session item (trackingId, productName, variation, deliveryOption, shippingProvider, status)
     */
    static async updateSessionItem(itemId: string, data: {
        trackingId?: string;
        productName?: string;
        variation?: string;
        deliveryOption?: string;
        shippingProvider?: string;
        status?: string;
        scannedAt?: Date | null;
        scannedById?: string | null;
    }) {
        return prisma.sessionItem.update({
            where: { id: itemId },
            data
        });
    }

    /**
     * Delete a single session item
     */
    static async deleteSessionItem(itemId: string) {
        return prisma.sessionItem.delete({
            where: { id: itemId }
        });
    }

    // ========================================
    // Dashboard & Reports
    // ========================================

    /**
     * Get aggregated statistics for the warehouse dashboard
     */
    static async getDashboardStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalSessions, totalScannedToday, activeSessions] = await Promise.all([
            prisma.scanningSession.count({
                where: { createdAt: { gte: today } }
            }),
            prisma.sessionItem.count({
                where: {
                    status: 'SCANNED',
                    scannedAt: { gte: today }
                }
            }),
            prisma.scanningSession.count({
                where: { isActive: true }
            })
        ]);

        // Get total items for progress calculation
        const totalItems = await prisma.sessionItem.count();
        const totalScanned = await prisma.sessionItem.count({
            where: { status: 'SCANNED' }
        });

        const overallProgress = totalItems > 0 ? (totalScanned / totalItems) * 100 : 0;

        return {
            totalSessions,
            totalScannedToday,
            activeSessions,
            overallProgress: Math.round(overallProgress)
        };
    }

    /**
     * Get recent scan activity across all sessions
     */
    static async getRecentActivity(limit = 10) {
        return prisma.sessionItem.findMany({
            where: { status: 'SCANNED' },
            orderBy: { scannedAt: 'desc' },
            take: limit,
            include: {
                session: { select: { name: true } },
                scannedBy: { select: { name: true } }
            }
        });
    }

    /**
     * Get items for reconciliation report
     */
    static async getReportData(sessionId: string): Promise<ReportData | null> {
        const session = await prisma.scanningSession.findUnique({
            where: { id: sessionId },
            include: {
                items: {
                    orderBy: [{ status: 'asc' }, { scannedAt: 'desc' }],
                    include: {
                        scannedBy: { select: { name: true } }
                    }
                },
                createdBy: { select: { name: true } }
            }
        });

        if (!session) return null;

        const stats = this.calculateStats(session.items);
        const scanned = session.items.filter(i => i.status === 'SCANNED');
        const unscanned = session.items.filter(i => i.status === 'UNSCANNED');

        return {
            session: {
                id: session.id,
                name: session.name,
                createdAt: session.createdAt,
                createdBy: session.createdBy?.name || 'System'
            },
            stats,
            scanned: scanned as unknown as SessionItem[],
            unscanned: unscanned as unknown as SessionItem[]
        };
    }

    // ========================================
    // Helpers
    // ========================================

    /**
     * Calculate session statistics
     */
    private static calculateStats(items: { status: string }[]): SessionStats {
        const total = items.length;
        const scannedCount = items.filter(i => i.status === 'SCANNED').length;
        const missingCount = total - scannedCount;
        const progress = total > 0 ? (scannedCount / total) * 100 : 0;

        return { total, scannedCount, missingCount, progress };
    }
}
