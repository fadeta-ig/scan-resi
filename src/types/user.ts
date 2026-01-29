// src/types/user.ts
// User and authentication types

export type RoleType = 'ADMIN' | 'WAREHOUSE' | 'SUPER_ADMIN';

export interface User {
    id: string;
    username: string;
    name: string;
    role: RoleType;
    isActive: boolean;
    createdAt: Date;
    updatedAt?: Date;
    _count?: {
        createdSessions: number;
        scannedItems: number;
    };
}

export interface SessionUser {
    id: string;
    username: string;
    name: string;
    role: RoleType;
}

export interface SessionData {
    userId: string;
    username: string;
    name: string;
    role: string;
    expiresAt: number;
}

export interface AuthContextType {
    user: SessionUser | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}
