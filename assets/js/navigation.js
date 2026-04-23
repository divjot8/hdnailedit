// ── NAV ──────────────────────────────────────
function nav(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('onclick') === `nav('${page}')`) item.classList.add('active');
  });
  if (page==='ledger')     renderLedger();
  if (page==='cash')       renderCashLedger();
  if (page==='accountant') renderAccountant();
  if (page==='dashboard')  refreshDashboard();
  if (API_URL && page !== 'import') loadData(true);
}
