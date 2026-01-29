// src/app/superadmin/users/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import styles from '../../admin/admin.module.css';
import {
    Plus,
    Users,
    Edit2,
    Trash2,
    X,
    Loader2,
    UserCheck,
    UserX,
    Shield,
    Warehouse,
    User as UserIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import Modal from '@/components/Modal/Modal';

interface User {
    id: string;
    username: string;
    name: string;
    role: 'ADMIN' | 'WAREHOUSE' | 'SUPER_ADMIN';
    isActive: boolean;
    createdAt: string;
    _count?: {
        createdSessions: number;
        scannedItems: number;
    };
}

const roleLabels = {
    ADMIN: { label: 'Admin', icon: UserIcon, color: 'badgeInfo' },
    WAREHOUSE: { label: 'Warehouse', icon: Warehouse, color: 'badgeSuccess' },
    SUPER_ADMIN: { label: 'Super Admin', icon: Shield, color: 'badgeDanger' }
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        role: 'ADMIN' as 'ADMIN' | 'WAREHOUSE' | 'SUPER_ADMIN'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ username: '', password: '', name: '', role: 'ADMIN' });
        setShowModal(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            name: user.name,
            role: user.role
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';

            const body: {
                name: string;
                role: string;
                username?: string;
                password?: string;
            } = {
                name: formData.name,
                role: formData.role
            };

            if (!editingUser) {
                body.username = formData.username;
                body.password = formData.password;
            } else if (formData.password) {
                body.password = formData.password;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowModal(false);
                fetchUsers();
            } else {
                const err = await res.json();
                alert(err.error || 'Gagal menyimpan user');
            }
        } catch (error) {
            alert('Terjadi kesalahan');
        } finally {
            setSaving(false);
        }
    };

    const toggleUserStatus = async (user: User) => {
        const action = user.isActive ? 'menonaktifkan' : 'mengaktifkan';
        if (!confirm(`Yakin ingin ${action} user "${user.name}"?`)) return;

        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !user.isActive })
            });

            if (res.ok) {
                fetchUsers();
            } else {
                alert('Gagal mengubah status user');
            }
        } catch (error) {
            alert('Terjadi kesalahan');
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <Loader2 size={32} className={styles.spin} />
                <p style={{ marginTop: 16 }}>Memuat user...</p>
            </div>
        );
    }

    return (
        <>
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className={styles.pageTitle}>User Management</h1>
                        <p className={styles.pageSubtitle}>Kelola akun pengguna sistem</p>
                    </div>
                    <button
                        className={clsx(styles.button, styles.buttonPrimary)}
                        onClick={openCreateModal}
                    >
                        <Plus size={18} />
                        Tambah User
                    </button>
                </div>
            </header>

            {/* Stats */}
            <div className={styles.statsGrid} style={{ marginBottom: 24 }}>
                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconBlue)}>
                        <Users size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{users.length}</div>
                        <div className={styles.statLabel}>Total User</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconGreen)}>
                        <UserCheck size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{users.filter(u => u.isActive).length}</div>
                        <div className={styles.statLabel}>User Aktif</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={clsx(styles.statIcon, styles.statIconOrange)}>
                        <UserX size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statValue}>{users.filter(u => !u.isActive).length}</div>
                        <div className={styles.statLabel}>User Nonaktif</div>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className={styles.card}>
                <div className={styles.cardBody} style={{ padding: 0 }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Statistik</th>
                                <th>Dibuat</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const roleInfo = roleLabels[user.role];
                                const RoleIcon = roleInfo.icon;

                                return (
                                    <tr key={user.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 12,
                                                    background: 'white',
                                                    border: '1px solid rgba(128, 0, 0, 0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'var(--primary)',
                                                    fontWeight: 800,
                                                    boxShadow: 'var(--glass-shadow)'
                                                }}>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <strong>{user.name}</strong>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>@{user.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={clsx(styles.badge, styles[roleInfo.color])}>
                                                <RoleIcon size={12} />
                                                {roleInfo.label}
                                            </span>
                                        </td>
                                        <td>
                                            {user.isActive ? (
                                                <span className={clsx(styles.badge, styles.badgeSuccess)}>Aktif</span>
                                            ) : (
                                                <span className={clsx(styles.badge, styles.badgeWarning)}>Nonaktif</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            {user._count?.createdSessions || 0} sesi • {user._count?.scannedItems || 0} scan
                                        </td>
                                        <td>{new Date(user.createdAt).toLocaleDateString('id-ID')}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className={clsx(styles.button, styles.buttonSecondary, styles.buttonSmall)}
                                                    onClick={() => openEditModal(user)}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    className={clsx(styles.button, styles.buttonSecondary, styles.buttonSmall)}
                                                    onClick={() => toggleUserStatus(user)}
                                                    title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                                >
                                                    {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingUser ? 'Edit User' : 'Tambah User Baru'}
                maxWidth={480}
            >
                <form onSubmit={handleSubmit}>
                    {!editingUser && (
                        <div className={styles.formGroup}>
                            <label>Username</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                placeholder="username_baru"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label>Nama Lengkap</label>
                        <input
                            type="text"
                            className={styles.formInput}
                            placeholder="Nama lengkap"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Password {editingUser && '(kosongkan jika tidak diubah)'}</label>
                        <input
                            type="password"
                            className={styles.formInput}
                            placeholder={editingUser ? '••••••••' : 'Password baru'}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={!editingUser}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Role</label>
                        <select
                            className={styles.formInput}
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        >
                            <option value="ADMIN">Admin (Back Office)</option>
                            <option value="WAREHOUSE">Warehouse Staff (Field Operator)</option>
                            <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button
                            type="button"
                            className={clsx(styles.button, styles.buttonSecondary)}
                            onClick={() => setShowModal(false)}
                            style={{ flex: 1 }}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className={clsx(styles.button, styles.buttonPrimary)}
                            disabled={saving}
                            style={{ flex: 1 }}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={18} className={styles.spin} />
                                    Menyimpan...
                                </>
                            ) : (
                                'Simpan'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}
