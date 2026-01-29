// src/app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import Scanner from '@/components/Scanner/Scanner';
import SessionManager from '@/components/Session/SessionManager';
import ReconciliationReport from '@/components/Report/ReconciliationReport';
import { PackageSearch, ArrowLeft } from 'lucide-react';

export default function Home() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSessionDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${id}/scan`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
      }
    } catch (error) {
      console.error('Failed to fetch session detail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionDetails(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleScanResult = () => {
    if (selectedSessionId) fetchSessionDetails(selectedSessionId);
  };

  return (
    <main className={styles.main}>
      <div className="container">
        {!selectedSessionId ? (
          <>
            <header className={styles.hero}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                <div className="glass" style={{
                  padding: 24,
                  borderRadius: '24px',
                  color: 'var(--primary)',
                  background: '#ffffff',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  <PackageSearch size={48} strokeWidth={1.5} />
                </div>
              </div>
              <h1 className="animate-fade-in">Scan-Resi Pro</h1>
              <p className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                Bulk Scanning & Real-time Reconciliation System.
              </p>
            </header>

            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <SessionManager onSessionSelected={setSelectedSessionId} />
            </div>
          </>
        ) : (
          <div className="animate-fade-in">
            <button
              onClick={() => setSelectedSessionId(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', marginBottom: 40, fontWeight: 700 }}
            >
              <ArrowLeft size={20} /> Kembali ke Daftar Sesi
            </button>

            <div className={styles.contentGrid}>
              <section className={styles.scannerSection}>
                <div className="glass" style={{ padding: '0 0 20px 0', background: '#ffffff' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>Scan Item Sesi</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Sesi: {sessionData?.name}</p>
                  </div>
                  <Scanner sessionId={selectedSessionId} onScanResult={handleScanResult} />
                </div>
              </section>

              <section className={styles.dashboardSection}>
                {loading && !sessionData ? (
                  <div style={{ padding: 100, textAlign: 'center' }}>Loading Session Data...</div>
                ) : (
                  <ReconciliationReport session={sessionData} />
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
