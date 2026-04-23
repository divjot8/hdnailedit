// ═══════════════════════════════════════════
// CONFIG — paste your Web App URL here
// ═══════════════════════════════════════════
let API_URL = localStorage.getItem('hd_api_url') || '';
// ═══════════════════════════════════════════

let DB = [];
let pendingImport = [];
let currentType = 'Revenue';
let currentPayType = 'Full Payment';
let xlsxLoadPromise = null;
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function ensureXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxLoadPromise) return xlsxLoadPromise;
  xlsxLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = XLSX_URL;
    script.async = true;
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error('Could not load Excel tools.'));
    document.head.appendChild(script);
  });
  return xlsxLoadPromise;
}

// ── PWA SERVICE WORKER ──────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
