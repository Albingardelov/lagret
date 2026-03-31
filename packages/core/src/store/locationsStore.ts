import { create } from 'zustand'
import type { LocationIcon, StorageLocation } from '../types/index.ts'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { useHouseholdStore } from './householdStore.ts'

interface LocationsState {
  locations: StorageLocation[]
  loading: boolean
  error: string | null
  fetchLocations: () => Promise<void>
  addLocation: (name: string, icon: LocationIcon) => Promise<void>
  updateLocation: (id: string, name: string, icon: LocationIcon) => Promise<void>
  deleteLocation: (id: string) => Promise<void>
}

type StorageLocationRow = {
  id: string
  household_id: string
  name: string
  icon: LocationIcon
  sort_order: number
  created_at: string
}

function mapLocation(row: StorageLocationRow): StorageLocation {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    icon: row.icon,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

export const useLocationsStore = create<LocationsState>((set, get) => ({
  locations: [],
  loading: false,
  error: null,

  fetchLocations: async () => {
    const supabase = getSupabaseClient()
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) return

    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('storage_locations')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order')
      .returns<StorageLocationRow[]>()

    if (error) {
      set({ error: error.message, loading: false })
      throw new Error(error.message)
    }

    set({ locations: (data ?? []).map(mapLocation), loading: false })
  },

  addLocation: async (name, icon) => {
    const supabase = getSupabaseClient()
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) throw new Error('Inget hushåll laddat')

    const maxOrder = get().locations.reduce((m, l) => Math.max(m, l.sortOrder), -1)
    const { data, error } = await supabase
      .from('storage_locations')
      .insert({ household_id: householdId, name, icon, sort_order: maxOrder + 1 })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    set((s) => ({ locations: [...s.locations, mapLocation(data as StorageLocationRow)] }))
  },

  updateLocation: async (id, name, icon) => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('storage_locations')
      .update({ name, icon })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    const updated = mapLocation(data as StorageLocationRow)
    set((s) => ({
      locations: s.locations.map((l) => (l.id === id ? updated : l)),
    }))
  },

  deleteLocation: async (id) => {
    const supabase = getSupabaseClient()

    const { count, error: countError } = await supabase
      .from('inventory')
      .select('id', { count: 'exact', head: true })
      .eq('location', id)
    if (countError) throw new Error(countError.message)
    if (count && count > 0) throw new Error('Platsen har varor – töm den först')

    const { error } = await supabase.from('storage_locations').delete().eq('id', id)
    if (error) throw new Error(error.message)
    set((s) => ({ locations: s.locations.filter((l) => l.id !== id) }))
  },
}))
