'use client';

import { Language } from '@/lib/types';
import { t } from '@/lib/i18n';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';

interface HeaderProps {
  lang: Language;
  onLangToggle: () => void;
}

export default function Header({ lang, onLangToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a0d0a]/95 backdrop-blur-md border-b border-[#2A302A]">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src="/logo.svg"
              alt="Halt & Charge Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="text-xs font-bold tracking-[0.18em] text-[#39FF14] uppercase leading-none">
              Halt &amp; Charge
            </div>
            <div className="text-[10px] text-[#B8BDB8] tracking-widest uppercase mt-0.5">
              {t('title', lang)}
            </div>
          </div>
        </div>

        {/* Right: secure badge + lang toggle */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[#B8BDB8] tracking-wide">
            <ShieldCheck size={13} className="text-[#39FF14]" />
            <span>{t('secure', lang)}</span>
          </div>

          {/* Language Toggle */}
          <button
            id="lang-toggle-btn"
            onClick={onLangToggle}
            aria-label="Toggle language"
            className="ml-2 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wider border border-[#2A302A] text-[#B8BDB8] hover:border-[#39FF14] hover:text-[#39FF14] transition-all duration-200 bg-[#111411]"
          >
            {lang === 'en' ? 'தமிழ்' : 'EN'}
          </button>
        </div>
      </div>
    </header>
  );
}
