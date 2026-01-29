// src/types/package.ts
export type PackageStatus = 'WAREHOUSE' | 'COURIER';

export interface Package {
    resiNumber: string;
    recipientName: string;
    address: string;
    status: PackageStatus;
    scannedAt?: Date;
}
