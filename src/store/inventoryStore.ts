import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useHouseholdStore } from './householdStore'
import type { InventoryItem, StorageLocation } from '../types'

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
  getByLocation: (location: StorageLocation) => InventoryItem[]
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
      set({ items: data as InventoryItem[], loading: false })
    }
  },

  addItem: async (item) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) {
      throw new Error('Du måste tillhöra ett hushåll för att lägga till varor')
    }
    const now = new Date().toISOString()
    const { error } = await supabase.from('inventory').insert({
      household_id: householdId,
      name: item.name,
      barcode: item.barcode ?? null,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location,
      expiry_date: item.expiryDate ?? null,
      category: item.category ?? null,
      created_at: now,
      updated_at: now,
    })
    if (error) throw new Error(error.message)
    get().fetchItems()
  },

  addItems: async (items) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) {
      throw new Error('Du måste tillhöra ett hushåll för att lägga till varor')
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
      created_at: now,
      updated_at: now,
    }))
    const { error } = await supabase.from('inventory').insert(rows)
    if (error) throw new Error(error.message)
    get().fetchItems()
  },

  updateItem: async (id, updates) => {
    const { data, error } = await supabase
      .from('inventory')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? (data as InventoryItem) : i)),
      }))
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
