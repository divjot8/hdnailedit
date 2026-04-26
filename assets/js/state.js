// ═══════════════════════════════════════════
// CONFIG — https://script.google.com/macros/s/AKfycbzxZ3HErNcSOxHK5HHhGVejZKv_np5IxNB9nd3IYweidPP2U7CCD_gSCzEQ_92sCEguJQ/exec
// ═══════════════════════════════════════════
const API = 'https://script.google.com/macros/s/AKfycbzxZ3HErNcSOxHK5HHhGVejZKv_np5IxNB9nd3IYweidPP2U7CCD_gSCzEQ_92sCEguJQ/exec'
let API_URL = localStorage.getItem('hd_api_url') || API;
// ═══════════════════════════════════════════

let DB = [];
let pendingImport = [];
let currentType = 'Revenue';
let currentPayType = 'Full Payment';
let dashPeriod = 'thisMonth';
let xlsxLoadPromise = null;
let splitRatio = JSON.parse(localStorage.getItem('hd_split_ratio')) || { harnoor: 0.5, dikshi: 0.5 };
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function saveSplitRatio(h, d) {
  splitRatio = { harnoor: h, dikshi: d };
  localStorage.setItem('hd_split_ratio', JSON.stringify(splitRatio));
}

function normalizeMonthKey(monthValue, dateValue) {
  const monthText = typeof monthValue === 'string' ? monthValue.trim() : '';
  if (/^\d{4}-\d{2}$/.test(monthText)) return monthText;
  if (/^\d{4}-\d{2}-\d{2}$/.test(monthText)) return monthText.slice(0, 7);

  const dateText = typeof dateValue === 'string' ? dateValue.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return dateText.slice(0, 7);

  const parsed = new Date(monthValue);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

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
