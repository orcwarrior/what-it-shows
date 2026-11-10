## What

One of the two problems inside support desk ticket #4471, split out by the kb's own cause logic
(`src/lib/kb/causes.ts`, run over the export `reports-4471.json`).

- **Covers: 379 reports** of the 412 merged into #4471.
- The shared date parser reads every date **month first**; all eleven tenants on file write dates
  **day first**. Invites come back flipped: 7 April runs on 4 July, 12 May on 11 May.
- Seen 2026-04-01 → 2026-10-04, all three channels (app 204 · email 150 · form 25).
- This is the bug the desk already knows; #4471's queued fix belongs to it and it alone.

## Per tenant

| tenant | locale | form | reports |
|---|---|---|---|
| harbour.dental | en-GB | booking-v2 | 52 |
| kettle.books | nl-NL | booking-v2 | 47 |
| nine.lanterns | pl-PL | booking-v2 | 44 |
| morrow.tax | fr-FR | booking-v2 | 40 |
| long.table | it-IT | booking-v2 | 39 |
| ridge.clinic | da-DK | booking-v2 | 36 |
| stone.and.sons | en-IE | booking-v2 | 30 |
| lantern.row | cs-CZ | booking-v2 | 28 |
| alder.physio | de-DE | booking-v3 | 23 |
| copper.studio | es-ES | booking-v3 | 19 |
| pale.harbour | pt-PT | booking-v3 | 21 |

## Evidence

- First: R-41200 (2026-04-01, harbour.dental, app): "Our 7 April reminder went out on 4 July."
- Last: R-41620 (2026-10-04, lantern.row, email): "Tuesday 6 October showed as Monday."
- `desk-notes.json` footnotes five reports (R-41202, R-41209, R-41236, R-41344, R-41620) the desk
  read as a one-day move; the kb counts them where they are filed — here.

## Fix

Teach the parser the tenant's locale order (`dayFirst()` in `causes.ts` already computes it), or
read every date day first: the tenants write day first, the parser must not disagree.
