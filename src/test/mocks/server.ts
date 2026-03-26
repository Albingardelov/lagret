import { setupServer } from 'msw/node'
import { mealdbHandlers } from './handlers/mealdb'
import { supabaseHandlers } from './handlers/supabase'

export const server = setupServer(...mealdbHandlers, ...supabaseHandlers)
