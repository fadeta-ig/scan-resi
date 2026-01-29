// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession, clearSession, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        if (session) {
            await logActivity({
                userId: session.userId,
                action: 'LOGOUT',
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                userAgent: request.headers.get('user-agent') || undefined
            });
        }

        await clearSession();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        await clearSession();
        return NextResponse.json({ success: true });
    }
}
