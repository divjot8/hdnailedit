// ── SYNC ────────────────────────────────────
function setSyncStatus(status, msg) {
  const statusMap = {
    loading:      { dot:'loading',   text: msg||'Syncing with Google Sheets...' },
    connected:    { dot:'connected', text: msg||'Connected · '+new Date().toLocaleTimeString() },
    error:        { dot:'error',     text: msg||'Connection error — using cached data' },
    disconnected: { dot:'',          text: 'No Web App URL — data saves locally only' },
  };
  const s = statusMap[status] || statusMap.disconnected;
  ['sync-bar-dash','sync-bar-entry'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="sync-bar"><div class="sync-dot ${s.dot}"></div><span class="sync-text">${s.text}</span><button class="sync-btn" onclick="loadData()">↺ Refresh</button></div>`;
  });
}

function renderConfigBanners() {
  const html = API_URL ? '' : `<div class="config-banner"><div class="cb-icon">⚙️</div><div class="cb-body"><div class="cb-title">Connect to Google Sheets for shared data</div><div class="cb-text">Both Harnoor and Dikshi need to paste this URL once. Go to your Google Sheet → Extensions → Apps Script → Deploy → New deployment → Web App → Execute as Me, Anyone can access → Deploy → copy URL.</div><input class="cb-input" type="text" placeholder="https://script.google.com/macros/s/.../exec" value="${API_URL}" onblur="saveApiUrl(this.value)"></div></div>`;
  ['config-banner-dash','config-banner-entry'].forEach(id => {
    const el = document.getElementById(id); if (el) el.innerHTML = html;
  });
}

function saveApiUrl(url) {
  url = url.trim(); if (!url) return;
  API_URL = url; localStorage.setItem('hd_api_url', url);
  renderConfigBanners(); loadData();
}

// ── API ──────────────────────────────────────
async function apiGet() {
  const res = await fetch(API_URL + '?t=' + Date.now());
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message);
  return data.entries || [];
}

async function apiPost(body) {
  const res = await fetch(API_URL, { method:'POST', body:JSON.stringify(body) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data.status !== 'ok') throw new Error(data.message);
  return data;
}

async function loadData(silent = false) {
  if (!API_URL) { setSyncStatus('disconnected'); hideLoading(); return; }
  if (!silent) setSyncStatus('loading');
  try {
    const entries = await apiGet();
    DB = entries.sort((a,b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('hd_nails_cache', JSON.stringify(DB));
    setSyncStatus('connected', `Connected · ${DB.length} entries · ${new Date().toLocaleTimeString()}`);
    refreshAllViews();
  } catch(err) {
    setSyncStatus('error', 'Error: ' + err.message);
    const cached = localStorage.getItem('hd_nails_cache');
    if (cached) { try { DB = JSON.parse(cached); refreshAllViews(); } catch(e){} }
  }
  hideLoading();
}

function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }
