# React Native (Expo) Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `apps/mobile` (Expo) and `packages/core` so the RN app can reuse the PWA’s domain logic and match UX/design closely, while keeping the existing PWA in place initially.

**Architecture:** Keep platform UI and navigation separate (Mantine/React Router for web, React Navigation for mobile) while centralizing domain logic (Zustand stores, Supabase queries, mapping helpers, types) in `packages/core` with small platform adapters.

**Tech Stack:** Vite + React 19 + Mantine 8 (PWA), Expo (React Native), Zustand, Supabase JS v2, TypeScript.

---

## Notes / Constraints

- **No tests for now** (per request). Prefer manual sanity checks and quick smoke flows.
- Node is via nvm in this repo. Use:

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
```

## Target file structure (end state)

- `apps/mobile/` (new Expo app)
  - `apps/mobile/app/*` or `apps/mobile/src/*` (mobile screens + navigation + theme)
- `apps/mobile/` (new Expo app)
  - `apps/mobile/app/*` or `apps/mobile/src/*` (mobile screens + navigation + theme)
- `packages/core/` (shared domain)
  - `packages/core/src/lib/*` (supabase client factory, shared API helpers)
  - `packages/core/src/store/*` (zustand stores; no direct `window`/`localStorage`)
  - `packages/core/src/types/*`
  - `packages/core/src/platform/*` (storage + auth redirect/linking adapters)

PWA stays at repo root (initially). After mobile is working, we incrementally switch PWA imports to use `packages/core` (option B) to avoid logic drift.

## Manual verification checklist (run occasionally)

- PWA still starts (root): `npm run dev`
- Mobile starts: `npm run dev` from `apps/mobile` (Expo)
- Shared package builds typecheck: `npm run build` (root orchestrator)

---

### Task 1: Create branch for RN monorepo work

**Files:**
- Modify: none

- [ ] **Step 1: Check git status is clean enough to branch**

Run:

```bash
git status
```

Expected: You may have local modifications; that’s OK, but be aware they will carry into the branch.

- [ ] **Step 2: Create and switch to branch**

Run:

```bash
git switch -c feat/react-native-monorepo
```

Expected: Now on `feat/react-native-monorepo`.

---

### Task 2: Convert repo root into a workspace host

**Files:**
- Modify: `package.json`
- Create: (optional) `apps/pwa/package.json`, `apps/mobile/package.json`, `packages/core/package.json`

- [ ] **Step 1: Update root `package.json` to use workspaces**

Edit `package.json`:
- Add `"workspaces": ["apps/*", "packages/*"]`
- Keep existing scripts for now (PWA remains at repo root)

- [ ] **Step 2: Add root scripts to delegate**

Add scripts (example):
- `dev:pwa`, `build:pwa`, `lint:pwa`
- `dev:mobile`
- `build:core`
- `dev` can remain PWA-only initially

- [ ] **Step 3: Install after workspace change**

Run:

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
npm install
```

Expected: lockfile updated for workspaces.

- [ ] **Step 4: Commit workspace host change**

Run:

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore: enable npm workspaces for apps and packages

EOF
)"
```

---

### Task 3: Create `packages/core` skeleton (shared domain)

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/lib/*`
- Create: `packages/core/src/store/*`
- Create: `packages/core/src/types/*`
- Create: `packages/core/src/platform/*`

- [ ] **Step 1: Create package skeleton**

Run:

```bash
mkdir -p packages/core/src/{lib,store,types,platform}
```

- [ ] **Step 2: Create `packages/core/package.json`**

Include:
- name: `@lagret/core`
- main/exports for TS (prefer `"type": "module"`, `"exports": { ".": "./src/index.ts" }` initially)
- deps: `zustand`, `@supabase/supabase-js`, `dayjs` (only if used in shared code)

- [ ] **Step 3: Add `supabase` client factory**

Create `packages/core/src/lib/supabase.ts` exporting something like:
- `createSupabaseClient({ url, anonKey })`

Avoid `import.meta.env` usage in core.

- [ ] **Step 4: Add platform adapters (stubs)**

Create:
- `packages/core/src/platform/storage.ts` (interface)
- `packages/core/src/platform/webStorage.ts` (localStorage impl; used by PWA)
- `packages/core/src/platform/nativeStorage.ts` (AsyncStorage impl; used by mobile)

Keep these thin and dependency-contained.

- [ ] **Step 5: Export barrel**

In `packages/core/src/index.ts`, export `lib`, `store`, and `types` public API.

- [ ] **Step 6: Commit core skeleton**

Run:

```bash
git add packages/core
git commit -m "$(cat <<'EOF'
chore: add shared core package skeleton

EOF
)"
```

---

### Task 4: Migrate shared types + pure helpers from PWA to `packages/core`

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/lib/*`
- Create: `packages/core/src/store/*`
- Create: `packages/core/src/types/*`
- Create: `packages/core/src/platform/*`

- [ ] **Step 1: Create package skeleton**

Run:

```bash
mkdir -p packages/core/src/{lib,store,types,platform}
```

- [ ] **Step 2: Create `packages/core/package.json`**

Include:
- name: `@lagret/core`
- main/exports for TS (prefer `"type": "module"`, `"exports": { ".": "./src/index.ts" }` initially)
- deps: `zustand`, `@supabase/supabase-js`, `dayjs` (only if used in shared code)

- [ ] **Step 3: Add `supabase` client factory**

Create `packages/core/src/lib/supabase.ts` exporting something like:
- `createSupabaseClient({ url, anonKey })`

Avoid `import.meta.env` usage in core.

- [ ] **Step 4: Add platform adapters (stubs)**

Create:
- `packages/core/src/platform/storage.ts` (interface)
- `packages/core/src/platform/webStorage.ts` (localStorage impl; used by PWA)
- `packages/core/src/platform/nativeStorage.ts` (AsyncStorage impl; used by mobile)

Keep these thin and dependency-contained.

- [ ] **Step 5: Export barrel**

In `packages/core/src/index.ts`, export `lib`, `store`, and `types` public API.

- [ ] **Step 6: Commit core skeleton**

Run:

```bash
git add packages/core
git commit -m "$(cat <<'EOF'
chore: add shared core package skeleton

EOF
)"
```

---

**Files:**
- Modify/Create: `packages/core/src/types/*`
- Modify: PWA imports (repo root `src/*`)

- [ ] **Step 1: Move `src/types` (or equivalent) to core**

Copy/move types into `packages/core/src/types`.

- [ ] **Step 2: Fix PWA imports**

Update PWA imports to use `@lagret/core` exports.

- [ ] **Step 3: Commit shared types**

Run:

```bash
git add packages/core src
git commit -m "$(cat <<'EOF'
refactor: share domain types via @lagret/core

EOF
)"
```

---

### Task 5: Migrate Supabase wrapper + mapping helpers to core

**Files:**
- Create/Modify: `packages/core/src/lib/*`
- Modify: `src/lib/supabase.ts` (becomes thin wrapper)

- [ ] **Step 1: Move logic into core**

PWA currently has `src/lib/supabase.ts` using `import.meta.env`.
Refactor so:
- Core owns `createSupabaseClient`
- PWA creates the configured client using `import.meta.env` and exports it for PWA-only UI code

- [ ] **Step 2: Commit supabase refactor**

Run:

```bash
git add packages/core src
git commit -m "$(cat <<'EOF'
refactor: centralize supabase client factory in @lagret/core

EOF
)"
```

---

### Task 6: Migrate Zustand stores into `packages/core` with platform adapter injections

**Files:**
- Create/Modify: `packages/core/src/store/*`
- Modify: `src/store/*` (becomes re-exports or removed)
- Modify: `src/App.tsx` and store imports as needed

- [ ] **Step 1: Move one store at a time (start with auth)**

Auth store currently references `window.location.origin` for redirects.
Refactor auth store in core to accept:
- `getRedirectUrl(): string` (web) or `getOAuthRedirectUrl(): string` (platform)

PWA provides a small adapter that returns `window.location.origin`.

- [ ] **Step 2: Repeat for household/locations/inventory/shopping stores**

Goal: stores in core have zero `window` usage and no direct `localStorage`.

- [ ] **Step 3: Ensure PWA still runs**

Smoke run root dev server again.

- [ ] **Step 4: Commit store migration**

Run:

```bash
git add packages/core src
git commit -m "$(cat <<'EOF'
refactor: move zustand stores into shared @lagret/core

EOF
)"
```

---

### Task 7: Scaffold Expo app in `apps/mobile`

**Files:**
- Create: `apps/mobile/*`

- [ ] **Step 1: Create Expo app**

Run:

```bash
mkdir -p apps
cd apps
npx create-expo-app@latest mobile
```

Expected: `apps/mobile` created.

- [ ] **Step 2: Set app package name + workspace**

Edit `apps/mobile/package.json`:
- name: `@lagret/mobile`
- ensure it can import `@lagret/core`

- [ ] **Step 3: Add env variables**

Document `.env` usage for Expo:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 4: Commit Expo scaffold**

Run:

```bash
git add apps/mobile
git commit -m "$(cat <<'EOF'
chore: scaffold Expo mobile app workspace

EOF
)"
```

---

### Task 8: Implement mobile theme + navigation shell matching PWA

**Files:**
- Create/Modify: `apps/mobile/src/theme/*` (or `app/theme/*`)
- Create/Modify: `apps/mobile/src/navigation/*`
- Create/Modify: `apps/mobile/src/screens/*`

- [ ] **Step 1: Add fonts and terra palette**

Use Expo font loading to include Manrope/Epilogue (or closest) and define shared color constants:
- `BG = #F7F2EB`
- `TERRA = #B5432A`

- [ ] **Step 2: Create auth gate**

Implement:
- loading state (mirrors `PageLoader`)
- login screen when unauthenticated
- app tabs when authenticated

- [ ] **Step 3: Bottom tabs**

Tabs: Lagret / Recept / Inköp / Hushåll
Match PWA footer styling as close as RN allows.

- [ ] **Step 4: Commit mobile shell**

Run:

```bash
git add apps/mobile
git commit -m "$(cat <<'EOF'
feat(mobile): add auth gate and bottom tab shell

EOF
)"
```

---

### Task 9: Wire mobile screens to shared stores (incremental)

**Files:**
- Modify: `apps/mobile/src/screens/*`
- Modify: `packages/core/src/store/*` (if adapters missing)

- [ ] **Step 1: Start with Inventory screen**

Show list of items and basic refresh. Ensure the same household selection assumptions are respected.

- [ ] **Step 2: Add Shopping, Household, Recipes**

Port behavior before polishing UI.

- [ ] **Step 3: Commit per screen**

One commit per screen to keep history readable.

---

## Self-review (plan vs spec)

- Spec requires: Expo + bottom tabs + shared `packages/core` + platform adapters + terra theme → covered by Tasks 2–9.
- No placeholders like TBD/TODO in steps → OK.
- Naming consistency: `@lagret/mobile`, `@lagret/core` used throughout.

