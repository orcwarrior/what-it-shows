const fs = require('fs');
const reports = JSON.parse(fs.readFileSync('./kb/support-kb/src/lib/data/reports-4471.json', 'utf8'));
const tenants = fs.readdirSync('./kb/support-kb/src/lib/data/tenants')
  .map((f) => JSON.parse(fs.readFileSync(`./kb/support-kb/src/lib/data/tenants/${f}`, 'utf8')));
const byHandle = new Map(tenants.map((t) => [t.handle, t]));

function dayFirst(locale) {
  const order = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(Date.UTC(2026, 0, 2, 12)))
    .map((p) => p.type);
  return order.indexOf('day') < order.indexOf('month');
}
const DATE_HINT = { 'booking-v2': 'DD/MM/YYYY', 'booking-v3': 'MM/DD/YYYY' };
function causeOf(r, t) {
  if (!t || !dayFirst(t.locale)) return null;
  return r.channel === 'form' && DATE_HINT[t.form].startsWith('MM') ? 'hint' : 'parser';
}

const unique = [...new Map(reports.map((r) => [r.id, r])).values()];
const merged = unique.filter((r) => r.mergedInto === 4471);
const g = { parser: [], hint: [] };
for (const r of merged) g[causeOf(r, byHandle.get(r.tenant))].push(r);

for (const cause of ['parser', 'hint']) {
  console.log(`\n== ${cause}: ${g[cause].length} reports`);
  const byTenant = new Map();
  for (const r of g[cause]) {
    const k = `${r.tenant} (${byHandle.get(r.tenant).locale}, ${byHandle.get(r.tenant).form})`;
    byTenant.set(k, (byTenant.get(k) || 0) + 1);
  }
  console.log('  per tenant:');
  for (const [k, n] of [...byTenant.entries()].sort()) console.log(`    ${n} × ${k}`);
  const byChannel = new Map();
  for (const r of g[cause]) byChannel.set(r.channel, (byChannel.get(r.channel) || 0) + 1);
  console.log('  per channel:', JSON.stringify([...byChannel.entries()]));
}

// deskRef for the page signature (port of desk-ref.ts)
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function fnv1a(text, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
function deskRef(signature) {
  const t = signature.trim();
  const a = fnv1a(t, 0x811c9dc5), b = fnv1a(t, 0x9e3779b9);
  let bits = (BigInt(a) << 8n) | BigInt(b & 0xff);
  let out = '';
  for (let i = 0; i < 8; i++) { out = ALPHABET[Number(bits & 31n)] + out; bits >>= 5n; }
  return `DR-${out.slice(0, 4)}-${out.slice(4)}`;
}
console.log('\n== desk refs (signature -> DR-…)');
for (const s of ['s01e03 · what it shows · review', 'what-it-shows · S01E03 · orcwarrior']) console.log('  ', JSON.stringify(s), '->', deskRef(s));
