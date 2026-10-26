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

// ─── Token management (stored in memory + localStorage) ──────────────────────
let _adminToken: string | null = null;

export function getAdminToken(): string | null {
  if (_adminToken) return _adminToken;
  if (typeof window !== 'undefined') {
    _adminToken = localStorage.getItem('hc_admin_token');
  }
  return _adminToken;
}

export function setAdminToken(token: string): void {
  _adminToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('hc_admin_token', token);
  }
}

export function clearAdminToken(): void {
  _adminToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hc_admin_token');
    localStorage.removeItem('hc_admin_user');
  }
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken();
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

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
  const resp = await adminFetch<AdminLoginResponse>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(req),
  }, false);
  setAdminToken(resp.token);
  if (typeof window !== 'undefined') {
    localStorage.setItem('hc_admin_user', resp.username);
  }
  return resp;
}

export async function adminLogout(): Promise<void> {
  try {
    await adminFetch<void>('/api/admin/logout', { method: 'POST' });
  } catch { /* ignore */ }
  clearAdminToken();
}

// ─── Session management ───────────────────────────────────────────────────────

export async function createAdminPaymentSession(
  req: CreatePaymentSessionRequest
): Promise<AdminPaymentSession> {
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
  const params = new URLSearchParams({
    page: String(page),
    size: String(pageSize),
    ...(search ? { search } : {}),
  });
  return adminFetch<AdminSessionListResponse>(`/api/admin/sessions?${params}`);
}

export async function getAdminStats(): Promise<AdminStats> {
  return adminFetch<AdminStats>('/api/admin/stats');
}

// ─── Client-side billing preview (mirrors backend formula) ────────────────────
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
  return {
    baseAmount: base,
    taxRate,
    taxAmount: tax,
    serviceFee: fee,
    discount: disc,
    totalAmount: total,
    currency: 'INR',
  };
}
