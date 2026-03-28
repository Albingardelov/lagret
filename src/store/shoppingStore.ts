import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useHouseholdStore } from './householdStore'
import type { ShoppingItem } from '../types'

function mapItem(row: Record<string, unknown>): ShoppingItem {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    name: row.name as string,
    note: (row.note as string | null) ?? undefined,
    category: (row.category as string | null) ?? undefined,
    isBought: row.is_bought as boolean,
    createdAt: row.created_at as string,
  }
}

interface ShoppingState {
  items: ShoppingItem[]
  loading: boolean
  error: string | null
  fetchItems: () => Promise<void>
  addItem: (name: string, note?: string, category?: string) => Promise<void>
  removeItem: (id: string) => Promise<void>
  toggleBought: (id: string) => Promise<void>
  clearBought: () => Promise<void>
  subscribeRealtime: () => () => void
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) return
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ items: (data as Record<string, unknown>[]).map(mapItem), loading: false })
    }
  },

  addItem: async (name, note, category) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) throw new Error('Inget hushåll laddat')
    const { data, error } = await supabase
      .from('shopping_list')
      .insert({ household_id: householdId, name, note: note ?? null, category: category ?? null })
      .select()
      .single()
    if (error) throw new Error(error.message)
    if (data) {
      set((s) => ({ items: [...s.items, mapItem(data as Record<string, unknown>)] }))
    }
  },

  removeItem: async (id) => {
    const { error } = await supabase.from('shopping_list').delete().eq('id', id)
    if (error) throw new Error(error.message)
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

  toggleBought: async (id) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const { data, error } = await supabase
      .from('shopping_list')
      .update({ is_bought: !item.isBought })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? mapItem(data as Record<string, unknown>) : i)),
      }))
    }
  },

  clearBought: async () => {
    const { error } = await supabase.from('shopping_list').delete().eq('is_bought', true)
    if (!error) {
      set((s) => ({ items: s.items.filter((i) => !i.isBought) }))
    }
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('shopping_list_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, () => {
        get().fetchItems()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
