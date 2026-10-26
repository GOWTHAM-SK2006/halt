'use client';

import { Language, PaymentStatus } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Loader2, ShieldCheck } from 'lucide-react';

interface PayNowButtonProps {
  totalAmount: number;
  status: PaymentStatus;
  lang: Language;
  onPay: () => void;
}

export default function PayNowButton({ totalAmount, status, lang, onPay }: PayNowButtonProps) {
  const isProcessing = status === 'PROCESSING';
  const isDisabled = isProcessing || status === 'PENDING_VERIFICATION';

  return (
    <div className="space-y-3">
      <button
        id="pay-now-btn"
        onClick={onPay}
        disabled={isDisabled}
        aria-busy={isProcessing}
        aria-label={`${t('payNow', lang)} ₹${totalAmount.toFixed(2)}`}
        className={`
          w-full relative flex items-center justify-center gap-3 py-4 px-6 rounded-2xl
          text-[#050505] font-extrabold text-lg tracking-wide
          transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-[#39FF14]/40
          ${isDisabled
            ? 'bg-[#2A302A] text-[#6A706A] cursor-not-allowed'
            : 'bg-[#39FF14] hover:bg-[#8DFF36] hover:scale-[1.015] active:scale-[0.99] shadow-[0_0_24px_rgba(57,255,20,0.4)] hover:shadow-[0_0_36px_rgba(57,255,20,0.6)]'
          }
        `}
      >
        {isProcessing ? (
          <>
            <Loader2 size={22} className="animate-spin" />
            <span>{t('processing', lang)}</span>
          </>
        ) : status === 'PENDING_VERIFICATION' ? (
          <>
            <Loader2 size={22} className="animate-spin" />
            <span>{t('verifying', lang)}</span>
          </>
        ) : (
          <>
            <span>{t('payNow', lang)}</span>
            <span className="opacity-80">·</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </>
        )}
      </button>

      {/* Security note */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A7F7A]">
        <ShieldCheck size={13} className="text-[#39FF14]" />
        <span>256-bit encrypted · Powered by Razorpay</span>
      </div>
    </div>
  );
}
