import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useHouseholdStore } from './householdStore'
import { useShoppingStore } from './shoppingStore'
import type { InventoryItem } from '../types'

function mapItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    name: row.name as string,
    barcode: (row.barcode as string) ?? undefined,
    quantity: row.quantity as number,
    unit: row.unit as string,
    location: row.location as string,
    expiryDate: (row.expiry_date as string) ?? undefined,
    category: (row.category as string) ?? undefined,
    minQuantity: (row.min_quantity as number) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

type NewItem = Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>

interface InventoryState {
  items: InventoryItem[]
  loading: boolean
  error: string | null
  fetchItems: () => Promise<void>
  addItem: (item: NewItem) => Promise<void>
  addItems: (items: NewItem[]) => Promise<void>
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  getByLocation: (location: string) => InventoryItem[]
  getExpiringSoon: (days?: number) => InventoryItem[]
  subscribeRealtime: () => () => void
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.from('inventory').select('*').order('name')
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ items: (data as Record<string, unknown>[]).map(mapItem), loading: false })
    }
  },

  addItem: async (item) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) {
      throw new Error('common.errors.noHousehold')
    }
    const now = new Date().toISOString()
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: ingen svar från databasen (10s)')), 10000)
    )
    const insert = supabase.from('inventory').insert({
      household_id: householdId,
      name: item.name,
      barcode: item.barcode ?? null,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      expiry_date: item.expiryDate ?? null,
      category: item.category ?? null,
      min_quantity: item.minQuantity ?? null,
      created_at: now,
      updated_at: now,
    })
    const { error } = await Promise.race([insert, timeout])
    if (error) throw new Error(error.message)
    get().fetchItems()
  },

  addItems: async (items) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) {
      throw new Error('common.errors.noHousehold')
    }
    const now = new Date().toISOString()
    const rows = items.map((item) => ({
      household_id: householdId,
      name: item.name,
      barcode: item.barcode ?? null,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      expiry_date: item.expiryDate ?? null,
      category: item.category ?? null,
      min_quantity: item.minQuantity ?? null,
      created_at: now,
      updated_at: now,
    }))
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: ingen svar från databasen (10s)')), 10000)
    )
    const insert = supabase.from('inventory').insert(rows)
    const { error } = await Promise.race([insert, timeout])
    if (error) throw new Error(error.message)
    get().fetchItems()
  },

  updateItem: async (id, updates) => {
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit
    if (updates.location !== undefined) dbUpdates.location = updates.location
    if (updates.expiryDate !== undefined) dbUpdates.expiry_date = updates.expiryDate ?? null
    if (updates.category !== undefined) dbUpdates.category = updates.category ?? null
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode ?? null
    if (updates.minQuantity !== undefined) dbUpdates.min_quantity = updates.minQuantity ?? null
    const { data, error } = await supabase
      .from('inventory')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      const updated = mapItem(data as Record<string, unknown>)
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? updated : i)),
      }))
      // Auto-add to shopping list if quantity dropped below minimum
      if (
        updated.minQuantity !== undefined &&
        updated.minQuantity > 0 &&
        updated.quantity < updated.minQuantity
      ) {
        const shopping = useShoppingStore.getState()
        const alreadyPending = shopping.items.some(
          (i) => !i.isBought && i.name.toLowerCase() === updated.name.toLowerCase()
        )
        if (!alreadyPending) {
          shopping.addItem(updated.name).catch(() => {})
        }
      }
    }
  },

  deleteItem: async (id) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id)
    if (!error) {
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
    }
  },

  getByLocation: (location) => get().items.filter((i) => i.location === location),

  subscribeRealtime: () => {
    const channel = supabase
      .channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        get().fetchItems()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  },

  getExpiringSoon: (days = 3) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + days)
    return get().items.filter((i) => {
      if (!i.expiryDate) return false
      const expiry = new Date(i.expiryDate)
      return expiry >= today && expiry <= cutoff
    })
  },
}))
