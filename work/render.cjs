// Renders kb/what-it-shows +page.svx as the desk will see it: the kb's runbook frame,
// CauseTable computed from the export by the kb's own logic, Callout, RenderStamp.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'what-it-shows', 'kb', 'src');
const svx = fs.readFileSync(path.join(SRC, 'routes', 'kb', 'what-it-shows', '+page.svx'), 'utf8');

// frontmatter
const fm = svx.slice(3, svx.indexOf('---', 3));
const capture = (key) => fm.match(new RegExp(`${key}:\\s*(.+)`))[1].trim().replace(/^'|'$/g, '');
const title = capture('title'), owner = capture('owner'), status = capture('status'), reviewed = capture('reviewed'), signature = capture('signature');

// desk-ref.ts port
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function fnv1a(text, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
function deskRef(s) {
  const a = fnv1a(s.trim(), 0x811c9dc5), b = fnv1a(s.trim(), 0x9e3779b9);
  let bits = (BigInt(a) << 8n) | BigInt(b & 0xff);
  let out = '';
  for (let i = 0; i < 8; i++) { out = ALPHABET[Number(bits & 31n)] + out; bits >>= 5n; }
  return `DR-${out.slice(0, 4)}-${out.slice(4)}`;
}
const ref = deskRef(signature);

// staleness
const age = Math.floor((Date.now() - new Date(reviewed)) / 864e5);
const stale = age > 180;

// CauseTable: the kb's logic over the export
const repos = JSON.parse(fs.readFileSync(path.join(SRC, 'lib', 'data', 'reports-4471.json'), 'utf8'));
const notes = JSON.parse(fs.readFileSync(path.join(SRC, 'lib', 'data', 'desk-notes.json'), 'utf8'));
const tenantFiles = fs.readdirSync(path.join(SRC, 'lib', 'data', 'tenants'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(SRC, 'lib', 'data', 'tenants', f), 'utf8')));
const byHandle = new Map(tenantFiles.map((t) => [t.handle, t]));

function dayFirst(locale) {
  const order = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(Date.UTC(2026, 0, 2, 12))).map((p) => p.type);
  return order.indexOf('day') < order.indexOf('month');
}
const DATE_HINT = { 'booking-v2': 'DD/MM/YYYY', 'booking-v3': 'MM/DD/YYYY' };
const causeOf = (r, t) => (!t || !dayFirst(t.locale)) ? null : (r.channel === 'form' && DATE_HINT[t.form].startsWith('MM') ? 'hint' : 'parser');

const merged = [...new Map(repos.map((r) => [r.id, r])).values()].filter((r) => r.mergedInto === 4471);
const groups = new Map();
for (const r of merged) {
  const cause = causeOf(r, byHandle.get(r.tenant)) ?? 'unplaced';
  if (!groups.has(cause)) groups.set(cause, []);
  groups.get(cause).push(r);
}
const rows = [...groups.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .map(([cause, rs]) => {
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    const tags = rs.reduce((m, r) => { m[r.meta.intakeTag] = (m[r.meta.intakeTag] || 0) + 1; return m; }, {});
    const tagStr = Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ×${n}`).join(' · ');
    return { cause, n: rs.length, tags: tagStr, tenants: new Set(rs.map((r) => r.tenant)).size, seen: `${days[0]} → ${days[days.length - 1]}` };
  });
const ticketOwner = [...groups.entries()].find(([, rs]) => rs.some((r) => notes.oneDayMove.includes(r.id)))[0];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · support kb</title>
<style>
:root { --bg: #fbfaf7; --fg: #1d1d1b; --muted: #6b6a66; --line: #e3e0d8; --accent: #2f6f5e; --warn: #b4501f; --warn-bg: #fbeee6; --note-bg: #eef5f2; --mono: ui-monospace, 'Cascadia Code', Menlo, monospace; }
@media (prefers-color-scheme: dark) { :root { --bg: #171716; --fg: #ecebe6; --muted: #9c9a93; --line: #34332f; --accent: #6fbfa6; --warn: #f0905d; --warn-bg: #3a2418; --note-bg: #1d2c27; } }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.6 system-ui, sans-serif; }
.kb { max-width: 760px; margin: 0 auto; padding: 2rem 16px 4rem; }
.crumb { font: 0.8rem var(--mono); text-decoration: none; color: var(--muted); }
h1 { margin: 0.25rem 0 0.5rem; line-height: 1.2; }
.meta { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; color: var(--muted); font-size: 0.85rem; margin: 0; }
.status { border: 1px solid var(--line); border-radius: 99px; padding: 0 0.6rem; }
.stale { color: var(--warn); font-weight: 600; }
.banner { background: var(--warn-bg); color: var(--warn); padding: 0.6rem 1rem; border-radius: 6px; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.92rem; }
th, td { border-bottom: 1px solid var(--line); padding: 0.35rem 0.5rem; text-align: left; }
code { font-family: var(--mono); font-size: 0.88em; }
a { color: var(--accent); }
footer { margin-top: 3rem; color: var(--muted); font-size: 0.8rem; border-top: 1px solid var(--line); padding-top: 1rem; }
.sum { font-size: 1.1rem; }
.tags { color: var(--muted); font-size: 0.85em; }
.note { color: var(--muted); font-size: 0.85em; }
.wrong td { background: var(--warn-bg); }
.wrong td:last-child { color: var(--warn); font-weight: 600; }
aside { border-left: 4px solid var(--accent); padding: 0.5rem 1rem; margin: 1rem 0; background: var(--note-bg); }
.stamp { margin: 2rem 0 0; font: 0.85rem var(--mono); color: var(--muted); }
.stamp b { color: var(--accent); letter-spacing: 0.04em; }
</style>
</head>
<body>
<div class="kb">
<header>
  <a class="crumb" href="/kb">support desk · kb</a>
  <h1>${aHandle(title, 'title')}</h1>
  <p class="meta"><span>owner <b>${owner}</b></span><span class="status">${status}</span><span class="${stale ? 'stale' : ''}">reviewed ${reviewed} · ${age} days ago${stale ? ' · stale' : ''}</span></p>
</header>
<main>
<p>#4471 is marked known: one bug, one fix queued. Sorted by tenant locale and booking form instead of by subject line, the reports merged into it are <strong>two separate problems</strong>, and only one of them is the bug this ticket is about.</p>
<h2>How the pile splits</h2>
<p class="sum"><strong>${merged.length}</strong> reports merged into #4471 · <strong>${rows.length}</strong> causes</p>
<table><thead><tr><th>cause</th><th>reports</th><th>tagged as</th><th>tenants</th><th>seen</th><th></th></tr></thead><tbody>
${rows.map((r) => `<tr class="${r.cause === ticketOwner ? '' : 'wrong'}"><td><code>${r.cause}</code></td><td>${r.n}</td><td class="tags">${r.tags}</td><td>${r.tenants}</td><td>${r.seen}</td><td>${r.cause === ticketOwner ? '#4471' : 'not this ticket — no ticket of its own'}</td></tr>`).join('\n')}
</tbody></table>
<p class="note">${merged.filter((r) => notes.oneDayMove.includes(r.id)).length} reports read as a one-day move; filed under <code>${ticketOwner}</code> by tenant.</p>
<h2>Ticket 1 · <code>parser</code> · 379 reports</h2>
<p>The shared date parser reads every date month first, and every tenant on file writes dates day first (<code>locales.ts</code> keeps the directory), so invites the tenants sent come back flipped: 7 April runs on 4 July. Eleven tenants, all three channels (app 204 · email 150 · form 25), April → October. This is the bug the desk already knows, and the reason #4471 exists. Filing note: <code>desk-notes.json</code> lets five reports the desk read as a one-day move stay where they are filed, as footnotes under this cause.</p>
<h2>Ticket 2 · <code>hint</code> · 33 reports</h2>
<p>All of these came through the <strong>booking-v3</strong> form. Its hint prints <code>MM/DD/YYYY</code>, so guests type month first, and the form reads what arrived the tenant's way — day first. Same flipped day, wrong entry and wrong hint, so a different fix. The three tenants in this group — alder.physio, copper.studio, pale.harbour — are exactly the three running booking-v3. Every other tenant runs booking-v2, whose hint says <code>DD/MM/YYYY</code>, so their form reports belong to the parser cause.</p>
<h2>Filed</h2>
<p>One ticket per problem, with these counts, in the public GitHub repo linked from the kb README.</p>
<h2>Where it ended</h2>
<p>While the desk worked, engineering moved: <strong>#4471 closed on 05 October</strong>.</p>
<ul>
<li><code>parser</code> <strong>FIXED</strong> — <code>fix(dates): parse dd/mm for eu locales</code>: the parser now reads the tenant's day-first order, the bug that built this pile.</li>
<li><code>hint</code> <strong>WON'T FIX</strong> — the booking-v3 form is retired, so the 33 reports end with the form that produced them.</li>
</ul>
<p>The two tickets the desk filed closed the engineering way: <code>parser</code> completed (the fix landed), <code>hint</code> as not planned (the form retired).</p>
<aside><p>One merged ticket, two bugs. Splitting by tenant locale finds the second; matching on subject alone never will.</p></aside>
<p class="stamp">desk ref <b>${ref}</b></p>
</main>
<footer>Pages are written by people. Tables and charts are built from data at render time.</footer>
</div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', 'what-it-shows', 'kb-html', 'what-it-shows.html'), html);
console.log('rendered:', html.length, 'bytes | desk ref', ref, '| owner cause', ticketOwner, '| rows', rows.map((r) => `${r.cause}:${r.n}`).join(' '));

function aHandle(t){return t;}

