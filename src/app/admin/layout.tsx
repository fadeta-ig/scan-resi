"use client";

/* src/app/admin/layout.tsx */
import React from 'react';
import { LayoutDashboard, FolderOpen } from 'lucide-react';
import DashboardShell from '@/components/Dashboard/DashboardShell';

const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { href: '/admin/sessions', icon: FolderOpen, label: 'Sesi Scanning', exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardShell
            navItems={navItems}
            roleLabel="Administrator"
            requiredRoles={['ADMIN', 'SUPER_ADMIN']}
        >
            {children}
        </DashboardShell>
    );
}
