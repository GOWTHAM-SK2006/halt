'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import StationInfo from '@/components/StationInfo';
import BillingBreakdown from '@/components/BillingBreakdown';
import PayNowButton from '@/components/PayNowButton';
import SupportSection from '@/components/SupportSection';
import SuccessView from '@/components/SuccessView';
import { getPaymentSession, createPaymentOrder, verifyPayment } from '@/lib/api';
import { Language, PaymentSession, PaymentStatus, PaymentResult } from '@/lib/types';
import { t } from '@/lib/i18n';
import { AlertCircle, RefreshCw, Clock, Zap } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  image?: string;
  prefill?: { name?: string; contact?: string };
  theme: { color: string; backdrop_color?: string };
  modal?: { ondismiss?: () => void };
  handler: (response: RazorpayResponse) => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: () => void): void;
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-[#2A302A] bg-[#0D100D] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#2A302A] bg-[#111411]">
        <div className="skeleton h-3 w-32 rounded" />
      </div>
      <div className="px-5 py-4 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between gap-4">
            <div className="skeleton h-3 rounded w-28" />
            <div className="skeleton h-3 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────
function ErrorState({
  message,
  type,
  lang,
  onRetry,
}: {
  message: string;
  type: 'expired' | 'invalid' | 'failed' | 'pending' | 'already_paid';
  lang: Language;
  onRetry?: () => void;
}) {
  const icons = {
    expired: <Clock size={44} className="text-orange-400" strokeWidth={1.5} />,
    invalid: <AlertCircle size={44} className="text-red-400" strokeWidth={1.5} />,
    failed: <AlertCircle size={44} className="text-red-400" strokeWidth={1.5} />,
    pending: <Clock size={44} className="text-yellow-400" strokeWidth={1.5} />,
    already_paid: <Zap size={44} className="text-[#39FF14]" strokeWidth={1.5} />,
  };

  return (
    <div className="flex flex-col items-center text-center py-8 space-y-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-current opacity-10 scale-150 blur-xl" />
        {icons[type]}
      </div>
      <div>
        <h2 className="text-xl font-bold text-white mb-2">
          {type === 'expired' && t('sessionExpired', lang)}
          {type === 'invalid' && t('invalidSession', lang)}
          {type === 'failed' && t('paymentFailed', lang)}
          {type === 'pending' && t('paymentPending', lang)}
          {type === 'already_paid' && t('alreadyPaid', lang)}
        </h2>
        <p className="text-sm text-[#B8BDB8] max-w-xs leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          id="retry-btn"
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#2A302A] text-[#B8BDB8] text-sm font-medium hover:border-[#39FF14] hover:text-[#39FF14] transition-all duration-200"
        >
          <RefreshCw size={15} />
          {t('retry', lang)}
        </button>
      )}
    </div>
  );
}

export default function PaymentPage() {
  const params = useParams();
  const token = params?.token as string;

  const [lang, setLang] = useState<Language>('en');
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'valid' | 'expired' | 'invalid' | 'already_paid'>('valid');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('READY');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const toggleLang = useCallback(() => setLang(l => l === 'en' ? 'ta' : 'en'), []);

  // Load Razorpay SDK once
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  // Fetch session
  const loadSession = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setPaymentError(null);
    try {
      const data = await getPaymentSession(token);
      setSession(data);
      if (data.status === 'EXPIRED') setSessionStatus('expired');
      else if (data.status === 'PAID') setSessionStatus('already_paid');
      else setSessionStatus('valid');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.toLowerCase().includes('expired')) setSessionStatus('expired');
      else if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('invalid')) setSessionStatus('invalid');
      else setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Handle payment
  const handlePay = useCallback(async () => {
    if (!session || paymentStatus === 'PROCESSING') return;
    setPaymentStatus('PROCESSING');
    setPaymentError(null);

    try {
      const order = await createPaymentOrder(token);

      // In demo mode, skip Razorpay widget and simulate success
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        await new Promise(r => setTimeout(r, 1500));
        setPaymentStatus('PENDING_VERIFICATION');
        const result = await verifyPayment({
          sessionToken: token,
          orderId: order.orderId,
          paymentId: 'pay_demo_' + Math.random().toString(36).slice(2),
          signature: 'demo_signature',
        });
        if (result.success) {
          setPaymentResult(result);
          setPaymentStatus('SUCCESS');
        } else {
          setPaymentStatus('FAILED');
          setPaymentError(t('paymentFailedDesc', lang));
        }
        return;
      }

      // Real Razorpay flow
      const rzpOptions: RazorpayOptions = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Halt & Charge',
        description: `Session: ${session.sessionId}`,
        image: '/logo.png',
        prefill: {
          name: session.customerName,
          contact: session.customerPhone,
        },
        theme: {
          color: '#39FF14',
          backdrop_color: 'rgba(5,5,5,0.92)',
        },
        modal: {
          ondismiss: () => {
            setPaymentStatus('READY');
          },
        },
        handler: async (response: RazorpayResponse) => {
          setPaymentStatus('PENDING_VERIFICATION');
          try {
            const result = await verifyPayment({
              sessionToken: token,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            if (result.success) {
              setPaymentResult(result);
              setPaymentStatus('SUCCESS');
            } else {
              setPaymentStatus('FAILED');
              setPaymentError(t('paymentFailedDesc', lang));
            }
          } catch {
            setPaymentStatus('PENDING_VERIFICATION');
            setPaymentError(t('paymentPendingDesc', lang));
          }
        },
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.open();
    } catch {
      setPaymentStatus('FAILED');
      setPaymentError(t('paymentFailedDesc', lang));
    }
  }, [session, token, paymentStatus, lang]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      <Header lang={lang} onLangToggle={toggleLang} />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 space-y-4 pb-12">

        {/* Loading state */}
        {loading && (
          <>
            <div className="text-center py-4">
              <p className="text-sm text-[#B8BDB8]">{t('loadingSession', lang)}</p>
            </div>
            <SkeletonCard rows={5} />
            <SkeletonCard rows={6} />
          </>
        )}

        {/* Load error */}
        {!loading && loadError && (
          <ErrorState
            message={loadError}
            type="invalid"
            lang={lang}
            onRetry={loadSession}
          />
        )}

        {/* Session status errors */}
        {!loading && !loadError && sessionStatus === 'expired' && (
          <ErrorState
            message={t('sessionExpiredDesc', lang)}
            type="expired"
            lang={lang}
          />
        )}

        {!loading && !loadError && sessionStatus === 'invalid' && (
          <ErrorState
            message={t('invalidSession', lang)}
            type="invalid"
            lang={lang}
          />
        )}

        {/* Already paid — show success with invoice download */}
        {!loading && !loadError && sessionStatus === 'already_paid' && session && (
          <>
            <ErrorState
              message={t('alreadyPaidDesc', lang)}
              type="already_paid"
              lang={lang}
            />
            <SuccessView
              invoiceId={session.sessionId}
              transactionId={session.sessionId}
              paymentId="N/A"
              amount={session.billing.totalAmount}
              paidAt={new Date().toISOString()}
              chargerId={session.station.chargerId}
              stationName={session.station.stationName}
              lang={lang}
            />
          </>
        )}

        {/* Main payment flow */}
        {!loading && !loadError && sessionStatus === 'valid' && session && (
          <>
            {paymentStatus === 'SUCCESS' && paymentResult ? (
              /* ── Payment success ── */
              <div className="animate-fade-up">
                <SuccessView
                  invoiceId={paymentResult.invoiceId!}
                  transactionId={paymentResult.transactionId!}
                  paymentId={paymentResult.paymentId!}
                  amount={paymentResult.amount!}
                  paidAt={paymentResult.paidAt!}
                  chargerId={session.station.chargerId}
                  stationName={session.station.stationName}
                  paymentMethod={paymentResult.paymentMethod}
                  lang={lang}
                />
              </div>
            ) : paymentStatus === 'FAILED' ? (
              /* ── Payment failed ── */
              <div className="animate-fade-up space-y-4">
                <ErrorState
                  message={paymentError || t('paymentFailedDesc', lang)}
                  type="failed"
                  lang={lang}
                  onRetry={() => {
                    setPaymentStatus('READY');
                    setPaymentError(null);
                  }}
                />
                <StationInfo station={session.station} lang={lang} />
                <BillingBreakdown billing={session.billing} lang={lang} />
                <PayNowButton
                  totalAmount={session.billing.totalAmount}
                  status="READY"
                  lang={lang}
                  onPay={handlePay}
                />
                <SupportSection lang={lang} />
              </div>
            ) : paymentStatus === 'PENDING_VERIFICATION' ? (
              /* ── Pending verification ── */
              <div className="animate-fade-up space-y-4">
                <ErrorState
                  message={paymentError || t('paymentPendingDesc', lang)}
                  type="pending"
                  lang={lang}
                />
              </div>
            ) : (
              /* ── Ready / Processing ── */
              <>
                {/* Station info */}
                <div className="animate-fade-up animate-fade-up-1">
                  <StationInfo station={session.station} lang={lang} />
                </div>

                {/* Billing */}
                <div className="animate-fade-up animate-fade-up-2">
                  <BillingBreakdown billing={session.billing} lang={lang} />
                </div>

                {/* Pay now button */}
                <div className="animate-fade-up animate-fade-up-3">
                  <PayNowButton
                    totalAmount={session.billing.totalAmount}
                    status={paymentStatus}
                    lang={lang}
                    onPay={handlePay}
                  />
                </div>

                {/* Support */}
                <div className="animate-fade-up animate-fade-up-4">
                  <SupportSection lang={lang} />
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1A1E1A] py-5 text-center">
        <p className="text-[11px] text-[#5A5F5A] tracking-wide">
          © {new Date().getFullYear()} Halt &amp; Charge · Redefining the way you recharge
        </p>
      </footer>
    </div>
  );
}
