## What

The second problem the merged pile of support desk ticket #4471 actually holds — not the parser
bug the desk knows.

- **Covers: 33 reports.**
- Every report came through the **booking-v3 form**. Its hint prints `MM/DD/YYYY`, so guests type
  month first, and the form reads what arrived the tenant's way — day first. The invite then shows
  the flip the parser cause also shows, but from a wrong entry against a wrong hint, not from the
  shared parser. Different bug, different fix.
- Seen 2026-04-17 → 2026-09-22, form channel only.
- The three tenants in this group are exactly the three on booking-v3; the other eight run
  booking-v2, whose hint says `DD/MM/YYYY`, so their form reports sit in the parser cause.
- The desk's own `CauseTable` marks this group "not this ticket — no ticket of its own": #4471's
  owner is `parser`. It is filed here instead.

## Per tenant

| tenant | locale | form | reports |
|---|---|---|---|
| alder.physio | de-DE | booking-v3 | 12 |
| copper.studio | es-ES | booking-v3 | 11 |
| pale.harbour | pt-PT | booking-v3 | 10 |

## Evidence

- R-41230 (2026-04-17, copper.studio, form): "My client came on 1 June instead of 6 January."
- R-41372 (2026-06-25, alder.physio, form): "Invite says Tuesday 8 September. We agreed Sunday 9 August. Which one do I trust?"
- The kb's `causeOf()` routes form channel + `MM/DD/YYYY` hint to `hint` — the desk's own code,
  not a judgment call.

## Fix

Print the tenant's own order as the booking-v3 hint (`DD/MM/YYYY` for every tenant on file), or
read what the hint told guests to type. Fixing the parser cause does not fix this: the parser
never misreads these entries — the form and the hint do.
