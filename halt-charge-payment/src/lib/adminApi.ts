/**
 * Admin API Client
 *
 * Strategy:
 *  - DEMO_MODE (NEXT_PUBLIC_DEMO_MODE=true): everything runs in-browser.
 *    Admin login validates hardcoded credentials. Sessions are stored in
 *    localStorage. Session tokens are base64-encoded JSON so the customer
 *    page can decode them without a backend — QR codes work cross-device.
 *
 *  - PRODUCTION (NEXT_PUBLIC_DEMO_MODE=false): forwards all calls to the
 *    Spring Boot backend at NEXT_PUBLIC_API_BASE_URL with JWT Bearer auth.
 */

import {
  AdminLoginRequest,
  AdminLoginResponse,
  CreatePaymentSessionRequest,
  AdminPaymentSession,
  AdminSessionListResponse,
  AdminStats,
  BillingPreview,
} from './adminTypes';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Demo credentials (development only — never ship real creds in frontend)
const DEMO_USERNAME = 'admin';
const DEMO_PASSWORD = 'HaltCharge@2025';
const DEMO_TOKEN = 'hc-demo-admin-session-2025';

// ─── LocalStorage keys ────────────────────────────────────────────────────────
const KEY_TOKEN = 'hc_admin_token';
const KEY_USER = 'hc_admin_user';
const KEY_SESSIONS = 'hc_demo_sessions';

// ─── In-memory token cache ────────────────────────────────────────────────────
let _adminToken: string | null = null;

export function getAdminToken(): string | null {
  if (_adminToken) return _adminToken;
  if (typeof window !== 'undefined') {
    _adminToken = localStorage.getItem(KEY_TOKEN);
  }
  return _adminToken;
}

export function setAdminToken(token: string): void {
  _adminToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY_TOKEN, token);
  }
}

export function clearAdminToken(): void {
  _adminToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
  }
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken();
}

// ─── Billing preview (client-side mirror of backend formula) ─────────────────
export function calculateBillingPreview(
  baseAmount: number,
  taxRate: number = 0.05,
  serviceFee: number = 0,
  discount: number = 0
): BillingPreview {
  const base = Math.max(0, baseAmount);
  const tax = parseFloat((base * taxRate).toFixed(2));
  const fee = Math.max(0, serviceFee);
  const disc = Math.max(0, discount);
  const total = parseFloat((base + tax + fee - disc).toFixed(2));
  return { baseAmount: base, taxRate, taxAmount: tax, serviceFee: fee, discount: disc, totalAmount: total, currency: 'INR' };
}

// ─── Token encoding ───────────────────────────────────────────────────────────
// Encodes session data as a URL-safe base64 string so customers can pay
// without hitting any backend. The customer page decodes this automatically.
function encodeSessionToken(data: object): string {
  const json = JSON.stringify(data);
  // Use btoa for browser compatibility; make URL-safe
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── Demo localStorage helpers ────────────────────────────────────────────────
function loadDemoSessions(): AdminPaymentSession[] {
  try {
    const raw = localStorage.getItem(KEY_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDemoSessions(sessions: AdminPaymentSession[]): void {
  localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions));
}

function buildDemoSession(req: CreatePaymentSessionRequest): AdminPaymentSession {
  const preview = calculateBillingPreview(
    req.baseAmount,
    req.taxRate ?? 0.05,
    req.serviceFee ?? 0,
    req.discount ?? 0
  );

  const ts = Date.now();
  const sessionId = `HC-${ts}-${(req.chargerId || 'CHRG').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8)}`;
  const createdAt = new Date().toISOString();

  // Embed ALL billing + station data in the token so customer page works offline
  const tokenPayload = {
    v: 1, // schema version
    sessionId,
    stationName: req.stationName,
    location: req.location || '',
    chargerId: req.chargerId,
    connectorType: req.connectorType || 'CCS2',
    baseAmount: preview.baseAmount,
    taxRate: preview.taxRate,
    taxAmount: preview.taxAmount,
    serviceFee: preview.serviceFee,
    discount: preview.discount,
    totalAmount: preview.totalAmount,
    currency: preview.currency,
    description: req.description || '',
    customerName: req.customerName || '',
    createdAt,
  };

  const token = encodeSessionToken(tokenPayload);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const paymentUrl = `${origin}/pay/${token}`;

  return {
    id: `demo-${ts}`,
    sessionId,
    token,
    stationName: req.stationName,
    location: req.location || '',
    chargerId: req.chargerId,
    connectorType: req.connectorType || 'CCS2',
    baseAmount: preview.baseAmount,
    taxRate: preview.taxRate,
    taxAmount: preview.taxAmount,
    serviceFee: preview.serviceFee,
    discount: preview.discount,
    totalAmount: preview.totalAmount,
    currency: preview.currency,
    status: 'PENDING',
    description: req.description,
    customerName: req.customerName,
    paymentUrl,
    createdAt,
    updatedAt: createdAt,
  };
}

// ─── HTTP helper (production mode) ───────────────────────────────────────────
async function adminFetch<T>(
  path: string,
  options?: RequestInit,
  requireAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (requireAuth) {
    const token = getAdminToken();
    if (!token) throw new Error('Not authenticated');
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearAdminToken();
    throw new Error('SESSION_EXPIRED');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function adminLogin(req: AdminLoginRequest): Promise<AdminLoginResponse> {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, 600)); // simulate network
    if (req.username === DEMO_USERNAME && req.password === DEMO_PASSWORD) {
      setAdminToken(DEMO_TOKEN);
      if (typeof window !== 'undefined') {
        localStorage.setItem(KEY_USER, req.username);
      }
      return {
        token: DEMO_TOKEN,
        username: req.username,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
    }
    throw new Error('Invalid username or password');
  }

  const resp = await adminFetch<AdminLoginResponse>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(req),
  }, false);
  setAdminToken(resp.token);
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY_USER, resp.username);
  }
  return resp;
}

export async function adminLogout(): Promise<void> {
  if (!DEMO_MODE) {
    try { await adminFetch<void>('/api/admin/logout', { method: 'POST' }); } catch { /* ignore */ }
  }
  clearAdminToken();
}

// ─── Session management ───────────────────────────────────────────────────────
export async function createAdminPaymentSession(
  req: CreatePaymentSessionRequest
): Promise<AdminPaymentSession> {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, 500));
    const session = buildDemoSession(req);
    const sessions = loadDemoSessions();
    sessions.unshift(session); // newest first
    saveDemoSessions(sessions);
    return session;
  }
  return adminFetch<AdminPaymentSession>('/api/admin/sessions', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function listAdminSessions(
  page = 0,
  pageSize = 20,
  search = ''
): Promise<AdminSessionListResponse> {
  if (DEMO_MODE) {
    await new Promise(r => setTimeout(r, 300));
    const all = loadDemoSessions();
    const filtered = search
      ? all.filter(s =>
          s.sessionId.toLowerCase().includes(search.toLowerCase()) ||
          s.chargerId.toLowerCase().includes(search.toLowerCase()) ||
          (s.stationName || '').toLowerCase().includes(search.toLowerCase())
        )
      : all;
    const start = page * pageSize;
    return {
      sessions: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }
  const params = new URLSearchParams({ page: String(page), size: String(pageSize), ...(search ? { search } : {}) });
  return adminFetch<AdminSessionListResponse>(`/api/admin/sessions?${params}`);
}

export async function getAdminStats(): Promise<AdminStats> {
  if (DEMO_MODE) {
    const sessions = loadDemoSessions();
    const paid = sessions.filter(s => s.status === 'PAID').length;
    const pending = sessions.filter(s => s.status === 'PENDING').length;
    const failed = sessions.filter(s => s.status === 'FAILED').length;
    const revenue = sessions.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.totalAmount, 0);
    return { totalSessions: sessions.length, pendingSessions: pending, paidSessions: paid, failedSessions: failed, totalRevenue: revenue };
  }
  return adminFetch<AdminStats>('/api/admin/stats');
}
