# Plan template (optional)

Copy into `docs/plans/html-structure-<slug>.md` and fill in.

## 1. Goal

One sentence: which route or feature should match which HTML reference.

## 2. HTML region map

| Order | Region (from HTML) | Role (main / aside / header / …) |
|------:|---------------------|-------------------------------------|
| 1 | | |

## 3. Repo mapping

| Region | Today (file/component) | Proposed (file/component) | Theme impact |
|--------|-------------------------|---------------------------|--------------|
| | | | None — structure only |

## 3b. UI primitives (`@/components/ui`)

Map every control-like HTML pattern to an existing file under `components/ui/` or a planned shadcn add. No parallel hand-rolled buttons/inputs in feature folders.

| HTML pattern | Import (`@/components/ui/...`) | If missing |
|--------------|----------------------------------|------------|
| e.g. `<button>` | `@/components/ui/button` | `npx shadcn@latest add button` |

## 4. File change list

- `app/...` — …
- `components/...` — …

## 5. Implementation order

1. …
2. …

## 6. Out of scope

- No changes to `app/globals.css`, theme config, or root layout fonts unless explicitly requested.
- No copying hex/rgb or webfont families from HTML.

## 7. Confirmation

(See main SKILL.md confirmation block.)
