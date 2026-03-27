import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { ShoppingItem } from '../types'

interface ShoppingState {
  items: ShoppingItem[]
  loading: boolean
  error: string | null
  fetchItems: () => Promise<void>
  addItem: (name: string, note?: string, category?: string) => Promise<void>
  toggleBought: (id: string) => Promise<void>
  clearBought: () => Promise<void>
  subscribeRealtime: () => () => void
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ items: data as ShoppingItem[], loading: false })
    }
  },

  addItem: async (name, note, category) => {
    const { data, error } = await supabase
      .from('shopping_list')
      .insert({ name, note: note ?? null, category: category ?? null })
      .select()
      .single()
    if (!error && data) {
      set((s) => ({ items: [...s.items, data as ShoppingItem] }))
    }
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
        items: s.items.map((i) => (i.id === id ? (data as ShoppingItem) : i)),
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
