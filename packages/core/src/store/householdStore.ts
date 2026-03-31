import { create } from 'zustand'
import type { Household, HouseholdMember } from '../types/index.ts'
import { getStorageAdapter } from '../lib/storageClient.ts'
import { getSupabaseClient } from '../lib/supabaseClient.ts'

const ACTIVE_HH_KEY = 'lagret:activeHousehold'

interface HouseholdState {
  households: Household[]
  household: Household | null
  activeHouseholdId: string | null
  members: HouseholdMember[]
  loading: boolean
  error: string | null
  fetchHouseholds: () => Promise<void>
  fetchMembers: (id: string) => Promise<void>
  setActiveHousehold: (id: string) => Promise<void>
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

  fetchHouseholds: async () => {
    const supabase = getSupabaseClient()
    const storage = getStorageAdapter()

    set({ loading: true, error: null })
    const { data, error } = await supabase.from('households').select('*')
    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    const households = (data ?? []).map((row) => mapHousehold(row as Record<string, string>))
    set({ households, loading: false })
    if (households.length === 0) return

    const saved = await storage.getItem(ACTIVE_HH_KEY)
    const active = households.find((h) => h.id === saved) ?? households[0]
    set({ household: active, activeHouseholdId: active.id })
    await storage.setItem(ACTIVE_HH_KEY, active.id)
    await get().fetchMembers(active.id)
  },

  setActiveHousehold: async (id: string) => {
    const storage = getStorageAdapter()
    const { households } = get()
    const household = households.find((h) => h.id === id)
    if (!household) return
    set({ household, activeHouseholdId: id })
    await storage.setItem(ACTIVE_HH_KEY, id)
    await get().fetchMembers(id)
  },

  fetchMembers: async (id: string) => {
    const supabase = getSupabaseClient()
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
}))
