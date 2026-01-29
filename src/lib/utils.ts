// src/lib/utils.ts
// Utility functions used across the application

/**
 * Calculate progress percentage
 */
export function getProgress(scanned: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((scanned / total) * 100);
}

/**
 * Format date to Indonesian locale (short format)
 */
export function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('id-ID');
}

/**
 * Format date with full format
 */
export function formatDateFull(date: Date | string): string {
    return new Date(date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleString('id-ID', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

/**
 * Format time only
 */
export function formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString('id-ID');
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Terjadi kesalahan yang tidak diketahui';
}

/**
 * Get IP address from request headers
 */
export function getClientIP(headers: Headers): string {
    return headers.get('x-forwarded-for')
        || headers.get('x-real-ip')
        || 'unknown';
}

/**
 * Validate tracking ID format
 */
export function isValidTrackingId(trackingId: string): boolean {
    return trackingId.trim().length > 0;
}

/**
 * Clean and normalize tracking ID
 */
export function normalizeTrackingId(trackingId: string): string {
    return trackingId.trim().toUpperCase();
}

/**
 * Classnames helper - combines class names conditionally
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ');
}
