import { setupServer } from 'msw/node'
import { mealdbHandlers } from './handlers/mealdb'
import { supabaseHandlers } from './handlers/supabase'
import { offHandlers } from './handlers/openFoodFacts'

export const server = setupServer(...mealdbHandlers, ...supabaseHandlers, ...offHandlers)
