'use client';

import { Language } from '@/lib/types';
import { t } from '@/lib/i18n';
import { HeadphonesIcon, Phone, Mail } from 'lucide-react';

interface SupportSectionProps {
  lang: Language;
  supportPhone?: string;
  supportEmail?: string;
}

export default function SupportSection({ lang, supportPhone, supportEmail }: SupportSectionProps) {
  return (
    <section className="rounded-2xl border border-[#2A302A] bg-[#0D100D] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#2A302A] bg-[#111411] flex items-center gap-2">
        <HeadphonesIcon size={14} className="text-[#39FF14]" />
        <h2 className="text-xs font-bold tracking-[0.2em] text-[#39FF14] uppercase">
          {t('needHelp', lang)}
        </h2>
      </div>

      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-[#B8BDB8] leading-relaxed">
          {t('supportText', lang)}
        </p>

        <div className="space-y-2">
          {supportPhone && (
            <a
              href={`tel:${supportPhone}`}
              id="support-phone-link"
              className="flex items-center gap-3 text-sm text-white hover:text-[#39FF14] transition-colors duration-150"
            >
              <Phone size={14} className="text-[#39FF14] flex-shrink-0" />
              <span>{supportPhone}</span>
            </a>
          )}
          {supportEmail && (
            <a
              href={`mailto:${supportEmail}`}
              id="support-email-link"
              className="flex items-center gap-3 text-sm text-white hover:text-[#39FF14] transition-colors duration-150"
            >
              <Mail size={14} className="text-[#39FF14] flex-shrink-0" />
              <span>{supportEmail}</span>
            </a>
          )}
          {!supportPhone && !supportEmail && (
            <div className="flex items-center gap-3 text-sm text-[#B8BDB8]">
              <Mail size={14} className="text-[#39FF14] flex-shrink-0" />
              <span>support@haltandcharge.in</span>
            </div>
          )}
        </div>

        <div className="pt-2 text-[11px] text-[#5A5F5A] leading-relaxed border-t border-[#1A1E1A]">
          For failed or pending payments, please wait 24 hours before contacting support.
          Duplicate charges will be automatically refunded within 5–7 business days.
        </div>
      </div>
    </section>
  );
}
