// ═══════════════════════════════════════════
// CONFIG — paste your Web App URL here
// ═══════════════════════════════════════════
let API_URL = localStorage.getItem('hd_api_url') || '';
// ═══════════════════════════════════════════

let DB = [];
let pendingImport = [];
let currentType = 'Revenue';
let currentPayType = 'Full Payment';

// ── PWA SERVICE WORKER ──────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
