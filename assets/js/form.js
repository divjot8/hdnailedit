// ── FORM ──────────────────────────────────────
function setEntryType(t) {
  currentType = t;
  document.querySelectorAll('.type-tab').forEach((b,i) => b.classList.toggle('active',['Revenue','Expense','Withdrawal'][i]===t));
  const si = t==='Revenue';
  const isWithdrawal = t==='Withdrawal';
  document.getElementById('fg-staff').style.display   = si||isWithdrawal?'':'none';
  document.querySelector('#fg-staff .form-label').textContent = isWithdrawal?'Paid to':'Staff';
  document.getElementById('fg-service').style.display = si?'':'none';
  document.getElementById('fg-client').style.display  = isWithdrawal?'none':'';
  document.getElementById('fg-paytype').style.display = si?'':'none';
  document.getElementById('client-label').textContent = t==='Expense'?'Supplier':'Client';
  document.getElementById('f-client').placeholder = t==='Expense'?'Supplier name':t==='Withdrawal'?'e.g. Harnoor personal':'Client name';
  autoSplit();
}

function setPayType(t) {
  currentPayType = t;
  document.getElementById('pay-full').classList.toggle('active', t==='Full Payment');
  document.getElementById('pay-dep').classList.toggle('active', t==='Deposit');
}

function autoSplit() {
  const total = parseFloat(document.getElementById('f-amount').value)||0;
  document.getElementById('f-cash').value = '';
  document.getElementById('f-transfer').value = total>0?total.toFixed(2):'';
}

function syncSplit(changed) {
  const total = parseFloat(document.getElementById('f-amount').value)||0;
  if (!total) return;
  if (changed==='cash') document.getElementById('f-transfer').value = Math.max(0,total-(parseFloat(document.getElementById('f-cash').value)||0)).toFixed(2);
  else document.getElementById('f-cash').value = Math.max(0,total-(parseFloat(document.getElementById('f-transfer').value)||0)).toFixed(2);
}

function clearForm() {
  document.getElementById('f-date').value = today();
  ['f-client','f-amount','f-cash','f-transfer','f-note'].forEach(id => document.getElementById(id).value='');
  setEntryType('Revenue'); setPayType('Full Payment');
}

function today() { return new Date().toISOString().split('T')[0]; }
