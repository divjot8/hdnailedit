// ── TOAST ──────────────────────────────────────
function toast(msg) {
  const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),3500);
}

// ── INIT ──────────────────────────────────────
document.getElementById('f-date').value = today();
renderConfigBanners();
setSyncStatus(API_URL?'loading':'disconnected');
const cached = localStorage.getItem('hd_nails_cache');
if (cached) { try { DB=JSON.parse(cached); refreshAllViews(); } catch(e){} }
if (API_URL) loadData(); else hideLoading();
setInterval(()=>{ if(API_URL&&document.visibilityState==='visible') loadData(true); }, 30000);
