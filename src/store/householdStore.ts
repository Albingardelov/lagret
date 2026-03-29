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
    const household = households.find((h) => h.id === id)
    if (!household) return
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
      households: s.households.some((h) => h.id === mapped.id)
        ? s.households
        : [...s.households, mapped],
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
      households: s.households.some((h) => h.id === mapped.id)
        ? s.households
        : [...s.households, mapped],
      household: mapped,
      activeHouseholdId: mapped.id,
      loading: false,
    }))
    await get().fetchMembers(mapped.id)
  },
}))
