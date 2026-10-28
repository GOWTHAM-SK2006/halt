'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import QRCode from 'qrcode';
import {
  Plus, LogOut, Search, QrCode, Download, Copy, ChevronDown,
  ChevronUp, X, Loader2, CheckCircle2, AlertCircle, Clock, Zap,
  RefreshCw, ExternalLink, TrendingUp, CreditCard, XCircle,
} from 'lucide-react';
import {
  createAdminPaymentSession,
  listAdminSessions,
  getAdminStats,
  adminLogout,
  isAdminLoggedIn,
  calculateBillingPreview,
} from '@/lib/adminApi';
import { AdminPaymentSession, AdminStats, BillingPreview } from '@/lib/adminTypes';

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-yellow-950/60 text-yellow-400 border-yellow-800/40' },
    PAID: { label: 'Paid', cls: 'bg-green-950/60 text-[#39FF14] border-green-800/40' },
    EXPIRED: { label: 'Expired', cls: 'bg-orange-950/60 text-orange-400 border-orange-800/40' },
    FAILED: { label: 'Failed', cls: 'bg-red-950/60 text-red-400 border-red-800/40' },
  };
  const c = cfg[status] || { label: status, cls: 'bg-[#1A1E1A] text-[#B8BDB8] border-[#2A302A]' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({
  session,
  onClose,
}: {
  session: AdminPaymentSession;
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(session.paymentUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#050505', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).then(setQrDataUrl);
  }, [session.paymentUrl]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(session.paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `HC-QR-${session.chargerId}-${session.sessionId}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111411] border border-[#2A302A] rounded-2xl w-full max-w-sm shadow-2xl animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A302A]">
          <div className="flex items-center gap-2">
            <QrCode size={16} className="text-[#39FF14]" />
            <span className="text-sm font-bold text-white">Payment QR Code</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#5A5F5A] hover:text-white hover:bg-[#1A1E1A] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-xl shadow-lg">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Payment QR" className="w-56 h-56 object-contain" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-[#2A302A]" />
                </div>
              )}
            </div>
          </div>

          {/* Session details */}
          <div className="bg-[#0D100D] rounded-xl border border-[#2A302A] p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#B8BDB8]">Station</span>
              <span className="text-xs font-semibold text-white truncate max-w-[55%] text-right">{session.stationName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#B8BDB8]">Charger ID</span>
              <span className="text-xs font-mono text-white">{session.chargerId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#B8BDB8]">Session ID</span>
              <span className="text-xs font-mono text-[#B8BDB8]">{session.sessionId}</span>
            </div>
            <div className="border-t border-[#2A302A] pt-2 flex justify-between items-center">
              <span className="text-xs text-[#B8BDB8]">Amount</span>
              <span className="text-base font-black text-white" style={{ textShadow: '0 0 12px rgba(57,255,20,0.3)' }}>
                ₹{session.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment URL */}
          <div className="bg-[#0D100D] rounded-xl border border-[#2A302A] p-3">
            <p className="text-[10px] text-[#5A5F5A] mb-1 uppercase tracking-wider">Payment Link</p>
            <p className="text-xs text-[#B8BDB8] break-all leading-relaxed">{session.paymentUrl}</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="download-qr-btn"
              onClick={downloadQR}
              disabled={!qrDataUrl}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#2A302A] text-sm font-semibold text-white hover:border-[#39FF14] hover:text-[#39FF14] transition-all duration-200 disabled:opacity-40"
            >
              <Download size={14} />
              Download
            </button>
            <button
              id="copy-link-btn"
              onClick={copyLink}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
              style={{
                background: copied ? '#1A2A1A' : '#39FF14',
                color: copied ? '#39FF14' : '#050505',
                boxShadow: copied ? 'none' : '0 0 16px rgba(57,255,20,0.3)',
              }}
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* Open in browser */}
          <a
            href={session.paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-[#2A302A] text-xs text-[#B8BDB8] hover:text-white hover:border-[#39FF14] transition-all duration-200"
          >
            <ExternalLink size={12} />
            Open customer page (test)
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Create Session Form ───────────────────────────────────────────────────────
function CreateSessionPanel({
  onCreated,
  onCancel,
}: {
  onCreated: (s: AdminPaymentSession) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    stationName: '',
    location: '',
    chargerId: '',
    connectorType: 'CCS2 (DC Fast Charge)',
    baseAmount: '',
    taxRate: '5',
    serviceFee: '0',
    discount: '0',
    description: '',
    customerName: '',
    customerPhone: '',
  });
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recalculate preview on change
  useEffect(() => {
    const base = parseFloat(form.baseAmount);
    if (!isNaN(base) && base > 0) {
      setPreview(calculateBillingPreview(
        base,
        parseFloat(form.taxRate) / 100 || 0.05,
        parseFloat(form.serviceFee) || 0,
        parseFloat(form.discount) || 0,
      ));
    } else {
      setPreview(null);
    }
  }, [form.baseAmount, form.taxRate, form.serviceFee, form.discount]);

  const set = (key: keyof typeof form, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.stationName.trim()) { setError('Station name is required.'); return; }
    if (!form.chargerId.trim()) { setError('Charger ID is required.'); return; }
    const base = parseFloat(form.baseAmount);
    if (isNaN(base) || base <= 0) { setError('Enter a valid base amount greater than 0.'); return; }

    setLoading(true);
    try {
      const session = await createAdminPaymentSession({
        stationName: form.stationName.trim(),
        location: form.location.trim() || undefined,
        chargerId: form.chargerId.trim(),
        connectorType: form.connectorType.trim() || undefined,
        baseAmount: base,
        taxRate: parseFloat(form.taxRate) / 100 || 0.05,
        serviceFee: parseFloat(form.serviceFee) || 0,
        discount: parseFloat(form.discount) || 0,
        description: form.description.trim() || undefined,
        customerName: form.customerName.trim() || undefined,
        customerPhone: form.customerPhone.trim() || undefined,
      });
      onCreated(session);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-[#0D100D] border border-[#2A302A] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3A403A] focus:outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14]/20 transition-all duration-200";
  const labelCls = "block text-xs font-semibold text-[#B8BDB8] uppercase tracking-wider mb-1.5";

  return (
    <div className="bg-[#111411] border border-[#2A302A] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2A302A] bg-[#0D100D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plus size={15} className="text-[#39FF14]" />
          <span className="text-sm font-bold text-white">Create Payment QR</span>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-lg text-[#5A5F5A] hover:text-white hover:bg-[#1A1E1A] transition-colors">
          <X size={15} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5">
        {error && (
          <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 mb-4 animate-fade-up">
            <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Station Name */}
          <div className="md:col-span-2">
            <label className={labelCls} htmlFor="f-station">Station Name *</label>
            <input id="f-station" className={inputCls} value={form.stationName} onChange={e => set('stationName', e.target.value)} placeholder="e.g. Halt & Charge — Phoenix MarketCity" disabled={loading} />
          </div>

          {/* Location */}
          <div className="md:col-span-2">
            <label className={labelCls} htmlFor="f-location">Location</label>
            <input id="f-location" className={inputCls} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Velachery, Chennai — 600042" disabled={loading} />
          </div>

          {/* Charger ID */}
          <div>
            <label className={labelCls} htmlFor="f-charger">Charger ID *</label>
            <input id="f-charger" className={inputCls} value={form.chargerId} onChange={e => set('chargerId', e.target.value)} placeholder="HC-CHN-001-A3" disabled={loading} />
          </div>

          {/* Connector type */}
          <div>
            <label className={labelCls} htmlFor="f-connector">Connector Type</label>
            <select id="f-connector" className={inputCls} value={form.connectorType} onChange={e => set('connectorType', e.target.value)} disabled={loading}>
              <option>CCS2 (DC Fast Charge)</option>
              <option>CHAdeMO (DC Fast Charge)</option>
              <option>Type 2 (AC)</option>
              <option>Bharat DC-001</option>
              <option>Bharat AC-001</option>
              <option>GB/T (DC)</option>
            </select>
          </div>

          {/* Base Amount */}
          <div>
            <label className={labelCls} htmlFor="f-amount">Base Amount (₹) *</label>
            <input id="f-amount" type="number" min="1" step="0.01" className={inputCls} value={form.baseAmount} onChange={e => set('baseAmount', e.target.value)} placeholder="268.80" disabled={loading} />
          </div>

          {/* Tax rate */}
          <div>
            <label className={labelCls} htmlFor="f-tax">Tax Rate (%)</label>
            <input id="f-tax" type="number" min="0" max="100" step="0.1" className={inputCls} value={form.taxRate} onChange={e => set('taxRate', e.target.value)} placeholder="5" disabled={loading} />
          </div>

          {/* Service fee */}
          <div>
            <label className={labelCls} htmlFor="f-fee">Service Fee (₹)</label>
            <input id="f-fee" type="number" min="0" step="0.01" className={inputCls} value={form.serviceFee} onChange={e => set('serviceFee', e.target.value)} placeholder="0" disabled={loading} />
          </div>

          {/* Discount */}
          <div>
            <label className={labelCls} htmlFor="f-disc">Discount (₹)</label>
            <input id="f-disc" type="number" min="0" step="0.01" className={inputCls} value={form.discount} onChange={e => set('discount', e.target.value)} placeholder="0" disabled={loading} />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className={labelCls} htmlFor="f-desc">Description (optional)</label>
            <input id="f-desc" className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Charging session — 22.4 kWh" disabled={loading} />
          </div>

          {/* Customer name */}
          <div>
            <label className={labelCls} htmlFor="f-cname">Customer Name (optional)</label>
            <input id="f-cname" className={inputCls} value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="Raj Kumar" disabled={loading} />
          </div>

          {/* Customer phone */}
          <div>
            <label className={labelCls} htmlFor="f-cphone">Customer Phone (optional)</label>
            <input id="f-cphone" type="tel" className={inputCls} value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} placeholder="+91 9876543210" disabled={loading} />
          </div>
        </div>

        {/* Billing preview */}
        {preview && (
          <div className="mt-5 bg-[#0D100D] border border-[#39FF14]/20 rounded-xl p-4 animate-fade-up">
            <p className="text-xs font-semibold text-[#39FF14] uppercase tracking-wider mb-3">Bill Preview</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#B8BDB8]">
                <span>Base Amount</span>
                <span>₹{preview.baseAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#B8BDB8]">
                <span>Tax ({(preview.taxRate * 100).toFixed(0)}%)</span>
                <span>₹{preview.taxAmount.toFixed(2)}</span>
              </div>
              {preview.serviceFee > 0 && (
                <div className="flex justify-between text-[#B8BDB8]">
                  <span>Service Fee</span>
                  <span>₹{preview.serviceFee.toFixed(2)}</span>
                </div>
              )}
              {preview.discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount</span>
                  <span>−₹{preview.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-[#2A302A] pt-2 flex justify-between">
                <span className="font-bold text-white">Total Payable</span>
                <span className="font-black text-white text-lg" style={{ textShadow: '0 0 12px rgba(57,255,20,0.4)' }}>
                  ₹{preview.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          id="generate-qr-btn"
          type="submit"
          disabled={loading || !preview}
          className="mt-5 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: loading ? '#2A302A' : '#39FF14',
            color: loading ? '#B8BDB8' : '#050505',
            boxShadow: (loading || !preview) ? 'none' : '0 0 24px rgba(57,255,20,0.35)',
          }}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" />Generating QR…</>
          ) : (
            <><QrCode size={16} />Generate Payment QR</>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [qrSession, setQrSession] = useState<AdminPaymentSession | null>(null);
  const [sessions, setSessions] = useState<AdminPaymentSession[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [search, setSearch] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;
  const adminUser = typeof window !== 'undefined' ? localStorage.getItem('hc_admin_user') || 'Admin' : 'Admin';

  // Auth guard
  useEffect(() => {
    if (!isAdminLoggedIn()) {
      router.replace('/admin/login');
    }
  }, [router]);

  const loadSessions = useCallback(async (p = 0, q = '') => {
    setLoadingSessions(true);
    try {
      const res = await listAdminSessions(p, PAGE_SIZE, q);
      setSessions(res.sessions);
      setTotal(res.total);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        router.replace('/admin/login');
      }
    } finally {
      setLoadingSessions(false);
    }
  }, [router]);

  const loadStats = useCallback(async () => {
    try {
      const s = await getAdminStats();
      setStats(s);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    loadSessions(0);
    loadStats();
  }, [loadSessions, loadStats]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(0);
    loadSessions(0, q);
  };

  const handleCreated = (session: AdminPaymentSession) => {
    setShowCreate(false);
    setQrSession(session);
    loadSessions(0, search);
    loadStats();
  };

  const handleLogout = async () => {
    await adminLogout();
    router.replace('/admin/login');
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* QR Modal */}
      {qrSession && <QRModal session={qrSession} onClose={() => setQrSession(null)} />}

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#0D100D]/95 backdrop-blur border-b border-[#2A302A]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <Image src="/logo.png" alt="Halt & Charge" fill className="object-contain" />
            </div>
            <div>
              <span className="text-sm font-black text-white tracking-tight">HALT <span className="text-[#39FF14]">&</span> CHARGE</span>
              <p className="text-[10px] text-[#5A5F5A] -mt-0.5">Payment Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-[#5A5F5A]">{adminUser}</span>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2A302A] text-xs text-[#B8BDB8] hover:border-red-700 hover:text-red-400 transition-all duration-200"
            >
              <LogOut size={12} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Sessions', value: stats.totalSessions, icon: <CreditCard size={16} />, color: 'text-[#B8BDB8]' },
              { label: 'Paid', value: stats.paidSessions, icon: <CheckCircle2 size={16} />, color: 'text-[#39FF14]' },
              { label: 'Pending', value: stats.pendingSessions, icon: <Clock size={16} />, color: 'text-yellow-400' },
              { label: 'Revenue', value: `₹${stats.totalRevenue.toFixed(0)}`, icon: <TrendingUp size={16} />, color: 'text-[#39FF14]' },
            ].map(s => (
              <div key={s.label} className="bg-[#111411] border border-[#2A302A] rounded-xl p-4">
                <div className={`flex items-center gap-1.5 ${s.color} mb-2`}>
                  {s.icon}
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Create button */}
        {!showCreate && (
          <button
            id="create-payment-btn"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200"
            style={{ background: '#39FF14', color: '#050505', boxShadow: '0 0 24px rgba(57,255,20,0.3)' }}
          >
            <Plus size={16} />
            Create Payment QR
          </button>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="animate-fade-up">
            <CreateSessionPanel onCreated={handleCreated} onCancel={() => setShowCreate(false)} />
          </div>
        )}

        {/* Sessions table */}
        <div className="bg-[#111411] border border-[#2A302A] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2A302A] bg-[#0D100D] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Zap size={14} className="text-[#39FF14]" />
              <span className="text-sm font-bold text-white">Payment Sessions</span>
              {total > 0 && <span className="text-xs text-[#5A5F5A]">({total})</span>}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5F5A]" />
                <input
                  id="session-search"
                  type="search"
                  placeholder="Search session or charger ID…"
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  className="bg-[#0D100D] border border-[#2A302A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#3A403A] focus:outline-none focus:border-[#39FF14] w-56"
                />
              </div>
              <button
                onClick={() => loadSessions(page, search)}
                className="p-2 rounded-xl border border-[#2A302A] text-[#5A5F5A] hover:text-[#39FF14] hover:border-[#39FF14] transition-colors"
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loadingSessions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="animate-spin text-[#39FF14]" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-[#5A5F5A]">
                <QrCode size={32} strokeWidth={1} />
                <p className="text-sm">No payment sessions yet</p>
                <p className="text-xs">Click &quot;Create Payment QR&quot; to get started</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1A1E1A]">
                    {['Session ID', 'Station', 'Charger', 'Amount', 'Status', 'Created', 'QR'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#5A5F5A] uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1E1A]">
                  {sessions.map(s => (
                    <tr key={s.id} className="hover:bg-[#0D100D]/50 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs text-[#B8BDB8] whitespace-nowrap">{s.sessionId}</td>
                      <td className="px-4 py-3 text-xs text-white max-w-[160px] truncate">{s.stationName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#B8BDB8] whitespace-nowrap">{s.chargerId}</td>
                      <td className="px-4 py-3 font-bold text-white whitespace-nowrap">₹{s.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-xs text-[#B8BDB8] whitespace-nowrap">{formatDate(s.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setQrSession(s)}
                          className="p-1.5 rounded-lg text-[#5A5F5A] hover:text-[#39FF14] hover:bg-[#1A1E1A] transition-colors"
                          title="Show QR"
                        >
                          <QrCode size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="px-5 py-3 border-t border-[#1A1E1A] flex items-center justify-between">
              <span className="text-xs text-[#5A5F5A]">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => { const p = page - 1; setPage(p); loadSessions(p, search); }}
                  className="px-3 py-1.5 rounded-lg border border-[#2A302A] text-xs text-[#B8BDB8] disabled:opacity-40 hover:border-[#39FF14] hover:text-[#39FF14] transition-all"
                >
                  Previous
                </button>
                <button
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  onClick={() => { const p = page + 1; setPage(p); loadSessions(p, search); }}
                  className="px-3 py-1.5 rounded-lg border border-[#2A302A] text-xs text-[#B8BDB8] disabled:opacity-40 hover:border-[#39FF14] hover:text-[#39FF14] transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[#1A1E1A] py-4 text-center mt-8">
        <p className="text-[11px] text-[#3A403A]">© {new Date().getFullYear()} Halt &amp; Charge · Admin Dashboard</p>
      </footer>
    </div>
  );
}
