---
name: html-structure-to-app-plan
description: Compares a static HTML file’s layout hierarchy to the repo’s Next.js app/ tree and components, drafts a Markdown change plan for review, and applies edits only after explicit confirmation. Preserves theme, tokens, and global styling; maps controls to existing shadcn/ui primitives under @/components/ui only. Use when the user supplies HTML (path or attachment) to mirror page structure visually without replacing the design system or hand-rolling UI widgets.
---

# HTML structure → App plan (theme-safe)

## When to use

The user provides **HTML as a file path, workspace path, or pasted/attached HTML**. Goal: align **page and component structure** with that HTML’s **regions and hierarchy** (visual layout intent), **not** to port colors, fonts, or theme from the HTML.

## Non-negotiables

1. **Do not overwrite theme**: leave `app/globals.css`, design tokens, Tailwind theme extensions, and root `app/layout.tsx` **font/theme wiring** unchanged unless the user explicitly asks to change branding.
2. **HTML is structure-only**: treat tags, nesting, landmarks (`main`, `header`, `nav`, `section`, grids/flex wrappers) as a **blueprint**. Ignore or strip HTML-specific styling for replication purposes (inline `style`, `<style>` blocks, link to external CSS) except to infer **spatial relationships** (columns, stacks, sticky regions).
3. **Follow this repo’s Next.js**: read `node_modules/next/dist/docs/` for APIs and file conventions when unsure; heed deprecations (see `AGENTS.md`).
4. **UI primitives from the design library only**: interactive and structural widgets that correspond to shadcn-style building blocks (`Button`, `Card`, `Input`, `Select`, `Table`, `Badge`, etc.) must be implemented by **importing from `@/components/ui/...`** (see `components.json` → `aliases.ui`). Do **not** replicate `<button>`, `<select>`, `<input>`, tables, dialogs, etc. with raw HTML or ad-hoc styled `div`s when a library component exists or can be added. If the HTML implies a primitive that is **not** yet in `components/ui/`, list it in the plan as **“add via shadcn CLI”** (e.g. `npx shadcn@latest add dialog`) and wait for approval before adding; still **no** copying markup/CSS from the source HTML for those controls.

## Inputs

- **HTML source**: absolute or repo-relative path, or raw HTML the user pasted.
- **Target scope** (infer or ask once): single route (`app/page.tsx`), nested route (`app/.../page.tsx`), or a specific component under `components/`.

## Workflow

### 1. Ingest HTML

- Parse the DOM mentally or with tools: document order, major sections, repeated patterns (cards, rows, sidebars), responsive hints (classes like `grid-cols-*` in HTML are **hints for layout shape**, not a mandate to copy class names or colors).
- Note **accessibility landmarks** and heading levels to preserve in JSX.

### 2. Map to `app/` and components

- Inventory **`app/`**: `layout.tsx`, `page.tsx`, route segments, `loading.tsx` / `error.tsx` / `template.tsx` if present.
- Inventory **`@/components/ui/*`**: list primitives already present; every HTML control-like element must map to one of these (or a planned shadcn add).
- Find **existing components** that already match sections; prefer **composition and moves** over new files.
- Decide **where structure lives**: App Router pages should stay thin; move reusable blocks into `components/` (or existing feature folders like `components/sentiment/`). **Feature components** compose **`@/components/ui/*`**; they do not reimplement shadcn-level controls.

### 3. Write the plan (Markdown only)

Create or update a **single plan file** the user can read in preview (suggested path: `docs/plans/html-structure-<short-slug>.md`). If `docs/plans/` does not exist, create it.

The plan **must** include:

- **HTML summary**: bullet list of top-level regions in order.
- **Current vs proposed tree**: which `app/*` files and which components change; what stays the same.
- **File-by-file intent**: for each touched file, 1–3 sentences: what structural JSX moves (wrap, split, extract), **explicitly “no theme changes”** where relevant.
- **Component extraction table**: HTML region → existing or new **feature** component name → props/data needs (no new colors).
- **UI primitive mapping table**: For each control-like HTML pattern (e.g. native `button`, `select`, table), give the concrete **`@/components/ui/...`** import path (example: `@/components/ui/button`). If the primitive is missing, note **add via shadcn CLI** with the component name (example: `npx shadcn@latest add dialog`)—do not substitute raw HTML.
- **Risks / open questions**: e.g. data fetching boundaries, client vs server components.
- **Confirmation block** (copy-paste ready):

```markdown
## Confirmation

Reply with one of:
- **APPROVE** — apply the plan as written.
- **REVISE: <notes>** — update the plan first.
- **CANCEL** — discard.

Until you send **APPROVE**, do not modify application source files for this task.
```

### 4. Wait for approval

- **Do not** edit `app/`, `components/`, or styles for this task until the user replies **APPROVE** (or equivalent clear consent).
- If the user revises, update the same Markdown plan and re-ask.

### 5. After approval

- Apply **structural** changes only: JSX hierarchy, wrappers, semantic tags, component splits, imports.
- For controls and shadcn-level patterns, **only** `import … from "@/components/ui/..."` (plus any approved new files under `components/ui/` from the shadcn CLI). **Do not** add parallel “local” button/input/table components outside `components/ui/` for the same role.
- Reuse **existing** Tailwind utility patterns from neighboring code for **layout spacing** only where needed; do **not** introduce palette/typography from the HTML file.
- Run typecheck/lint if available; fix issues introduced by the change.

## Output discipline

- **First deliverable** is always the **Markdown plan**, not a large diff.
- Keep the plan **concrete**: file paths, component names, and ordering of sections—not vague “refactor layout.”

## Additional resources

- For a fuller plan template, see [reference.md](reference.md).
