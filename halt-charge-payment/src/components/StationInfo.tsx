'use client';

import { StationInfo as StationInfoType } from '@/lib/types';
import { Language } from '@/lib/types';
import { t } from '@/lib/i18n';
import { MapPin, Zap, Calendar, Clock, Plug } from 'lucide-react';

interface StationInfoProps {
  station: StationInfoType;
  lang: Language;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#1E231E] last:border-0">
      <div className="text-[#39FF14] mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold tracking-[0.15em] text-[#B8BDB8] uppercase mb-0.5">
          {label}
        </div>
        <div className="text-sm text-white font-medium break-words">{value}</div>
      </div>
    </div>
  );
}

export default function StationInfo({ station, lang }: StationInfoProps) {
  const sessionDateFormatted = new Date(station.sessionDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <section className="rounded-2xl border border-[#2A302A] bg-[#0D100D] overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-3.5 border-b border-[#2A302A] bg-[#111411] flex items-center gap-2">
        <Zap size={14} className="text-[#39FF14]" />
        <h2 className="text-xs font-bold tracking-[0.2em] text-[#39FF14] uppercase">
          {t('stationInfo', lang)}
        </h2>
      </div>

      {/* Rows */}
      <div className="px-5">
        <InfoRow
          icon={<Zap size={15} />}
          label={t('chargingStation', lang)}
          value={station.stationName}
        />
        <InfoRow
          icon={<MapPin size={15} />}
          label={t('location', lang)}
          value={station.location}
        />
        <InfoRow
          icon={<Plug size={15} />}
          label={t('chargerId', lang)}
          value={station.chargerId}
        />
        {station.connectorType && (
          <InfoRow
            icon={<Plug size={15} />}
            label={t('connectorType', lang)}
            value={station.connectorType}
          />
        )}
        <InfoRow
          icon={<Calendar size={15} />}
          label={t('sessionDate', lang)}
          value={sessionDateFormatted}
        />
        {station.startTime && station.endTime && (
          <InfoRow
            icon={<Clock size={15} />}
            label={`${t('startTime', lang)} – ${t('endTime', lang)}`}
            value={`${station.startTime} – ${station.endTime}`}
          />
        )}
      </div>
    </section>
  );
}
