'use client';

import { BillingBreakdown as BillingType } from '@/lib/types';
import { Language } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Receipt } from 'lucide-react';

interface BillingBreakdownProps {
  billing: BillingType;
  lang: Language;
}

function fmt(amount: number) {
  return `₹${amount.toFixed(2)}`;
}

function BillRow({
  label,
  value,
  sublabel,
  highlight = false,
  dimmed = false,
  isDiscount = false,
}: {
  label: string;
  value: string;
  sublabel?: string;
  highlight?: boolean;
  dimmed?: boolean;
  isDiscount?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between py-2.5 ${highlight ? '' : 'border-b border-[#1A1E1A]'}`}>
      <div>
        <span
          className={`text-sm ${
            dimmed ? 'text-[#B8BDB8]' : highlight ? 'text-white font-bold' : 'text-[#D4D9D4]'
          }`}
        >
          {label}
        </span>
        {sublabel && (
          <div className="text-[11px] text-[#7A7F7A] mt-0.5">{sublabel}</div>
        )}
      </div>
      <span
        className={`text-sm font-semibold ml-4 flex-shrink-0 ${
          highlight
            ? 'text-[#39FF14] text-base'
            : isDiscount
            ? 'text-green-400'
            : 'text-white'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function BillingBreakdown({ billing, lang }: BillingBreakdownProps) {
  return (
    <section className="rounded-2xl border border-[#2A302A] bg-[#0D100D] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#2A302A] bg-[#111411] flex items-center gap-2">
        <Receipt size={14} className="text-[#39FF14]" />
        <h2 className="text-xs font-bold tracking-[0.2em] text-[#39FF14] uppercase">
          {t('chargingBill', lang)}
        </h2>
      </div>

      <div className="px-5 pt-2 pb-4">
        <BillRow
          label={t('energyConsumed', lang)}
          sublabel={`${billing.energyConsumedKwh.toFixed(2)} ${t('kwh', lang)} × ${fmt(billing.tariffPerKwh)}/${t('kwh', lang)}`}
          value={fmt(billing.energyCharge)}
        />
        <BillRow
          label={t('gst', lang)}
          sublabel={`${(billing.gstRate * 100).toFixed(0)}% on energy charge`}
          value={fmt(billing.gstAmount)}
          dimmed
        />
        {billing.serviceFee > 0 && (
          <BillRow
            label={t('serviceFee', lang)}
            value={fmt(billing.serviceFee)}
            dimmed
          />
        )}
        {billing.discount > 0 && (
          <BillRow
            label={t('discount', lang)}
            value={`− ${fmt(billing.discount)}`}
            isDiscount
          />
        )}

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-[#2A302A]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#B8BDB8] font-medium uppercase tracking-widest">
              {t('totalAmount', lang)}
            </span>
            <div className="text-right">
              <div
                className="text-3xl font-extrabold text-white tracking-tight"
                style={{ textShadow: '0 0 20px rgba(57,255,20,0.35)' }}
              >
                {fmt(billing.totalAmount)}
              </div>
              <div className="text-[11px] text-[#B8BDB8] mt-0.5">{billing.currency}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
