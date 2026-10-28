/**
 * Halt & Charge — Shared JavaScript Utilities
 * Reusable helpers for all pages
 */

// ── Backend API Config ────────────────────────────────────────────
const API = {
  // Change this to your Railway backend URL after deployment
  BASE_URL: 'https://halt-charge-backend-production.up.railway.app',

  // Helper to build full API URLs
  url: (path) => `${API.BASE_URL}${path}`,

  // Get stored JWT token
  getToken: () => Store.get('hc_jwt_token'),

  // Authenticated fetch wrapper
  fetch: async (path, options = {}) => {
    const token = API.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    const resp = await fetch(API.url(path), { ...options, headers });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `HTTP ${resp.status}`);
    }
    return resp.json();
  },
};

// ── Storage helpers ──────────────────────────────────────────────
const Store = {
  get: (key, fallback = null) => {
    try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set: (key, val) => { try { sessionStorage.setItem(key, JSON.stringify(val)); } catch {} },
  clear: (key) => { sessionStorage.removeItem(key); },
};

// ── Auth helpers ─────────────────────────────────────────────────
const Auth = {
  // Legacy demo credentials (kept for fallback if backend is unreachable)
  DEMO_USER: 'admin',
  DEMO_PASS: 'halt2024',

  // Real login — calls backend JWT endpoint
  loginWithBackend: async (username, password) => {
    try {
      const data = await API.fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (data.success && data.data?.token) {
        Store.set('hc_jwt_token', data.data.token);
        Store.set('hc_auth', true);
        Store.set('hc_login_time', Date.now());
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Backend login failed, falling back to demo auth:', err.message);
      // Fallback to demo mode if backend unreachable
      return Auth.login(username, password);
    }
  },

  // Demo/fallback login
  login: (user, pass) => user === Auth.DEMO_USER && pass === Auth.DEMO_PASS,

  isLoggedIn: () => Store.get('hc_auth') === true,

  doLogin: () => { Store.set('hc_auth', true); Store.set('hc_login_time', Date.now()); },

  doLogout: () => {
    Store.clear('hc_auth');
    Store.clear('hc_login_time');
    Store.clear('hc_jwt_token');
  },

  guard: (redirectTo = '../index.html') => {
    if (!Auth.isLoggedIn()) { window.location.href = redirectTo; }
  },
};

// ── DOM helpers ──────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const el = (tag, cls = '', html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

// ── Notification toast ───────────────────────────────────────────
let toastWrap = null;
function showToast(msg, type = 'success', duration = 3500) {
  if (!toastWrap) {
    toastWrap = el('div', 'toast-container');
    Object.assign(toastWrap.style, {
      position: 'fixed', top: '20px', right: '20px', zIndex: '9999',
      display: 'flex', flexDirection: 'column', gap: '10px',
    });
    document.body.appendChild(toastWrap);
  }
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const colors = {
    success: { bg: 'rgba(57,255,20,0.1)', border: 'rgba(57,255,20,0.35)', color: '#39FF14' },
    error:   { bg: 'rgba(255,59,59,0.1)', border: 'rgba(255,59,59,0.35)', color: '#ff6b6b' },
    warning: { bg: 'rgba(255,170,0,0.1)', border: 'rgba(255,170,0,0.35)', color: '#ffaa00' },
    info:    { bg: 'rgba(100,160,255,0.1)', border: 'rgba(100,160,255,0.35)', color: '#90b8ff' },
  };
  const c = colors[type] || colors.info;
  const toast = el('div');
  Object.assign(toast.style, {
    background: c.bg, border: `1px solid ${c.border}`, color: c.color,
    padding: '12px 16px', borderRadius: '10px', fontSize: '0.88rem',
    fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
    backdropFilter: 'blur(12px)', minWidth: '240px', maxWidth: '340px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    animation: 'fadeIn 0.3s ease',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  });
  toast.innerHTML = `<span style="font-size:1rem">${icons[type]}</span><span>${msg}</span>`;
  toast.onclick = () => dismiss();
  toastWrap.appendChild(toast);
  const timer = setTimeout(dismiss, duration);
  function dismiss() {
    clearTimeout(timer);
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }
}

// ── Loading spinner overlay ──────────────────────────────────────
function showLoader(msg = 'Processing...') {
  let overlay = document.getElementById('hc-loader');
  if (!overlay) {
    overlay = el('div', '', `
      <div style="text-align:center">
        <div style="width:48px;height:48px;border:3px solid #1a1a1a;border-top-color:#39FF14;
          border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px"></div>
        <p id="hc-loader-msg" style="color:#39FF14;font-weight:600;font-family:Outfit,sans-serif">${msg}</p>
      </div>
    `);
    overlay.id = 'hc-loader';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', background: 'rgba(5,5,5,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '10000', backdropFilter: 'blur(8px)',
    });
    document.body.appendChild(overlay);
  } else {
    document.getElementById('hc-loader-msg').textContent = msg;
    overlay.style.display = 'flex';
  }
}
function hideLoader() {
  const o = document.getElementById('hc-loader');
  if (o) o.style.display = 'none';
}

// ── Format helpers ───────────────────────────────────────────────
const fmt = {
  currency: (n) => `₹${parseFloat(n).toFixed(2)}`,
  percent: (n) => `${parseFloat(n).toFixed(1)}%`,
  date: (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  time: (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  txnId: () => 'HC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase(),
};

// ── URL params helper ────────────────────────────────────────────
const Params = {
  get: (key) => new URLSearchParams(window.location.search).get(key),
  all: () => Object.fromEntries(new URLSearchParams(window.location.search)),
};

// ── Animate elements on scroll ───────────────────────────────────
function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; }
    });
  }, { threshold: 0.1 });
  $$('[data-animate]').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    obs.observe(el);
  });
}
document.addEventListener('DOMContentLoaded', initScrollAnimations);
