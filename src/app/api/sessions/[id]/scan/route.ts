// src/app/api/sessions/[id]/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/sessionService';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sessionId } = await params;
        const { trackingId } = await req.json();

        if (!trackingId) {
            return NextResponse.json({ error: 'Tracking ID is required' }, { status: 400 });
        }

        const result = await SessionService.scanItem(sessionId, trackingId);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
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
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        return NextResponse.json(sessionData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
