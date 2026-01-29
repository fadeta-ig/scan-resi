// src/app/api/sessions/[id]/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/sessionService';
import { getErrorMessage } from '@/lib/utils';
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

        const result = await SessionService.scanItem(sessionId, trackingId);
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
