// Runs the kb's own cause logic (causes.ts) over reports-4471.json, outside Svelte.
const fs = require('fs');
const reportsRaw = JSON.parse(fs.readFileSync('./src/lib/data/reports-4471.json', 'utf8'));
const notes = JSON.parse(fs.readFileSync('./src/lib/data/desk-notes.json', 'utf8'));

const tenants = fs.readdirSync('./src/lib/data/tenants')
  .map((f) => JSON.parse(fs.readFileSync(`./src/lib/data/tenants/${f}`, 'utf8')));
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

// uniqueById
const unique = [...new Map(reportsRaw.map((r) => [r.id, r])).values()];
const merged = unique.filter((r) => r.mergedInto === 4471);
console.log('raw rows:', reportsRaw.length, '| unique ids:', unique.length, '| merged into #4471:', merged.length);

// duplicates detail
const counts = new Map();
for (const r of reportsRaw) counts.set(r.id, (counts.get(r.id) || 0) + 1);
const dupes = [...counts.entries()].filter(([, n]) => n > 1);
console.log('duplicated ids:', JSON.stringify(dupes));
const dupeRows = dupes.map(([id]) => reportsRaw.filter((r) => r.id === id));
for (const rows of dupeRows) {
  const same = rows.every((x) => JSON.stringify(x) === JSON.stringify(rows[0]));
  console.log('  ', rows[0].id, 'rows:', rows.length, 'identical:', same);
}

// group by cause
const groups = new Map();
for (const r of merged) {
  const t = byHandle.get(r.tenant);
  const cause = causeOf(r, t) ?? 'unplaced';
  if (!groups.has(cause)) groups.set(cause, []);
  groups.get(cause).push(r);
}
console.log('\ncause groups:');
for (const [cause, rs] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  const tagged = rs.reduce((m, r) => { m[r.meta.intakeTag] = (m[r.meta.intakeTag] || 0) + 1; return m; }, {});
  const tenantsIn = new Set(rs.map((r) => r.tenant));
  console.log(`  ${cause}: ${rs.length} reports, tenants ${tenantsIn.size}, seen ${days[0]} → ${days[days.length - 1]}, intake tags ${JSON.stringify(tagged)}`);
}

// unplaced detail
const unplaced = groups.get('unplaced') || [];
const unkTenants = new Set(unplaced.map((r) => r.tenant));
console.log('\nunplaced tenants (not on file):', JSON.stringify([...unkTenants]));
console.log('unplaced channels:', JSON.stringify(unplaced.reduce((m, r) => { m[r.channel] = (m[r.channel] || 0) + 1; return m; }, {})));

// day-first tenants on file?
console.log('\ntenant directory:');
for (const t of tenants) console.log(`  ${t.handle.padEnd(15)} locale ${t.locale.padEnd(8)} dayFirst=${dayFirst(t.locale)} form=${t.form}`);

// desk-notes: reports read as a one-day move
const noteIds = new Set(notes.oneDayMove);
const noted = merged.filter((r) => noteIds.has(r.id));
console.log('\ndesk-notes oneDayMove ids:', JSON.stringify(notes.oneDayMove));
for (const r of noted) {
  const t = byHandle.get(r.tenant);
  console.log(`  ${r.id} tenant=${r.tenant} channel=${r.channel} cause=${causeOf(r, t)} subject="${r.subject}" body="${r.body}"`);
}

// intake tags over all merged
console.log('\nall intake tags:', JSON.stringify(merged.reduce((m, r) => { m[r.meta.intakeTag] = (m[r.meta.intakeTag] || 0) + 1; return m; }, {})));

// sample subjects & bodies per cause
for (const [cause, rs] of groups) {
  console.log(`\nsample from "${cause}":`);
  for (const r of rs.slice(0, 3)) console.log(`  [${r.channel}] ${r.subject} — ${r.body}`);
}
