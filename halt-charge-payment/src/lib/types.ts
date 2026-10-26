// ─── Core Domain Types ───────────────────────────────────────────────────────

export interface StationInfo {
  stationName: string;
  location: string;
  chargerId: string;
  sessionDate: string;       // ISO date string
  startTime: string;         // HH:mm
  endTime: string;           // HH:mm
  connectorType?: string;
}

export interface BillingBreakdown {
  energyConsumedKwh: number;
  tariffPerKwh: number;        // ₹ per kWh
  energyCharge: number;        // energyConsumedKwh × tariffPerKwh
  gstRate: number;             // e.g. 0.05 for 5%
  gstAmount: number;
  serviceFee: number;
  discount: number;
  totalAmount: number;         // final payable
  currency: string;            // 'INR'
}

export interface PaymentSession {
  token: string;
  sessionId: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  station: StationInfo;
  billing: BillingBreakdown;
  customerName?: string;
  customerPhone?: string;
}

export type PaymentStatus =
  | 'READY'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING_VERIFICATION';

export interface RazorpayOrder {
  orderId: string;         // rzp_order id from backend
  amount: number;          // in paise
  currency: string;
  keyId: string;           // Razorpay Key ID (publishable)
}

export interface PaymentVerificationRequest {
  sessionToken: string;
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentResult {
  success: boolean;
  invoiceId?: string;
  transactionId?: string;
  paymentId?: string;
  amount?: number;
  paidAt?: string;
  paymentMethod?: string;
  message?: string;
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  transactionId: string;
  paymentId: string;
  sessionId: string;
  station: StationInfo;
  billing: BillingBreakdown;
  paidAt: string;
  paymentMethod: string;
  customerName?: string;
  supportEmail: string;
  supportPhone: string;
}

export type Language = 'en' | 'ta';
