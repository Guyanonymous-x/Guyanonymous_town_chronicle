# Town Chronicle

Create an imaginary community of up to 1,000 people, then follow their lives year by year. Each person has their own life story. Some lead quiet, ordinary lives; others don't.

Everything runs in one HTML file, offline, in your browser. There's nothing to install.

## How to use it

1. Download `town-chronicle.html`.
2. Open it in Chrome or Edge.
3. Pick a setting and a size, then create your community.
4. Advance one year at a time, or many years at once.

Save your community to a file whenever you like. You can open it later, scroll back through its whole history and carry on.

## Settings

- Medieval village
- Frontier town
- Modern town
- Fantasy realm
- Sci-fi colony
- **Dropped into an empty world:** present-day people alone on an Earth-like world, with nothing but their skills and knowledge. Their first year has perfect weather.

## What it does

- **People:**
  - names, families, looks, personality, faith, work, goals, fears and secrets
  - friends, loves, rivals and enemies, each with a history of what happened between them
  - hermits and loners
- **Each year,** season by season:
  - births, deaths, illness, marriages, separations and affairs
  - jobs, crime, gossip, elections, laws, feuds, newcomers and people leaving
  - grief, guilt and low spirits that ripple out to others
- **The outside world:** weather, pests, blights, prices and supply chains. For example, a pest in the apple orchards hurts the cider maker.
- **Census:** statistics for the whole town, which you can drill down into to reach the people behind each number.
- **Family trees and maps:**
  - box family trees for one person, a family or the whole town
  - connection maps for each person
  - a map of how families are joined by marriage
  - maps of groups, grudges and feuds
- **Editing:** change anything in the current year. You can also plan what happens next year, such as a death, a marriage, children (up to octuplets), a fire or newcomers arriving.
- **Make a person:** design someone yourself and move them into the town. This is LifeWeaver's person maker, now part of Town Chronicle.
  - Fill in or lock anything you already know, such as a name, a job, a marriage or a turning point, and Generate makes up the rest to fit the town and its year.
  - Their partner and children come too. Children 18 or over may stay behind, as with other newcomer families.
  - Lock a death year to fix when they die: nothing in the town can kill them before then. You can unlock it later on their page.
  - Their life before arriving, regrets, dreams and turning points stay on their page, in printed life stories, Excel and family-tree files.
  - Available for medieval, modern, fantasy and sci-fi towns. Frontier and dropped towns come later.
- **Exports:**
  - family-tree files (GEDCOM) for genealogy programs
  - Excel workbooks
  - printed life stories, which you can save as PDF
  - PNG and SVG pictures of every tree and map
  - compressed save files

## For developers

- **Source:** the source is in `src/`.
- **Building the app:** `python3 build.py` joins the files into `town-chronicle.html`.
- **Checks:** the checks are in `test/`.
  - Files ending in `.js` run with Node.
  - Files ending in `_test.py` drive the app in Chrome using Playwright.
  - `export_verify.py` needs `openpyxl`.
- **Changes:** see `CHANGELOG.md` for what changed in each version.

Everyone in a generated community is invented.

## Licence

Town Chronicle is released under the MIT Licence. You're free to use, change and share it, as long as you keep the copyright notice. See `LICENSE`.
