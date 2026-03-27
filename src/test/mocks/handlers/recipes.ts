import { http, HttpResponse } from 'msw'

// Supabase REST API base – matchar VITE_SUPABASE_URL i tester
const BASE = 'http://localhost:54321/rest/v1'

export const MOCK_RECIPE_ROW = {
  id: 1,
  url: 'https://www.ica.se/recept/test-1/',
  slug: 'test-1',
  name: 'Testrecept',
  description: 'Ett testrecept',
  ingredients: ['200 g pasta', '1 burk krossade tomater'],
  instructions: ['Koka pastan.', 'Häll på tomatsåsen.'],
  image_urls: ['https://example.com/image.jpg'],
  cook_time: 'PT20M',
  prep_time: 'PT10M',
  total_time: 'PT30M',
  servings: '4',
}

export const recipeHandlers = [
  // GET recipes by id or slug
  http.get(`${BASE}/recipes`, () => {
    return HttpResponse.json(MOCK_RECIPE_ROW)
  }),

  // RPC calls (search_recipes and match_recipes_by_ingredients)
  http.post(`${BASE}/rpc/search_recipes`, () => {
    return HttpResponse.json([MOCK_RECIPE_ROW])
  }),

  http.post(`${BASE}/rpc/match_recipes_by_ingredients`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Testrecept',
        slug: 'test-1',
        image_urls: ['https://example.com/image.jpg'],
        match_count: 2,
      },
    ])
  }),
]
