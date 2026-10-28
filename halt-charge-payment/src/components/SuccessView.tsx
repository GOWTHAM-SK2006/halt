'use client';

import { Invoice, Language } from '@/lib/types';
import { t } from '@/lib/i18n';
import { CheckCircle2, Download, HeadphonesIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { getInvoice } from '@/lib/api';
import { generateInvoicePDF } from '@/lib/pdfGenerator';

interface SuccessViewProps {
  invoiceId: string;
  transactionId: string;
  paymentId: string;
  amount: number;
  paidAt: string;
  chargerId: string;
  stationName: string;
  paymentMethod?: string;
  lang: Language;
}

export default function SuccessView({
  invoiceId,
  transactionId,
  paymentId,
  amount,
  paidAt,
  chargerId,
  stationName,
  paymentMethod,
  lang,
}: SuccessViewProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const paidAtFormatted = new Date(paidAt).toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const invoice = await getInvoice(invoiceId);
      await generateInvoicePDF(invoice);
    } catch {
      setDownloadError('Could not generate invoice. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      {/* Success icon with glow */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 rounded-full bg-[#39FF14]/10 animate-pulse" />
        <div className="absolute w-16 h-16 rounded-full bg-[#39FF14]/15" />
        <CheckCircle2
          size={56}
          className="text-[#39FF14] relative z-10"
          strokeWidth={1.8}
        />
      </div>

      {/* Heading */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          {t('paymentSuccessful', lang)}
        </h1>
        <p
          className="text-4xl font-black text-white mt-2"
          style={{ textShadow: '0 0 28px rgba(57,255,20,0.4)' }}
        >
          ₹{amount.toFixed(2)}
        </p>
      </div>

      {/* Details card */}
      <div className="w-full rounded-2xl border border-[#2A302A] bg-[#0D100D] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#2A302A] bg-[#111411]">
          <span className="text-xs font-bold tracking-[0.2em] text-[#39FF14] uppercase">
            Payment Details
          </span>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { label: t('transactionId', lang), value: transactionId },
            { label: 'Payment ID', value: paymentId },
            { label: t('paidAt', lang), value: paidAtFormatted },
            { label: t('chargerId', lang), value: chargerId },
            { label: t('chargingStation', lang), value: stationName },
            ...(paymentMethod ? [{ label: t('paymentMethod', lang), value: paymentMethod }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-start gap-4">
              <span className="text-[11px] font-semibold tracking-widest text-[#B8BDB8] uppercase flex-shrink-0">
                {label}
              </span>
              <span className="text-sm text-white text-right break-all">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="w-full space-y-3">
        <button
          id="download-invoice-btn"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-[#39FF14] text-[#050505] font-bold text-sm tracking-wide hover:bg-[#8DFF36] transition-all duration-200 shadow-[0_0_20px_rgba(57,255,20,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>{t('invoiceGenerating', lang)}</span>
            </>
          ) : (
            <>
              <Download size={18} />
              <span>{t('downloadInvoice', lang)}</span>
            </>
          )}
        </button>

        {downloadError && (
          <p className="text-center text-xs text-red-400">{downloadError}</p>
        )}

        <a
          href="mailto:support@haltandcharge.in"
          id="contact-support-link"
          className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl border border-[#2A302A] text-[#B8BDB8] font-medium text-sm tracking-wide hover:border-[#39FF14] hover:text-[#39FF14] transition-all duration-200"
        >
          <HeadphonesIcon size={16} />
          <span>{t('contactSupport', lang)}</span>
        </a>
      </div>
    </div>
  );
}
