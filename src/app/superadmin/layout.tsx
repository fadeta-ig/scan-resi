/* src/app/superadmin/layout.tsx */
import React from 'react';
import { LayoutDashboard, Users, FileText, FolderOpen, Scan } from 'lucide-react';
import DashboardShell from '@/components/Dashboard/DashboardShell';

const navItems = [
    { href: '/superadmin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { href: '/superadmin/users', icon: Users, label: 'User Management', exact: false },
    { href: '/superadmin/logs', icon: FileText, label: 'Activity Logs', exact: false },
    { href: '/admin/sessions', icon: FolderOpen, label: 'Kelola Sesi', exact: false },
    { href: '/warehouse', icon: Scan, label: 'Mode Scanning', exact: false },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardShell
            navItems={navItems}
            roleLabel="Super Administrator"
            requiredRoles={['SUPER_ADMIN']}
        >
            {children}
        </DashboardShell>
    );
}
