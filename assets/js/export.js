// ── EXCEL EXPORT ──────────────────────────────
function entrySource(e) {
  return e.type === 'Withdrawal' ? 'HDNailedIt' : e.client;
}

function exportType(e) {
  return e.type === 'Deposit' ? 'Revenue' : e.type;
}

async function exportExcel(mode) {
  try { await ensureXlsx(); }
  catch(err) { toast(err.message); return; }
  const wb = XLSX.utils.book_new();
  const allRows=DB.map(e=>({'Date':fmtDate(e.date),'Type':exportType(e),'Payment Type':e.type==='Deposit'?'Deposit':e.payType,'Service':e.service,'Client / Supplier / From':entrySource(e),'Staff / Paid To':e.staff,'Cash ($)':e.cash,'Transfer ($)':e.tf,'Total ($)':e.amount,'Note':e.note,'Month':fmtMonth(e.month)}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(allRows),'Full Ledger');
  const cashRows=DB.filter(e=>e.cash>0).map(e=>({'Date':fmtDate(e.date),'Type':exportType(e),'Service':e.service,'Client / Supplier / From':entrySource(e),'Staff / Paid To':e.staff,'Cash Amount ($)':e.cash,'Note':e.note}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cashRows.length?cashRows:[{Note:'No cash transactions'}]),'Cash Ledger');
  const tfRows=DB.filter(e=>e.tf>0||e.type==='Expense'||e.type==='Withdrawal').map(e=>({'Date':fmtDate(e.date),'Type':exportType(e),'Payment Type':e.type==='Deposit'?'Deposit':e.payType,'Service':e.service,'Client / Supplier / From':entrySource(e),'Staff / Paid To':e.staff,'Transfer Amount ($)':e.tf,'Total Amount ($)':e.amount,'Note':e.note}));
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(tfRows.length?tfRows:[{Note:'No transfer transactions'}]),'Accountant Export');
  const monthly={};
  DB.forEach(e=>{const monthKey=normalizeMonthKey(e.month,e.date);if(!monthKey)return;if(!monthly[monthKey])monthly[monthKey]={rev:0,dep:0,exp:0,cash:0,tf:0,wd:0,entries:0,harnoorRev:0,dikshiRev:0,harnoorWd:0,dikshiWd:0};const m=monthly[monthKey];m.entries++;if(isRevenueEntry(e)){m.rev+=e.amount;m.cash+=e.cash;m.tf+=e.tf;if(isDepositEntry(e))m.dep+=e.amount;if(e.staff==='Harnoor')m.harnoorRev+=e.amount;if(e.staff==='Dikshi')m.dikshiRev+=e.amount;}if(e.type==='Expense')m.exp+=e.amount;if(e.type==='Withdrawal'){m.wd+=e.amount;if(e.staff==='Harnoor')m.harnoorWd+=e.amount;if(e.staff==='Dikshi')m.dikshiWd+=e.amount;}});
  const mRows=Object.keys(monthly).sort().map(ym=>{const d=monthly[ym];return{'Month':fmtMonth(ym),'Revenue ($)':d.rev,'Deposit Revenue ($)':d.dep,'Expenses ($)':d.exp,'Net Profit ($)':d.rev-d.exp,'Cash Income ($)':d.cash,'Transfer Income ($)':d.tf,'Withdrawals ($)':d.wd,'Harnoor Revenue ($)':d.harnoorRev,'Dikshi Revenue ($)':d.dikshiRev,'Withdrawn to Harnoor ($)':d.harnoorWd,'Withdrawn to Dikshi ($)':d.dikshiWd,'Entries':d.entries};});
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(mRows.length?mRows:[{Note:'No data'}]),'Monthly Summary');
  XLSX.writeFile(wb,`HD_NailStudio_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('✓ Excel downloaded');
}

// ═══════════════════════════════════════════════════
