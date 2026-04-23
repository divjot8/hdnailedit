// ── TOAST ──────────────────────────────────────
function toast(msg) {
  const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),3500);
}

// ── INIT ──────────────────────────────────────
document.getElementById('f-date').value = today();
renderConfigBanners();
setSyncStatus(API_URL?'connected':'disconnected', API_URL?'Showing cached data · syncing in background':undefined);
const cached = localStorage.getItem('hd_nails_cache');
if (cached) { try { DB=JSON.parse(cached); refreshAllViews(); } catch(e){} }
hideLoading();
if (API_URL) setTimeout(()=>loadData(true), 0);
setInterval(()=>{ if(API_URL&&document.visibilityState==='visible') loadData(true); }, 30000);

let _chartResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_chartResizeTimer);
  _chartResizeTimer = setTimeout(refreshDashboard, 120);
});
