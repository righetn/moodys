# Plan: align app structure with `Customer_Sentiment_Dashboard (1).html`

**Source HTML:** `Customer_Sentiment_Dashboard (1).html` (structure and layout regions only; ignore `:root` colors, Inter import, Chart.js/XLSX scripts, and inline theme CSS.)

**Target route:** `app/page.tsx` → `DashboardProvider` → `SentimentDashboard` (and supporting `components/sentiment/*`).

**Theme:** No changes to `app/globals.css`, Tailwind theme extensions, or root `app/layout.tsx` font wiring unless you explicitly request it later.

---

## 1. HTML summary (regions, top to bottom)

1. **Page wrapper** — Max-width container with horizontal padding (`.pw`).
2. **Header** (`header.hdr`) — Flex row: **logo** (image), **vertical separator**, **text block** (live client count + date), **source pills** (HubSpot / Modjo indicators, non-interactive chips).
3. **KPI strip** (`.kpi-grid`) — Responsive auto-fit grid of **clickable** KPI tiles (emoji, value, label, hint); some tiles act as score filters.
4. **Controls** (`.controls`) — Flex row: **search** (`input`), **CSM** filter (`select`). Optional **filter indicator** line with “Reset” action.
5. **Body** (`.page-body`) — **Two-column grid**: main column (~1fr) + **sticky sidebar** (~272px); stacks to one column under ~1100px.
6. **Main column** — Card-like table shell (`.tbl-wrap`) → **data table** with sortable headers; **expandable detail rows** (full colspan) with inner **two-column** grid: **Modjo calls** | **HubSpot emails** (call cards / email cards).
7. **Sidebar** (`aside.page-sidebar`) — Two stacked **cards** with titles, subtitles, and **chart** canvases (donut “Mood distribution”, bar “Health by Segment”).
8. **Footer** — Centered small line with attribution and date.

---

## 2. Current vs proposed (high level)

| Area | Today (`SentimentDashboard` + children) | Proposed vs HTML blueprint |
|------|------------------------------------------|----------------------------|
| Wrapper | `max-w-[1400px] px-6 py-6` | Match HTML intent: slightly wider cap (~1480px), padding rhythm similar to `.pw` (structure only; use existing spacing tokens). |
| Header | Centered `h1` + subtitle only | **Restructure** to horizontal header: optional logo slot, `Separator`-like vertical rule, metadata line (counts/date), source pills row. **No** copying Moody’s SVG or colors from HTML—reuse `DASHBOARD_META` / data for copy. |
| KPIs | `SentimentKpiGrid`: `Card` + label/value/sublabel, no emoji row, different density | **Restructure** grid to mirror HTML: top emoji/visual row, compact card, **clickable filter** behavior aligned with existing `scoreFilter` / KPI data (logic stays in context). Still built from **`Card`** (and subparts). |
| Controls | `Input` + 2× `Select` (score, segment) + `Button` CSV | HTML shows **search + CSM** only. **Product choice:** keep score/segment (app value) but **layout** as single flex wrap row like `.controls`; add **CSM** column/filter only if schema/API exposes CSM (see risks). Keep CSV as extra `Button` (HTML used different export path). |
| Main + sidebar | Single column; **no** charts aside | Introduce **CSS grid** main + sidebar; sidebar = two **`Card`** blocks; chart areas inside cards. |
| Table | 8 columns (Client, Segment, Score, Tendance, Sentiment, Dernier appel, problems, features) | HTML: **6** columns (no Segment/Tendance/Sentiment split—single “Mood”; has **CSM**). **Product choice:** either (A) keep richer app columns and only align **visual shell** (card, row hover, left score accent), or (B) narrow columns to HTML set—**requires** data and copy decisions. |
| Row detail | Single column list of **calls** `Card`s only | **Restructure** to HTML’s **two-column** detail: **Calls** (left) + **Emails** (right), each list in `Card` / `Badge` patterns; use existing client fields if present, else stub empty states like HTML. |
| Footer | None in dashboard | Add semantic `<footer>` block at bottom of dashboard shell (muted text; content from meta / build date). |

`app/page.tsx` stays a thin server page: **no structural change required** unless you extract a layout-only wrapper component.

---

## 3. File-by-file intent

| File | Intent | Theme |
|------|--------|--------|
| `app/page.tsx` | Likely **unchanged** (still fetches clients + wraps provider). | None. |
| `app/layout.tsx` | **Do not edit** for this task. | None. |
| `components/sentiment/sentiment-dashboard.tsx` | Reorder DOM to match: wrapper → header row → KPI grid → controls → `div` grid (main \| aside) → footer. Refactor table/detail JSX for two-column detail; wire sidebar placeholders or charts. Replace raw header sort `<button>` with **`Button`** (`variant="ghost"`) where used for sort controls. | Use existing `bg-background`, `border-border`, `text-muted-foreground`, etc.—no HTML palette. |
| `components/sentiment/sentiment-kpi-grid.tsx` | Adjust **composition** of `Card` to mirror KPI tile structure (emoji row, value, hint); accept click handlers / active state props from parent or context. | Token-only classes. |
| `components/sentiment/dashboard-context.tsx` | Extend only if new filters (CSM) or KPI-linked filter state need shared state; otherwise minimal. | N/A |
| **New** (optional) `components/sentiment/dashboard-header.tsx` | Extract header row (logo slot, pills, counts) for readability. | N/A |
| **New** (optional) `components/sentiment/dashboard-sidebar-charts.tsx` | Two `Card`s + chart mounting; keeps `SentimentDashboard` smaller. | N/A |

---

## 4. Component extraction table (HTML region → feature component)

| HTML region | Feature component | Props / data |
|-------------|-------------------|--------------|
| `.pw` outer | Keep inline in `SentimentDashboard` or thin `DashboardShell` | `children` only if extracted |
| `.hdr` | `DashboardHeader` (optional extract) | `title`/`subtitle` from `DASHBOARD_META`, client count, `lastUpdated`, optional `logoSrc` |
| `.kpi-grid` | `SentimentKpiGrid` (extend) | `kpis`, `onKpiFilter`, `activeFilter` |
| `.controls` | Stay in `SentimentDashboard` or `DashboardToolbar` | `search`, `setSearch`, filters |
| `.page-body` / main / aside | `SentimentDashboard` sections + `DashboardSidebarCharts` | `clients` / filtered slice for charts |
| `.tbl-wrap` + table + detail | `SentimentDashboard` (table section) | `visibleClients`, `expanded`, `toggleExpanded`, sort |
| `footer` | `SentimentDashboard` footer fragment | Static + dynamic date string |

---

## 5. UI primitive mapping table (`@/components/ui`)

| HTML pattern | Import path | Notes |
|--------------|-------------|--------|
| Native `input` search | `@/components/ui/input` | Already used. |
| Native `select` (CSM) | `@/components/ui/select` | Same as score/segment; **no** `<select>`. |
| Primary actions (export, reset) | `@/components/ui/button` | CSV + reset as `Button`. |
| Table shell | `@/components/ui/card` | Outer `Card` for table (already). |
| Table | `@/components/ui/table` | Already used. |
| Pills / score / tags | `@/components/ui/badge` | Already used for issues/features; align “Mood” display with `Badge` if HTML used span badges. |
| KPI tiles | `@/components/ui/card` | Compose `Card`, `CardHeader`, `CardContent`, `CardFooter` as today. |
| Header vertical rule | **Missing:** `@/components/ui/separator` | **Add via shadcn CLI:** `npx shadcn@latest add separator` — then `import { Separator } from "@/components/ui/separator"`. |
| Sidebar charts | **Missing:** dedicated chart primitive | **Add via shadcn CLI:** `npx shadcn@latest add chart` (if your registry exposes it) **or** implement charts in a feature file using the same design tokens, still wrapping chart UI in **`Card`**. Do **not** embed Chart.js from the HTML file without an explicit dependency decision. |

Sortable column headers today use a raw `<button>`. **Align with skill:** use `@/components/ui/button` (`variant="ghost"`, size sm) for sort triggers.

---

## 6. Risks / open questions

1. **Column model:** App shows Segment, Tendance, Sentiment; HTML collapses “Mood” and adds CSM. Confirm whether to **drop/rename** columns vs keep app model with only **layout** changes.
2. **CSM filter:** HTML has `select#csmFilter`; dashboard types/API may not expose CSM per client—confirm schema (`DashboardClient`) before adding filter UI.
3. **Emails in detail:** HTML’s right column lists HubSpot emails; current expanded row appears **calls-only**. Confirm data availability (`DashboardClient` fields) for email list; otherwise plan phased UI (empty state + structure).
4. **Charts:** Sidebar uses Chart.js in HTML. Prefer **shadcn chart** + existing CSS variables, or static placeholders until data series are defined.
5. **Logo / Moody’s branding:** HTML embeds a logo image; legal/branding constraints—use placeholder or existing asset pipeline only with your approval.
6. **Client vs server:** `SentimentDashboard` is `"use client"`; any new chart library must stay client-side or use dynamic import.

---

## 7. Confirmation

Reply with one of:

- **APPROVE** — apply the plan as written.
- **REVISE** (with your notes in the reply) — update the plan first.
- **CANCEL** — discard.

Until you send **APPROVE**, do not modify application source files for this task.
