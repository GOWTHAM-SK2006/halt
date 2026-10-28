# Halt & Charge — EV Charging Payment Portal

> Premium, branded EV charging payment portal with Tamil/English support, Razorpay integration, and PDF invoice generation.

## Repository Structure

```
├── halt-charge-payment/    ← Next.js 16 + TypeScript + Tailwind CSS
└── halt-charge-backend/    ← Spring Boot 3 + PostgreSQL + Razorpay
```

## Railway Deployment

This repo is configured as a **Railway monorepo** with two services:

| Service | Root Directory | Builder |
|---------|---------------|---------|
| `halt-charge-payment` | `halt-charge-payment` | Nixpacks (Node 18+) |
| `halt-charge-backend` | `halt-charge-backend` | Dockerfile (Java 21) |

### Step-by-step: Deploy on Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select `GOWTHAM-SK2006/helt-charge-model`
3. Railway will detect both services — or add them manually:
   - **Service 1 — Frontend**: Root Directory = `halt-charge-payment`
   - **Service 2 — Backend**: Root Directory = `halt-charge-backend`
4. Add a **PostgreSQL** plugin from the Railway dashboard
5. Set environment variables (see below)
6. Deploy!

### Frontend Environment Variables (Railway)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_DEMO_MODE` | `false` (use `true` for demo) |
| `NEXT_PUBLIC_API_BASE_URL` | Your backend Railway URL e.g. `https://halt-charge-backend.up.railway.app` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `rzp_test_XXXX` (from Razorpay dashboard) |

### Backend Environment Variables (Railway)

| Variable | Value |
|----------|-------|
| `DB_URL` | Auto-filled by Railway PostgreSQL plugin |
| `DB_USERNAME` | Auto-filled by Railway PostgreSQL plugin |
| `DB_PASSWORD` | Auto-filled by Railway PostgreSQL plugin |
| `RAZORPAY_KEY_ID` | `rzp_test_XXXX` |
| `RAZORPAY_KEY_SECRET` | Your Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | From Razorpay webhook settings |
| `FRONTEND_ORIGIN` | Your frontend Railway URL |

> **Tip:** Railway's PostgreSQL plugin automatically injects `DATABASE_URL`. You can map it as `DB_URL=${{Postgres.DATABASE_URL}}` in Railway's variable reference syntax.

## Local Development

### Frontend (Demo mode — no backend needed)
```bash
cd halt-charge-payment
npm install
npm run dev
# Open: http://localhost:3000/pay/demo-token-abc123
```

### Backend
```bash
cd halt-charge-backend
# Set env vars, then:
./mvnw spring-boot:run
```

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, jsPDF, Razorpay.js
- **Backend**: Spring Boot 3.3, Java 21, JPA, Liquibase, Razorpay Java SDK
- **Database**: PostgreSQL 14+
- **Payment**: Razorpay (sandbox → production)
- **Deployment**: Railway (monorepo, Dockerfile + Nixpacks)
