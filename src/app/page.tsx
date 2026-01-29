// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        // Redirect based on role
        if (user.role === 'SUPER_ADMIN') {
          router.push('/superadmin');
        } else if (user.role === 'ADMIN') {
          router.push('/admin');
        } else if (user.role === 'WAREHOUSE') {
          router.push('/warehouse');
        }
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fcfcfd',
      backgroundImage: 'radial-gradient(at 0% 0%, rgba(128, 0, 0, 0.05) 0%, transparent 50%), radial-gradient(at 100% 100%, rgba(128, 0, 0, 0.05) 0%, transparent 50%)',
      color: '#1a1a1c',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        padding: '40px 60px',
        borderRadius: 32,
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px 0 rgba(128, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <Loader2 size={40} style={{ color: '#800000', animation: 'spin 1.5s linear infinite' }} />
        <p style={{ marginTop: 24, fontSize: '1.2rem', fontWeight: 800, color: '#800000', letterSpacing: '-0.02em' }}>
          Wijaya Tracking
        </p>
        <p style={{ marginTop: 4, fontSize: '0.9rem', color: '#6e6e73', fontWeight: 500 }}>
          Menyiapkan dashboard Anda...
        </p>
      </div>
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
