// src/lib/auth.ts
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const SALT_ROUNDS = 10;
const SESSION_COOKIE_NAME = 'scan_resi_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================
// Password Utilities
// ============================================

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

// ============================================
// Session Management
// ============================================

interface SessionData {
    userId: string;
    username: string;
    name: string;
    role: string;
    expiresAt: number;
}

export async function createSession(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, name: true, role: true }
    });

    if (!user) throw new Error('User not found');

    const sessionData: SessionData = {
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        expiresAt: Date.now() + SESSION_DURATION
    };

    // Encode session data as base64
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    return sessionToken;
}

export async function setSessionCookie(sessionToken: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION / 1000, // Convert to seconds
        path: '/'
    });
}

export async function getSession(): Promise<SessionData | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) return null;

    try {
        const sessionData: SessionData = JSON.parse(
            Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
        );

        // Check if session is expired
        if (sessionData.expiresAt < Date.now()) {
            return null;
        }

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: sessionData.userId },
            select: { isActive: true }
        });

        if (!user?.isActive) return null;

        return sessionData;
    } catch {
        return null;
    }
}

export async function clearSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

// ============================================
// Auth Helpers
// ============================================

export type RoleType = 'ADMIN' | 'WAREHOUSE' | 'SUPER_ADMIN';

export function hasRole(userRole: string, allowedRoles: RoleType[]): boolean {
    return allowedRoles.includes(userRole as RoleType);
}

export function canAccessAdmin(role: string): boolean {
    return hasRole(role, ['ADMIN', 'SUPER_ADMIN']);
}

export function canAccessWarehouse(role: string): boolean {
    return hasRole(role, ['WAREHOUSE', 'SUPER_ADMIN']);
}

export function canAccessSuperAdmin(role: string): boolean {
    return hasRole(role, ['SUPER_ADMIN']);
}

// ============================================
// Activity Logging
// ============================================

interface LogActivityParams {
    userId: string;
    action: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

export async function logActivity({
    userId,
    action,
    details,
    ipAddress,
    userAgent
}: LogActivityParams): Promise<void> {
    try {
        await prisma.activityLog.create({
            data: {
                userId,
                action,
                details: details ? JSON.stringify(details) : null,
                ipAddress,
                userAgent
            }
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
