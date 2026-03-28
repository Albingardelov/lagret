// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing recipes
const { mockRpc, mockSelect, mockEq, mockIn, mockSingle } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockIn: vi.fn(),
  mockSingle: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
          limit: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
        not: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        in: mockIn,
        textSearch: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
      }),
    })),
  },
}))

import { searchRecipes, getRecipeById, getRecipeBySlug, suggestRecipes } from '../recipes'

const MOCK_DB_ROW = {
  id: 1,
  url: 'https://www.ica.se/recept/test-1/',
  slug: 'test-1',
  name: 'Testrecept',
  description: 'Ett testrecept',
  ingredient_groups: [{ name: null, items: ['200 g pasta', '1 burk krossade tomater'] }],
  instructions: ['Koka pastan.', 'Häll på tomatsåsen.'],
  image_urls: ['https://example.com/image.jpg'],
  cook_time: 'PT20M',
  prep_time: 'PT10M',
  total_time: 'PT30M',
  servings: '4',
}

describe('searchRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls search_recipes RPC and maps results', async () => {
    mockRpc.mockResolvedValue({ data: [MOCK_DB_ROW], error: null })

    const results = await searchRecipes('pasta')
    expect(mockRpc).toHaveBeenCalledWith('search_recipes', { query: 'pasta', lim: 20 })
    expect(results).toHaveLength(1)
    expect(results[0].imageUrls).toEqual(['https://example.com/image.jpg'])
    expect(results[0].cookTime).toBe('PT20M')
  })

  it('returns [] on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } })

    const results = await searchRecipes('pasta')
    expect(results).toEqual([])
  })

  it('returns [] for empty query', async () => {
    const results = await searchRecipes('')
    expect(mockRpc).not.toHaveBeenCalled()
    expect(results).toEqual([])
  })
})

describe('getRecipeById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped recipe for valid id', async () => {
    mockSingle.mockResolvedValue({ data: MOCK_DB_ROW, error: null })

    const recipe = await getRecipeById(1)
    expect(recipe).not.toBeNull()
    expect(recipe!.name).toBe('Testrecept')
    expect(recipe!.ingredientGroups).toEqual([
      { name: null, items: ['200 g pasta', '1 burk krossade tomater'] },
    ])
  })

  it('returns null for unknown id', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const recipe = await getRecipeById(99999)
    expect(recipe).toBeNull()
  })
})

describe('getRecipeBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns mapped recipe for valid slug', async () => {
    mockSingle.mockResolvedValue({ data: MOCK_DB_ROW, error: null })

    const recipe = await getRecipeBySlug('test-1')
    expect(recipe).not.toBeNull()
    expect(recipe!.slug).toBe('test-1')
  })

  it('returns null for unknown slug', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const recipe = await getRecipeBySlug('nonexistent')
    expect(recipe).toBeNull()
  })
})

describe('suggestRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns [] for empty ingredients', async () => {
    const results = await suggestRecipes([])
    expect(mockRpc).not.toHaveBeenCalled()
    expect(results).toEqual([])
  })

  it('calls match_recipes_by_ingredients RPC and fetches full recipes via batch query', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        { id: 1, name: 'Testrecept', slug: 'test-1', image_urls: ['img.jpg'], match_count: 2 },
      ],
      error: null,
    })
    mockIn.mockResolvedValue({ data: [MOCK_DB_ROW], error: null })

    const results = await suggestRecipes(['pasta', 'tomater'])
    expect(mockRpc).toHaveBeenCalledWith('match_recipes_by_ingredients', {
      search_ingredients: ['pasta', 'tomater'],
      lim: 20,
    })
    expect(mockIn).toHaveBeenCalledWith('id', [1])
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Testrecept')
  })
})
