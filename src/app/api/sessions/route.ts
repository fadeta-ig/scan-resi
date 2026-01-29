// src/app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/sessionService';

export async function GET() {
    try {
        const sessions = await SessionService.listSessions();
        return NextResponse.json(sessions);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const name = formData.get('name') as string;
        const file = formData.get('file') as File;

        if (!name || !file) {
            return NextResponse.json({ error: 'Name and file are required' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const session = await SessionService.createSessionFromExcel(name, buffer);

        return NextResponse.json(session);
    } catch (error: any) {
        console.error('Session Creation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
