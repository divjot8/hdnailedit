// ── SUBMIT ────────────────────────────────────
async function submitEntry() {
  const date=document.getElementById('f-date').value, type=currentType, payType=currentPayType;
  const service=document.getElementById('f-service').value;
  let client=document.getElementById('f-client').value.trim();
  const staff=document.getElementById('f-staff').value, amount=parseFloat(document.getElementById('f-amount').value)||0;
  let cash=parseFloat(document.getElementById('f-cash').value)||0, tf=parseFloat(document.getElementById('f-transfer').value)||0;
  const note=document.getElementById('f-note').value.trim();
  if (type==='Withdrawal') {
    syncWithdrawalParties('staff');
    client = document.getElementById('f-withdrawal-from').value;
  }
  if (!date) { toast('Enter a date.'); return; }
  if (!amount) { toast('Enter an amount.'); return; }
  if (['Revenue','Deposit'].includes(type)&&!client) { toast('Enter a client name.'); return; }
  if (type==='Expense'&&!client) { toast('Enter a supplier name.'); return; }
  if (type==='Withdrawal'&&client===staff) { toast('Choose different people for paid from and paid to.'); return; }
  if (cash===0&&tf===0) tf=amount;
  else if (cash>0&&tf===0) tf=amount-cash;
  else if (tf>0&&cash===0) cash=amount-tf;
  if (cash < -0.01 || tf < -0.01 || cash > amount + 0.01 || tf > amount + 0.01) { toast('Cash and transfer must fit within the total.'); return; }
  if (cash + tf > amount + 0.01) { toast('Cash and transfer are more than the total.'); return; }
  const entry = {
    id:'HD'+Date.now(), date, type,
    payType: ['Revenue','Deposit'].includes(type)?payType:(type==='Withdrawal'?`Paid to ${staff}`:'-'),
    service: ['Revenue','Deposit'].includes(type)?service:'-',
    client: client||'-', staff: ['Revenue','Deposit','Withdrawal'].includes(type)?staff:'-',
    amount:+amount.toFixed(2), cash:+Math.max(0,cash).toFixed(2), tf:+Math.max(0,tf).toFixed(2),
    note, month:date.slice(0,7),
  };
  const btn = document.getElementById('submit-btn');
  btn.disabled=true; btn.textContent='Saving...';
  try {
    if (API_URL) { await apiPost({action:'add',entry}); }
    DB.unshift(entry);
    localStorage.setItem('hd_nails_cache', JSON.stringify(DB));
    refreshAllViews();
    toast(`✓ ${type} $${amount.toFixed(2)} saved`);
    clearForm();
  } catch(err) { toast('Error: '+err.message); }
  finally { btn.disabled=false; btn.textContent='Add Entry'; }
}

// ── DELETE ────────────────────────────────────
async function deleteEntry(id) {
  if (!confirm('Delete this entry?')) return;
  try {
    if (API_URL) await apiPost({action:'delete',id});
    DB = DB.filter(e=>e.id!==id);
    localStorage.setItem('hd_nails_cache', JSON.stringify(DB));
    refreshAllViews(); toast('Entry deleted.');
  } catch(err) { toast('Error: '+err.message); }
}
