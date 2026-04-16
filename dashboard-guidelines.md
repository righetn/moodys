# Agent guidelines: `PUT /api/dashboard` (score batch)

## Purpose

- One **PUT** = one **batch**: the server assigns a new **`batchId`** (UUID) and one **`batch_created_at`** for every client in that request.
- **`id`** is the organization key: organizations are **upserted** by `id`; each client becomes one **`score`** row for that batch.

## Preconditions

- **`DASHBOARD_UPDATE_TOKEN`** must be set on the server (otherwise **503**).
- **`DATABASE_URL`** or **`POSTGRES_URL`** must be set (otherwise writes fail).
- Base URL: `{APP_ORIGIN}/api/dashboard` (e.g. `https://your-app.example.com/api/dashboard`).

## HTTP contract

| Item         | Value                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| Method       | **PUT**                                                                   |
| Path         | **/api/dashboard**                                                        |
| Content-Type | **application/json**                                                      |
| Body size    | Max **2 MB** (via `content-length`); larger → **413** `PAYLOAD_TOO_LARGE` |

## Authentication

Send exactly one of:

- **`Authorization: Bearer <DASHBOARD_UPDATE_TOKEN>`**
- **`x-dashboard-token: <DASHBOARD_UPDATE_TOKEN>`**

**Never** log the token, put it in URLs, or expose it in user-visible output. Read it from a secret store or environment variable on the caller side.

## JSON body shape

Accepted forms:

1. **`{ "clients": [ ... ] }`**
2. Root **array** `[ ... ]` (the server normalizes to `{ clients: [...] }` before validation).

## Per-client fields (validation)

Each object in **`clients`** must satisfy the Zod schema in `lib/schemas/dashboard.ts` (`dashboardClientSchema`).

- **`id`**: string, length 1–64 (organization id; stable across batches).
- **`displayName`**: string, 1–500 chars (org name, updated on upsert).
- **`searchName`**: max 2000 chars.
- **`hubspotUrl`**: valid URL.
- **`segment`**: string, 1–500 chars.
- **`score`**: integer **1–3** or **`null`**.
- **`scoreFilter`**: **`"1"` | `"2"` | `"3"` | `"na"`**, and must match **`score`**:
  - If **`score === null`** → **`scoreFilter` must be `"na"`**.
  - If **`score` is 1, 2, or 3** → **`scoreFilter` must be `"1"`, `"2"`, or `"3"`** respectively (string, same value as score).
- **`lastCall`**: string max 32 chars or **`null`**.
- **`problems`**: array of strings, max **80** items, each string max **4000** chars.
- **`features`**: same limits as `problems`.
- **`detailTitle`**: string, 1–500 chars.
- **`emptyMessage`**: max 4000 chars or **`null`**.
- **`calls`**: max **100** items; each: **`title`** (1–500), **`sentiment`**, **`date`**, **`summary`** (per-schema length caps).
- **`emails`**: max **100** items; each: **`subject`**, **`direction`** (`inbound` | `outbound`), **`sentiment`**, **`sender``, **`date`**, **`hubspotUrl`\*\* (valid URL).
- **`csm`**: max 200 chars or **`null`**.

## Batch limits and uniqueness

- Max **500** clients per request (`MAX_CLIENTS_PER_PAYLOAD`).
- **No duplicate `id`** in a single payload: DB constraint `UNIQUE (organization_id, batch_id)`; duplicates in one PUT can cause failure.

## Success response

- **200** with JSON: **`{ "ok": true, "batchId": "<uuid>" }`**.
- **`batchId` is server-generated**; the client cannot choose it. Store it if you need audit or correlation.

## Errors (agent handling)

| Status  | Meaning                                | Suggested action                                                                                   |
| ------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **401** | Missing or wrong token                 | Fix auth; do not spin retry loops with a bad token.                                                |
| **400** | Invalid JSON or validation failure     | Fix payload; non-production may include **`details`** (Zod).                                       |
| **413** | Payload too large                      | Split or shrink; respect 2 MB and 500 clients.                                                     |
| **503** | Token not configured or DB URL missing | Environment/config issue; stop and fix deployment.                                                 |
| **500** | Write failure                          | Treat as operational error; retry policy is your choice (each successful PUT creates a new batch). |

## Recommended agent workflow

1. Build client objects matching the schema (reference `data.json` for real shapes).
2. Deduplicate by **`id`** within the batch.
3. If more than **500** clients, split into multiple PUTs (each = separate batch / **`batchId`**).
4. Validate URLs and **`score` / `scoreFilter`** pairs before sending.
5. Send **PUT** with auth header and JSON body.
6. On success, record **`batchId`**; optionally **GET `/api/dashboard`** with **`Authorization: Bearer`** (or **`x-dashboard-token`**) using a token that matches **`DASHBOARD_READ_TOKEN`** and/or **`DASHBOARD_UPDATE_TOKEN`** (same rules as server config; GET returns **503** if neither env var is set).

## Optional system-prompt snippet

> Use `PUT {BASE_URL}/api/dashboard` with JSON `{ "clients": [...] }` or a root array. Authenticate with `Authorization: Bearer {DASHBOARD_UPDATE_TOKEN}` or header `x-dashboard-token`. Each client must satisfy the dashboard client schema: valid HubSpot URLs; `score` null iff `scoreFilter` is `"na"`; otherwise `scoreFilter` must equal `String(score)`. Max 500 clients and 2 MB per request; no duplicate `id` in one payload. On 200, read `batchId` from the response. Never log the token.

## Code references

- Route: `app/api/dashboard/route.ts` (GET/PUT).
- Payload schema: `lib/schemas/dashboard.ts`.
- DB write: `lib/db/dashboard.ts` (`appendDashboardClients`).
- Auth helpers: `lib/dashboard-update-auth.ts`.
