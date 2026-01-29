// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword, canAccessSuperAdmin, logActivity } from '@/lib/auth';
import { getErrorMessage, getClientIP } from '@/lib/utils';
import type { CreateUserRequest } from '@/types/api';

export async function GET() {
    try {
        const session = await getSession();

        if (!session || !canAccessSuperAdmin(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
                _count: {
                    select: {
                        createdSessions: true,
                        scannedItems: true
                    }
                }
            }
        });

        return NextResponse.json(users);
    } catch (error: unknown) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session || !canAccessSuperAdmin(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json() as CreateUserRequest;
        const { username, password, name, role } = body;

        if (!username || !password || !name || !role) {
            return NextResponse.json(
                { error: 'Semua field wajib diisi' },
                { status: 400 }
            );
        }

        // Check if username exists
        const existing = await prisma.user.findUnique({
            where: { username: username.toLowerCase().trim() }
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Username sudah digunakan' },
                { status: 400 }
            );
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                username: username.toLowerCase().trim(),
                password: hashedPassword,
                name,
                role
            },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true
            }
        });

        // Log activity
        await logActivity({
            userId: session.userId,
            action: 'CREATE_USER',
            details: { newUserId: user.id, newUsername: user.username, newRole: user.role },
            ipAddress: getClientIP(request.headers)
        });

        return NextResponse.json(user);
    } catch (error: unknown) {
        console.error('Create user error:', error);
        return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 500 }
        );
    }
}
