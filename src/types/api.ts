// src/types/api.ts
// API request/response types

export interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
    success?: boolean;
}

export interface ApiErrorResponse {
    error: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
}

export interface LogsResponse {
    logs: ActivityLog[];
    total: number;
    limit: number;
    offset: number;
}

export interface ActivityLog {
    id: string;
    userId: string;
    user: { username: string; name: string };
    action: string;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

export interface CreateUserRequest {
    username: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'WAREHOUSE' | 'SUPER_ADMIN';
}

export interface UpdateUserRequest {
    name?: string;
    role?: 'ADMIN' | 'WAREHOUSE' | 'SUPER_ADMIN';
    isActive?: boolean;
    password?: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    user?: {
        id: string;
        username: string;
        name: string;
        role: string;
    };
    error?: string;
}

export interface ScanRequest {
    trackingId: string;
}
