// src/app/admin/sessions/[id]/page.tsx
"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
    ArrowLeft01Icon,
    PackageIcon,
    CheckmarkCircle01Icon,
    Alert01Icon,
    Download01Icon,
    File02Icon,
    FileAttachmentIcon,
    Loading03Icon,
    Refresh01Icon,
    Search01Icon,
    Tick02Icon,
    PencilEdit01Icon,
    Delete02Icon,
    ViewIcon,
    Cancel01Icon
} from 'hugeicons-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from '@/components/ui/pagination';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';

interface SessionItem {
    id: string;
    trackingId: string;
    productName: string;
    variation: string | null;
    deliveryOption: string | null;
    shippingProvider: string | null;
    status: string;
    scannedAt: string | null;
    scannedBy?: { name: string };
}

interface SessionDetail {
    id: string;
    name: string;
    createdAt: string;
    items: SessionItem[];
    stats: {
        total: number;
        scannedCount: number;
        missingCount: number;
        progress: number;
    };
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { user: authUser } = useAuth();
    const [session, setSession] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'scanned' | 'unscanned'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Super Admin CRUD states
    const [showEditItemModal, setShowEditItemModal] = useState(false);
    const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<SessionItem | null>(null);
    const [editItemData, setEditItemData] = useState({
        trackingId: '',
        productName: '',
        variation: '',
        deliveryOption: '',
        shippingProvider: '',
        status: 'UNSCANNED'
    });
    const [actionLoading, setActionLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchSession();
    }, [resolvedParams.id]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(fetchSession, 5000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh, resolvedParams.id]);

    const fetchSession = async () => {
        try {
            const res = await fetch(`/api/sessions/${resolvedParams.id}/scan`);
            if (res.ok) {
                setSession(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch session:', error);
            toast.error("Gagal memuat detail sesi");
        } finally {
            setLoading(false);
        }
    };

    const handleEditItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/session-items/${selectedItem.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editItemData),
            });

            if (res.ok) {
                toast.success('Informasi paket berhasil diperbarui');
                setShowEditItemModal(false);
                fetchSession();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Gagal memperbarui paket');
            }
        } catch (error) {
            toast.error('Terjadi kesalahan pada server');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!selectedItem) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/session-items/${selectedItem.id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Paket berhasil dihapus');
                setShowDeleteItemModal(false);
                fetchSession();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Gagal menghapus paket');
            }
        } catch (error) {
            toast.error('Terjadi kesalahan pada server');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredItems = session?.items.filter(item => {
        const matchesFilter =
            filter === 'all' ||
            (filter === 'scanned' && item.status === 'SCANNED') ||
            (filter === 'unscanned' && item.status === 'UNSCANNED');

        const matchesSearch =
            !searchQuery ||
            item.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.variation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.shippingProvider?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesFilter && matchesSearch;
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const exportToExcel = () => {
        if (!session) return;
        try {
            const scanned = session.items.filter(i => i.status === 'SCANNED');
            const unscanned = session.items.filter(i => i.status === 'UNSCANNED');

            const wb = XLSX.utils.book_new();

            const scannedData = scanned.map(item => ({
                'No Resi': item.trackingId,
                'Produk': item.productName || '-',
                'Variasi': item.variation || '-',
                'Opsi Pengiriman': item.deliveryOption || '-',
                'Kurir': item.shippingProvider || '-',
                'Waktu Scan': item.scannedAt ? new Date(item.scannedAt).toLocaleString('id-ID') : '-'
            }));
            const ws1 = XLSX.utils.json_to_sheet(scannedData);
            XLSX.utils.book_append_sheet(wb, ws1, 'Terkirim');

            const unscannedData = unscanned.map(item => ({
                'No Resi': item.trackingId,
                'Produk': item.productName || '-',
                'Variasi': item.variation || '-',
                'Opsi Pengiriman': item.deliveryOption || '-',
                'Kurir': item.shippingProvider || '-',
            }));
            const ws2 = XLSX.utils.json_to_sheet(unscannedData);
            XLSX.utils.book_append_sheet(wb, ws2, 'Hilang-Tertinggal');

            XLSX.writeFile(wb, `Rekonsiliasi_${session.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Laporan Excel berhasil diunduh');
        } catch (err) {
            toast.error('Gagal mengekspor Excel');
        }
    };

    const exportToPDF = () => {
        if (!session) return;
        try {
            const doc = new jsPDF();
            const scanned = session.items.filter(i => i.status === 'SCANNED');
            const unscanned = session.items.filter(i => i.status === 'UNSCANNED');

            doc.setFontSize(18);
            doc.text('Laporan Rekonsiliasi', 14, 22);
            doc.setFontSize(12);
            doc.text(`Sesi: ${session.name}`, 14, 32);
            doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 40);

            doc.setFontSize(10);
            doc.text(`Total: ${session.stats.total} | Terkirim: ${session.stats.scannedCount} | Tertinggal: ${session.stats.missingCount}`, 14, 50);

            doc.setFontSize(14);
            doc.text('Paket Terkirim (Scanned)', 14, 65);

            autoTable(doc, {
                startY: 70,
                head: [['No', 'No Resi', 'Produk', 'Variasi', 'Kurir', 'Waktu Scan']],
                body: scanned.map((item, idx) => [
                    idx + 1,
                    item.trackingId,
                    item.productName || '-',
                    item.variation || '-',
                    item.shippingProvider || '-',
                    item.scannedAt ? new Date(item.scannedAt).toLocaleString('id-ID') : '-'
                ]),
                headStyles: { fillColor: [34, 197, 94] },
                styles: { fontSize: 7 }
            });

            const finalY = (doc as any).lastAutoTable.finalY || 70;
            doc.setFontSize(14);
            doc.text('Paket Hilang/Tertinggal (Unscanned)', 14, finalY + 15);

            autoTable(doc, {
                startY: finalY + 20,
                head: [['No', 'No Resi', 'Produk', 'Variasi', 'Kurir']],
                body: unscanned.map((item, idx) => [
                    idx + 1,
                    item.trackingId,
                    item.productName || '-',
                    item.variation || '-',
                    item.shippingProvider || '-'
                ]),
                headStyles: { fillColor: [239, 68, 68] },
                styles: { fontSize: 7 }
            });

            doc.save(`Rekonsiliasi_${session.name}_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('Laporan PDF berhasil diunduh');
        } catch (err) {
            toast.error('Gagal mengekspor PDF');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <Loading03Icon size={48} className="animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Memuat detail sesi...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <Alert01Icon size={64} className="text-yellow-500 mb-4" />
                <p className="text-xl font-semibold">Sesi tidak ditemukan</p>
                <Link href="/admin/sessions" className="mt-6">
                    <Button>Kembali ke Daftar Sesi</Button>
                </Link>
            </div>
        );
    }

    const progress = Math.round(session.stats.progress);

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    {authUser?.role === 'SUPER_ADMIN' ? (
                        <Link href="/superadmin">
                            <Button variant="outline" size="sm" className="gap-2">
                                <ArrowLeft01Icon size={16} /> Dashboard SuperAdmin
                            </Button>
                        </Link>
                    ) : (
                        <Link href="/admin/sessions">
                            <Button variant="outline" size="sm" className="gap-2">
                                <ArrowLeft01Icon size={16} /> Daftar Sesi
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{session.name}</h1>
                        <p className="text-muted-foreground">
                            Dibuat {new Date(session.createdAt).toLocaleDateString('id-ID', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={autoRefresh ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className="gap-2"
                        >
                            <Refresh01Icon size={16} className={autoRefresh ? "animate-spin" : ""} />
                            {autoRefresh ? 'Refresh: ON' : 'Auto-Refresh'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                            <File02Icon size={16} className="text-green-600" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                            <FileAttachmentIcon size={16} className="text-red-600" /> PDF
                        </Button>
                    </div>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Paket</CardTitle>
                        <PackageIcon size={20} className="text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{session.stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Terkirim</CardTitle>
                        <CheckmarkCircle01Icon size={20} className="text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{session.stats.scannedCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tertinggal</CardTitle>
                        <Alert01Icon size={20} className="text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{session.stats.missingCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
                        <div className="text-sm font-bold text-primary">{progress}%</div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Package List */}
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <CardTitle>Daftar Paket</CardTitle>
                        <div className="flex bg-secondary p-1 rounded-lg">
                            {(['all', 'scanned', 'unscanned'] as const).map(f => (
                                <button
                                    key={f}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                        filter === f ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    onClick={() => { setFilter(f); setCurrentPage(1); }}
                                >
                                    {f === 'all' ? 'Semua' : f === 'scanned' ? 'Terkirim' : 'Tertinggal'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search01Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari no resi, produk, kurir..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="pl-10 h-10"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No Resi</TableHead>
                                <TableHead>Produk</TableHead>
                                <TableHead>Variasi</TableHead>
                                <TableHead>Kurir</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Waktu Scan</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-48 text-muted-foreground">
                                        Tidak ada data yang sesuai filter
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedItems.map((item) => (
                                    <TableRow key={item.id} className="group">
                                        <TableCell className="font-bold font-mono text-sm">{item.trackingId}</TableCell>
                                        <TableCell className="max-w-[180px] truncate">{item.productName || '-'}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{item.variation || '-'}</TableCell>
                                        <TableCell className="text-sm">{item.shippingProvider || '-'}</TableCell>
                                        <TableCell>
                                            {item.status === 'SCANNED' ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                                                    <Tick02Icon size={12} className="text-green-700" /> Terkirim
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                                                    <Alert01Icon size={12} className="text-red-700" /> Tertinggal
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {item.scannedAt
                                                ? new Date(item.scannedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                                                : '-'
                                            }
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary"
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setShowViewModal(true);
                                                    }}
                                                    title="Lihat Detail"
                                                >
                                                    <ViewIcon size={16} />
                                                </Button>

                                                {authUser?.role === 'SUPER_ADMIN' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-amber-600"
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setEditItemData({
                                                                    trackingId: item.trackingId,
                                                                    productName: item.productName || '',
                                                                    variation: item.variation || '',
                                                                    deliveryOption: item.deliveryOption || '',
                                                                    shippingProvider: item.shippingProvider || '',
                                                                    status: item.status
                                                                });
                                                                setShowEditItemModal(true);
                                                            }}
                                                        >
                                                            <PencilEdit01Icon size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-600"
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setShowDeleteItemModal(true);
                                                            }}
                                                        >
                                                            <Delete02Icon size={16} />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="py-2">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>

                            <PaginationItem>
                                <PaginationLink href="#" isActive onClick={(e) => e.preventDefault()}>
                                    {currentPage}
                                </PaginationLink>
                            </PaginationItem>

                            <PaginationItem>
                                <span className="text-muted-foreground text-sm mx-2">dari {totalPages}</span>
                            </PaginationItem>

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}

            {/* Edit Item Modal */}
            <Dialog open={showEditItemModal} onOpenChange={setShowEditItemModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Informasi Paket</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditItem} className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">No Resi</label>
                            <Input
                                value={editItemData.trackingId}
                                onChange={(e) => setEditItemData({ ...editItemData, trackingId: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Nama Produk</label>
                            <Input
                                value={editItemData.productName}
                                onChange={(e) => setEditItemData({ ...editItemData, productName: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Variasi</label>
                            <Input
                                value={editItemData.variation}
                                onChange={(e) => setEditItemData({ ...editItemData, variation: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Opsi Pengiriman</label>
                            <Input
                                value={editItemData.deliveryOption}
                                onChange={(e) => setEditItemData({ ...editItemData, deliveryOption: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Kurir (Shipping Provider)</label>
                            <Input
                                value={editItemData.shippingProvider}
                                onChange={(e) => setEditItemData({ ...editItemData, shippingProvider: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={editItemData.status}
                                onChange={(e) => setEditItemData({ ...editItemData, status: e.target.value })}
                            >
                                <option value="UNSCANNED">UNSCANNED (Tertinggal)</option>
                                <option value="SCANNED">SCANNED (Terkirim)</option>
                            </select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowEditItemModal(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={actionLoading || !editItemData.trackingId}>
                                {actionLoading ? <Loading03Icon size={16} className="animate-spin mr-2" /> : null}
                                Simpan Perubahan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Item Confirmation */}
            <Dialog open={showDeleteItemModal} onOpenChange={setShowDeleteItemModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Alert01Icon size={20} />
                            Hapus Paket?
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>Apakah Anda yakin ingin menghapus paket dengan tracking ID <strong>"{selectedItem?.trackingId}"</strong>?</p>
                        <p className="text-sm text-muted-foreground mt-2">Tindakan ini tidak dapat dibatalkan.</p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowDeleteItemModal(false)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteItem}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loading03Icon size={16} className="animate-spin mr-2" /> : null}
                            Hapus Sekarang
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Detail Modal */}
            <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                    <div className="bg-primary p-6 text-white relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                            onClick={() => setShowViewModal(false)}
                        >
                            <Cancel01Icon size={20} />
                        </Button>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <PackageIcon size={24} />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight">Rincian Paket</h3>
                        </div>
                        <p className="text-white/60 text-sm font-medium tracking-wide uppercase">Informasi Lengkap No Resi</p>
                    </div>

                    <div className="p-6 space-y-6 bg-white">
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-50 items-start">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">No Resi</span>
                                <span className="col-span-2 font-mono font-bold text-primary select-all">{selectedItem?.trackingId}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-50 items-start">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                                <div className="col-span-2">
                                    {selectedItem?.status === 'SCANNED' ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 border border-green-100">
                                            <Tick02Icon size={14} /> Terkirim
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-100">
                                            <Alert01Icon size={14} /> Tertinggal
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-50 items-start">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Produk</span>
                                <span className="col-span-2 text-sm font-medium leading-relaxed">{selectedItem?.productName || '-'}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-50 items-start">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Variasi</span>
                                <span className="col-span-2 text-sm font-medium">{selectedItem?.variation || '-'}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-50 items-start">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kurir</span>
                                <div className="col-span-2 space-y-1">
                                    <span className="text-sm font-bold block">{selectedItem?.shippingProvider || '-'}</span>
                                    <span className="text-xs text-muted-foreground block">{selectedItem?.deliveryOption || '-'}</span>
                                </div>
                            </div>

                            {selectedItem?.status === 'SCANNED' && (
                                <div className="grid grid-cols-3 gap-2 py-3 border-b border-gray-50 items-start">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Waktu Scan</span>
                                    <div className="col-span-2 space-y-1">
                                        <span className="text-sm font-medium block">
                                            {selectedItem.scannedAt ? new Date(selectedItem.scannedAt).toLocaleString('id-ID', {
                                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                            }) : '-'}
                                        </span>
                                        <span className="text-xs text-primary font-bold block">
                                            {selectedItem.scannedAt ? new Date(selectedItem.scannedAt).toLocaleTimeString('id-ID', {
                                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                                            }) : ''}
                                        </span>
                                        {selectedItem.scannedBy && (
                                            <span className="text-[10px] text-muted-foreground italic block mt-1">
                                                Oleh: {selectedItem.scannedBy.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <Button
                                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                                onClick={() => setShowViewModal(false)}
                            >
                                Tutup Detail
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
