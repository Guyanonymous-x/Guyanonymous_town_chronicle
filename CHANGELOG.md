# Town Chronicle — Changelog

## V8 — Stage 6: exports, printing, pictures and smaller saves (2026-11-07)

**New: Exports & printing page** (in the menu, after Storyteller)

- **Family-tree file (GEDCOM 5.5.1)**
  - This is the standard file that family-tree programs and websites open or import.
  - **Who is in it:** everyone in the records, or only people living here now.
  - **Each person:** name (with married name where it differs), sex, birth, death and cause, work, faith, schooling, arrival and leaving, and their home area.
  - **Each family:** marriages and living together (with years), separations, and children in birth order.
  - **Life notes (optional):** each person's whole life, year by year with seasons and reasons.
  - **Secrets** are left out unless you tick "Include secrets".
  - **Same-sex couples:** the GEDCOM 5.5.1 standard only has "husband" and "wife" places. A same-sex couple is listed in those two places in ID order.
- **Excel workbook (.xlsx)**
  - One file with 15 sheets: people (48 columns), life events, households, relationships, the town by year, census, town events, places of work, groups, feuds, crimes, leaders, elections, laws and the economy.
  - A secrets sheet is added if you choose.
  - Every sheet has a frozen, shaded top row and filters on every column.
- **Print, or save as PDF** (choose "Save as PDF" in the print window)
  - **One person's whole life:**
    - their story
    - their family, with how each person is related
    - friends, loves and enemies, with their history
    - a mood and health chart
    - year by year, with seasons and reasons
  - **A household:** everyone in it, one after another.
  - **A family:** everyone born with the surname, or only those living here.
  - **A chosen list:** from the People page, including people picked from the census.
  - **The town's chronicle:** any range of years, with or without the years before the chronicle began.
  - **Every small detail, and secrets,** can be included or left out.
  - **Books of several people** get a title page and a list of contents. Each life starts on a new page.
- **Pictures of every family tree and map**
  - Every drawing now has **PNG**, **SVG** and **Print / PDF** buttons. They save the whole drawing, not just the part on screen.
  - **PNG** is made at twice screen size, shrunk only when the drawing is too big for the browser to make (it tells you, and suggests SVG).
  - **Print / PDF** gives a page showing the whole drawing. For a big drawing it can also print it at full, readable size across several pages. It tells you how many pages first.
- **Smaller saves**
  - Choose normal saves (.town.json) or compressed saves (.town.json.gz). In the tests, compressed files were about a seventh of the size.
  - In the save window you can also pick either kind by its file type.
  - **Open…** opens both kinds, and older saves still open.
  - Automatic backups stay normal files.

**Also new**
- **Buttons on other pages:**
  - **Print life story** on every person's page
  - **Print this household** on household pages
  - **Print these people**, **Excel of these people** and **Family-tree file of these people** on the People page, for whoever you have filtered
  - **Print the chronicle…** on the History page
- **The whole-community box tree** now lays the families out in rows instead of one very long line, so it makes a sensible picture and printout.

**Checked**
- **Family-tree files**
  - Made for all six settings.
  - All 12,311 people were read back from the files and compared with the community. Each person's name, sex, birth and death year, every life note, and their parents all matched: 0 problems.
  - Every person-to-family link points both ways, and no line is too long.
- **Excel workbooks**
  - Made for all six settings.
  - All 211,249 rows and 2,420,655 cells were read back in a spreadsheet reader: 0 differences from what was written.
- **In the app itself (all six settings)**
  - **Family-tree file downloads:** 18 in all — 6 of everyone, 6 of the living, 6 of a chosen list. All had the right people.
  - **Excel downloads:** 12, with the right sheets and rows.
  - **Life stories:** 17,964 made, covering every person, with and without details and secrets: 0 broken.
  - **Print buttons:** each prints the right people: person, household, family, chosen list, and the chronicle with every year.
  - **Pictures:** 24 drawings, each saved as PNG, SVG and Print / PDF: all correct. When a drawing is split over several pages, every box appears on them.
  - **Saves:** 12 (6 compressed, 6 normal). Each was reopened identical and carried on to the next year.
  - **Errors:** 0.
- **Real PDFs:** made of a chronicle book (28 pages) and a family tree (an overview page plus 6 full-size pages), then read back.
- **Box trees** for every family and the whole town, rechecked after the new row layout: 0 missing, 0 drawn twice, 0 overlapping.

  | Setting | Trees checked |
  |---|---|
  | Medieval | 216 |
  | Frontier | 369 |
  | Modern | 399 |
  | Fantasy | 387 |
  | Sci-fi | 123 |
  | Dropped | 558 |
  | **Total** | **2,252** |

- **Person family trees,** rechecked: 0 overlapping boxes, 0 broken lines.

  | Setting | Trees drawn |
  |---|---|
  | Medieval | 6,985 |
  | Frontier | 7,613 |
  | Modern | 4,840 |
  | Fantasy | 6,821 |
  | Sci-fi | 4,218 |
  | Dropped | 6,658 |
  | **Total** | **37,135** |

- **Random edits and plans:** all six settings, 0 problems.
- **Earlier checks, all rerun on all six settings and still passing:**
  - 868 person tree and map pages
  - 334 map pages with 6,005 dots, 0 overlapping
  - 6,469 census views, 0 totals that don't add up
  - 13,467 person pages
  - 5,476 household pages
  - stories with secrets shown, history, editing and plans (octuplets, fire, newcomers), undo, save, reopen and continue
  - 0 errors in all of them

## V7 — Stage 5: editing and the Storyteller, plus clearer trees and maps (2026-11-07)

**New: change anything in the current year**
- An **Edit tab on every person**, with drop-downs and boxes for:
  - first and last name, and notes
  - health, cleverness, standing, each personality trait and each feeling
  - low spirits, faith, who they love, living alone as a hermit
  - their work or role (only the jobs open to them), and moving them to another household or a new one of their own
- Their **relationships**: change any tie (friend, sweetheart, rival, enemy and so on) or end it.
- **Household edits:** district, savings, kind of home, and whether they own it.
- Every change is written in an **edit log**. **Undo** works for edits as well as for advancing years.

**New: plan what happens next year (the Storyteller)**
- **For a person:**
  - a death
  - a marriage
  - children (one up to eight at once — twins through octuplets)
  - an affair
  - a crime
  - an injury or illness
  - a new job, or losing one
  - moving away
  - a new friend or enemy
  - money gained or lost
  - becoming a hermit
  - low spirits, drinking, or recovering
  - running for office
  - a big success
- **For the town:**
  - a community event
  - an outbreak of illness
  - the weather
  - a blight
  - newcomers arriving
  - a feud starting or ending
  - an election
  - a new law
  - a discovery
- Each plan can be set for a season. It is checked when you make it (for example, a father must be 14–90). It then happens in that season with its knock-on effects, and is told in the person's life story.
- A **Storyteller page** lists:
  - town plans
  - plans still waiting
  - earlier plans and what came of them
  - the full edit log

**Improved: family trees and maps (your feedback)**
- **New traditional box family tree** on the Family trees page, for one family or the whole community:
  - each person has one full box with name, years, age and work
  - lines run down from each couple to their children
  - dashed lines show former or late partners
  - choose the family, how many generations (or all), and whether to include the dead, those who moved away, and former partners
- **Copies in the box tree:** when someone belongs in two places, they get a light dashed copy box in the second place. For example, a wife is drawn beside her husband, while her full box sits with her own parents.
  - Clicking a copy jumps to the full box and makes it flash.
  - Where several children are all drawn under their other parent, one box says "3 children — drawn under …" instead of repeating them.
- **Marriage map between families is now readable:**
  - small dots instead of big overlapping circles
  - each name with "N here" underneath
  - names never overlap
  - point at a family to light up just the families it married into and fade the rest
  - clicking a family shows its box tree
- **Connection map on each person is now readable:**
  - each kind of tie gets its own side of the picture (family, love, friends, enemies, work, neighbours, home)
  - each person shows how they are related (son, granddaughter, rival…) under their name
  - names never overlap
  - pointing at someone lights up their links
- **Group, grudge and feud maps** get the same treatment: smaller dots, no overlapping names, and hover to light up links.
- **Person family trees:**
  - the line down to children now starts beside the right partner when someone had children with more than one partner
  - with "Former and late partners" on, the other parent of any shown child is now always shown

**Checked**
- **Random edits and plans:** run on all six settings, with full record checks after every year. 0 problems.
- **Clicking through the app:**
  - renaming
  - a health edit
  - a planned octuplets birth (8 children born)
  - a planned fire
  - newcomers arriving (11 people in the final run)
  - undoing an edit
  - every person's Edit tab
  - 0 errors
- **Person family trees:** drawn for everyone in all six settings with four option sets. 0 overlapping boxes, 0 broken lines.

  | Setting | Trees drawn |
  |---|---|
  | Medieval | 6,985 |
  | Frontier | 7,613 |
  | Modern | 4,840 |
  | Fantasy | 6,821 |
  | Sci-fi | 4,218 |
  | Dropped | 6,658 |
  | **Total** | **37,135** |

- **Box trees for every family and the whole community:** checked in all six settings with three option sets.
  - 2,252 trees in all.
  - Every person who should be shown has exactly one full box (or appears beside their partner): 0 missing.
  - 0 drawn in full twice, 0 overlapping boxes, 0 people shown who should be hidden.

  | Setting | Trees checked |
  |---|---|
  | Medieval | 216 |
  | Frontier | 369 |
  | Modern | 399 |
  | Fantasy | 387 |
  | Sci-fi | 123 |
  | Dropped | 558 |
  | **Total** | **2,252** |

- **Maps in the app:** 334 map pages across all six settings (connection maps, Family trees pages, group pages, grudges).
  - 6,005 dots and names: 0 overlapping.
  - 0 missing drawings and 0 errors.
  - Clicking a copy box jumps correctly in every setting.
- **Earlier checks, all rerun on all six settings and still passing:**
  - 868 person tree and map pages, 0 errors
  - 6,469 census views, 0 errors, 0 totals that don't add up
  - 13,467 person pages, 0 errors
  - 5,476 household pages, 0 errors
  - stories with secrets shown, history pages, undo, save, reopen and continue: 0 errors

## V6 — Stage 4: family trees and maps (2026-11-07)

**New**
- **Family tree tab on every person:**
  - choose how many generations up (0–6) and down (0–6)
  - switch on or off: husbands, wives and partners; former and late partners; brothers and sisters, and their children; people who have died; people who moved away
  - boxes show name, years, age and work, with colour for sex, † for the dead, dashed boxes for those gone and dashed lines for former or late partners
  - click anyone to re-centre the tree on them
- **Connection map tab on every person:** a map of everyone connected to them, coloured by kind: family, home, friends and sweethearts, rivals and enemies (dashed red), work, neighbours and regulars. Tick or untick each kind; show the ties between the people too; include the dead and those gone. Click a person to centre the map on them.
- **Family trees page (whole community):**
  - every family (by birth surname) as a circle sized by how many live here, with lines for marriages between families (thicker means more)
  - click a family to list its people and start a tree from its oldest known ancestors, ranked by number of descendants
  - a search box starts a tree from anyone
- **Group maps:** each friend group's page shows its members and the friendships, romances, family ties and quarrels inside it.
- **Feuds & grudges page:**
  - a map of all bad blood in the town, with feuding households shaded
  - each family feud now shows its full history and a map of the two households
  - ended feuds are shown as ended
- **Household pages** link to the head's family tree, and the Family tab links to the tree.
- **All drawings** can be dragged to move around, scrolled or zoomed with + and −, and "Fit all" shows everything. Big trees open at a readable size, centred on the person.

**Checked**
- 46,000+ family trees drawn across all six settings with four different option sets: 0 overlapping boxes, 0 broken lines (largest tree: 544 people).
- Tree and map tabs for a sample of people in every setting, plus the Family trees page, feud and grudge pages and every group page: 0 errors.
- Clicking re-centres correctly, and dragging doesn't open anything by accident.
- All earlier checks (census, person pages with and without secrets, history, households, undo, save, reopen and continue) still pass.

## V5 — Stage 3: the census (2026-11-07)

**New**
- **Census page.** Everyone living here (and anyone in prison) is counted 24 ways:
  - work status, kind of work, work or role, place of work
  - sex, age group, five-year age bands, where they live
  - marriage, kind of household, household size, household means
  - born here or came later, background, faith, languages, schooling
  - health, long-term health problems, mood, troubles of the mind
  - standing in the town, criminal record, loners
- **Drill-down:** click any line to look inside it, then keep going. For example: Everyone → In work (366) → Farming and land (140) → Villein farmer → the farmers' place of work → "List these people" opens the exact people. Each step suggests the next sensible breakdown, and you can switch to any other.
- **Breadcrumbs** show the path, and you can click back to any step.
- **Every table** shows counts, shares and men/women columns. Things a person can have more than one of (languages, health problems) are clearly marked.
- **Census over the years:** a census is taken at the start of every year and kept, and a table shows the trends: people, households, median age, children, elders, in work, out of work, married %, poor %, happy %, poor health %, and with a record.
- **Overview** links to the full census.

**Checked**
- Every census breakdown and two levels of drill-down opened in 6 towns (over 1,000 views each): 0 errors.
- In every town, each breakdown adds up exactly to the total population.
- 6 towns advanced 30 years with full record checks: 0 problems. All earlier page checks still pass.

## V4 — Stage 2c: society (2026-11-07)

**New**
- **Crime and justice:**
  - theft, assault, fraud, poaching (medieval and fantasy), cattle rustling (frontier), drugs (modern), smuggling (space colony), arson and murder, at rates suited to each setting
  - who turns to crime depends on character, poverty, drinking, being out of work and past convictions; famine and slumps raise theft
  - violence and murder grow out of real grudges
  - victims lose money, get hurt or die
- **Getting caught:** depends on the setting's law officers, how clever the culprit is, and any night watch. Crimes may go unsolved, can be solved years later when word gets around or the culprit confesses out of guilt, and sometimes the wrong person is blamed and later cleared.
- **Punishments fit each setting:**
  - Medieval: the manor court's fines, pillory, stocks, branding, outlawry and hanging for felonies.
  - Frontier: jail, being run out of town, hanging and the occasional lynch mob.
  - Modern: probation, jail and prison.
  - Fantasy: stocks, branding, banishment and execution.
  - Space colony: fines, confinement and deportation to Earth.
  - Empty world: the settlement council's shaming, extra work and banishment.
- **Prison and banishment** take people away for a set number of years, and they come back to whatever life is left.
- **Revenge:** the families of murder victims may take matters into their own hands.
- **Leaders and politics:**
  - offices for each setting: lord (passes to the heir), reeve, constable, mayor, sheriff, town council, police chief, town elder, captain of the guard, colony administrator and council, and the empty world's speaker and council
  - elections where people vote by friendship, family, reputation, faith and culture, and feuds; only men vote in the medieval and frontier settings, as in the real past
  - appointments that can favour relatives
- **Rules leaders bring in, chosen by temperament:** raised or lowered dues, a night watch, harsh or merciful punishments, a school, a healer, closing drinking houses, a fair, a curfew, a granary against famine. These really change taxes, crime, catching criminals, schooling, medicine, drinking, mood and hunger.
- **Approval of the leader** is worked out every year. When it's low, there's unrest, early elections, or unpopular rules being undone.
- **Reputation:** each person has a standing in the town, from "shunned" to "highly respected". It's shaped by their work and character, offices held, scandals, convictions and drinking, and it affects elections.
- **Gossip and secrets:**
  - affairs, secret parentage and unsolved crimes become secrets known to a few, which spread along friendships and families
  - once enough people know, they become common talk, with consequences: spouses find out, fathers learn a child isn't theirs, and culprits are brought to justice
  - people with grudges start false rumours, which spread just as well; victims may find out who started them, and liars may be exposed
- **New pages:** Leaders & politics (offices, approval chart, rules, elections with vote counts, everyone who has held office), Crime & justice (crimes by kind and how many were solved, who is locked up, who was wrongly blamed, the full record), and Gossip & secrets (common talk versus what's still secret, true or false, and how many know).
- **Person pages:** the life story now shows reputation, offices held, run-ins with the law, crimes against them, what people say about them, and secrets they know. Secrets stay hidden until you tick "Show secrets".
- **People filters:** criminal record, looked down on, highly respected, holds an office, in prison.
- **History:** crimes, trials, scandals, elections, new rules, disasters and discoveries.
- **New settings:** how much crime there is, and how fast gossip spreads.

**Changed / fixed**
- The save format is now version 4. Earlier saves open and are upgraded automatically (V3 saves tested).
- Positions held by only one person (like the lord) are now always filled when a town is created. Before, a town could start without a lord.
- Office jobs (mayor, sheriff, reeve and so on) are now given by election, appointment or inheritance, not handed out like ordinary jobs.
- An orphan is no longer placed with a household whose head is also a child.

**Checked**
- 12 towns advanced 40 years (all six settings, two seeds), with every record checked every year: 0 problems.
- Stage 1 town creation re-checked at small sizes: 0 problems.
- 6 towns in the browser: every person page (with and without secrets), household, history year and page opened, with 0 errors. Undo, save, reopen and continue all work.
- V3 saves in three settings opened in V4 and advanced 10 years.

## V3 — Stage 2b: the world around them (2026-11-07)

**New**
- **Weather, season by season**, fitting each setting: frosts, droughts, storms, harsh winters; dust storms and solar flares in the space colony. Over the years it averages out to normal, and an "how wild the weather is" setting turns it up or down.
- **Harvests and supply chains:** each kind of work makes and needs things (grain → flour → bread, apples → cider, wool → cloth, livestock → leather, ore → tools). Weather and blights (rust in the wheat, codling moth, a grasshopper plague, murrain, a fungal bloom in the hydroponics…) cut a crop. The growers and everyone who depends on them have a bad year, and they're told why in their life story: no apples means a hard year for the cider presser.
- **Food prices** rise after poor harvests, and costs go up for every household. In the historical and fantasy settings, very poor harvests bring hunger and famine: the poor go short first, and the weakest can die.
- **Big events, invented but with real roots:**
  - fires, floods, storms and tornadoes
  - wars that take men away (some die, some come home wounded or changed)
  - outlaw bands and goblin raids, wolves
  - the lord raising his dues
  - market charters, the railroad arriving, silver strikes and slumps, plant cuts, a supply ship delayed, a dome breach
  - golden harvests and feasts

  Booms bring newcomers, and slumps cost jobs and wages.
- **Money:**
  - every household earns, spends, saves and can fall into debt, in pence (shown as £/s/d), dollars, crowns or credits
  - family help and charity stop the very worst
  - households can be sold up to pay debts, buy homes and move up in the world
  - wealth ("destitute" to "rich") now comes from real savings and property
- **Inheritance:** when the last person in a home dies, the estate goes to the heirs. The medieval setting gives the eldest son the home and most of the rest, the fantasy setting favours the eldest child, and others share equally. Quarrels over the will can follow.
- **Empty-world settlement:**
  - food, shelter, tools and farming grow with the work people do; year one has perfect weather
  - 16 discoveries, each credited to a person: clay pots, smoking meat, stone axes, a fever bark, the first fields, taming goats, a kiln, copper and more
  - discoveries open new kinds of work (farmer, herder, potter, weaver, smith) and improve healing
  - poor shelter means deaths from cold
  - after the first years, people slowly accept that a husband or wife left on Earth is gone, and can marry again
  - with no birth control, families grow larger
- **New page: Economy & land:**
  - a chart of good and bad years
  - households by means (click to list them)
  - the trades hit hardest and doing best
  - richest households and those deepest in debt
  - average earnings by work
  - weather and harvests year by year
  - in the empty world, this page shows the settlement's progress and discoveries instead
- **Household pages** show the home, whether it's owned, savings or debt, last year's earnings and spending, and a chart of what the household is worth over time. The households list shows means and can be filtered by them.
- **Person pages** show what the person earned last year.
- **History** shows each year's weather, harvest and food prices.
- **People filters:** poor, in debt, well-off.
- **New settings:** how often disasters happen, and how wild the weather is.

**Changed**
- The save format is now version 3. V1 and V2 saves open and are upgraded automatically (tested).
- Babies and people who marry in from outside now always get a role (a fix).
- Two households with the same surname in a feud are now named by their heads.
- Illness hits the poor harder and the rich a little less.

**Checked**
- 12 towns advanced 40 years (all six settings, two seeds), with every record checked every year: 0 problems.
- 6 towns in the browser: every person, household, history year and page opened, with 0 errors. Undo, save, reopen and continue all work.
- V2 saves in three settings opened, upgraded and advanced 10 years without problems.

**Known**
- The empty-world group of mostly older adults shrinks in the first decades, then levels off as children grow up. The fertility setting can change that.
- Save files are about 0.4–0.6 MB per simulated year for 1,000 people.

## V2 — Stage 2a: the yearly life engine (2026-11-07)

**New**
- **▶ Next year** and **Advance…** (1–500 years) buttons. Each year is lived season by season (spring, summer, autumn, winter), with a progress bar and a Stop button.
- **Undo** goes back to before the last advance. The last 3 states are kept while the window is open.
- **Backups page:** choose a folder (Chrome/Edge) and a backup file is written after every advance, and every 10 years during long runs. Restore points can also be downloaded.
- **History page:** every year from the oldest records to now, with a population chart. Each year opens to show its summary, causes of death, deaths, births, weddings, separations, newcomers, people who moved away, serious illness, injuries, scandals and feuds. You can jump to a decade and switch the order.
- **Health:**
  - illnesses spread through households, workplaces and neighbourhoods
  - outbreaks for each setting (influenza, measles, smallpox, the bloody flux, cholera, the great pestilence, a native microbe fever, the grey fever and others)
  - injuries by kind of work, some leaving lasting harm (a limp, missing fingers, blindness in one eye…)
  - accidents where someone else is to blame cause guilt and grudges
  - long-term conditions develop with age
- **Pregnancy:** tracked season by season, with miscarriage, twins, deaths in childbirth and infant deaths. Babies are sometimes born outside marriage or from secret affairs.
- **Romance:** crushes, courtship, proposals and weddings (or living together), break-ups and heartbreak. Courtship can happen across a family feud. Each marriage has a quality that rises and falls, and affairs can be discovered, leading to separation.
- **Minds:** mood, strain, grief (fading over time, depending on temperament), trauma, guilt, depression with recovery, and heavy drinking with recovery. Each one changes later behaviour: drinking costs jobs and health, and grief and trauma can make someone withdraw from everyone.
- **Ripples:** when something happens to someone, family and friends feel it in proportion to how close they are. Rivals feel the opposite.
- **Relationships change over time:** friendships grow, drift apart or sour after quarrels. Grudges flare, cool, get forgotten or are forgiven, and every change is kept in a "what happened between them" history. Family feuds flare up, end (for example when a marriage joins the families), or start from bitter enmities.
- **Work:**
  - skills grow with use and fade with age
  - school, college and apprenticeships, ending in work in the master's trade
  - retirement, lay-offs, job changes, family businesses passed on
  - good and bad years at work
- **Homes and moving:** young people move out, the elderly move in with their children, orphans are taken in, newcomers arrive, and young people and whole families move away.
- **Empty-world setting:** people slowly learn each other's languages, and survival roles are filled as children grow up. Desired family size goes up by one.
- **Person pages:**
  - "Year by year" now covers every year, with a one-line summary and reasons, events by season, mood and health bars, and a life chart
  - new "Mind, body & skills" tab
  - connections are split into current and past
  - the life story adds the person's current state
- **People filters by situation:** unhappy, depressed, grieving, drinking, pregnant, courting, out of work, and others.
- **New era settings (starting estimates, editable):** newcomers per year, young people leaving, whole households leaving, medicine level, outbreak chance, accident risk.

**Changed**
- The save format is now version 2. Version 1 saves open and are upgraded automatically.
- Background deaths now give causes that fit the person's age.

**Checked**
- 18 towns advanced 30–100 years across all six settings, with every record checked every year: 0 problems.
- 6 towns in the browser: every person page, every history year and every view opened, with 0 errors. Undo, save, reopen and continuing all work.

**Known**
- Save files grow by about 0.3–0.7 MB per simulated year for 1,000 people. A century can reach 40–75 MB.
- The empty-world settlement tends to shrink, because there is no food, shelter or medicine system yet (coming in V3 / Stage 2b).

## V1 — Stage 1: create, browse, save (2026-11-07)
- Create a community of 20–1,000 people in six settings: Medieval village, 1800s frontier, Modern small town, Fantasy kingdom, Space colony, Dropped into an empty world.
- About 90 years of back-history: families, marriages, deaths, step-families, orphans, newcomers and departures.
- Jobs and workplaces, households and areas, friendships, crushes, rivals, enemies, strained family ties, friend groups, family feuds and loners.
- Pages: overview with census-style numbers, a searchable people list, person pages (life story, family, connections, year by year, character), households, groups, feuds and grudges, places of work, and era settings.
- Save and open (.town.json).
