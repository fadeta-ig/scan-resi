// src/app/api/sessions/[id]/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/sessionService';
import { getErrorMessage, getClientIP } from '@/lib/utils';
import { getSession, logActivity } from '@/lib/auth';
import type { ScanRequest } from '@/types/api';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sessionId } = await params;
        const body = await req.json() as ScanRequest;
        const { trackingId } = body;

        if (!trackingId) {
            return NextResponse.json(
                { error: 'Tracking ID is required' },
                { status: 400 }
            );
        }

        const sessionData = await getSession();
        if (!sessionData) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await SessionService.scanItem(sessionId, trackingId, sessionData.userId);

        // Log activity if scanning was attempted (even if invalid/duplicate, but primarily interested in SUCCESS for log clutter)
        // Only log SUCCESS to avoid cluttering logs with every typo/duplicate scan if desired, 
        // but the request was "action ada yang belum muncul lognya", so let's log SUCCESS/DUPLICATE at least.
        if (result.status === 'SUCCESS' || result.status === 'DUPLICATE') {
            await logActivity({
                userId: sessionData.userId,
                action: 'SCAN_ITEM',
                details: {
                    sessionId,
                    trackingId,
                    status: result.status,
                    itemName: result.item?.productName
                },
                ipAddress: getClientIP(req.headers)
            });
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 500 }
        );
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sessionId } = await params;
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (query) {
            const item = await SessionService.getItem(sessionId, query);
            if (!item) {
                return NextResponse.json({ error: 'Item not found' }, { status: 404 });
            }
            return NextResponse.json(item);
        }

        const sessionData = await SessionService.getSession(sessionId);

        if (!sessionData) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(sessionData);
    } catch (error: unknown) {
        return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 500 }
        );
    }
}
