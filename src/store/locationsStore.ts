import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useHouseholdStore } from './householdStore'
import type { StorageLocation, LocationIcon } from '../types'

interface LocationsState {
  locations: StorageLocation[]
  loading: boolean
  error: string | null
  fetchLocations: () => Promise<void>
  addLocation: (name: string, icon: LocationIcon) => Promise<void>
  updateLocation: (id: string, name: string, icon: LocationIcon) => Promise<void>
  deleteLocation: (id: string) => Promise<void>
}

function mapLocation(row: Record<string, unknown>): StorageLocation {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    name: row.name as string,
    icon: row.icon as LocationIcon,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  }
}

export const useLocationsStore = create<LocationsState>((set, get) => ({
  locations: [],
  loading: false,
  error: null,

  fetchLocations: async () => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) return
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('storage_locations')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order')
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ locations: (data as Record<string, unknown>[]).map(mapLocation), loading: false })
    }
  },

  addLocation: async (name, icon) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) throw new Error('common.errors.noHouseholdShort')
    const maxOrder = get().locations.reduce((m, l) => Math.max(m, l.sortOrder), -1)
    const { data, error } = await supabase
      .from('storage_locations')
      .insert({ household_id: householdId, name, icon, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) throw new Error(error.message)
    set((s) => ({ locations: [...s.locations, mapLocation(data as Record<string, unknown>)] }))
  },

  updateLocation: async (id, name, icon) => {
    const { data, error } = await supabase
      .from('storage_locations')
      .update({ name, icon })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    set((s) => ({
      locations: s.locations.map((l) =>
        l.id === id ? mapLocation(data as Record<string, unknown>) : l
      ),
    }))
  },

  deleteLocation: async (id) => {
    const { count, error: countError } = await supabase
      .from('inventory')
      .select('id', { count: 'exact', head: true })
      .eq('location', id)
    if (countError) throw new Error(countError.message)
    if (count && count > 0) throw new Error('common.errors.locationHasItems')
    const { error } = await supabase.from('storage_locations').delete().eq('id', id)
    if (error) throw new Error(error.message)
    set((s) => ({ locations: s.locations.filter((l) => l.id !== id) }))
  },
}))
