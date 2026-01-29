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
    recipient: ['recipient', 'penerima', 'nama penerima', 'customer']
};

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

        const headers = rows[0].map((h) => String(h || '').toLowerCase().trim());

        // Find column indices
        const trackingIdx = this.findHeaderIndex(headers, HEADER_PATTERNS.tracking);
        const productIdx = this.findHeaderIndex(headers, HEADER_PATTERNS.product);
        const recipientIdx = this.findHeaderIndex(headers, HEADER_PATTERNS.recipient);

        if (trackingIdx === -1) {
            throw new Error('Kolom "Tracking ID" / "Resi" tidak ditemukan dalam file Excel.');
        }

        // Parse rows and deduplicate
        const itemMap = new Map<string, ExcelItem>();

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const trackingId = String(row[trackingIdx] || '').trim();

            if (trackingId && !itemMap.has(trackingId)) {
                itemMap.set(trackingId, {
                    trackingId,
                    productName: productIdx !== -1 ? String(row[productIdx] || 'N/A') : 'N/A',
                    recipient: recipientIdx !== -1 ? String(row[recipientIdx] || 'N/A') : 'N/A'
                });
            }
        }

        const items = Array.from(itemMap.values());

        if (items.length === 0) {
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
     * Get session by ID with stats
     */
    static async getSession(sessionId: string) {
        const session = await prisma.scanningSession.findUnique({
            where: { id: sessionId },
            include: {
                items: { orderBy: { scannedAt: 'desc' } }
            }
        });

        if (!session) return null;

        const stats = this.calculateStats(session.items);

        return { ...session, stats };
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

    // ========================================
    // Scanning
    // ========================================

    /**
     * Scan an item in a session
     */
    static async scanItem(sessionId: string, trackingId: string, userId?: string): Promise<ScanResult> {
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

        const updated = await prisma.sessionItem.update({
            where: { id: item.id },
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
    }

    // ========================================
    // Reports
    // ========================================

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
