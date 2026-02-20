# AGENTS.md — Coding Agent Guide

This document is intended for AI coding agents (GitHub Copilot, Cursor, etc.) working in this repository. Read it in full before making changes.

---

## Project overview

**Farm Data Hub** is a Next.js 13 (App Router) web application that:

1. Authenticates users with Supabase Auth (email/password).
2. Lets users connect their John Deere Operations Center account via OAuth 2.0.
3. Proxies John Deere API calls through Supabase Edge Functions (Deno) to keep secrets server-side.
4. Displays fields and harvest operations from the selected organization.

The app can be deployed to **Bolt** or **Netlify** (a `netlify.toml` is already present).

---

## Build, lint, and type-check commands

```bash
npm install          # install dependencies
npm run dev          # start Next.js dev server (http://localhost:3000)
npm run build        # production build
npm run lint         # ESLint (next lint)
npm run typecheck    # tsc --noEmit (no output files)
```

There are no automated tests in this project. Manual browser testing is the primary verification method.

---

## Architecture

```
Browser
  │
  ├── Next.js App (frontend)
  │     ├── /login            — Supabase email/password auth
  │     ├── /dashboard        — Main view (connect JD, pick org, view data)
  │     └── /auth/callback    — John Deere OAuth redirect handler
  │
  └── Supabase
        ├── Auth              — User accounts
        ├── Database          — john_deere_connections table (one row per user)
        └── Edge Functions    — Server-side secrets & John Deere API proxy
              ├── john-deere-auth   — Token exchange / refresh / disconnect
              └── john-deere-api    — Organizations / fields / harvest ops
```

The frontend **never calls the John Deere API directly**. All John Deere calls go through Edge Functions, which hold the client secret.

---

## Directory structure

```
app/
  layout.tsx                  # Root layout; wraps everything in <AuthProvider>
  page.tsx                    # Redirect to /login or /dashboard
  login/page.tsx              # Sign-in / sign-up UI
  dashboard/page.tsx          # Dashboard page (auth-gated)
  auth/callback/page.tsx      # Handles ?code= from John Deere OAuth redirect

components/
  dashboard/
    john-deere-connect.tsx    # Connect / Disconnect card
    organization-selector.tsx # Fetch orgs from JD, persist selection to Supabase
    fields-list.tsx           # List fields for selected org
    harvest-operations.tsx    # List harvest operations per field
  ui/                         # shadcn/ui primitives (do not edit manually)

contexts/
  auth-context.tsx            # React context: user, session, johnDeereConnection

lib/
  supabase.ts                 # Supabase browser client (uses NEXT_PUBLIC_* vars)
  john-deere-client.ts        # fetch() wrappers → Supabase Edge Functions
  utils.ts                    # shadcn cn() utility

types/
  database.ts                 # TypeScript types for Supabase tables
  john-deere.ts               # TypeScript types for John Deere API responses

supabase/
  migrations/
    20260205140923_create_john_deere_tokens_table.sql
  functions/
    john-deere-auth/index.ts  # Deno edge function: OAuth token management
    john-deere-api/index.ts   # Deno edge function: John Deere API proxy
```

---

## Environment variables

### Frontend (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase public anon key |
| `NEXT_PUBLIC_JOHN_DEERE_CLIENT_ID` | ✅ | John Deere OAuth client ID (used to build auth URL) |

### Supabase Edge Functions

| Variable | Required | Description |
|----------|----------|-------------|
| `JOHN_DEERE_CLIENT_ID` | ✅ | John Deere OAuth client ID |
| `JOHN_DEERE_CLIENT_SECRET` | ✅ | John Deere OAuth client secret (never exposed to browser) |
| `SUPABASE_URL` | auto | Injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | auto | Injected by Supabase runtime (bypasses RLS) |

---

## Database schema

Table: **`john_deere_connections`** (one row per authenticated user)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid FK → `auth.users` | UNIQUE, CASCADE DELETE |
| `access_token` | text | Short-lived John Deere token |
| `refresh_token` | text | Long-lived token for renewal |
| `token_expires_at` | timestamptz | Used to decide when to refresh |
| `selected_org_id` | text (nullable) | Currently selected JD org |
| `selected_org_name` | text (nullable) | Display name for selected org |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Row-Level Security is enabled. Authenticated users can only read/write their own row. Edge Functions use the service role key and therefore bypass RLS.

---

## OAuth flow (John Deere)

```
1. User clicks "Connect" in JohnDeereConnect component
      → getJohnDeereAuthUrl() builds authorize URL with state + redirect_uri
      → Browser redirects to signin.johndeere.com

2. John Deere redirects back to /auth/callback?code=...
      → CallbackPage extracts code
      → exchangeCodeForTokens() calls POST /functions/v1/john-deere-auth?action=exchange
      → Edge Function trades code for tokens and upserts into john_deere_connections

3. On each API call, the john-deere-api Edge Function calls getValidToken()
      → If token expires within 5 minutes, it auto-refreshes before calling the JD API
```

---

## Supabase Edge Functions

Both functions share the same pattern:
1. Validate the `Authorization: Bearer <user_jwt>` header using `supabase.auth.getUser()`.
2. Dispatch on the `?action=` query param.
3. Return JSON with CORS headers.

### `john-deere-auth`

| Action | Method | Description |
|--------|--------|-------------|
| `exchange` | POST | Trade authorization code for tokens; upsert into DB |
| `refresh` | POST | Refresh access token using stored refresh token |
| `disconnect` | POST | Delete the user's connection row |

### `john-deere-api`

| Action | Method | Description |
|--------|--------|-------------|
| `organizations` | GET | List organizations from `GET /platform/organizations` |
| `select-organization` | POST | Persist selected org ID/name to DB |
| `fields` | GET | `GET /platform/organizations/{orgId}/fields` |
| `harvest-operations` | GET | Fetch all fields, then `GET /platform/organizations/{orgId}/fields/{fieldId}/fieldOperations?fieldOperationType=HARVEST` |

> **Note:** The app uses the **sandbox** API (`sandboxapi.deere.com`). Change `JOHN_DEERE_API_BASE` in `john-deere-api/index.ts` for production.

---

## Key patterns and conventions

- **`'use client'`** at the top of every component that uses hooks or browser APIs.
- **shadcn/ui** components live in `components/ui/`. Do not edit these manually — regenerate via `npx shadcn-ui add <component>`.
- **Tailwind CSS** for all styling. The design system uses `emerald-600` as the primary action color and `slate-*` for text and backgrounds.
- **Path aliases**: `@/` maps to the project root (configured in `tsconfig.json`).
- **Error handling**: every async call in components is wrapped in try/catch with an `error` state that renders an inline error message.
- **Token refresh**: handled transparently in the `john-deere-api` edge function via `getValidToken()` — callers never need to trigger a refresh manually.

---

## How to add a new John Deere API endpoint

1. Add a new `if (action === "your-action")` block in `supabase/functions/john-deere-api/index.ts`.
2. Add a corresponding `export async function fetchYourData()` in `lib/john-deere-client.ts`.
3. Add TypeScript types to `types/john-deere.ts` if needed.
4. Create or update a component in `components/dashboard/` to display the data.

---

## Deployment

### Bolt (current)
Open the project in [bolt.new](https://bolt.new) — it reads `package.json` and runs automatically.

### Netlify
`netlify.toml` is already configured:
- Build command: `npx next build`
- Plugin: `@netlify/plugin-nextjs`

Set the three frontend environment variables in Netlify site settings.

### Supabase Edge Functions
Deploy with the Supabase CLI:
```bash
supabase functions deploy john-deere-auth
supabase functions deploy john-deere-api
```
Set secrets:
```bash
supabase secrets set JOHN_DEERE_CLIENT_ID=<value>
supabase secrets set JOHN_DEERE_CLIENT_SECRET=<value>
```
