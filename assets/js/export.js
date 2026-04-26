// ── EXCEL EXPORT ──────────────────────────────
function entrySource(e) {
  return e.type === 'Withdrawal' ? 'HDNailedIt' : e.client;
}

function exportType(e) {
  return e.type === 'Deposit' ? 'Revenue' : e.type;
}

function exportOwner(e) {
  return ownerForEntry(e) || '-';
}

function ledgerRow(e, accountantMode) {
  const row = {
    'Date': fmtDate(e.date),
    'Type': exportType(e),
    'Payment Type': e.type === 'Deposit' ? 'Deposit' : e.payType,
    'Service': e.service,
    'Client / Supplier / From': entrySource(e),
    'Staff / Paid To': e.staff,
    'Owner': exportOwner(e),
  };
  if (accountantMode) {
    row['Transfer Amount ($)'] = e.tf;
    row['Total Amount ($)'] = isRevenueEntry(e) ? e.tf : e.amount;
  } else {
    row['Cash ($)'] = e.cash;
    row['Transfer ($)'] = e.tf;
    row['Total ($)'] = e.amount;
  }
  row['Note'] = e.note;
  row['Month'] = fmtMonth(e.month);
  return row;
}

async function exportExcel(mode) {
  try { await ensureXlsx(); }
  catch(err) { toast(err.message); return; }
  const wb = XLSX.utils.book_new();
  if (mode === 'accountant') {
    const accountantRows=DB.filter(e=>e.tf>0||e.type==='Expense'||e.type==='Withdrawal').map(e=>ledgerRow(e, true));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(accountantRows.length?accountantRows:[{Note:'No accountant transactions'}]),'Accountant Ledger');
    XLSX.writeFile(wb,`HD_Accountant_Ledger_${new Date().toISOString().slice(0,10)}.xlsx`);
  } else if (mode === 'cash') {
    const cashRows=DB.filter(e=>e.cash>0).map(e=>({'Date':fmtDate(e.date),'Type':exportType(e),'Service':e.service,'Client / Supplier / From':entrySource(e),'Staff / Paid To':e.staff,'Owner':exportOwner(e),'Cash Amount ($)':e.cash,'Note':e.note}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cashRows.length?cashRows:[{Note:'No cash transactions'}]),'Cash Ledger');
    XLSX.writeFile(wb,`HD_Cash_Ledger_${new Date().toISOString().slice(0,10)}.xlsx`);
  } else {
    const allRows=DB.map(e=>ledgerRow(e, false));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(allRows.length?allRows:[{Note:'No transactions'}]),'Full Ledger');
    XLSX.writeFile(wb,`HD_Full_Ledger_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
  toast('✓ Excel downloaded');
}

// ═══════════════════════════════════════════════════
