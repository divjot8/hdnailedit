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
  if(!ym)return''; const[y,m]=ym.split('-');
  return['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]+' '+y;
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

function refreshDashboard() {
  let cashHand=0,cashBank=0,totalRev=0,totalExp=0,totalWith=0,fullTf=0,fullCash=0,deps=0;
  let hRev=0,hCash=0,hTf=0,hWith=0,dRev=0,dCash=0,dTf=0,dWith=0;
  const monthly={};
  DB.forEach(e=>{
    const isInc=isRevenueEntry(e);
    if(!monthly[e.month])monthly[e.month]={rev:0,exp:0,cash:0,tf:0,count:0};
    monthly[e.month].count++;
    if(isInc){
      totalRev+=e.amount;cashHand+=e.cash;cashBank+=e.tf;
      monthly[e.month].rev+=e.amount;monthly[e.month].cash+=e.cash;monthly[e.month].tf+=e.tf;
      if(isDepositEntry(e))deps+=e.amount;else{fullTf+=e.tf;fullCash+=e.cash;}
      if(e.staff==='Harnoor'){hRev+=e.amount;hCash+=e.cash;hTf+=e.tf;}
      if(e.staff==='Dikshi'){dRev+=e.amount;dCash+=e.cash;dTf+=e.tf;}
    }else if(e.type==='Expense'){totalExp+=e.amount;cashHand-=e.cash;cashBank-=e.tf;monthly[e.month].exp+=e.amount;}
    else if(e.type==='Withdrawal'){
      totalWith+=e.amount;cashHand-=e.cash;cashBank-=e.tf;
      if(e.staff==='Harnoor')hWith+=e.amount;
      if(e.staff==='Dikshi')dWith+=e.amount;
    }
  });
  const totalBiz=cashHand+cashBank, net=totalRev-totalExp;
  document.getElementById('sb-balance').textContent=fmt(totalBiz);
  document.getElementById('m-cash-hand').textContent=fmt(cashHand);
  document.getElementById('m-cash-bank').textContent=fmt(cashBank);
  document.getElementById('m-total-biz').textContent=fmt(totalBiz);
  document.getElementById('m-withdrawals').textContent=fmt(totalWith);
  document.getElementById('m-total-rev').textContent=fmt(totalRev);
  document.getElementById('m-total-exp').textContent=fmt(totalExp);
  const np=document.getElementById('m-net-profit');
  np.textContent=fmt(net);np.className='mc-value '+(net>=0?'positive':'negative');
  document.getElementById('d-full-tf').textContent=fmt(fullTf);
  document.getElementById('d-full-cash').textContent=fmt(fullCash);
  document.getElementById('d-deps').textContent=fmt(deps);
  document.getElementById('d-exp-neg').textContent=fmt(totalExp);
  const dn=document.getElementById('d-net');dn.textContent=fmt(net);dn.className='dr-val '+(net>=0?'pos':'neg');
  ['d-h-rev','d-h-cash','d-h-tf','d-h-with'].forEach((id,i)=>document.getElementById(id).textContent=fmt([hRev,hCash,hTf,hWith][i]));
  ['d-d-rev','d-d-cash','d-d-tf','d-d-with'].forEach((id,i)=>document.getElementById(id).textContent=fmt([dRev,dCash,dTf,dWith][i]));
  const months=Object.keys(monthly).sort().reverse().slice(0,12);
  document.getElementById('monthly-body').innerHTML=months.length
    ?months.map(m=>{const d=monthly[m];d.net=d.rev-d.exp;return`<tr>
      <td><strong>${fmtMonth(m)}</strong></td>
      <td class="td-right amount-positive">${fmt(d.rev)}</td>
      <td class="td-right amount-negative">${fmt(d.exp)}</td>
      <td class="td-right"><strong class="${amountClass(d.net>=0)}">${fmt(d.net)}</strong></td>
      <td class="td-right">${fmt(d.cash)}</td>
      <td class="td-right">${fmt(d.tf)}</td>
      <td class="td-right month-count">${d.count}</td>
    </tr>`;}).join('')
    :'<tr><td colspan="7"><div class="empty-state"><div class="es-text">No data yet</div></div></td></tr>';
  if(DB.length)document.getElementById('dash-updated').textContent=`${DB.length} entries · ${new Date().toLocaleTimeString()}`;
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
    if(!monthly[e.month])monthly[e.month]={rev:0,dep:0,exp:0,net:0,h:0,d:0};
    if(isRevenueEntry(e)){tfR+=e.tf;cR+=e.cash;tR+=e.amount;if(isDepositEntry(e))monthly[e.month].dep+=e.amount;else monthly[e.month].rev+=e.amount;if(e.staff==='Harnoor')monthly[e.month].h+=e.amount;if(e.staff==='Dikshi')monthly[e.month].d+=e.amount;}
    else if(e.type==='Expense'){tE+=e.amount;monthly[e.month].exp+=e.amount;}
    monthly[e.month].net=monthly[e.month].rev+monthly[e.month].dep-monthly[e.month].exp;
  });
  document.getElementById('acc-tf-rev').textContent=fmt(tfR);document.getElementById('acc-cash-rev').textContent=fmt(cR);
  document.getElementById('acc-total-rev').textContent=fmt(tR);document.getElementById('acc-total-exp').textContent=fmt(tE);
  const months=Object.keys(monthly).sort().reverse();
  document.getElementById('acc-monthly-body').innerHTML=months.length?months.map(m=>{const d=monthly[m];return`<tr><td><strong>${fmtMonth(m)}</strong></td><td class="td-right amount-positive">${fmt(d.rev)}</td><td class="td-right amount-deposit">${fmt(d.dep)}</td><td class="td-right amount-negative">${fmt(d.exp)}</td><td class="td-right"><strong class="${amountClass(d.net>=0)}">${fmt(d.net)}</strong></td><td class="td-right amount-negative">${fmt(d.h)}</td><td class="td-right amount-dikshi">${fmt(d.d)}</td></tr>`;}).join(''):'<tr><td colspan="7"><div class="empty-state"><div class="es-text">No data</div></div></td></tr>';
  const ae=DB.filter(e=>e.tf>0||e.type==='Expense'||e.type==='Withdrawal');
  document.getElementById('acc-body').innerHTML=ae.length?ae.map(e=>`<tr><td class="td-mono">${fmtDate(e.date)}</td><td>${typeBadge(e.type)}</td><td class="text-secondary">${e.service==='-'?'—':e.service}</td><td>${partyText(e)}</td><td>${staffBadge(e.staff)}</td><td class="td-right td-mono">${e.tf>0?fmt(e.tf):'—'}</td><td class="td-right td-mono"><strong>${fmt(e.amount)}</strong></td><td class="note-cell">${e.note||''}</td></tr>`).join(''):'<tr><td colspan="8"><div class="empty-state"><div class="es-text">No transfer transactions</div></div></td></tr>';
}
