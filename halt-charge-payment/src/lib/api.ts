import { PaymentSession, RazorpayOrder, PaymentVerificationRequest, PaymentResult, Invoice } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// ─── Demo / Mock Data (used as fallback) ──────────────────────────────────────
export const DEMO_SESSION: PaymentSession = {
  token: 'demo-token-abc123',
  sessionId: 'SESSION-2024-HC-00847',
  status: 'PENDING',
  station: {
    stationName: 'Halt & Charge — Phoenix MarketCity',
    location: 'Phoenix MarketCity, Velachery, Chennai — 600042',
    chargerId: 'HC-CHN-001-A3',
    sessionDate: new Date().toISOString().slice(0, 10),
    startTime: '18:42',
    endTime: '20:15',
    connectorType: 'CCS2 (DC Fast Charge)',
  },
  billing: {
    energyConsumedKwh: 22.4,
    tariffPerKwh: 12,
    energyCharge: 268.8,
    gstRate: 0.05,
    gstAmount: 13.44,
    serviceFee: 10,
    discount: 0,
    totalAmount: 292.24,
    currency: 'INR',
  },
};

// ─── Base64 token decoder ─────────────────────────────────────────────────────
// Tries to decode a QR token that was encoded by adminApi.ts (demo mode).
// Returns null if the token is not a valid base64-encoded session.
function tryDecodeSessionToken(token: string): PaymentSession | null {
  try {
    // Restore URL-safe base64 to standard base64
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const data = JSON.parse(json);

    // Validate it looks like our encoded session
    if (!data.sessionId || data.totalAmount === undefined || !data.stationName) return null;

    return {
      token,
      sessionId: data.sessionId,
      status: 'PENDING',
      station: {
        stationName: data.stationName,
        location: data.location || '',
        chargerId: data.chargerId || '',
        sessionDate: (data.createdAt || new Date().toISOString()).slice(0, 10),
        startTime: '',
        endTime: '',
        connectorType: data.connectorType || '',
      },
      billing: {
        energyConsumedKwh: 0,
        tariffPerKwh: data.baseAmount || 0,
        energyCharge: data.baseAmount || 0,
        gstRate: data.taxRate || 0.05,
        gstAmount: data.taxAmount || 0,
        serviceFee: data.serviceFee || 0,
        discount: data.discount || 0,
        totalAmount: data.totalAmount,
        currency: data.currency || 'INR',
      },
      customerName: data.customerName || undefined,
    };
  } catch {
    return null;
  }
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Payment session ──────────────────────────────────────────────────────────
export async function getPaymentSession(token: string): Promise<PaymentSession> {
  // 1. Try to decode as a self-contained base64 token (admin-generated QR)
  const decoded = tryDecodeSessionToken(token);
  if (decoded) return decoded;

  // 2. Demo fallback (for /pay/demo-token-abc123 etc.)
  if (DEMO_MODE || token.startsWith('demo-token')) {
    await new Promise(r => setTimeout(r, 600));
    return { ...DEMO_SESSION, token };
  }

  // 3. Real backend
  return fetchJson<PaymentSession>(`${BASE_URL}/api/payment-sessions/${token}`);
}

// ─── Create payment order ─────────────────────────────────────────────────────
export async function createPaymentOrder(sessionToken: string): Promise<RazorpayOrder> {
  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  // Decode the token to get the amount (for demo mode)
  const decoded = tryDecodeSessionToken(sessionToken);

  if (DEMO_MODE || sessionToken.startsWith('demo-token')) {
    await new Promise(r => setTimeout(r, 400));
    const amount = decoded ? decoded.billing.totalAmount : DEMO_SESSION.billing.totalAmount;
    return {
      orderId: 'order_demo_' + Math.random().toString(36).slice(2),
      amount: Math.round(amount * 100),
      currency: 'INR',
      keyId: razorpayKeyId || 'rzp_test_demo',
    };
  }

  // If we decoded a base64 session, we still need a real Razorpay order.
  // Use the backend to create it (it has the secret key).
  return fetchJson<RazorpayOrder>(`${BASE_URL}/api/payments/create-order`, {
    method: 'POST',
    body: JSON.stringify({ sessionToken }),
  });
}

// ─── Verify payment ───────────────────────────────────────────────────────────
export async function verifyPayment(req: PaymentVerificationRequest): Promise<PaymentResult> {
  if (DEMO_MODE || req.sessionToken.startsWith('demo-token') || req.signature === 'demo_signature') {
    await new Promise(r => setTimeout(r, 800));

    // Decode amount from the token
    const decoded = tryDecodeSessionToken(req.sessionToken);
    const amount = decoded ? decoded.billing.totalAmount : DEMO_SESSION.billing.totalAmount;

    return {
      success: true,
      invoiceId: 'INV-DEMO-' + Date.now(),
      transactionId: req.orderId,
      paymentId: req.paymentId,
      amount,
      paidAt: new Date().toISOString(),
      paymentMethod: 'UPI (Demo)',
    };
  }

  return fetchJson<PaymentResult>(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// ─── Get invoice ──────────────────────────────────────────────────────────────
export async function getInvoice(invoiceId: string): Promise<Invoice> {
  if (DEMO_MODE || invoiceId.startsWith('INV-DEMO')) {
    await new Promise(r => setTimeout(r, 300));
    return {
      invoiceId,
      invoiceNumber: 'HC-INV-' + new Date().getFullYear() + '-' + invoiceId.slice(-6),
      transactionId: 'order_' + Math.random().toString(36).slice(2),
      paymentId: 'pay_' + Math.random().toString(36).slice(2),
      sessionId: DEMO_SESSION.sessionId,
      station: DEMO_SESSION.station,
      billing: DEMO_SESSION.billing,
      paidAt: new Date().toISOString(),
      paymentMethod: 'UPI (Demo)',
      supportEmail: 'support@haltandcharge.in',
      supportPhone: '+91-XXXXXXXXXX',
    };
  }

  return fetchJson<Invoice>(`${BASE_URL}/api/invoices/${invoiceId}`);
}
