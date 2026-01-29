// src/app/api/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, canAccessSuperAdmin } from '@/lib/auth';
import { getErrorMessage } from '@/lib/utils';

interface LogsQueryParams {
    userId?: string;
    action?: string;
    limit: number;
    offset: number;
}

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session || !canAccessSuperAdmin(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const queryParams: LogsQueryParams = {
            userId: searchParams.get('userId') || undefined,
            action: searchParams.get('action') || undefined,
            limit: parseInt(searchParams.get('limit') || '100'),
            offset: parseInt(searchParams.get('offset') || '0')
        };

        // Build where clause with proper typing
        const where: {
            userId?: string;
            action?: string;
        } = {};

        if (queryParams.userId) where.userId = queryParams.userId;
        if (queryParams.action) where.action = queryParams.action;

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: queryParams.limit,
                skip: queryParams.offset,
                include: {
                    user: {
                        select: { username: true, name: true }
                    }
                }
            }),
            prisma.activityLog.count({ where })
        ]);

        return NextResponse.json({
            logs,
            total,
            limit: queryParams.limit,
            offset: queryParams.offset
        });
    } catch (error: unknown) {
        console.error('Get logs error:', error);
        return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 500 }
        );
    }
}
