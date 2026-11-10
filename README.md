# what it shows — S01E03

The support desk merged 412 reports about dates into ticket **#4471** and marked it known. It is
not one problem. This public repo holds the desk's tickets, one per problem the merged pile holds,
each with how many reports it covers, and the kb page that documents them.

## Tickets

| # | cause | covers | what it is |
|---|-------|--------|------------|
| one | `parser` | 379 reports | the shared parser reads every date month first; day-first tenants' invites flip |
| two | `hint` | 33 reports | booking-v3's form hint says `MM/DD/YYYY`; guests type month first, the form reads day first |

## Layout

```
kb/                     the desk's kb export, used as it came
  src/routes/kb/what-it-shows/+page.svx   the page about the tickets, signed (signature in frontmatter, <RenderStamp /> at the end)
kb-html/what-it-shows.html   the same page as the desk will see it, rendered through the kb's runbook frame
tickets/                the exact body of each filed issue
work/                   the scripts behind the numbers (runs the kb's own src/lib/kb/causes.ts logic)
```

`gh auth login` + `gh repo create` were used per the kb export's terms; issues are filed by `gh issue create`.

## The one-line verdict

`#4471` = `parser` (379, the known bug, all 11 tenants, all channels) + `hint` (33, only the three
booking-v3 tenants, form channel only). Subject-line merging glued them together on day one
([decision 0001](kb/src/routes/kb/decisions/0001-dedupe-by-subject/+page.svx)).
