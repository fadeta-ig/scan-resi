// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword, canAccessSuperAdmin, logActivity } from '@/lib/auth';
import { getErrorMessage, getClientIP } from '@/lib/utils';
import type { UpdateUserRequest } from '@/types/api';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSession();

        if (!session || !canAccessSuperAdmin(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error: unknown) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSession();

        if (!session || !canAccessSuperAdmin(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json() as UpdateUserRequest;
        const { name, role, isActive, password } = body;

        // Build update data with proper typing
        const updateData: {
            name?: string;
            role?: 'ADMIN' | 'WAREHOUSE' | 'SUPER_ADMIN';
            isActive?: boolean;
            password?: string;
        } = {};

        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (password) updateData.password = await hashPassword(password);

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
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
            action: 'UPDATE_USER',
            details: { targetUserId: id, changes: Object.keys(updateData) },
            ipAddress: getClientIP(request.headers)
        });

        return NextResponse.json(user);
    } catch (error: unknown) {
        console.error('Update user error:', error);
        return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSession();

        if (!session || !canAccessSuperAdmin(session.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Don't actually delete, just deactivate
        const user = await prisma.user.update({
            where: { id },
            data: { isActive: false },
            select: {
                id: true,
                username: true,
                name: true
            }
        });

        // Log activity
        await logActivity({
            userId: session.userId,
            action: 'DEACTIVATE_USER',
            details: { targetUserId: id, targetUsername: user.username },
            ipAddress: getClientIP(request.headers)
        });

        return NextResponse.json({ success: true, user });
    } catch (error: unknown) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 500 }
        );
    }
}
