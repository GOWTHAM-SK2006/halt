import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 text-center">
      <div className="space-y-6 max-w-sm">
        <AlertCircle size={52} className="text-red-400 mx-auto" strokeWidth={1.5} />
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
          <p className="text-sm text-[#B8BDB8] leading-relaxed">
            This payment link is invalid or has expired. Please scan the QR code on the charger again.
          </p>
        </div>
        <div className="pt-2 text-xs text-[#5A5F5A]">
          If you need help, contact{' '}
          <a href="mailto:support@haltandcharge.in" className="text-[#39FF14] hover:underline">
            support@haltandcharge.in
          </a>
        </div>
      </div>
    </div>
  );
}
