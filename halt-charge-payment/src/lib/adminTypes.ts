// ─── Admin Domain Types ───────────────────────────────────────────────────────

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  username: string;
  expiresAt: string;
}

export interface CreatePaymentSessionRequest {
  stationName: string;
  location?: string;
  chargerId: string;
  connectorType?: string;
  baseAmount: number;         // INR — base charge (energy or flat)
  taxRate?: number;           // default 0.05 (5% GST)
  serviceFee?: number;
  discount?: number;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  currency?: string;
}

export interface BillingPreview {
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  serviceFee: number;
  discount: number;
  totalAmount: number;
  currency: string;
}

export interface AdminPaymentSession {
  id: string;
  sessionId: string;
  token: string;
  stationName: string;
  location?: string;
  chargerId: string;
  connectorType?: string;
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  serviceFee: number;
  discount: number;
  totalAmount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  description?: string;
  customerName?: string;
  paymentMethod?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  paymentUrl: string;         // the full URL for the QR code
}

export interface AdminSessionListResponse {
  sessions: AdminPaymentSession[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminStats {
  totalSessions: number;
  pendingSessions: number;
  paidSessions: number;
  failedSessions: number;
  totalRevenue: number;
}
