// src/services/sessionService.ts
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export class SessionService {
    /**
     * Parses Excel buffer and creates a new scanning session with items
     */
    static async createSessionFromExcel(name: string, buffer: Buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const headers = data[0].map((h: any) => h?.toString().toLowerCase().trim());
        const rows = data.slice(1);

        // Dynamic header detection
        const trackingIdx = headers.findIndex((h: string) => h.includes('tracking id') || h.includes('resi') || h.includes('barcode'));
        const productIdx = headers.findIndex((h: string) => h.includes('product name') || h.includes('nama produk'));
        const recipientIdx = headers.findIndex((h: string) => h.includes('recipient') || h.includes('penerima'));

        if (trackingIdx === -1) {
            throw new Error('Kolom "Tracking ID" tidak ditemukan dalam file Excel.');
        }

        const validItems = rows
            .map(row => ({
                trackingId: row[trackingIdx]?.toString().trim(),
                productName: productIdx !== -1 ? row[productIdx]?.toString() : 'N/A',
                recipient: recipientIdx !== -1 ? row[recipientIdx]?.toString() : 'N/A',
            }))
            .filter(item => item.trackingId && item.trackingId !== '');

        // De-duplicate in memory (SQLite doesn't support skipDuplicates in createMany)
        const uniqueItems = Array.from(
            new Map(validItems.map(item => [item.trackingId, item])).values()
        );

        if (uniqueItems.length === 0) {
            throw new Error('No valid Tracking IDs found in Excel file.');
        }

        return await prisma.scanningSession.create({
            data: {
                name,
                items: {
                    createMany: {
                        data: uniqueItems,
                    },
                },
            },
            include: {
                _count: {
                    select: { items: true },
                },
            },
        });
    }

    /**
     * Gets session details with real-time stats
     */
    static async getSession(sessionId: string) {
        const session = await prisma.scanningSession.findUnique({
            where: { id: sessionId },
            include: {
                items: {
                    orderBy: { scannedAt: 'desc' },
                },
            },
        });

        if (!session) return null;

        const total = session.items.length;
        const scannedCount = session.items.filter((i: any) => i.status === 'SCANNED').length;
        const missingCount = total - scannedCount;

        return {
            ...session,
            stats: {
                total,
                scannedCount,
                missingCount,
                progress: total > 0 ? (scannedCount / total) * 100 : 0,
            },
        };
    }

    /**
     * Real-time scanning logic within a session
     */
    static async scanItem(sessionId: string, trackingId: string) {
        const item = await prisma.sessionItem.findUnique({
            where: {
                sessionId_trackingId: { sessionId, trackingId },
            },
        });

        if (!item) {
            return { status: 'INVALID', message: 'Paket Tidak Terdaftar' };
        }

        if (item.status === 'SCANNED') {
            return { status: 'DUPLICATE', message: 'Paket Sudah Discan', item };
        }

        const updated = await prisma.sessionItem.update({
            where: { id: item.id },
            data: {
                status: 'SCANNED',
                scannedAt: new Date(),
            },
        });

        return { status: 'SUCCESS', message: 'Berhasil Discan', item: updated };
    }

    /**
     * List all sessions for the dashboard
     */
    static async listSessions() {
        return await prisma.scanningSession.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { items: true },
                },
            },
        });
    }
}
