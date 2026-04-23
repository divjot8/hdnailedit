// SMART IMPORTER — reads their existing spreadsheet
// ═══════════════════════════════════════════════════

function dragOver(e) { e.preventDefault(); document.getElementById('import-zone').classList.add('dragover'); }
function dragLeave(e) { document.getElementById('import-zone').classList.remove('dragover'); }
function dropFile(e) { e.preventDefault(); document.getElementById('import-zone').classList.remove('dragover'); handleFiles(e.dataTransfer.files); }

function handleFiles(files) {
  if (!files.length) return;
  pendingImport = [];
  const logEl = document.getElementById('import-log');
  document.getElementById('import-preview').style.display = 'block';
  logEl.innerHTML = '';
  let totalParsed=0, totalSkipped=0, totalDups=0;

  const existingIds = new Set(DB.map(e => e.date+'|'+e.type+'|'+e.client+'|'+e.amount));

  Array.from(files).forEach(file => {
    log(logEl, `📂 Processing: ${file.name}`, 'ok');
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const wb = XLSX.read(ev.target.result, {type:'binary', cellDates:true});
        wb.SheetNames.forEach(sheetName => {
          log(logEl, `  └ Sheet: "${sheetName}"`, 'ok');
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:false});
          const result = parseHDSheet(rows, sheetName, existingIds, logEl);
          pendingImport.push(...result.entries);
          totalParsed += result.parsed;
          totalSkipped += result.skipped;
          totalDups += result.dups;
          setProgress(Math.min(90, (pendingImport.length / Math.max(pendingImport.length+1,1))*90));
        });
      } catch(err) {
        log(logEl, `  ✗ Error reading file: ${err.message}`, 'err');
      }
      updateImportStats(totalParsed, totalSkipped, totalDups);
      renderImportPreview();
      setProgress(100);
    };
    reader.readAsBinaryString(file);
  });
}

function parseHDSheet(rows, sheetName, existingIds, logEl) {
  let parsed=0, skipped=0, dups=0;
  const entries = [];
  let currentDate = null;

  rows.forEach((row, rowIdx) => {
    try {
      // Try to extract date from col 0
      const col0 = (row[0]||'').toString().trim();
      const col1 = (row[1]||'').toString().trim();
      const col2 = (row[2]||'').toString().trim();
      const col3 = (row[3]||'').toString().trim();
      const col4 = (row[4]||'').toString().trim();
      const col5 = (row[5]||'').toString().trim();

      // Skip empty rows, balance rows, header rows
      if (!col1 && !col2) return;
      if (col1.toLowerCase().includes('service') && col2.toLowerCase().includes('client')) return;
      if (col3.toLowerCase().includes('balance') || col1.toLowerCase().includes('balance')) return;
      if (col1.toLowerCase() === 'service' || col1.toLowerCase() === 'gel x deposit') {
        // might still be valid — continue
      }

      // Date detection
      const dateAttempt = parseFlexDate(col0);
      if (dateAttempt) currentDate = dateAttempt;
      if (!currentDate) return;

      // Skip rows that look like deduction/reconciliation rows (contain a name with dash like "alyssa - harnoor")
      const isDeduc = /\w+\s*[-–]\s*(harnoor|dikshi)/i.test(col2) || /\w+\s*[-–]\s*(harnoor|dikshi)/i.test(col5);
      if (isDeduc) return;

      // Skip BALANCE rows
      if (/balance/i.test(col3) || /balance/i.test(col4) || /balance/i.test(col5)) return;

      // Extract fee string from col3
      const feeStr = col3.trim();
      if (!feeStr) return;

      // Skip if fee is empty or looks like a balance line
      if (/^\$[\d,]+\.\d+/.test(feeStr) && feeStr.split('$').length > 2) return;

      // Determine type
      let type = 'Revenue';
      let payType = 'Full Payment';
      let amount = 0;
      let cash = 0;
      let tf = 0;

      const feeUpper = feeStr.toUpperCase();
      const isDeposit = feeUpper.includes('DEPOSIT');
      const isSupply = /supplies?|supplier|shein|amazon|woolies|kmart|abs|lashmer|dicksmith|bunnings|diamond|best nail|ali/i.test(col2) || /supplies?/i.test(col1);

      if (isSupply) {
        type = 'Expense';
      } else if (isDeposit) {
        // Extract deposit amount
        const match = feeStr.match(/\$?\s*([\d]+(?:\.\d+)?)/);
        amount = match ? parseFloat(match[1]) : 20;
        type = 'Deposit';
        payType = 'Deposit';
      } else {
        // Try to parse amount
        const match = feeStr.match(/\$?\s*([\d]+(?:\.\d+)?)/);
        if (!match) return;
        amount = parseFloat(match[1]);
        if (!amount || amount <= 0) return;
      }

      if (type === 'Expense') {
        // Parse negative amount
        const match = feeStr.match(/-?\$?\s*([\d]+(?:\.\d+)?)/);
        amount = match ? parseFloat(match[1]) : 0;
        if (!amount) return;
      }

      // Payment method from col4
      const methodStr = (col4||'').toString().toLowerCase();
      const hasCash = methodStr.includes('cash');
      const hasTransfer = methodStr.includes('transfer') || methodStr.includes('t/f') || methodStr.includes('pay id');

      // Parse mixed amounts like "$10 transfer, $50 cash"
      const cashMatch = col4.match(/\$?\s*(\d+(?:\.\d+)?)\s*cash/i);
      const tfMatch   = col4.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:transfer|t\/f)/i);

      if (cashMatch && tfMatch) {
        cash = parseFloat(cashMatch[1]);
        tf   = parseFloat(tfMatch[1]);
        amount = cash + tf;
      } else if (cashMatch) {
        cash = parseFloat(cashMatch[1]);
        tf   = Math.max(0, amount - cash);
      } else if (tfMatch) {
        tf   = parseFloat(tfMatch[1]);
        cash = Math.max(0, amount - tf);
      } else if (hasCash && !hasTransfer) {
        cash = amount;
      } else {
        tf = amount;
      }

      // Staff from col5 (last column)
      let staff = '-';
      if (/harnoor/i.test(col5)) staff = 'Harnoor';
      else if (/dikshi/i.test(col5)) staff = 'Dikshi';
      // also check col5 for "H" or "D" shorthand
      if (staff==='-' && /^h(\s|$|\d)/i.test(col5)) staff='Harnoor';
      if (staff==='-' && /^d(\s|$|\d)/i.test(col5)) staff='Dikshi';

      // Service from col1
      const service = normaliseService(col1);
      const client  = col2.trim() || '-';

      const note = '';
      const month = currentDate.slice(0,7);

      // Duplicate check
      const key = `${currentDate}|${type}|${client}|${amount}`;
      if (existingIds.has(key)) { dups++; return; }
      existingIds.add(key);

      const entry = {
        id: 'IMP'+Date.now()+'_'+rowIdx+Math.random().toString(36).slice(2,6),
        date: currentDate, type, payType,
        service: type==='Expense'?'Supplies':service,
        client, staff,
        amount:+amount.toFixed(2), cash:+Math.max(0,cash).toFixed(2), tf:+Math.max(0,tf).toFixed(2),
        note, month,
      };

      entries.push(entry);
      parsed++;
    } catch(e) {
      skipped++;
    }
  });

  log(logEl, `  ✓ Parsed ${parsed} entries, ${skipped} rows skipped, ${dups} duplicates ignored`, parsed>0?'ok':'warn');
  return { entries, parsed, skipped, dups };
}

function parseFlexDate(str) {
  if (!str) return null;
  str = str.toString().trim();
  // dd/mm/yyyy or d/m/yyyy
  let m = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    let [,d,mo,y] = m;
    if (y.length===2) y='20'+y;
    return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // yyyy-mm-dd
  m = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  // Excel serial date number
  if (/^\d{5}$/.test(str)) {
    const d = new Date((parseInt(str)-25569)*86400*1000);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
  }
  return null;
}

function normaliseService(raw) {
  raw = (raw||'').toLowerCase().trim();
  if (raw.includes('biab infill')) return 'BIAB infill';
  if (raw.includes('biab')) return 'BIAB';
  if (raw.includes('gel x infill')) return 'Gel x infill';
  if (raw.includes('infill')) return 'Gel x infill';
  if (raw.includes('removal') && raw.includes('set')) return 'Removal + set';
  if (raw.includes('removal') && raw.includes('biab')) return 'Removal + set';
  if (raw.includes('removal') && raw.includes('mani')) return 'Gel mani';
  if (raw.includes('removal')) return 'Removal';
  if (raw.includes('press on')) return 'Press ons';
  if (raw.includes('press')) return 'Press ons';
  if (raw.includes('gel mani') || raw.includes('gel manicure')) return 'Gel mani';
  if (raw.includes('repair')) return 'Repair';
  if (raw.includes('gel x')) return 'Gel x';
  if (raw.includes('supplies') || raw.includes('supply')) return 'Supplies';
  return raw ? raw.charAt(0).toUpperCase()+raw.slice(1) : 'Other';
}

function log(el, msg, type='ok') {
  const span = document.createElement('div');
  span.className = type==='err'?'log-err':type==='warn'?'log-warn':'log-ok';
  span.textContent = msg;
  el.appendChild(span);
  el.scrollTop = el.scrollHeight;
}

function setProgress(pct) {
  document.getElementById('progress-fill').style.width = pct+'%';
}

function updateImportStats(parsed, skipped, dups) {
  document.getElementById('import-stats').innerHTML = `
    <div class="istat"><div class="istat-label">Entries found</div><div class="istat-val">${parsed}</div></div>
    <div class="istat"><div class="istat-label">Rows skipped</div><div class="istat-val">${skipped}</div></div>
    <div class="istat"><div class="istat-label">Duplicates</div><div class="istat-val">${dups}</div></div>
    <div class="istat"><div class="istat-label">Ready to import</div><div class="istat-val istat-val-ready">${pendingImport.length}</div></div>`;
}

function renderImportPreview() {
  const wrap = document.getElementById('preview-table-wrap');
  if (!pendingImport.length) { wrap.innerHTML='<div class="empty-state"><div class="es-text">No importable entries found — check your file format</div></div>'; return; }
  const sample = pendingImport.slice(0,50);
  wrap.innerHTML = `<div class="preview-caption">Preview — showing first ${sample.length} of ${pendingImport.length} entries</div>
    <table class="data-table"><thead><tr><th>Date</th><th>Type</th><th>Service</th><th>Client</th><th>Staff</th><th class="td-right">Cash</th><th class="td-right">Transfer</th><th class="td-right">Total</th></tr></thead>
    <tbody>${sample.map(e=>`<tr>
      <td class="td-mono">${fmtDate(e.date)}</td><td>${typeBadge(e.type)}</td>
      <td class="text-secondary">${e.service}</td><td>${e.client}</td>
      <td>${staffBadge(e.staff)}</td>
      <td class="td-right td-mono">${e.cash>0?fmt(e.cash):'—'}</td>
      <td class="td-right td-mono">${e.tf>0?fmt(e.tf):'—'}</td>
      <td class="td-right td-mono"><strong>${fmt(e.amount)}</strong></td>
    </tr>`).join('')}</tbody></table>`;
}

async function confirmImport() {
  if (!pendingImport.length) { toast('Nothing to import.'); return; }
  const btn = document.getElementById('confirm-import-btn');
  btn.disabled = true; btn.textContent = 'Importing...';
  const logEl = document.getElementById('import-log');
  log(logEl, `⬆ Sending ${pendingImport.length} entries to Google Sheets...`, 'ok');

  let success=0, fail=0;
  // Batch in groups of 20 to avoid timeout
  const batchSize = 20;
  for (let i=0; i<pendingImport.length; i+=batchSize) {
    const batch = pendingImport.slice(i, i+batchSize);
    for (const entry of batch) {
      try {
        if (API_URL) await apiPost({action:'add', entry});
        DB.unshift(entry);
        success++;
      } catch(err) { fail++; }
    }
    setProgress(Math.round(((i+batchSize)/pendingImport.length)*100));
    log(logEl, `  ${Math.min(i+batchSize, pendingImport.length)}/${pendingImport.length} processed`, 'ok');
    await new Promise(r=>setTimeout(r,100)); // small delay between batches
  }

  localStorage.setItem('hd_nails_cache', JSON.stringify(DB));
  refreshAllViews();
  log(logEl, `✓ Done! ${success} imported${fail>0?`, ${fail} failed`:''}`, success>0?'ok':'err');
  toast(`✓ ${success} entries imported successfully`);
  pendingImport = [];
  btn.disabled=false; btn.textContent='Confirm Import';
}

function cancelImport() {
  pendingImport=[];
  document.getElementById('import-preview').style.display='none';
  document.getElementById('import-log').innerHTML='';
  setProgress(0);
}
