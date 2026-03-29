# Multi-hushåll & Medlemslista — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Låt användare vara med i flera hushåll, byta aktivt hushåll på Hushåll-sidan och se vilka e-poster som är med i det aktiva hushållet.

**Architecture:** Databasen får en ny SECURITY DEFINER-funktion för att hämta medlemmars e-poster. `householdStore` utökas med `households[]`, `members[]`, `activeHouseholdId` (persisterat i localStorage) och `setActiveHousehold()`. `HouseholdPage` får tre sektioner: hushållsväljare, medlemslista och befintlig platshantering.

**Tech Stack:** React 19, TypeScript, Zustand, Supabase (RPC, RLS), Mantine 8, Vitest

---

## Filstruktur

| Fil | Förändring |
|-----|-----------|
| `supabase/migrations/20260329000001_household_members_fn.sql` | Ny — SQL-funktion `get_household_members` |
| `src/types/index.ts` | Lägg till `HouseholdMember`-interface |
| `src/store/householdStore.ts` | Utöka state + nya funktioner |
| `src/store/__tests__/householdStore.test.ts` | Ny — enhetstester |
| `src/pages/HouseholdPage.tsx` | Ny UI: hushållsväljare + medlemslista |

---

## Task 1: SQL-migration

**Files:**
- Create: `supabase/migrations/20260329000001_household_members_fn.sql`

- [ ] **Steg 1: Skapa migrationsfilen**

```sql
-- supabase/migrations/20260329000001_household_members_fn.sql
CREATE OR REPLACE FUNCTION get_household_members(hid uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT hm.user_id, u.email::text
  FROM household_members hm
  JOIN auth.users u ON u.id = hm.user_id
  WHERE hm.household_id = hid
    AND is_household_member(hid);
$$;
```

- [ ] **Steg 2: Kör SQL i Supabase Dashboard**

Öppna Supabase Dashboard → SQL Editor → klistra in innehållet ovan → Run.
Verifiera: kör `SELECT get_household_members('<ditt-household-id>')` — ska returnera rader med `user_id` och `email`.

- [ ] **Steg 3: Commit migrationsfilen**

```bash
git add supabase/migrations/20260329000001_household_members_fn.sql
git commit -m "db: add get_household_members RPC function"
```

---

## Task 2: Lägg till HouseholdMember-typ

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Steg 1: Lägg till interface i types/index.ts**

Lägg till detta direkt efter `Household`-interfacet (rad 52):

```ts
export interface HouseholdMember {
  userId: string
  email: string
}
```

- [ ] **Steg 2: Bygg för att verifiera inga TypeScript-fel**

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
npm run build 2>&1 | grep -E "error|✓ built"
```

Förväntat: `✓ built in ...`

- [ ] **Steg 3: Commit**

```bash
git add src/types/index.ts
git commit -m "types: add HouseholdMember interface"
```

---

## Task 3: Skriv testfil för householdStore (failing)

**Files:**
- Create: `src/store/__tests__/householdStore.test.ts`

- [ ] **Steg 1: Skapa testfil**

```ts
// src/store/__tests__/householdStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// Mock dependent stores — fetchLocations, fetchItems are called on household switch
vi.mock('../locationsStore', () => ({
  useLocationsStore: {
    getState: vi.fn(() => ({ fetchLocations: vi.fn() })),
  },
}))
vi.mock('../inventoryStore', () => ({
  useInventoryStore: {
    getState: vi.fn(() => ({ fetchItems: vi.fn() })),
  },
}))
vi.mock('../shoppingStore', () => ({
  useShoppingStore: {
    getState: vi.fn(() => ({ fetchItems: vi.fn() })),
  },
}))

import { supabase } from '../../lib/supabase'
import { useHouseholdStore } from '../householdStore'

const mockHouseholds = [
  { id: 'hh-1', name: 'Hemma', invite_code: 'abc12345', created_at: '2026-01-01' },
  { id: 'hh-2', name: 'Stugan', invite_code: 'xyz67890', created_at: '2026-02-01' },
]

function makeChain(data: unknown, error: unknown = null) {
  const chain = { select: vi.fn(), eq: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(), insert: vi.fn(), single: vi.fn() }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.limit.mockReturnValue(chain)
  chain.maybeSingle.mockResolvedValue({ data, error })
  chain.insert.mockReturnValue(chain)
  chain.single.mockResolvedValue({ data, error })
  return chain
}

beforeEach(() => {
  // Reset store state between tests
  useHouseholdStore.setState({
    households: [],
    household: null,
    activeHouseholdId: null,
    members: [],
    loading: false,
    error: null,
  })
  localStorage.clear()
  vi.clearAllMocks()
})

describe('fetchHouseholds', () => {
  it('sätter households från Supabase', async () => {
    vi.mocked(supabase.from).mockReturnValue(makeChain(null) as ReturnType<typeof supabase.from>)
    // Override maybeSingle with array response
    const chain = makeChain(null)
    chain.select.mockReturnValue({ data: mockHouseholds, error: null } as unknown as ReturnType<typeof chain.select>)
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>)

    await useHouseholdStore.getState().fetchHouseholds()

    const { households } = useHouseholdStore.getState()
    expect(households).toHaveLength(2)
    expect(households[0].id).toBe('hh-1')
    expect(households[0].name).toBe('Hemma')
    expect(households[0].inviteCode).toBe('abc12345')
  })

  it('sätter household till första om inget sparats i localStorage', async () => {
    const chain = { select: vi.fn().mockResolvedValue({ data: mockHouseholds, error: null }) }
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>)

    // Mock rpc för fetchMembers
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as Awaited<ReturnType<typeof supabase.rpc>>)

    await useHouseholdStore.getState().fetchHouseholds()

    expect(useHouseholdStore.getState().household?.id).toBe('hh-1')
  })

  it('återställer sparat aktivt hushåll från localStorage', async () => {
    localStorage.setItem('lagret:activeHousehold', 'hh-2')
    const chain = { select: vi.fn().mockResolvedValue({ data: mockHouseholds, error: null }) }
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>)
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as Awaited<ReturnType<typeof supabase.rpc>>)

    await useHouseholdStore.getState().fetchHouseholds()

    expect(useHouseholdStore.getState().household?.id).toBe('hh-2')
    expect(useHouseholdStore.getState().activeHouseholdId).toBe('hh-2')
  })
})

describe('setActiveHousehold', () => {
  it('uppdaterar household och sparar i localStorage', async () => {
    useHouseholdStore.setState({
      households: [
        { id: 'hh-1', name: 'Hemma', inviteCode: 'abc12345', createdAt: '2026-01-01' },
        { id: 'hh-2', name: 'Stugan', inviteCode: 'xyz67890', createdAt: '2026-02-01' },
      ],
    })
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as Awaited<ReturnType<typeof supabase.rpc>>)

    await useHouseholdStore.getState().setActiveHousehold('hh-2')

    expect(useHouseholdStore.getState().household?.id).toBe('hh-2')
    expect(useHouseholdStore.getState().activeHouseholdId).toBe('hh-2')
    expect(localStorage.getItem('lagret:activeHousehold')).toBe('hh-2')
  })
})

describe('fetchMembers', () => {
  it('sätter members från RPC', async () => {
    const mockMembers = [
      { user_id: 'u-1', email: 'anna@example.com' },
      { user_id: 'u-2', email: 'bjorn@example.com' },
    ]
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockMembers, error: null } as Awaited<ReturnType<typeof supabase.rpc>>)

    await useHouseholdStore.getState().fetchMembers('hh-1')

    const { members } = useHouseholdStore.getState()
    expect(members).toHaveLength(2)
    expect(members[0].email).toBe('anna@example.com')
    expect(members[0].userId).toBe('u-1')
  })

  it('sätter members till [] om RPC misslyckas', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'fel' } } as Awaited<ReturnType<typeof supabase.rpc>>)

    await useHouseholdStore.getState().fetchMembers('hh-1')

    expect(useHouseholdStore.getState().members).toEqual([])
  })
})
```

- [ ] **Steg 2: Kör testerna — verifiera att de misslyckas**

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
npm run test -- src/store/__tests__/householdStore.test.ts 2>&1 | tail -15
```

Förväntat: testfilen hittas men testerna misslyckas med fel som `households is not a function` eller liknande — store saknar de nya funktionerna.

---

## Task 4: Implementera householdStore

**Files:**
- Modify: `src/store/householdStore.ts`

- [ ] **Steg 1: Ersätt hela householdStore.ts**

```ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Household, HouseholdMember } from '../types'
import { useLocationsStore } from './locationsStore'
import { useInventoryStore } from './inventoryStore'
import { useShoppingStore } from './shoppingStore'

const ACTIVE_HH_KEY = 'lagret:activeHousehold'

interface HouseholdState {
  households: Household[]
  household: Household | null
  activeHouseholdId: string | null
  members: HouseholdMember[]
  loading: boolean
  error: string | null
  fetchHousehold: () => Promise<void>
  fetchHouseholds: () => Promise<void>
  setActiveHousehold: (id: string) => Promise<void>
  fetchMembers: (id: string) => Promise<void>
  createHousehold: (name: string) => Promise<void>
  joinHousehold: (inviteCode: string) => Promise<void>
}

function mapHousehold(row: Record<string, string>): Household {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
  }
}

export const useHouseholdStore = create<HouseholdState>((set, get) => ({
  households: [],
  household: null,
  activeHouseholdId: null,
  members: [],
  loading: false,
  error: null,

  // Bakåtkompatibelt alias — AppLayout anropar fetchHousehold()
  fetchHousehold: async () => {
    await get().fetchHouseholds()
  },

  fetchHouseholds: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.from('households').select('*')
    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    const households = (data ?? []).map((row) => mapHousehold(row as Record<string, string>))
    set({ households, loading: false })

    if (households.length === 0) return

    // Återställ aktivt hushåll från localStorage, annars välj första
    const saved = localStorage.getItem(ACTIVE_HH_KEY)
    const active = households.find((h) => h.id === saved) ?? households[0]
    set({ household: active, activeHouseholdId: active.id })
    localStorage.setItem(ACTIVE_HH_KEY, active.id)
    await get().fetchMembers(active.id)
  },

  setActiveHousehold: async (id: string) => {
    const { households } = get()
    const household = households.find((h) => h.id === id) ?? null
    set({ household, activeHouseholdId: id })
    localStorage.setItem(ACTIVE_HH_KEY, id)
    await get().fetchMembers(id)
    await useLocationsStore.getState().fetchLocations()
    await useInventoryStore.getState().fetchItems()
    await useShoppingStore.getState().fetchItems()
  },

  fetchMembers: async (id: string) => {
    const { data, error } = await supabase.rpc('get_household_members', { hid: id })
    if (error || !data) {
      set({ members: [] })
      return
    }
    const members: HouseholdMember[] = (data as { user_id: string; email: string }[]).map(
      (row) => ({ userId: row.user_id, email: row.email })
    )
    set({ members })
  },

  createHousehold: async (name) => {
    set({ loading: true, error: null })
    const { data: hh, error: hhError } = await supabase
      .from('households')
      .insert({ name })
      .select()
      .single()
    if (hhError || !hh) {
      set({ error: hhError?.message ?? 'Okänt fel', loading: false })
      return
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({ household_id: hh.id, user_id: user?.id })
    if (memberError) {
      set({ error: memberError.message, loading: false })
      return
    }
    const mapped = mapHousehold(hh as Record<string, string>)
    localStorage.setItem(ACTIVE_HH_KEY, mapped.id)
    await useLocationsStore.getState().fetchLocations()
    set((s) => ({
      households: [...s.households, mapped],
      household: mapped,
      activeHouseholdId: mapped.id,
      loading: false,
    }))
    await get().fetchMembers(mapped.id)
  },

  joinHousehold: async (inviteCode) => {
    set({ loading: true, error: null })
    const { data: hh, error: findError } = await supabase
      .from('households')
      .select('*')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .maybeSingle()
    if (findError || !hh) {
      set({ error: 'Hittade inget hushåll med den koden', loading: false })
      return
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({ household_id: hh.id, user_id: user?.id })
    if (memberError) {
      set({ error: memberError.message, loading: false })
      return
    }
    const mapped = mapHousehold(hh as Record<string, string>)
    localStorage.setItem(ACTIVE_HH_KEY, mapped.id)
    await useLocationsStore.getState().fetchLocations()
    set((s) => ({
      households: [...s.households, mapped],
      household: mapped,
      activeHouseholdId: mapped.id,
      loading: false,
    }))
    await get().fetchMembers(mapped.id)
  },
}))
```

- [ ] **Steg 2: Kör testerna — verifiera att de passerar**

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
npm run test -- src/store/__tests__/householdStore.test.ts 2>&1 | tail -15
```

Förväntat: alla tester i filen passerar.

- [ ] **Steg 3: Kör alla tester — verifiera att inget gick sönder**

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
npm run test 2>&1 | tail -8
```

Förväntat: `204+` passed, samma 1 pre-existing failed fil som innan.

- [ ] **Steg 4: Commit**

```bash
git add src/store/householdStore.ts src/store/__tests__/householdStore.test.ts
git commit -m "feat: householdStore — multi-household, setActiveHousehold, fetchMembers"
```

---

## Task 5: Uppdatera HouseholdPage

**Files:**
- Modify: `src/pages/HouseholdPage.tsx`

- [ ] **Steg 1: Uppdatera imports och store-destructuring**

Ersätt den inledande `useHouseholdStore`-destructureringen (rad 63–64) med:

```tsx
const { households, household, members, loading, error, fetchHouseholds, setActiveHousehold, createHousehold, joinHousehold } =
  useHouseholdStore()
```

Uppdatera även `useEffect` (rad 81–83) som anropar `fetchHousehold` till `fetchHouseholds`:

```tsx
useEffect(() => {
  fetchHouseholds()
}, [fetchHouseholds])
```

Lägg till `IconUsers` i Tabler-importen:

```tsx
import {
  IconCopy, IconCheck, IconPlus, IconDoor, IconEdit, IconTrash,
  IconFridge, IconBox, IconSnowflake, IconChevronRight, IconLogout,
  IconUsers,
} from '@tabler/icons-react'
```

Lägg till `HouseholdMember` i types-importen:

```tsx
import type { LocationIcon, HouseholdMember } from '../types'
```

- [ ] **Steg 2: Lägg till "Mina hushåll"-sektion i det inloggade vyn**

Ersätt den befintliga "Household card"-boxen (det terraröda kortet, rad 284–370) med följande block som innehåller hushållsväljaren + det aktiva hushållets kort:

```tsx
{/* Mina hushåll */}
{households.length > 1 && (
  <Box px="md" mb="md">
    <Text
      style={{
        fontFamily: '"Manrope", sans-serif',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#7A6A5A',
        marginBottom: 10,
      }}
    >
      Mina hushåll
    </Text>
    <Stack gap={8}>
      {households.map((hh) => {
        const isActive = hh.id === household?.id
        return (
          <UnstyledButton
            key={hh.id}
            onClick={() => !isActive && setActiveHousehold(hh.id)}
            style={{
              background: CARD_BG,
              borderRadius: 14,
              padding: '14px 16px',
              boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
              border: isActive ? `2px solid ${TERRA}` : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: isActive ? 'default' : 'pointer',
            }}
          >
            <Box>
              <Text
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1C1410',
                }}
              >
                {hh.name}
              </Text>
              <Text
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#9A8A7A',
                  letterSpacing: '0.08em',
                }}
              >
                {hh.inviteCode}
              </Text>
            </Box>
            {isActive && (
              <Box
                style={{
                  background: TERRA,
                  borderRadius: 20,
                  padding: '3px 10px',
                }}
              >
                <Text
                  style={{
                    fontFamily: '"Manrope", sans-serif',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Aktivt
                </Text>
              </Box>
            )}
          </UnstyledButton>
        )
      })}
    </Stack>
  </Box>
)}

{/* Aktivt hushåll — terraröd hero-kort (befintlig design, oförändrad) */}
<Box
  mx="md"
  mb="md"
  style={{
    background: TERRA,
    borderRadius: 18,
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  }}
>
  <Box
    style={{
      position: 'absolute',
      top: -20,
      right: -20,
      width: 100,
      height: 100,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.08)',
    }}
  />
  <Text
    style={{
      fontFamily: '"Manrope", sans-serif',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: 'rgba(255,255,255,0.7)',
      textTransform: 'uppercase',
      marginBottom: 4,
    }}
  >
    Aktivt hushåll
  </Text>
  <Text
    style={{
      fontFamily: '"Epilogue", sans-serif',
      fontWeight: 800,
      fontSize: 22,
      color: '#FFFFFF',
      marginBottom: 12,
    }}
  >
    {household?.name}
  </Text>
  <Group gap="xs" align="center">
    <Text style={{ fontFamily: '"Manrope", sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
      Inbjudningskod:
    </Text>
    <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.1em' }}>
      {household?.inviteCode}
    </Text>
    <CopyButton value={household?.inviteCode ?? ''} timeout={2000}>
      {({ copied, copy }) => (
        <Tooltip label={copied ? 'Kopierat!' : 'Kopiera'} withArrow>
          <ActionIcon
            variant="filled"
            onClick={copy}
            size="sm"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', borderRadius: 6 }}
          >
            {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  </Group>
</Box>

{/* Medlemmar */}
<Box px="md" mb="md">
  <Group gap={6} mb={10} align="center">
    <IconUsers size={14} color="#7A6A5A" />
    <Text
      style={{
        fontFamily: '"Manrope", sans-serif',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#7A6A5A',
      }}
    >
      Medlemmar
    </Text>
  </Group>
  <Stack gap={6}>
    {members.map((m: HouseholdMember) => (
      <Box
        key={m.userId}
        style={{
          background: CARD_BG,
          borderRadius: 12,
          padding: '10px 14px',
          boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
        }}
      >
        <Text
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 13,
            color: '#1C1410',
          }}
        >
          {m.email}
        </Text>
      </Box>
    ))}
    {members.length === 0 && (
      <Text
        style={{
          fontFamily: '"Manrope", sans-serif',
          fontSize: 13,
          color: '#9A8A7A',
          textAlign: 'center',
          padding: '8px 0',
        }}
      >
        Inga medlemmar hittades
      </Text>
    )}
  </Stack>
</Box>
```

- [ ] **Steg 3: Bygg och verifiera**

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
npm run build 2>&1 | grep -E "error|✓ built"
```

Förväntat: `✓ built in ...`

- [ ] **Steg 4: Kör alla tester**

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
npm run test 2>&1 | tail -8
```

Förväntat: samma antal passerade tester som innan (204+).

- [ ] **Steg 5: Commit och push**

```bash
git add src/pages/HouseholdPage.tsx src/types/index.ts
git commit -m "feat: HouseholdPage — hushållsväljare och medlemslista"
git push
```
