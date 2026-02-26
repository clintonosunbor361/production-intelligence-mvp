# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is **Maison Couture ERP** — a production intelligence system for a tailoring/garment business. It tracks items (garments) through a production pipeline, assigns work to tailors, manages QC, and computes payroll.

The repo contains **two parallel apps**:

1. **Root app** (`/src`, `vite.config.js`) — React + Vite prototype using localStorage as a mock database. Original MVP; kept for reference.
2. **`erp-next/`** — Next.js 16 (App Router) rewrite with real Supabase backend. This is the production app.

## Commands

### Root Vite App (run from repo root)
```bash
npm run dev       # start dev server
npm run build     # production build
npm run lint      # eslint
```

### erp-next (run from `erp-next/` directory)
```bash
cd erp-next
npm run dev       # Next.js dev with Turbopack
npm run build     # production build
npm run lint      # eslint
```

## Architecture

### Domain Model

Core workflow: **Production creates Items → QC assigns Work to Tailors → Accounts batches payments → Completion marks Items complete**

- **Tickets** — order references (`ticket_number`); group one or more Items
- **Items** — individual garments; `item_key` is generated as `{ticket_number}-{ProductType}-{seq}` in `createProductionBatchAction`
- **Work Assignments** — the financial unit; links Item + TaskType + Tailor; stores immutable pay snapshots (`pay_band_snapshot`, `rate_snapshot`, `pay_amount`)
- **Tailors** — Band A or Band B; determines which rate card column applies
- **Rate Cards** — fee lookup keyed by `(organization_id, task_type_id, product_type_id)` with `band_a_fee` / `band_b_fee`
- **Roles**: `admin`, `production`, `qc`, `accounts`, `completion`

Work assignment state machine: `CREATED → QC_PASSED / QC_FAILED → PAID → REVERSED`

### Root Vite App (`/src`)

- `src/services/db.js` — `MaisonDB` class backed by `localStorage` (key: `maison_db_v1`). Call `db.reset()` to re-seed from `mockData.js`.
- `src/context/AuthContext.jsx` — mock auth with role switcher; no real backend
- Pages mirror domain roles: `Admin/`, `Production/`, `QC/`, `Accounts/`, `Completion/`, `Dashboard/`

### erp-next (`/erp-next/src`)

- **App Router** with root layout → `Providers` (SupabaseAuthProvider) → `DashboardLayout`
- `src/middleware.ts` — refreshes Supabase sessions; redirects unauthenticated users to `/login`
- `src/context/SupabaseAuthContext.tsx` — real Supabase auth; exposes `{ user, role, permissions, orgId, signOut, loading }`; fetches role + permissions from `user_roles → roles → role_permissions → permissions`
- `src/app/actions/spine.ts` — all business mutations as Server Actions. Operational mutations call Supabase RPCs. Master data writes use `createAdminClient()` (service role) after verifying `has_permission('admin')`
- `src/lib/supabase/server.ts` — SSR server client (`createClient`) + service role client (`createAdminClient`)
- `src/lib/supabase/client.ts` — browser client for client components
- `src/components/Layout/DashboardLayout.jsx` — login route bypasses layout (renders children only); all other routes get sidebar + header with dynamic page title computed from pathname
- `src/components/Layout/Sidebar.jsx` — role-filtered navigation; admin sees all routes, other roles see only their permitted paths
- All pages read data directly from Supabase via `createClient()` (browser); mutations call Server Actions

### Supabase Schema (`/supabase/`)

| File | Purpose |
|------|---------|
| `schema.sql` | Table definitions + `set_updated_at` trigger + immutability guard trigger — run first |
| `rls.sql` | RLS policies + `current_org_id()` and `has_permission()` helper functions |
| `functions.sql` | Business logic RPCs (`SECURITY DEFINER`): `create_work_assignment`, `qc_pass`, `qc_fail`, `create_payment_batch`, `reverse_payment`, `cancel_item`, `complete_item`, `cancel_ticket` |
| `triggers.sql` | Additional triggers |

The top-level `schema.sql` (repo root) is an older draft; the canonical schema is in `/supabase/`.

## Key Patterns

- **All writes in erp-next go through `spine.ts` Server Actions** — client components never mutate data directly
- **Operational RPCs (`create_work_assignment`, `qc_pass`, etc.)** use the user SSR client so RLS + permission checks run inside the DB
- **Master data writes** (tailors, product_types, task_types, rate_cards) use `createAdminClient()` (service role) after explicitly checking `has_permission('admin')` via RPC, because these tables have no RLS write policies
- **Pay snapshots are immutable** — `pay_band_snapshot`, `rate_snapshot`, `pay_amount` on work_assignments are set at creation and enforced by DB trigger; never recompute them
- **`item_key` is generated in `createProductionBatchAction`** as `{ticketNumber}-{productTypeName}-{n}` — not by a DB trigger in the new schema
- **Multi-tenant** — every table has `organization_id`; `current_org_id()` resolves the current user's org. RLS enforces org isolation automatically for reads; inserts must include `organization_id`
- **No `// @ts-nocheck`** in new files — migration is complete; all new erp-next pages are fully typed
