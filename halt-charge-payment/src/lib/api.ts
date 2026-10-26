import { PaymentSession, RazorpayOrder, PaymentVerificationRequest, PaymentResult, Invoice } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

// ─── Demo / Mock Data (used when NEXT_PUBLIC_DEMO_MODE=true) ──────────────────
export const DEMO_SESSION: PaymentSession = {
  token: 'demo-token-abc123',
  sessionId: 'SESSION-2024-HC-00847',
  status: 'PENDING',
  station: {
    stationName: 'Halt & Charge — Phoenix MarketCity',
    location: 'Phoenix MarketCity, Velachery, Chennai — 600042',
    chargerId: 'HC-CHN-001-A3',
    sessionDate: '2026-10-25',
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

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function getPaymentSession(token: string): Promise<PaymentSession> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    // Simulate slight network delay in demo
    await new Promise(r => setTimeout(r, 600));
    return { ...DEMO_SESSION, token };
  }
  return fetchJson<PaymentSession>(`${BASE_URL}/api/payment-sessions/${token}`);
}

export async function createPaymentOrder(sessionToken: string): Promise<RazorpayOrder> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    await new Promise(r => setTimeout(r, 400));
    return {
      orderId: 'order_demo_' + Math.random().toString(36).slice(2),
      amount: Math.round(DEMO_SESSION.billing.totalAmount * 100),
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_demo',
    };
  }
  return fetchJson<RazorpayOrder>(`${BASE_URL}/api/payments/create-order`, {
    method: 'POST',
    body: JSON.stringify({ sessionToken }),
  });
}

export async function verifyPayment(req: PaymentVerificationRequest): Promise<PaymentResult> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    await new Promise(r => setTimeout(r, 800));
    return {
      success: true,
      invoiceId: 'INV-DEMO-' + Date.now(),
      transactionId: req.orderId,
      paymentId: req.paymentId,
      amount: DEMO_SESSION.billing.totalAmount,
      paidAt: new Date().toISOString(),
      paymentMethod: 'UPI (Demo)',
    };
  }
  return fetchJson<PaymentResult>(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function getInvoice(invoiceId: string): Promise<Invoice> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    await new Promise(r => setTimeout(r, 400));
    return {
      invoiceId,
      invoiceNumber: 'HC-INV-2024-00847',
      transactionId: 'order_demo_abc123',
      paymentId: 'pay_demo_xyz789',
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
