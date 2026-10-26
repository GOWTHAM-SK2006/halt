# Halt & Charge — EV Charging Payment Portal

> **Redefining the way you recharge** · A production-quality, branded payment portal for EV charging sessions.

---

## Project Structure

```
helt and charge payment gatway/
├── halt-charge-payment/       ← Next.js 16 + TypeScript + Tailwind CSS (Frontend)
└── halt-charge-backend/       ← Spring Boot 3 + PostgreSQL (Backend)
```

---

## 🚀 Quick Start (Demo Mode — No Backend Required)

The frontend ships with a full demo mode that simulates the entire payment flow without a backend.

### 1. Run the Frontend

```bash
cd halt-charge-payment
npm install
npm run dev
```

Open: **http://localhost:3000/pay/demo-token-abc123**

This loads the demo charging session:
- Station: Halt & Charge — Phoenix MarketCity, Chennai
- Energy: 22.40 kWh × ₹12/kWh = ₹268.80
- GST (5%): ₹13.44 · Service Fee: ₹10.00
- **Total: ₹292.24**

Clicking **Pay Now** simulates a complete payment and shows the success page with invoice download.

---

## 🛠 Full Stack Setup (Production / Real Backend)

### Prerequisites
- Node.js 18+
- Java 21 (JDK)
- PostgreSQL 14+
- Maven 3.9+

### Frontend Setup

```bash
cd halt-charge-payment
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_DEMO_MODE=false
#   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
#   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_XXXX
npm run dev
```

### Backend Setup

```bash
# 1. Create PostgreSQL database
createdb haltcharge_payment

# 2. Configure environment
cd halt-charge-backend
cp .env.example .env
# Fill in DB credentials, Razorpay keys

# 3. Set env vars and run
mvn spring-boot:run
```

---

## 🔑 QR Code → Payment Flow

```
1. Charger session ends
2. Backend generates unique token → creates payment_session record
3. Token is embedded in QR URL: https://pay.haltandcharge.in/pay/{token}
4. Customer scans QR → mobile browser opens payment page
5. Page calls GET /api/payment-sessions/{token}
6. Customer clicks Pay Now → POST /api/payments/create-order
7. Razorpay checkout opens → customer pays
8. Frontend calls POST /api/payments/verify (signature verified server-side)
9. Invoice generated → success page shown
10. Customer downloads PDF invoice
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/payment-sessions/{token}` | Fetch session + billing details |
| `POST` | `/api/payments/create-order` | Create Razorpay order |
| `POST` | `/api/payments/verify` | Verify payment signature |
| `POST` | `/api/payments/webhook` | Razorpay webhook handler |
| `GET` | `/api/invoices/{invoiceId}` | Fetch invoice data for PDF |

---

## 💳 Billing Calculation

```
Energy Charge  = Energy (kWh)  x  Tariff (Rs/kWh)
GST Amount     = Energy Charge  x  5%    [concessional rate]
Total Payable  = Energy Charge + GST + Service Fee - Discount
```

**All amounts are calculated and validated on the backend. The frontend never trusts a client-supplied amount.**

---

## 🗄 Database Schema

```sql
charging_stations      -- Charger hardware & tariff config
charging_sessions      -- Each EV session with billing fields
payment_sessions       -- QR token -> session mapping (with expiry)
payments               -- Razorpay order/payment records
invoices               -- Invoice number <-> payment <-> session
```

---

## 🔒 Security Notes

- QR token is cryptographically random — does not expose session/customer data
- Razorpay key_secret lives only on the backend — never in frontend code
- Payment signatures verified using HMAC-SHA256 on the backend before marking as paid
- Idempotency: duplicate payment attempts for the same order are safe
- Session tokens expire (configurable)

---

## 🌐 Languages

Toggle between **English** and **Tamil** using the header button. 40+ UI strings translated.

---

## 📄 PDF Invoice

Generated client-side using jsPDF after verified payment. Includes:
- Invoice number (HC-INV-YYYY-NNNNN)
- Station, session, and billing details
- Tax breakdown
- Payment reference IDs
- Support contact

---

## 🔧 Razorpay Sandbox Setup

1. Register at razorpay.com
2. Dashboard > Settings > API Keys > Generate Test Key
3. Add rzp_test_* Key ID to frontend .env.local
4. Add Key ID + Key Secret to backend .env
5. Configure Webhook: Dashboard > Webhooks > add URL /api/payments/webhook

---

## 📱 Tested Flows

- Demo mode complete payment (no backend)
- Session expired error state
- Invalid token error state
- Already-paid session detection
- Payment failed with retry
- Payment pending verification
- Invoice PDF download
- Tamil / English toggle
- Mobile responsive layout

---

*© 2026 Halt & Charge — Redefining the way you recharge*
