import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useHouseholdStore } from './householdStore'
import type { MealPlan } from '../types'

function mapItem(row: Record<string, unknown>): MealPlan {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    date: row.date as string,
    recipeId: (row.recipe_id as number | null) ?? null,
    title: row.title as string,
    createdAt: row.created_at as string,
  }
}

interface MealPlanState {
  items: MealPlan[]
  loading: boolean
  fetchItems: (startDate: string, endDate: string) => Promise<void>
  addItem: (date: string, title: string, recipeId?: number) => Promise<void>
  updateItem: (id: string, title: string, recipeId?: number | null) => Promise<void>
  removeItem: (id: string) => Promise<void>
  subscribeRealtime: () => () => void
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  items: [],
  loading: false,

  fetchItems: async (startDate, endDate) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) return
    set({ loading: true })
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('household_id', householdId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
    set({ loading: false })
    if (error) throw new Error('Kunde inte hämta måltidsplanen')
    set({ items: (data ?? []).map(mapItem) })
  },

  addItem: async (date, title, recipeId) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) throw new Error('Inget hushåll valt')
    const { data, error } = await supabase
      .from('meal_plans')
      .upsert(
        {
          household_id: householdId,
          date,
          title,
          recipe_id: recipeId ?? null,
        },
        { onConflict: 'household_id,date' }
      )
      .select()
      .single()
    if (error || !data) throw new Error('Kunde inte spara måltid')
    const item = mapItem(data)
    set((s) => ({
      items: [...s.items.filter((i) => i.date !== date), item].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    }))
  },

  updateItem: async (id, title, recipeId) => {
    const { data, error } = await supabase
      .from('meal_plans')
      .update({ title, recipe_id: recipeId ?? null })
      .eq('id', id)
      .select()
      .single()
    if (error || !data) throw new Error('Kunde inte uppdatera måltid')
    const item = mapItem(data)
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? item : i)),
    }))
  },

  removeItem: async (id) => {
    const { error } = await supabase.from('meal_plans').delete().eq('id', id)
    if (error) throw new Error('Kunde inte ta bort måltid')
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('meal_plan_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_plans' }, () => {
        const { items } = get()
        if (items.length > 0) {
          const dates = items.map((i) => i.date).sort()
          get().fetchItems(dates[0], dates[dates.length - 1])
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
