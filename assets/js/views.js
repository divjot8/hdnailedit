// ── VIEWS ─────────────────────────────────────
function refreshAllViews() { refreshDashboard(); renderLedger(); renderCashLedger(); renderAccountant(); }

function isRevenueEntry(e) {
  return e.type === 'Revenue' || e.type === 'Deposit';
}

function isDepositEntry(e) {
  return e.payType === 'Deposit' || e.type === 'Deposit';
}

function fmt(n) {
  const value = Number(n) || 0;
  const sign = value < 0 ? '-' : '';
  return sign+'$'+Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
}
function fmtDate(d) { if(!d)return''; const[y,m,day]=d.split('-'); return`${day}/${m}/${y}`; }
function fmtMonth(ym) {
  const normalized = normalizeMonthKey(ym);
  if(!normalized)return'';
  const[y,m]=normalized.split('-');
  const label=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m,10)-1];
  return label?`${label} ${y}`:normalized;
}
function typeBadge(t) {
  const m={Revenue:'badge-revenue',Deposit:'badge-revenue',Expense:'badge-expense',Withdrawal:'badge-withdrawal'};
  return`<span class="badge ${m[t]||''}">${t}</span>`;
}
function staffBadge(s) {
  if(!s||s==='-')return'<span class="text-muted">—</span>';
  return`<span class="badge ${s==='Harnoor'?'badge-harnoor':'badge-dikshi'}">${s}</span>`;
}
function partyText(e) {
  if (e.type === 'Withdrawal') return `HDNailedIt to ${e.staff || '-'}`;
  return e.client;
}
function amountClass(isPositive) {
  return isPositive ? 'amount-positive' : 'amount-negative';
}

function setDashPeriod(period) {
  dashPeriod = period;
  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', (b.getAttribute('onclick') || '').includes(`'${period}'`));
  });
  refreshDashboard();
}

function getPeriodRange() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (dashPeriod === 'thisMonth') return { start: new Date(y, m, 1), end: null };
  if (dashPeriod === 'lastMonth') return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
  if (dashPeriod === '3months') return { start: new Date(y, m - 2, 1), end: null };
  if (dashPeriod === '6months') return { start: new Date(y, m - 5, 1), end: null };
  if (dashPeriod === 'thisYear') return { start: new Date(y, 0, 1), end: null };
  return { start: null, end: null };
}

function inPeriod(entry) {
  const { start, end } = getPeriodRange();
  if (!start) return true;
  const d = new Date(entry.date + 'T00:00:00');
  return d >= start && (!end || d <= end);
}

function periodLabel() {
  return { thisMonth:'This Month', lastMonth:'Last Month', '3months':'Last 3 Months',
           '6months':'Last 6 Months', thisYear:'This Year', all:'All Time' }[dashPeriod] || 'Period';
}

function formatShortDollar(value) {
  const amount = Number(value) || 0;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(amount)}`;
}

function roundRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawMonthlyChart(monthly) {
  const canvas = document.getElementById('monthly-chart');
  if (!canvas || !canvas.parentElement) return;
  const width = canvas.parentElement.clientWidth || 300;
  const height = 290;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.floor(height * dpr);
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const monthKeys = Object.keys(monthly).sort();
  const recentMonths = monthKeys.slice(-7);
  const data = recentMonths.map(key => ({ key, ...monthly[key] }));

  ctx.fillStyle = '#6f6a63';
  ctx.font = "10px 'DM Sans', sans-serif";

  if (!data.length) {
    ctx.textAlign = 'center';
    ctx.fillText('No chart data yet', width / 2, height / 2);
    return;
  }

  const plot = { left: 50, right: 20, top: 12, bottom: 62 };
  const chartWidth = Math.max(10, width - plot.left - plot.right);
  const chartHeight = Math.max(10, height - plot.top - plot.bottom);
  const maxValue = Math.max(1, ...data.flatMap(item => [item.rev || 0, item.exp || 0]));
  const stepValue = maxValue / 4;

  ctx.strokeStyle = '#e4ddd5';
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const value = stepValue * i;
    const y = plot.top + chartHeight - (value / maxValue) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(width - plot.right, y);
    ctx.stroke();
    ctx.fillText(formatShortDollar(value), plot.left - 8, y);
  }

  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(18, groupWidth * 0.28);
  const gap = Math.max(4, barWidth * 0.35);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  data.forEach((item, index) => {
    const centerX = plot.left + groupWidth * index + groupWidth / 2;
    const revHeight = maxValue ? (item.rev / maxValue) * chartHeight : 0;
    const expHeight = maxValue ? (item.exp / maxValue) * chartHeight : 0;
    const baseY = plot.top + chartHeight;

    ctx.fillStyle = '#4a7c4e';
    roundRect(ctx, centerX - gap - barWidth, baseY - revHeight, barWidth, Math.max(2, revHeight), 6);
    ctx.fill();

    ctx.fillStyle = '#c98288';
    roundRect(ctx, centerX + gap, baseY - expHeight, barWidth, Math.max(2, expHeight), 6);
    ctx.fill();

    ctx.fillStyle = '#6f6a63';
    ctx.fillText(fmtMonth(item.key).split(' ')[0], centerX, baseY + 10);
  });

  const legendY = height - 18;
  const legend = [
    { label: 'Revenue', color: '#4a7c4e', x: width / 2 - 70 },
    { label: 'Expenses', color: '#c98288', x: width / 2 + 10 },
  ];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  legend.forEach(item => {
    ctx.fillStyle = item.color;
    roundRect(ctx, item.x, legendY - 5, 14, 10, 4);
    ctx.fill();
    ctx.fillStyle = '#6f6a63';
    ctx.fillText(item.label, item.x + 22, legendY);
  });
}

function refreshDashboard() {
  let cashHand=0,cashBank=0,totalWith=0;
  let pRev=0,pExp=0,fullTf=0,fullCash=0,deps=0,pEntries=0;
  let hRev=0,hCash=0,hTf=0,hWith=0,dRev=0,dCash=0,dTf=0,dWith=0;
  const monthly={};

  DB.forEach(e => {
    const isInc = isRevenueEntry(e);
    const monthKey = normalizeMonthKey(e.month, e.date);
    if (monthKey && !monthly[monthKey]) monthly[monthKey] = { rev:0, exp:0, cash:0, tf:0, count:0 };
    if (monthKey) monthly[monthKey].count++;

    if (isInc) {
      cashHand += e.cash;
      cashBank += e.tf;
      if (monthKey) {
        monthly[monthKey].rev += e.amount;
        monthly[monthKey].cash += e.cash;
        monthly[monthKey].tf += e.tf;
      }
    } else if (e.type === 'Expense') {
      cashHand -= e.cash;
      cashBank -= e.tf;
      if (monthKey) monthly[monthKey].exp += e.amount;
    } else if (e.type === 'Withdrawal') {
      totalWith += e.amount;
      cashHand -= e.cash;
      cashBank -= e.tf;
    }

    if (!inPeriod(e)) return;
    pEntries++;

    if (isInc) {
      pRev += e.amount;
      if (isDepositEntry(e)) deps += e.amount;
      else {
        fullTf += e.tf;
        fullCash += e.cash;
      }
      if (e.staff === 'Harnoor') {
        hRev += e.amount;
        hCash += e.cash;
        hTf += e.tf;
      }
      if (e.staff === 'Dikshi') {
        dRev += e.amount;
        dCash += e.cash;
        dTf += e.tf;
      }
    } else if (e.type === 'Expense') {
      pExp += e.amount;
    } else if (e.type === 'Withdrawal') {
      if (e.staff === 'Harnoor') hWith += e.amount;
      if (e.staff === 'Dikshi') dWith += e.amount;
    }
  });

  const totalBiz = cashHand + cashBank;
  const pNet = pRev - pExp;
  const period = periodLabel();
  document.getElementById('sb-balance').textContent = fmt(totalBiz);
  document.getElementById('m-cash-hand').textContent = fmt(cashHand);
  document.getElementById('m-cash-bank').textContent = fmt(cashBank);
  document.getElementById('m-total-biz').textContent = fmt(totalBiz);
  document.getElementById('m-withdrawals').textContent = fmt(totalWith);

  document.getElementById('p-period-label').textContent = period;
  document.getElementById('p-rev-label').textContent = `${period} Revenue`;
  document.getElementById('p-exp-label').textContent = `${period} Expenses`;
  document.getElementById('p-net-label').textContent = `${period} Net Profit`;
  document.getElementById('p-rev').textContent = fmt(pRev);
  document.getElementById('p-exp').textContent = fmt(pExp);
  const pNetEl = document.getElementById('p-net');
  pNetEl.textContent = fmt(pNet);
  pNetEl.className = 'mc-value ' + (pNet >= 0 ? 'positive' : 'negative');
  document.getElementById('p-entries').textContent = pEntries;

  document.getElementById('d-full-tf').textContent = fmt(fullTf);
  document.getElementById('d-full-cash').textContent = fmt(fullCash);
  document.getElementById('d-deps').textContent = fmt(deps);
  document.getElementById('d-exp-neg').textContent = fmt(pExp);
  const dn = document.getElementById('d-net');
  dn.textContent = fmt(pNet);
  dn.className = 'dr-val ' + (pNet >= 0 ? 'pos' : 'neg');
  ['d-h-rev','d-h-cash','d-h-tf','d-h-with'].forEach((id, i) => document.getElementById(id).textContent = fmt([hRev,hCash,hTf,hWith][i]));
  ['d-d-rev','d-d-cash','d-d-tf','d-d-with'].forEach((id, i) => document.getElementById(id).textContent = fmt([dRev,dCash,dTf,dWith][i]));

  const months = Object.keys(monthly).sort().reverse().slice(0,12);
  document.getElementById('monthly-body').innerHTML = months.length
    ? months.map(m => {
      const d = monthly[m];
      const net = d.rev - d.exp;
      return `<tr>
      <td><strong>${fmtMonth(m)}</strong></td>
      <td class="td-right amount-positive">${fmt(d.rev)}</td>
      <td class="td-right amount-negative">${fmt(d.exp)}</td>
      <td class="td-right"><strong class="${amountClass(net>=0)}">${fmt(net)}</strong></td>
      <td class="td-right">${fmt(d.cash)}</td>
      <td class="td-right">${fmt(d.tf)}</td>
      <td class="td-right month-count">${d.count}</td>
    </tr>`;
    }).join('')
    : '<tr><td colspan="7"><div class="empty-state"><div class="es-text">No data yet</div></div></td></tr>';

  document.getElementById('dash-updated').textContent = DB.length
    ? `${DB.length} entries · ${new Date().toLocaleTimeString()}`
    : '—';
  drawMonthlyChart(monthly);
}

function renderLedger() {
  const tf=document.getElementById('l-filter-type').value, sf=document.getElementById('l-filter-staff').value;
  const pf=document.getElementById('l-filter-pay').value, s=document.getElementById('l-search').value.toLowerCase();
  const f=DB.filter(e=>(!tf||(tf==='Revenue'?isRevenueEntry(e):e.type===tf))&&(!sf||e.staff===sf)&&(!pf||e.payType===pf||(pf==='Deposit'&&e.type==='Deposit'))&&(!s||(e.client||'').toLowerCase().includes(s)||(e.staff||'').toLowerCase().includes(s)||(e.note||'').toLowerCase().includes(s)));
  const tbody=document.getElementById('ledger-body');
  if(!f.length){tbody.innerHTML='<tr><td colspan="11"><div class="empty-state"><div class="es-text">No entries match filters</div></div></td></tr>';document.getElementById('ledger-count').textContent='';return;}
  tbody.innerHTML=f.map(e=>`<tr>
    <td class="td-mono">${fmtDate(e.date)}</td><td>${typeBadge(e.type)}</td>
    <td><span class="badge badge-full badge-small">${e.payType==='-'?'—':e.payType}</span></td>
    <td class="text-secondary">${e.service==='-'?'—':e.service}</td>
    <td><strong>${partyText(e)}</strong></td><td>${staffBadge(e.staff)}</td>
    <td class="td-right td-mono">${e.cash>0?fmt(e.cash):'<span class="text-muted">—</span>'}</td>
    <td class="td-right td-mono">${e.tf>0?fmt(e.tf):'<span class="text-muted">—</span>'}</td>
    <td class="td-right td-mono"><strong class="${amountClass(isRevenueEntry(e))}">${isRevenueEntry(e)?'+':'-'}${fmt(e.amount)}</strong></td>
    <td class="note-cell">${e.note||''}</td>
    <td><button class="del-btn" onclick="deleteEntry('${e.id}')">×</button></td>
  </tr>`).join('');
  document.getElementById('ledger-count').textContent=`Showing ${f.length} of ${DB.length} entries`;
}

function renderCashLedger() {
  const sf=document.getElementById('c-filter-staff').value, s=document.getElementById('c-search').value.toLowerCase();
  const ce=DB.filter(e=>e.cash>0&&(!sf||e.staff===sf)&&(!s||(e.client||'').toLowerCase().includes(s)||(e.staff||'').toLowerCase().includes(s)||(e.note||'').toLowerCase().includes(s)));
  let ci=0,co=0; ce.forEach(e=>{ if(isRevenueEntry(e))ci+=e.cash;else co+=e.cash; });
  document.getElementById('cash-in-total').textContent=fmt(ci);
  document.getElementById('cash-out-total').textContent=fmt(co);
  document.getElementById('cash-body').innerHTML=ce.length
    ?ce.map(e=>`<tr><td class="td-mono">${fmtDate(e.date)}</td><td>${typeBadge(e.type)}</td><td class="text-secondary">${e.service==='-'?'—':e.service}</td><td>${partyText(e)}</td><td>${staffBadge(e.staff)}</td><td class="td-right td-mono"><strong class="${amountClass(isRevenueEntry(e))}">${isRevenueEntry(e)?'+':'-'}${fmt(e.cash)}</strong></td><td class="note-cell">${e.note||''}</td></tr>`).join('')
    :'<tr><td colspan="7"><div class="empty-state"><div class="es-text">No cash transactions</div></div></td></tr>';
}

function renderAccountant() {
  let tfR=0,cR=0,tR=0,tE=0; const monthly={};
  DB.forEach(e=>{
    const monthKey = normalizeMonthKey(e.month, e.date);
    if(!monthKey)return;
    if(!monthly[monthKey])monthly[monthKey]={rev:0,dep:0,exp:0,net:0,h:0,d:0};
    if(isRevenueEntry(e)){tfR+=e.tf;cR+=e.cash;tR+=e.amount;if(isDepositEntry(e))monthly[monthKey].dep+=e.amount;else monthly[monthKey].rev+=e.amount;if(e.staff==='Harnoor')monthly[monthKey].h+=e.amount;if(e.staff==='Dikshi')monthly[monthKey].d+=e.amount;}
    else if(e.type==='Expense'){tE+=e.amount;monthly[monthKey].exp+=e.amount;}
    monthly[monthKey].net=monthly[monthKey].rev+monthly[monthKey].dep-monthly[monthKey].exp;
  });
  document.getElementById('acc-tf-rev').textContent=fmt(tfR);document.getElementById('acc-cash-rev').textContent=fmt(cR);
  document.getElementById('acc-total-rev').textContent=fmt(tR);document.getElementById('acc-total-exp').textContent=fmt(tE);
  const months=Object.keys(monthly).sort().reverse();
  document.getElementById('acc-monthly-body').innerHTML=months.length?months.map(m=>{const d=monthly[m];return`<tr><td><strong>${fmtMonth(m)}</strong></td><td class="td-right amount-positive">${fmt(d.rev)}</td><td class="td-right amount-deposit">${fmt(d.dep)}</td><td class="td-right amount-negative">${fmt(d.exp)}</td><td class="td-right"><strong class="${amountClass(d.net>=0)}">${fmt(d.net)}</strong></td><td class="td-right amount-negative">${fmt(d.h)}</td><td class="td-right amount-dikshi">${fmt(d.d)}</td></tr>`;}).join(''):'<tr><td colspan="7"><div class="empty-state"><div class="es-text">No data</div></div></td></tr>';
  const ae=DB.filter(e=>e.tf>0||e.type==='Expense'||e.type==='Withdrawal');
  document.getElementById('acc-body').innerHTML=ae.length?ae.map(e=>`<tr><td class="td-mono">${fmtDate(e.date)}</td><td>${typeBadge(e.type)}</td><td class="text-secondary">${e.service==='-'?'—':e.service}</td><td>${partyText(e)}</td><td>${staffBadge(e.staff)}</td><td class="td-right td-mono">${e.tf>0?fmt(e.tf):'—'}</td><td class="td-right td-mono"><strong>${fmt(e.amount)}</strong></td><td class="note-cell">${e.note||''}</td></tr>`).join(''):'<tr><td colspan="8"><div class="empty-state"><div class="es-text">No transfer transactions</div></div></td></tr>';
}
