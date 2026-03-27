import { setupServer } from 'msw/node'
import { recipeHandlers } from './handlers/recipes'
import { supabaseHandlers } from './handlers/supabase'
import { offHandlers } from './handlers/openFoodFacts'

export const server = setupServer(...recipeHandlers, ...supabaseHandlers, ...offHandlers)
