import { create } from 'zustand'
import type { ShoppingItem } from '../types/index.ts'
import { getSupabaseClient } from '../lib/supabaseClient.ts'
import { useHouseholdStore } from './householdStore.ts'

type ShoppingListRow = {
  id: string
  household_id: string
  name: string
  quantity: number
  unit: string
  note: string | null
  category: string | null
  is_bought: boolean
  created_at: string
}

function mapItem(row: ShoppingListRow): ShoppingItem {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    note: row.note ?? undefined,
    category: row.category ?? undefined,
    isBought: row.is_bought,
    createdAt: row.created_at,
  }
}

interface ShoppingState {
  items: ShoppingItem[]
  loading: boolean
  error: string | null
  fetchItems: () => Promise<void>
  addItem: (
    name: string,
    quantity?: number,
    unit?: string,
    note?: string,
    category?: string
  ) => Promise<void>
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
    const supabase = getSupabaseClient()
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) return

    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })
      .returns<ShoppingListRow[]>()

    if (error) {
      set({ error: error.message, loading: false })
      throw new Error(error.message)
    }

    set({ items: (data ?? []).map(mapItem), loading: false })
  },

  addItem: async (name, quantity, unit, note, category) => {
    const supabase = getSupabaseClient()
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) throw new Error('Inget hushåll laddat')

    const { data, error } = await supabase
      .from('shopping_list')
      .insert({
        household_id: householdId,
        name,
        quantity: quantity ?? 1,
        unit: unit ?? 'st',
        note: note ?? null,
        category: category ?? null,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    if (data) set((s) => ({ items: [...s.items, mapItem(data as ShoppingListRow)] }))
  },

  removeItem: async (id) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('shopping_list').delete().eq('id', id)
    if (error) throw new Error(error.message)
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

  toggleBought: async (id) => {
    const supabase = getSupabaseClient()
    const item = get().items.find((i) => i.id === id)
    if (!item) return

    const { data, error } = await supabase
      .from('shopping_list')
      .update({ is_bought: !item.isBought })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    if (data) {
      const updated = mapItem(data as ShoppingListRow)
      set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }))
    }
  },

  clearBought: async () => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('shopping_list').delete().eq('is_bought', true)
    if (error) throw new Error(error.message)
    set((s) => ({ items: s.items.filter((i) => !i.isBought) }))
  },

  subscribeRealtime: () => {
    const supabase = getSupabaseClient()
    const channel = supabase
      .channel('shopping_list_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, () => {
        get()
          .fetchItems()
          .catch(() => {})
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
