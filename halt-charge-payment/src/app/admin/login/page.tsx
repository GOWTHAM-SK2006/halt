'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Zap, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { adminLogin } from '@/lib/adminApi';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await adminLogin({ username: username.trim(), password });
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg === 'SESSION_EXPIRED' || msg.toLowerCase().includes('401') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('unauthorized')) {
        setError('Invalid username or password. Please try again.');
      } else if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        setError('Cannot reach server. Please check your connection.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [username, password, router]);

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#39FF14] opacity-[0.03] blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-8 relative">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-24 h-24">
            <Image
              src="/logo.png"
              alt="Halt & Charge"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-white">
              HALT <span className="text-[#39FF14]">&amp;</span> CHARGE
            </h1>
            <p className="text-xs text-[#B8BDB8] mt-1 tracking-widest uppercase">Admin Portal</p>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-[#111411] border border-[#2A302A] rounded-2xl overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b border-[#2A302A] bg-[#0D100D] flex items-center gap-2">
            <Shield size={14} className="text-[#39FF14]" />
            <span className="text-xs font-semibold text-[#B8BDB8] uppercase tracking-wider">
              Secure Admin Login
            </span>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5" noValidate>
            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 animate-fade-up">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300 leading-snug">{error}</p>
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <label htmlFor="admin-username" className="text-xs font-semibold text-[#B8BDB8] uppercase tracking-wider">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
                placeholder="admin"
                className="w-full bg-[#0D100D] border border-[#2A302A] rounded-xl px-4 py-3 text-sm text-white placeholder-[#3A403A] focus:outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14]/30 transition-all duration-200 disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-xs font-semibold text-[#B8BDB8] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full bg-[#0D100D] border border-[#2A302A] rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-[#3A403A] focus:outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14]/30 transition-all duration-200 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#5A5F5A] hover:text-[#B8BDB8] transition-colors"
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading ? '#2A302A' : '#39FF14',
                color: loading ? '#B8BDB8' : '#050505',
                boxShadow: loading ? 'none' : '0 0 24px rgba(57,255,20,0.35)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#3A403A] tracking-wide">
          © {new Date().getFullYear()} Halt &amp; Charge · Admin Access Only
        </p>
      </div>
    </div>
  );
}
