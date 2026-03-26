import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Household } from '../types'
import { useLocationsStore } from './locationsStore'

interface HouseholdState {
  household: Household | null
  loading: boolean
  error: string | null
  fetchHousehold: () => Promise<void>
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

export const useHouseholdStore = create<HouseholdState>((set) => ({
  household: null,
  loading: false,
  error: null,

  fetchHousehold: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.from('households').select('*').limit(1).maybeSingle()
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ household: data ? mapHousehold(data as Record<string, string>) : null, loading: false })
    }
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
    await useLocationsStore.getState().fetchLocations()
    set({ household: mapHousehold(hh as Record<string, string>), loading: false })
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
    await useLocationsStore.getState().fetchLocations()
    set({ household: mapHousehold(hh as Record<string, string>), loading: false })
  },
}))
