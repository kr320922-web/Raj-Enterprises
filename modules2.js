/* ---------- Helpers ---------- */
const TODAY = () => new Date().toISOString().slice(0, 10);
const fld = (k, l, t = 'text', v = '', c = '') => `<div class="${c}"><label>${l}</label><input id="f_${k}" type="${t}" value="${esc(v)}"></div>`;
const val = k => document.getElementById('f_' + k).value.trim();
const ferr = t => document.getElementById('f_err').textContent = t;
const mact = (fn, l = 'Save') => `<div class="err" id="f_err"></div><div class="mact"><button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn" onclick="${fn}">${l}</button></div>`;
const sel = (k, l, opts) => `<div class="full"><label>${l}</label><select id="f_${k}">${opts.map(o => `<option value="${o[0]}">${esc(o[1])}</option>`).join('')}</select></div>`;
const mkey = off => { const d = new Date(); let y = d.getFullYear(), m = d.getMonth() + 1 - off; if (m < 1) { m += 12; y--; } return y + '-' + String(m).padStart(2, '0'); };
const tbl = (h, rows, empty) => `<div class="panel" style="overflow-x:auto"><table><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr>${rows.join('') || `<tr><td colspan="${h.length}">${empty}</td></tr>`}</table></div>`;

/* ---------- Customers ---------- */
let CQ = '';
VIEWS.customers = () => {
  const bills = load('bills', []), cs = load('customers', []).filter(c => (c.name + c.mobile).toLowerCase().includes(CQ.toLowerCase()));
  return `<div class="toolbar"><input id="cq" placeholder="Search by name or mobile" value="${esc(CQ)}" oninput="CQ=this.value;refreshKeep('cq')"><button class="btn" onclick="editCust()">+ Add customer</button></div>` +
    tbl(['Name', 'Mobile', 'Total purchases', 'Balance due', ''], cs.map(c => `<tr><td>${esc(c.name)}</td><td>${c.mobile}</td><td>${rs(bills.filter(b => b.cid === c.id).reduce((s, b) => s + b.total, 0))}</td>
     <td>${c.due > 0 ? `<span class="tag due">${rs(c.due)}</span>` : '-'}</td><td style="white-space:nowrap"><button class="sm" onclick="profile(${c.id})">Profile</button> <button class="sm" onclick="editCust(${c.id})">Edit</button></td></tr>`), 'No customers found.');
};
function editCust(id) {
  const c = load('customers', []).find(x => x.id === id) || { name: '', mobile: '' };
  openModal(`<h2>${id ? 'Edit' : 'Add'} customer</h2><div class="fg">${fld('name', 'Customer name', 'text', c.name, 'full')}${fld('mobile', 'Mobile number', 'tel', c.mobile, 'full')}</div>${mact(`saveCust(${id || 0})`)}`);
}
function saveCust(id) {
  const n = val('name'), m = val('mobile');
  if (n.length < 2) return ferr('Enter the customer name.');
  if (!/^\d{10}$/.test(m)) return ferr('Enter a 10-digit mobile number.');
  const l = load('customers', []), c = l.find(x => x.id === id);
  c ? Object.assign(c, { name: n, mobile: m }) : l.push({ id: Math.max(0, ...l.map(x => x.id)) + 1, name: n, mobile: m, due: 0 });
  save('customers', l); closeModal(); go(CUR); toast('Saved successfully');
}
function profile(id) {
  const c = load('customers', []).find(x => x.id === id), bs = load('bills', []).filter(b => b.cid === id).reverse();
  const sum = k => rs(bs.filter(b => b.date.startsWith(mkey(k))).reduce((s, b) => s + b.total, 0));
  openModal(`<h2>${esc(c.name)}</h2><p style="color:var(--muted);margin-bottom:14px">${c.mobile}</p>
   <div class="sum"><span>This month purchases</span><span>${sum(0)}</span></div><div class="sum"><span>Previous month purchases</span><span>${sum(1)}</span></div><div class="sum t"><span>Balance due</span><span>${rs(c.due)}</span></div>
   <h2 style="font-size:1.1rem;margin-top:16px">Purchase history</h2><table><tr><th>Invoice</th><th>Date</th><th>Items</th><th>Total</th></tr>
   ${bs.map(b => `<tr><td>${b.id}</td><td>${b.date}</td><td>${(b.items || []).map(i => esc(i.name) + ' x' + i.qty).join(', ') || '-'}</td><td>${rs(b.total)}</td></tr>`).join('') || '<tr><td colspan="4">No purchases yet.</td></tr>'}</table>
   <div class="mact"><button class="btn" onclick="closeModal()">Close</button></div>`);
}

/* ---------- Payments and udhaar ---------- */
VIEWS.payments = () => {
  const cs = load('customers', []), bills = load('bills', []), pays = load('payments', []), due = cs.reduce((s, c) => s + c.due, 0);
  return `<div class="stats"><div class="stat bad"><span>Total udhaar pending</span><b>${rs(due)}</b></div><div class="stat"><span>Customers with balance</span><b>${cs.filter(c => c.due > 0).length}</b></div></div>` +
    tbl(['Customer', 'Total purchases', 'Total paid', 'Remaining balance', ''], cs.map(c => {
      const bp = bills.filter(b => b.cid === c.id), paid = bp.reduce((s, b) => s + (b.paid || 0), 0) + pays.filter(p => p.cid === c.id).reduce((s, p) => s + p.amt, 0);
      return `<tr><td>${esc(c.name)}</td><td>${rs(bp.reduce((s, b) => s + b.total, 0))}</td><td>${rs(paid)}</td><td>${c.due > 0 ? `<span class="tag due">${rs(c.due)}</span>` : '-'}</td><td>${c.due > 0 ? `<button class="sm" onclick="payForm(${c.id})">Receive payment</button>` : ''}</td></tr>`;
    }), 'No customers yet.') +
    `<h2 style="margin:6px 0 12px;font-size:1.1rem">Payment history</h2>` + tbl(['Date', 'Customer', 'Mode', 'Amount'], pays.slice().reverse().slice(0, 15).map(p => `<tr><td>${p.date}</td><td>${esc(p.name)}</td><td>${p.mode}</td><td>${rs(p.amt)}</td></tr>`), 'No payments received yet.');
};
function payForm(id) {
  const c = load('customers', []).find(x => x.id === id);
  openModal(`<h2>Receive payment</h2><p style="color:var(--muted)">${esc(c.name)} owes ${rs(c.due)}. Partial payments are allowed.</p><div class="fg">${fld('amt', 'Amount (₹)', 'number', c.due, 'full')}${sel('mode', 'Mode', [['Cash', 'Cash'], ['UPI', 'UPI']])}</div>${mact(`savePay(${id})`, 'Save payment')}`);
}
function savePay(id) {
  const l = load('customers', []), c = l.find(x => x.id === id), a = +val('amt');
  if (!(a > 0) || a > c.due) return ferr('Enter an amount between 1 and ' + c.due + '.');
  c.due -= a; save('customers', l);
  const p = load('payments', []); p.push({ cid: id, name: c.name, date: TODAY(), amt: a, mode: val('mode') || document.getElementById('f_mode').value }); save('payments', p);
  closeModal(); go(CUR); toast('Saved successfully');
}

/* ---------- Inventory, expiry, reorder, returns ---------- */
VIEWS.inventory = () => {
  const ps = load('products', []), t = TODAY(), soon = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), rt = load('returns', []);
  const st = p => !p.exp ? '-' : p.exp < t ? '<span class="tag low">Expired</span>' : p.exp <= soon ? '<span class="tag due">Expires ' + p.exp + '</span>' : p.exp;
  const low = ps.filter(p => p.qty <= p.min);
  return `<div class="stats"><div class="stat"><span>Stock value (at cost)</span><b>${rs(ps.reduce((s, p) => s + p.qty * p.buy, 0))}</b></div><div class="stat warn"><span>Items to reorder</span><b>${low.length}</b></div>
   <div class="stat bad"><span>Expired or expiring soon</span><b>${ps.filter(p => p.exp && p.exp <= soon).length}</b></div></div>` +
    '<h2 style="margin-bottom:12px;font-size:1.1rem">Stock</h2>' + tbl(['Product', 'In stock', 'Stock value', 'Expiry', ''], ps.map(p => `<tr><td>${esc(p.name)}</td><td>${p.qty <= p.min ? `<span class="tag low">${p.qty}</span>` : p.qty}</td><td>${rs(p.qty * p.buy)}</td><td>${st(p)}</td><td><button class="sm" onclick="stockForm(${p.id})">Add stock</button></td></tr>`), '') +
    '<h2 style="margin:6px 0 12px;font-size:1.1rem">Smart reorder list</h2>' + tbl(['Product', 'In stock', 'Minimum', 'Suggested order'], low.map(p => `<tr><td>${esc(p.name)}</td><td>${p.qty}</td><td>${p.min}</td><td><b>${Math.max(p.min * 2 - p.qty, 1)}</b></td></tr>`), 'Nothing to reorder right now.') +
    `<div class="toolbar" style="margin-top:6px"><h2 style="flex:1;font-size:1.1rem">Product returns</h2><button class="btn" onclick="retForm()">+ Record return</button></div>` +
    tbl(['Date', 'Product', 'Qty', 'Refund'], rt.slice().reverse().slice(0, 10).map(r => `<tr><td>${r.date}</td><td>${esc(r.name)}</td><td>${r.qty}</td><td>${rs(r.amt)}</td></tr>`), 'No returns recorded.');
};
function stockForm(id) { const p = prod(id); openModal(`<h2>Add stock</h2><p style="color:var(--muted)">${esc(p.name)} (now ${p.qty})</p><div class="fg">${fld('q', 'Quantity received', 'number', '', 'full')}</div>${mact(`saveStock(${id})`)}`); }
function saveStock(id) { const q = +val('q'); if (!(q > 0)) return ferr('Enter a quantity above 0.'); const l = load('products', []); l.find(x => x.id === id).qty += q; save('products', l); closeModal(); go(CUR); toast('Saved successfully'); }
function retForm() { openModal(`<h2>Record return</h2><div class="fg">${sel('p', 'Product', load('products', []).map(p => [p.id, p.name]))}${fld('q', 'Quantity returned', 'number', 1, 'full')}</div>${mact('saveRet()', 'Save return')}`); }
function saveRet() {
  const q = +val('q'), l = load('products', []), p = l.find(x => x.id === +document.getElementById('f_p').value);
  if (!(q > 0)) return ferr('Enter a quantity above 0.');
  p.qty += q; save('products', l); const r = load('returns', []); r.push({ date: TODAY(), name: p.name, qty: q, amt: q * p.sell }); save('returns', r); closeModal(); go(CUR); toast('Saved successfully');
}

/* ---------- Rate history ---------- */
let RP = 0;
VIEWS.rates = () => {
  const ps = load('products', []); if (!RP) RP = ps[0].id;
  const p = ps.find(x => x.id === +RP), rl = load('rates', []).filter(r => r.pid === +RP);
  if (!rl.length || rl[rl.length - 1].sell !== p.sell) rl.push({ date: rl.length ? TODAY() : 'Current', buy: p.buy, sell: p.sell });
  return `<div class="toolbar"><select onchange="RP=this.value;go('rates')">${ps.map(x => `<option value="${x.id}" ${x.id === +RP ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` +
    tbl(['Date', 'Purchase rate', 'Selling rate', 'Approx. margin', 'Selling price change'], rl.map((r, i) => { const d = i ? r.sell - rl[i - 1].sell : 0;
      return `<tr><td>${r.date}</td><td>${rs(r.buy)}</td><td>${rs(r.sell)}</td><td>${Math.round((r.sell - r.buy) / r.sell * 100)}%</td><td>${d ? `<span class="tag ${d > 0 ? 'low' : ''}">${d > 0 ? '+' : '-'}${rs(Math.abs(d))}</span>` : '-'}</td></tr>`; }).reverse(), '');
};

/* ---------- Suppliers ---------- */
VIEWS.suppliers = () => {
  let sp = load('suppliers', null); if (!sp) { sp = [{ id: 1, name: 'Sharma Wholesale', phone: '9815012345', item: 'Grocery' }, { id: 2, name: 'Punjab Dairy Traders', phone: '9876012345', item: 'Dairy' }]; save('suppliers', sp); }
  return `<div class="toolbar"><button class="btn" onclick="supForm()">+ Add supplier</button><button class="btn sec" onclick="purForm()">+ Record purchase</button></div>` +
    tbl(['Supplier', 'Phone', 'Supplies'], sp.map(s => `<tr><td>${esc(s.name)}</td><td>${s.phone}</td><td>${esc(s.item)}</td></tr>`), '') +
    '<h2 style="margin:6px 0 12px;font-size:1.1rem">Purchase records</h2>' + tbl(['Date', 'Supplier', 'Product', 'Qty', 'Rate', 'Total'], load('purch', []).slice().reverse().map(p => `<tr><td>${p.date}</td><td>${esc(p.sup)}</td><td>${esc(p.name)}</td><td>${p.qty}</td><td>${rs(p.rate)}</td><td>${rs(p.qty * p.rate)}</td></tr>`), 'No purchases recorded yet.');
};
function supForm() { openModal(`<h2>Add supplier</h2><div class="fg">${fld('n', 'Supplier name', 'text', '', 'full')}${fld('ph', 'Phone', 'tel', '', 'full')}${fld('it', 'Supplies (e.g. Grocery)', 'text', '', 'full')}</div>${mact('saveSup()')}`); }
function saveSup() { if (val('n').length < 2) return ferr('Enter the supplier name.'); const l = load('suppliers', []); l.push({ id: Math.max(0, ...l.map(x => x.id)) + 1, name: val('n'), phone: val('ph'), item: val('it') || '-' }); save('suppliers', l); closeModal(); go(CUR); toast('Saved successfully'); }
function purForm() { openModal(`<h2>Record purchase</h2><div class="fg">${sel('s', 'Supplier', load('suppliers', []).map(s => [s.id, s.name]))}${sel('p', 'Product', load('products', []).map(p => [p.id, p.name]))}${fld('q', 'Quantity', 'number')}${fld('r', 'Purchase rate (₹)', 'number')}</div>${mact('savePur()', 'Save purchase')}`); }
function savePur() {
  const q = +val('q'), r = +val('r'), l = load('products', []), p = l.find(x => x.id === +document.getElementById('f_p').value), s = load('suppliers', []).find(x => x.id === +document.getElementById('f_s').value);
  if (!(q > 0) || !(r > 0)) return ferr('Enter quantity and rate above 0.');
  if (p.buy !== r) { p.buy = r; logRate(p.id, p); } p.qty += q; save('products', l);
  const h = load('purch', []); h.push({ date: TODAY(), sup: s.name, name: p.name, qty: q, rate: r }); save('purch', h); closeModal(); go(CUR); toast('Saved successfully');
}

/* ---------- Reports and expenses ---------- */
VIEWS.reports = () => {
  const bills = load('bills', []), ps = load('products', []), ex = load('expenses', []), mk = mkey(0);
  const days = []; for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().slice(0, 10)); }
  const mb = bills.filter(b => b.date.startsWith(mk)), buy = n => (ps.find(p => p.name === n) || { buy: 0 }).buy;
  const profit = mb.reduce((s, b) => s + (b.items ? b.items.reduce((a, i) => a + i.qty * (i.rate - buy(i.name)), 0) - (b.disc || 0) : 0), 0);
  const exp = ex.filter(e => e.date.startsWith(mk)).reduce((s, e) => s + e.amt, 0);
  const pw = {}; bills.forEach(b => (b.items || []).forEach(i => { pw[i.name] = pw[i.name] || { q: 0, a: 0 }; pw[i.name].q += i.qty; pw[i.name].a += i.qty * i.rate; }));
  const monthRows = [5,4,3,2,1,0].map(k=>({label:mkey(k),value:bills.filter(b=>b.date.startsWith(mkey(k))).reduce((a,b)=>a+b.total,0)}));
  const dailyRows = days.slice().reverse().map(d=>({label:d.slice(5),value:bills.filter(b=>b.date===d).reduce((a,b)=>a+b.total,0)}));
  const topRows = Object.entries(pw).sort((a,b)=>b[1].a-a[1].a).slice(0,6).map(([name,x])=>({label:name,value:x.a}));
  const paymentRows = ['Cash','UPI','Credit'].map(mode=>({label:mode,value:bills.filter(b=>b.mode===mode).reduce((a,b)=>a+b.total,0)}));
  const graphs = `<div class="reportgrid">
     <div class="panel"><h2>Daily sales · last 7 days</h2>${reportBars(dailyRows)}</div>
     <div class="panel"><h2>Monthly sales · last 6 months</h2>${reportBars(monthRows)}</div>
     <div class="panel"><h2>Top products by revenue</h2>${reportBars(topRows)}</div>
     <div class="panel"><h2>Payment modes</h2>${reportBars(paymentRows)}</div>
   </div>`;
  const h = t => `<h2 style="margin:6px 0 12px;font-size:1.1rem">${t}</h2>`;
  return `<div class="stats"><div class="stat"><span>This month's sales</span><b>${rs(mb.reduce((s, b) => s + b.total, 0))}</b></div><div class="stat"><span>Estimated profit</span><b>${rs(profit)}</b></div>
   <div class="stat warn"><span>Expenses this month</span><b>${rs(exp)}</b></div><div class="stat"><span>Net profit after expenses</span><b>${rs(profit - exp)}</b></div></div>` +
    graphs + h('Daily sales (last 7 days)') + tbl(['Date', 'Bills', 'Sales'], days.map(d => { const b = bills.filter(x => x.date === d); return `<tr><td>${d}</td><td>${b.length}</td><td>${rs(b.reduce((s, x) => s + x.total, 0))}</td></tr>`; }), '') +
    h('Monthly sales') + tbl(['Month', 'Bills', 'Sales'], [0, 1, 2].map(k => { const b = bills.filter(x => x.date.startsWith(mkey(k))); return `<tr><td>${mkey(k)}</td><td>${b.length}</td><td>${rs(b.reduce((s, x) => s + x.total, 0))}</td></tr>`; }), '') +
    h('Product-wise sales') + tbl(['Product', 'Units sold', 'Sales'], Object.entries(pw).sort((a, b) => b[1].a - a[1].a).map(e => `<tr><td>${esc(e[0])}</td><td>${e[1].q}</td><td>${rs(e[1].a)}</td></tr>`), 'Product-wise data appears after you create bills.') +
    h('Stock report') + tbl(['Total products', 'Total units', 'Stock value', 'Low stock'], [`<tr><td>${ps.length}</td><td>${ps.reduce((s, p) => s + p.qty, 0)}</td><td>${rs(ps.reduce((s, p) => s + p.qty * p.buy, 0))}</td><td>${ps.filter(p => p.qty <= p.min).length}</td></tr>`], '') +
    `<div class="toolbar"><h2 style="flex:1;font-size:1.1rem">Expenses</h2><button class="btn" onclick="expForm()">+ Add expense</button></div>` + tbl(['Date', 'Expense', 'Amount'], ex.slice().reverse().slice(0, 10).map(e => `<tr><td>${e.date}</td><td>${esc(e.title)}</td><td>${rs(e.amt)}</td></tr>`), 'No expenses recorded.') +
    '<p style="color:var(--muted);font-size:.85rem">Profit is estimated from selling rate minus current purchase rate, and only for bills created in this app.</p>';
};
function expForm() { openModal(`<h2>Add expense</h2><div class="fg">${fld('t', 'Expense (e.g. Shop rent, Electricity)', 'text', '', 'full')}${fld('a', 'Amount (₹)', 'number', '', 'full')}</div>${mact('saveExp()')}`); }
function saveExp() { const a = +val('a'); if (!val('t') || !(a > 0)) return ferr('Enter the expense name and an amount above 0.'); const l = load('expenses', []); l.push({ date: TODAY(), title: val('t'), amt: a }); save('expenses', l); closeModal(); go(CUR); toast('Saved successfully'); }

function reportBars(rows){
  const max=Math.max(1,...rows.map(r=>r.value));
  if(!rows.length||rows.every(r=>r.value===0))return '<p class="help">No sales recorded yet. Graphs update when you create bills.</p>';
  return `<div class="reportbars">${rows.map(r=>`<div class="reportbarrow"><span title="${esc(r.label)}">${esc(r.label)}</span><div class="reporttrack"><div class="reportfill" style="width:${Math.max(0,r.value/max*100)}%"></div></div><b>${rs(r.value)}</b></div>`).join('')}</div>`;
}
