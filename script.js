/* Store name used across the app (invoices, headers) */
const store = () => JSON.parse(localStorage.getItem('ds_store') || 'null') || { name: 'Raj Enterprises', address: 'Ludhiana, Punjab', phone: '', gstin: '' };
/* Redirect to login if not signed in */
const SESSION = JSON.parse(localStorage.getItem('ds_session') || 'null');
if (!SESSION || SESSION.name !== 'Jatin Arora') { location.replace('login.html'); throw new Error('Admin login required'); }

/* ---------- Data layer (LocalStorage) ---------- */
const K = 'ds_';
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(K + k)) || d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(K + k, JSON.stringify(v));
const rs = n => '₹' + Math.round(n).toLocaleString('en-IN');

function seed() {
  if (localStorage.getItem(K + 'seeded')) return;
  save('products', [
    ['Aashirvaad Atta 5kg','Grocery',42,10,215,248],['Tata Salt 1kg','Grocery',65,15,22,28],
    ['Fortune Sunflower Oil 1L','Grocery',8,12,128,149],['Basmati Rice 5kg','Grocery',20,8,420,499],
    ['Amul Butter 500g','Dairy',6,10,250,285],['Parle-G Biscuits','Snacks',90,30,8,10],
    ['Maggi Noodles 12-pack','Snacks',34,12,138,168],['Surf Excel 1kg','Household',4,8,118,140],
    ['Dettol Soap 3-pack','Personal Care',27,10,96,120],['Colgate Toothpaste 200g','Personal Care',18,10,88,110],
    ['Red Label Tea 500g','Beverages',15,8,230,265],['Britannia Bread','Bakery',3,10,35,45]
  ].map((p, i) => ({ id: i + 1, name: p[0], cat: p[1], qty: p[2], min: p[3], buy: p[4], sell: p[5] })));
  save('customers', [
    { id: 1, name: 'Ramesh Kumar', mobile: '9876543210', due: 1850 },
    { id: 2, name: 'Sunita Sharma', mobile: '9812345678', due: 640 },
    { id: 3, name: 'Gurpreet Singh', mobile: '9988776655', due: 0 },
    { id: 4, name: 'Anita Verma', mobile: '9876501234', due: 2300 }]);
  const amounts = [[2450, 1820, 960], [3120, 740], [1890, 2210, 1340], [4010, 1560], [2760, 980, 1430], [3550, 2290], [1980, 2640, 870]];
  const bills = []; let n = 1001;
  amounts.forEach((day, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    day.forEach(t => bills.push({ id: 'INV-' + n++, date: d.toISOString().slice(0, 10), total: t, mode: ['Cash', 'Credit'][n % 3] }));
  });
  save('bills', bills);
  localStorage.setItem(K + 'seeded', '1');
}

/* ---------- Line icons ---------- */
const P = {
  dashboard:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  products:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  inventory:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  billing:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  customers:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14c2.5.6 4 2.4 4 6"/>',
  payments:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  rates:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  suppliers:'<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  reports:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  settings:'<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  rupee:'<path d="M7 5h10M7 9h10M7 5c6 0 6 8 0 8l7 7"/>',
  alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'
};
const ico = k => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;

/* ---------- Modules ---------- */
const MODULES = [
  ['dashboard', 'Dashboard'], ['products', 'Products'], ['inventory', 'Inventory'],
  ['billing', 'Billing'], ['customers', 'Customers'], ['payments', 'Payments'],
  ['history', 'Bill History'], ['rates', 'Rate History'], ['suppliers', 'Suppliers'],
  ['reports', 'Reports'], ['settings', 'Settings']
];

function dashboard() {
  const products = load('products', []), customers = load('customers', []), bills = load('bills', []);
  const totalSales = bills.reduce((s, b) => s + b.total, 0);
  const low = products.filter(p => p.qty <= p.min);
  const dues = customers.filter(c => c.due > 0).sort((a, b) => b.due - a.due);
  const pending = dues.reduce((s, c) => s + c.due, 0);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), amt: bills.filter(b => b.date === key).reduce((s, b) => s + b.total, 0) });
  }
  const max = Math.max(...days.map(d => d.amt), 1);
  const todayKey = new Date().toISOString().slice(0, 10), tb = bills.filter(b => b.date === todayKey);
  const todaySales = tb.reduce((s, b) => s + b.total, 0), todayBills = tb.length;
  const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const rec = bills.slice(-5).reverse(), pw = {};
  bills.forEach(b => (b.items || []).forEach(i => pw[i.name] = (pw[i.name] || 0) + i.qty));
  const top = Object.entries(pw).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const extra = `<div class="cols"><div class="panel"><h2>Recent bills</h2><table><tr><th>Invoice</th><th>Customer</th><th>Mode</th><th>Total</th></tr>
    ${rec.map(b => `<tr><td>${b.id}</td><td>${esc(b.cust || 'Walk-in')}</td><td>${b.mode}</td><td>${rs(b.total)}</td></tr>`).join('')}</table></div>
    <div class="panel"><h2>Top selling products</h2><table><tr><th>Product</th><th>Units</th></tr>
    ${top.map(t => `<tr><td>${esc(t[0])}</td><td><span class="tag ok">${t[1]}</span></td></tr>`).join('') || '<tr><td colspan="2">Appears after you create bills.</td></tr>'}</table></div></div>`;
  return `
  <div class="banner"><div><h2>Welcome, Jatin Arora</h2>
    <p>Today you have ${rs(todaySales)} in sales from ${todayBills} bills.${low.length ? ' ' + low.length + ' items are running low on stock.' : ' All items are well stocked.'}</p></div>
    <button class="btn" onclick="go('billing')">Start a new bill</button></div>
  <div class="stats">
    <div class="stat"><div class="ic">${ico('rupee')}</div><span>Total sales</span><b>${rs(totalSales)}</b><small>All recorded bills</small></div>
    <div class="stat"><div class="ic">${ico('products')}</div><span>Total products</span><b>${products.length}</b><small>${new Set(products.map(p => p.cat)).size} categories</small></div>
    <div class="stat"><div class="ic">${ico('billing')}</div><span>Total bills</span><b>${bills.length}</b><small>${todayBills} created today</small></div>
    <div class="stat warn"><div class="ic">${ico('alert')}</div><span>Low-stock alerts</span><b>${low.length}</b><small>Items to reorder</small></div>
    <div class="stat bad"><div class="ic">${ico('payments')}</div><span>Pending payments</span><b>${rs(pending)}</b><small>${dues.length} customers owe you</small></div>
  </div>
  <div class="cols">
    <div class="panel"><h2>Sales overview (last 7 days)</h2>
      <div class="chart">${days.map(d => `<div class="${d.amt === max ? 'best' : ''}"><em>${rs(d.amt)}</em><i style="height:${Math.max(d.amt / max * 78, 3)}%"></i>${d.label}</div>`).join('')}</div></div>
    <div>
      <div class="panel"><h2>Low-stock alerts</h2><table><tr><th>Product</th><th>Stock</th></tr>
        ${low.map(p => `<tr><td>${p.name}</td><td><span class="tag low">${p.qty} left (min ${p.min})</span></td></tr>`).join('') || '<tr><td colspan="2">All products are well stocked.</td></tr>'}</table></div>
      <div class="panel"><h2>Pending payments (udhaar)</h2><table><tr><th>Customer</th><th>Balance</th></tr>
        ${dues.map(c => `<tr><td>${c.name}</td><td><span class="tag due">${rs(c.due)}</span></td></tr>`).join('') || '<tr><td colspan="2">No pending payments.</td></tr>'}</table></div>
    </div>
  </div>
  ${extra}`;
}

function settings() {
  const st = store(), f = (k, l, v) => `<div><label>${l}</label><input id="s_${k}" value="${esc(v)}"></div>`;
  return `<div class="panel"><h2>Shop profile</h2><p style="color:var(--muted);margin-bottom:6px">These details appear on the sidebar and on every PDF invoice.</p>
  <div class="fg">${f('name', 'Shop name', st.name)}${f('phone', 'Phone number', st.phone)}${f('address', 'Address', st.address)}${f('gstin', 'GSTIN (optional)', st.gstin)}</div>
  <div class="mact" style="justify-content:flex-start"><button class="btn" onclick="saveStore()">Save shop profile</button></div></div>
  <div class="panel"><h2>About storage</h2><p style="color:var(--muted)">Store information is saved locally in this browser. Keep a backup before clearing browser data.</p></div>`;
}
function saveStore() {
  const g = k => document.getElementById('s_' + k).value.trim();
  if (!g('name')) return toast('Enter the shop name.');
  localStorage.setItem('ds_store', JSON.stringify({ name: g('name'), phone: g('phone'), address: g('address'), gstin: g('gstin') }));
  applyBrand(); toast('Shop profile saved');
}

function comingSoon(name) {
  return `<div class="panel soon"><h2>${name}</h2><p>This module will be built in the next phase.</p></div>`;
}

/* ---------- Routing ---------- */
const SUB = { dashboard: 'A quick look at your store today', products: 'Manage items, prices and stock levels', inventory: 'Stock value, expiry, reorder and returns', billing: 'Create bills and download PDF invoices', customers: 'Customer details and purchase history', payments: 'Udhaar, partial payments and ledger', history: 'Search and reprint previous bills', rates: 'Purchase and selling price changes', suppliers: 'Suppliers and stock purchases', reports: 'Sales, profit, stock and expenses', settings: 'Shop profile and preferences' };
function applyBrand() { const st = store(); document.getElementById('brand').innerHTML = st.name + '<small>Store Management System</small>'; const sidebarName = document.getElementById('sbname'); if (sidebarName) sidebarName.textContent = st.name; document.title = st.name + ' | Store Management'; }
let CUR = 'dashboard';
function go(id) {
  CUR = (MODULES.find(x => x[0] === id) || MODULES[0])[0];
  const m = MODULES.find(x => x[0] === id) || MODULES[0];
  document.getElementById('title').textContent = m[1];
  document.getElementById('view').innerHTML = m[0] === 'dashboard' ? dashboard() : m[0] === 'settings' ? settings() : VIEWS[m[0]] ? VIEWS[m[0]]() : comingSoon(m[1]);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.id === m[0]));
  document.getElementById('subt').textContent = SUB[m[0]] || '';
  if (m[0] === 'billing') drawCart();
  document.getElementById('side').classList.remove('open');
  window.history.replaceState(null, '', '#' + m[0]);
}

seed();
applyBrand();
document.getElementById('nav').innerHTML = MODULES.map(m => `<button data-id="${m[0]}">${ico(m[0])}${m[1]}</button>`).join('');
document.querySelectorAll('#nav button').forEach(b => b.onclick = () => go(b.dataset.id));
document.getElementById('modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
document.getElementById('menu').onclick = () => document.getElementById('side').classList.toggle('open');
document.getElementById('today').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const u = document.getElementById('user'); u.textContent = 'Jatin Arora'; u.dataset.i = 'JA';
document.getElementById('logout').onclick = () => { localStorage.removeItem('ds_session'); location.href = 'login.html'; };
