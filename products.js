/* ---------- Shared helpers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const openModal = h => { document.getElementById('mbox').innerHTML = h; document.getElementById('modal').hidden = false; };
const closeModal = () => { document.getElementById('modal').hidden = true; };
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
function refreshKeep(id) { const e = document.getElementById(id), p = e.selectionStart; go(CUR); const n = document.getElementById(id); n.focus(); n.setSelectionRange(p, p); }

/* ---------- Product management ---------- */
let PQ = '';
VIEWS.products = () => {
  const all = load('products', []);
  const ps = all.filter(p => (p.name + p.cat).toLowerCase().includes(PQ.toLowerCase()));
  return `<div class="toolbar"><input id="pq" placeholder="Search by name or category" value="${esc(PQ)}" oninput="PQ=this.value;refreshKeep('pq')"><button class="btn" onclick="editProduct()">+ Add product</button><button class="btn sec" onclick="bulkForm()">Bulk add / CSV import</button></div>
  <div class="panel" style="overflow-x:auto"><table><tr><th>Product</th><th>Category</th><th>Stock</th><th>Purchase</th><th>Selling</th><th>Margin</th><th>Expiry</th><th></th></tr>
  ${ps.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.cat)}</td>
   <td>${p.qty} ${p.qty <= p.min ? '<span class="tag low">Low</span>' : '<span class="tag ok">In stock</span>'}</td><td>${rs(p.buy)}</td><td>${rs(p.sell)}</td>
   <td>${p.sell ? Math.round((p.sell - p.buy) / p.sell * 100) : 0}%</td><td>${p.exp || '-'}</td>
   <td style="white-space:nowrap"><button class="sm" onclick="editProduct(${p.id})">Edit</button> <button class="sm del" onclick="delProduct(${p.id})">Delete</button></td></tr>`).join('') || '<tr><td colspan="8">No products found.</td></tr>'}</table></div>`;
};
function editProduct(id) {
  const p = load('products', []).find(x => x.id === id) || { name: '', cat: 'Grocery', qty: '', min: 10, buy: '', sell: '', exp: '' };
  const f = (k, l, t = 'text', c = '') => `<div class="${c}"><label>${l}</label><input id="f_${k}" type="${t}" value="${esc(p[k] ?? '')}"></div>`;
  openModal(`<h2>${id ? 'Edit' : 'Add'} product</h2><div class="fg">${f('name', 'Product name', 'text', 'full')}${f('cat', 'Category')}${f('qty', 'Current stock', 'number')}
   ${f('buy', 'Purchase price (₹)', 'number')}${f('sell', 'Selling price (₹)', 'number')}${f('min', 'Low-stock level', 'number')}${f('exp', 'Expiry date', 'date')}</div>
   <div class="err" id="f_err"></div><div class="mact"><button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveProduct(${id || 0})">Save product</button></div>`);
}
function saveProduct(id) {
  const g = k => document.getElementById('f_' + k).value.trim();
  const p = { name: g('name'), cat: g('cat') || 'General', qty: +g('qty'), min: +g('min'), buy: +g('buy'), sell: +g('sell'), exp: g('exp') };
  const err = t => document.getElementById('f_err').textContent = t;
  if (!p.name) return err('Enter the product name.');
  if ([g('qty'), g('buy'), g('sell')].some(v => v === '' || +v < 0)) return err('Stock, purchase price and selling price must be numbers (0 or more).');
  const list = load('products', []), old = list.find(x => x.id === id);
  if (old) { if (old.buy !== p.buy || old.sell !== p.sell) logRate(id, p); Object.assign(old, p); }
  else { p.id = Math.max(0, ...list.map(x => x.id)) + 1; list.push(p); logRate(p.id, p); }
  save('products', list); closeModal(); go(CUR); toast('Product saved');
}
function logRate(pid, p) { const r = load('rates', []); r.push({ pid, date: new Date().toISOString().slice(0, 10), buy: p.buy, sell: p.sell }); save('rates', r); }
function delProduct(id) {
  const p = load('products', []).find(x => x.id === id);
  openModal(`<h2>Delete product?</h2><p style="color:var(--muted)">"${esc(p.name)}" will be removed from your product list. Old bills are not affected.</p>
   <div class="mact"><button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="doDel(${id})">Delete</button></div>`);
}
function doDel(id) { save('products', load('products', []).filter(x => x.id !== id)); closeModal(); go(CUR); toast('Product deleted'); }

/* ---------- Bulk product import ---------- */
const BULK_HEADER = ['name','category','quantity','min_stock','purchase_price','selling_price','expiry'];
function csvCell(v) { return '"' + String(v ?? '').replace(/"/g, '""') + '"'; }
function downloadProductTemplate() {
  const example = ['Sample Product','Grocery',20,5,50,70,''];
  const csv = [BULK_HEADER,example].map(r => r.map(csvCell).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  a.download = 'raj-enterprises-products-template.csv'; a.click(); URL.revokeObjectURL(a.href);
}
function bulkForm() {
  openModal(`<h2>Bulk add products</h2><p class="help">Add one product per line, or import a CSV file. Existing products remain unchanged unless you choose to update matching names.</p>
    <button class="btn sec" onclick="downloadProductTemplate()">Download CSV template</button>
    <label>Upload CSV file (Excel: Save As → CSV UTF-8)</label><input type="file" id="bulkfile" accept=".csv,text/csv" onchange="readBulkFile(this)">
    <label>Or paste product rows</label><textarea id="bulktext" rows="7" placeholder="name,category,quantity,min_stock,purchase_price,selling_price,expiry\nSugar 1kg,Grocery,40,10,35,45,\nMilk 1L,Dairy,20,5,50,60,"></textarea>
    <label class="bulkcheck"><input type="checkbox" id="bulkupdate"> Update matching product names instead of skipping them</label>
    <div id="bulkresult" class="help" role="status"></div>
    <div class="mact"><button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn" onclick="importBulk()">Import products</button></div>`);
}
function readBulkFile(el) {
  const f = el.files?.[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => {document.getElementById('bulktext').value = String(r.result).replace(/^\uFEFF/, ''); document.getElementById('bulkresult').textContent = 'CSV loaded. Click Import products.';}; r.readAsText(f);
}
function parseCSV(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') {if(quoted && text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===',' && !quoted){row.push(cell.trim());cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(v=>v!==''))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw Error('Unclosed quote in CSV.');
  row.push(cell.trim());if(row.some(v=>v!==''))rows.push(row);
  return rows;
}
function importBulk() {
  const out=document.getElementById('bulkresult'), raw=document.getElementById('bulktext').value.trim();
  if(!raw){out.textContent='Paste rows or choose a CSV file first.';return;}
  let rows;try{rows=parseCSV(raw);}catch(e){out.textContent=e.message;return;}
  const first=rows[0]?.[0]?.toLowerCase().replace(/\s/g,'');
  if(['name','product','productname'].includes(first))rows.shift();
  if(!rows.length){out.textContent='No product rows found.';return;}
  const errors=[], valid=[];
  rows.forEach((r,i)=>{
    if(r.length<6||r.length>7){errors.push('Row '+(i+1)+': expected 6 or 7 columns');return;}
    const [name,cat,qty,min,buy,sell,exp='']=r;
    if(!name||!cat||![qty,min,buy,sell].every(v=>v!==''&&Number.isFinite(Number(v))&&Number(v)>=0)||!Number.isInteger(+qty)||!Number.isInteger(+min)|| (exp&&!/^\d{4}-\d{2}-\d{2}$/.test(exp))){errors.push('Row '+(i+1)+': invalid name, category, numbers or expiry date');return;}
    valid.push({name,cat,qty:+qty,min:+min,buy:+buy,sell:+sell,exp});
  });
  if(errors.length){out.textContent='Nothing imported. Fix: '+errors.slice(0,6).join('; ')+(errors.length>6?' (and more)':'');return;}
  const list=load('products',[]), update=document.getElementById('bulkupdate').checked;
  let added=0,updated=0,skipped=0;
  for(const item of valid){const old=list.find(p=>p.name.toLowerCase()===item.name.toLowerCase());
    if(old){if(update){if(old.buy!==item.buy||old.sell!==item.sell)logRate(old.id,item);Object.assign(old,item);updated++;}else skipped++;}
    else {item.id=Math.max(0,...list.map(p=>p.id))+1;list.push(item);logRate(item.id,item);added++;}
  }
  save('products',list);closeModal();go('products');toast(`${added} added, ${updated} updated, ${skipped} skipped`);
}
