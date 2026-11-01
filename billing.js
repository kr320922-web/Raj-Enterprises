/* ---------- Billing ---------- */
let CART = [], LASTBILL = null;
const prod = id => load('products', []).find(p => p.id === +id);
function calc() {
  const sub = CART.reduce((s, c) => s + c.qty * prod(c.id).sell, 0);
  const disc = sub * (+document.getElementById('disc')?.value || 0) / 100;
  const gst = (sub - disc) * (+document.getElementById('gst')?.value || 0) / 100;
  return { sub, disc, gst, total: Math.round(sub - disc + gst) };
}
VIEWS.billing = () => {
  const ps = load('products', []), cs = load('customers', []);
  const ok = LASTBILL ? `<div class="okbox"><div><b>Bill ${LASTBILL} created.</b> Stock and customer balance are updated.</div><div><button class="btn" onclick="pdfBill('${LASTBILL}')">Download PDF</button></div></div>` : '';
  return ok + `<div class="cols"><div>
   <div class="panel"><h2>Add items</h2>
    <label>Scan barcode or enter product code</label><input id="bar" placeholder="Type code (e.g. 3) or exact name, press Enter" onkeydown="if(event.key==='Enter')barAdd(this)">
    <div class="add" style="margin-top:14px"><div><label>Product</label><select id="bsel">${ps.map(p => `<option value="${p.id}">${esc(p.name)} (stock ${p.qty}) - ${rs(p.sell)}</option>`).join('')}</select></div>
    <div><label>Qty</label><input id="bqty" type="number" min="1" value="1"></div><button class="btn" onclick="addItem(document.getElementById('bsel').value,+document.getElementById('bqty').value)">Add</button></div></div>
   <div class="panel"><h2>Bill items</h2><div id="cart"></div></div></div>
   <div class="panel"><h2>Bill details</h2>
    <label>Customer</label><select id="cust"><option value="0">Walk-in customer</option>${cs.map(c => `<option value="${c.id}">${esc(c.name)} - ${c.mobile}</option>`).join('')}</select>
    <div class="fg"><div><label>Discount %</label><input id="disc" type="number" min="0" max="100" value="0" oninput="drawCart()"></div>
     <div><label>GST</label><select id="gst" onchange="drawCart()"><option value="0">No GST</option><option>5</option><option>12</option><option>18</option></select></div></div>
    <label>Payment mode</label><select id="mode" onchange="modeChange()"><option>Cash</option><option>UPI</option><option>Credit</option></select>
    <label>Amount paid now (₹)</label><input id="paid" type="number" min="0" oninput="this.dataset.m=1">
    <div id="sum" style="margin-top:16px"></div><div class="err" id="berr"></div>
    <button class="btn" style="width:100%" onclick="makeBill()">Generate bill</button></div></div>`;
};
function barAdd(el) {
  const v = el.value.trim().toLowerCase(), p = load('products', []).find(x => String(x.id) === v || x.name.toLowerCase() === v);
  if (!p) return document.getElementById('berr').textContent = 'No product found for that code.';
  addItem(p.id, 1); el.value = '';
}
function addItem(id, q) {
  if (!(q > 0)) return;
  const c = CART.find(x => x.id === +id); c ? c.qty += q : CART.push({ id: +id, qty: q }); drawCart();
}
function modeChange() { document.getElementById('paid').dataset.m = ''; drawCart(); }
function drawCart() {
  const el = document.getElementById('cart'); if (!el) return;
  el.innerHTML = CART.length ? `<table><tr><th>Item</th><th>Rate</th><th>Qty</th><th>Amount</th><th></th></tr>${CART.map((c, i) => { const p = prod(c.id); return `<tr><td>${esc(p.name)}</td><td>${rs(p.sell)}</td>
   <td><input class="qty" type="number" min="1" value="${c.qty}" onchange="CART[${i}].qty=Math.max(1,+this.value||1);drawCart()"></td><td>${rs(c.qty * p.sell)}</td><td><button class="sm del" onclick="CART.splice(${i},1);drawCart()">Remove</button></td></tr>`; }).join('')}</table>` : '<p style="color:var(--muted)">No items yet. Add products to start the bill.</p>';
  const t = calc(), mode = document.getElementById('mode').value, pd = document.getElementById('paid');
  if (!pd.dataset.m) pd.value = mode === 'Credit' ? 0 : t.total;
  document.getElementById('sum').innerHTML = `<div class="sum"><span>Subtotal</span><span>${rs(t.sub)}</span></div><div class="sum"><span>Discount</span><span>- ${rs(t.disc)}</span></div><div class="sum"><span>GST</span><span>${rs(t.gst)}</span></div><div class="sum t"><span>Total</span><span>${rs(t.total)}</span></div>`;
}
function makeBill() {
  const err = t => document.getElementById('berr').textContent = t, t = calc();
  if (!CART.length) return err('Add at least one item.');
  const products = load('products', []);
  for (const c of CART) { const p = products.find(x => x.id === c.id); if (c.qty > p.qty) return err(`Only ${p.qty} of "${p.name}" in stock.`); }
  const paid = Math.min(+document.getElementById('paid').value || 0, t.total), due = t.total - paid, cid = +document.getElementById('cust').value;
  if (due > 0 && !cid) return err('Choose a customer to record the balance (udhaar).');
  const customers = load('customers', []), cu = customers.find(c => c.id === cid), bills = load('bills', []);
  const num = Math.max(1000, ...bills.map(b => +b.id.slice(4) || 0)) + 1, now = new Date();
  const bill = { id: 'INV-' + num, date: now.toISOString().slice(0, 10), time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), cid, cust: cu ? cu.name : 'Walk-in customer',
    items: CART.map(c => { const p = prod(c.id); return { name: p.name, qty: c.qty, rate: p.sell }; }), sub: t.sub, disc: t.disc, gst: t.gst, total: t.total,
    mode: document.getElementById('mode').value, paid, due };
  CART.forEach(c => products.find(x => x.id === c.id).qty -= c.qty);
  if (cu && due > 0) cu.due += due;
  bills.push(bill); save('bills', bills); save('products', products); save('customers', customers);
  CART = []; LASTBILL = bill.id; go('billing'); pdfBill(bill.id);
}
function pdfBill(id) {
  const b = load('bills', []).find(x => x.id === id);
  if (!window.jspdf) return alert('PDF library could not load. Check your internet connection and try again.');
  const d = new window.jspdf.jsPDF(), m = n => 'Rs. ' + Number(n).toFixed(2); let y = 22;
  const st = store(); d.setFontSize(20); d.text(st.name, 14, y); d.setFontSize(10); d.text('TAX INVOICE', 196, y, { align: 'right' });
  y += 6; d.setFontSize(9); d.text([st.address, st.phone && 'Phone: ' + st.phone, st.gstin && 'GSTIN: ' + st.gstin].filter(Boolean).join('   |   '), 14, y); d.setFontSize(10);
  y += 10; d.text('Invoice: ' + b.id, 14, y); d.text('Date: ' + b.date + (b.time ? ' ' + b.time : ''), 196, y, { align: 'right' });
  y += 6; d.text('Customer: ' + b.cust, 14, y); d.text('Payment: ' + b.mode, 196, y, { align: 'right' });
  y += 8; d.line(14, y, 196, y); y += 6; d.setFont(undefined, 'bold'); d.text('Item', 14, y); d.text('Qty', 120, y, { align: 'right' }); d.text('Rate', 155, y, { align: 'right' }); d.text('Amount', 196, y, { align: 'right' }); d.setFont(undefined, 'normal');
  y += 3; d.line(14, y, 196, y);
  (b.items || [{ name: 'Items not recorded (older bill)', qty: 1, rate: b.total }]).forEach(i => { y += 8; if (y > 270) { d.addPage(); y = 20; } d.text(String(i.name), 14, y); d.text(String(i.qty), 120, y, { align: 'right' }); d.text(m(i.rate), 155, y, { align: 'right' }); d.text(m(i.qty * i.rate), 196, y, { align: 'right' }); });
  y += 6; d.line(14, y, 196, y);
  [['Subtotal', b.sub ?? b.total], ['Discount', -(b.disc || 0)], ['GST', b.gst || 0]].forEach(r => { y += 7; d.text(r[0], 150, y, { align: 'right' }); d.text(m(r[1]), 196, y, { align: 'right' }); });
  y += 9; d.setFontSize(13); d.text('Total', 150, y, { align: 'right' }); d.text(m(b.total), 196, y, { align: 'right' }); d.setFontSize(10);
  if (b.due > 0) { y += 8; d.text('Paid: ' + m(b.paid) + '   Balance due: ' + m(b.due), 196, y, { align: 'right' }); }
  y += 16; d.text('Thank you for shopping at ' + st.name + '.', 14, y);
  d.save(b.id + '.pdf');
}

/* ---------- Bill history ---------- */
let BQ = '';
VIEWS.history = () => {
  const bs = load('bills', []).filter(b => (b.id + (b.cust || '') + b.date).toLowerCase().includes(BQ.toLowerCase())).reverse();
  return `<div class="toolbar"><input id="bq" placeholder="Search by customer, invoice or date (YYYY-MM-DD)" value="${esc(BQ)}" oninput="BQ=this.value;refreshKeep('bq')"></div>
  <div class="panel" style="overflow-x:auto"><table><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Mode</th><th>Total</th><th>Balance</th><th></th></tr>
  ${bs.map(b => `<tr><td>${b.id}</td><td>${b.date}</td><td>${esc(b.cust || 'Walk-in customer')}</td><td>${b.mode}</td><td>${rs(b.total)}</td><td>${b.due > 0 ? `<span class="tag due">${rs(b.due)}</span>` : '-'}</td>
   <td style="white-space:nowrap"><button class="sm" onclick="viewBill('${b.id}')">View items</button> <button class="sm" onclick="pdfBill('${b.id}')">PDF</button></td></tr>`).join('') || '<tr><td colspan="7">No bills found.</td></tr>'}</table></div>`;
};
function viewBill(id) {
  const b = load('bills', []).find(x => x.id === id);
  openModal(`<h2>${b.id}</h2><p style="color:var(--muted);margin-bottom:12px">${b.date} · ${esc(b.cust || 'Walk-in customer')} · ${b.mode}</p>
   ${b.items ? `<table><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>${b.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${rs(i.rate)}</td><td>${rs(i.qty * i.rate)}</td></tr>`).join('')}</table>` : '<p>Item details were not recorded for this demo bill.</p>'}
   <div class="sum t"><span>Total</span><span>${rs(b.total)}</span></div><div class="mact"><button class="btn" onclick="closeModal()">Close</button></div>`);
}
