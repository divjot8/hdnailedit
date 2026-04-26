// ── SUBMIT ────────────────────────────────────
async function submitEntry() {
  const date=document.getElementById('f-date').value, type=currentType, payType=currentPayType;
  const service=document.getElementById('f-service').value;
  let client=document.getElementById('f-client').value.trim();
  const staff=document.getElementById('f-staff').value, amount=parseFloat(document.getElementById('f-amount').value)||0;
  const owner=type==='Expense'?document.getElementById('f-owner').value:staff;
  let cash=parseFloat(document.getElementById('f-cash').value)||0, tf=parseFloat(document.getElementById('f-transfer').value)||0;
  const note=document.getElementById('f-note').value.trim();
  if (type==='Withdrawal') {
    client = 'HDNailedIt';
  }
  if (!date) { toast('Enter a date.'); return; }
  if (!amount) { toast('Enter an amount.'); return; }
  if (type==='Revenue'&&!client) { toast('Enter a client name.'); return; }
  if (type==='Expense'&&!client) { toast('Enter a supplier name.'); return; }
  if (cash===0&&tf===0) tf=amount;
  else if (cash>0&&tf===0) tf=amount-cash;
  else if (tf>0&&cash===0) cash=amount-tf;
  else if (cash+tf<amount) tf=amount-cash;
  if (cash < -0.01 || tf < -0.01 || cash > amount + 0.01 || tf > amount + 0.01) { toast('Cash and transfer must fit within the total.'); return; }
  if (cash + tf > amount + 0.01) { toast('Cash and transfer are more than the total.'); return; }
  const entry = {
    id:'HD'+Date.now(), date, type,
    payType: type==='Revenue'?payType:(type==='Withdrawal'?`Paid to ${staff}`:'-'),
    service: type==='Revenue'?service:'-',
    client: client||'-', staff: ['Revenue','Withdrawal'].includes(type)?staff:'-', owner,
    amount:+amount.toFixed(2), cash:+Math.max(0,cash).toFixed(2), tf:+Math.max(0,tf).toFixed(2),
    note, month:normalizeMonthKey(date, date),
  };
  const btn = document.getElementById('submit-btn');
  btn.disabled=true; btn.textContent='Saving...';
  DB.unshift(entry);
  localStorage.setItem('hd_nails_cache', JSON.stringify(DB));
  refreshAllViews();
  toast(`✓ ${type} $${amount.toFixed(2)} saved`);
  clearForm();
  btn.disabled=false; btn.textContent='Add Entry';

  if (API_URL) {
    apiPost({action:'add',entry})
      .then(() => setSyncStatus('connected', `Connected · ${DB.length} entries · ${new Date().toLocaleTimeString()}`))
      .catch(err => toast('Sheets sync error — saved locally: ' + err.message));
  }
}

// ── DELETE ────────────────────────────────────
async function deleteEntry(id) {
  if (!confirm('Delete this entry?')) return;
  const removed = DB.find(e => e.id === id);
  DB = DB.filter(e=>e.id!==id);
  localStorage.setItem('hd_nails_cache', JSON.stringify(DB));
  refreshAllViews();
  toast('Entry deleted.');
  if (API_URL) {
    apiPost({action:'delete',id}).catch(err => {
      if (removed) {
        DB.push(removed);
        DB.sort((a, b) => new Date(`${b.date}T00:00:00`) - new Date(`${a.date}T00:00:00`));
        localStorage.setItem('hd_nails_cache', JSON.stringify(DB));
        refreshAllViews();
      }
      toast('Delete sync failed: ' + err.message);
    });
  }
}
