import { useEffect, useState } from 'react'
import { Box, Text, Group, Button } from '@mantine/core'
import { IconChevronRight } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useMealPlanStore } from '../store/mealPlanStore'
import { useInventoryStore } from '../store/inventoryStore'
import { getRecipeById } from '../lib/recipes'
import { matchRecipe, getAllIngredients } from '../lib/recipeMatching'
import type { Recipe } from '../types'

export function TodayMealWidget() {
  const navigate = useNavigate()
  const { items: mealItems, fetchItems } = useMealPlanStore()
  const { items: inventoryItems } = useInventoryStore()
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  const today = dayjs().format('YYYY-MM-DD')
  const todayMeal = mealItems.find((m) => m.date === today)
  const recipeId = todayMeal?.recipeId ?? null

  // Clear recipe when recipeId changes to null (outside effect to avoid lint warning)
  if (!recipeId && recipe) {
    setRecipe(null)
  }

  useEffect(() => {
    fetchItems(today, today).catch(() => {})
  }, [fetchItems, today])

  useEffect(() => {
    if (!recipeId) return
    let cancelled = false
    getRecipeById(recipeId).then((r) => {
      if (!cancelled) setRecipe(r)
    })
    return () => {
      cancelled = true
    }
  }, [recipeId])

  const ingredientStatus = (() => {
    if (!recipe) return null
    const inventoryNames = inventoryItems.map((i) => i.name)
    const result = matchRecipe(recipe, inventoryNames)
    const total = getAllIngredients(recipe).length
    return { matched: result.matched.length, total }
  })()

  if (todayMeal) {
    return (
      <Box
        onClick={() => navigate('/meal-plan')}
        px="md"
        py="sm"
        style={{
          borderLeft: '3px solid #53642e',
          background: '#f8fbee',
          cursor: 'pointer',
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Box style={{ minWidth: 0 }}>
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#7a8a6a',
                marginBottom: 2,
              }}
            >
              Dagens middag
            </Text>
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 15,
                fontWeight: 700,
                color: '#191d16',
                lineHeight: 1.3,
              }}
              lineClamp={1}
            >
              {todayMeal.title}
            </Text>
            {ingredientStatus && (
              <Text
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: 12,
                  color: '#7a8a6a',
                  marginTop: 1,
                }}
              >
                {ingredientStatus.matched}/{ingredientStatus.total} ingredienser
              </Text>
            )}
          </Box>
          <IconChevronRight size={18} color="#7a8a6a" style={{ flexShrink: 0 }} />
        </Group>
      </Box>
    )
  }

  return (
    <Box
      px="md"
      py="sm"
      style={{
        border: '1px dashed #ccc',
        borderLeft: '1px dashed #ccc',
        borderRight: '1px dashed #ccc',
        margin: '0',
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <Box>
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#7a8a6a',
              marginBottom: 2,
            }}
          >
            Dagens middag
          </Text>
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 14,
              color: '#a8b4a0',
            }}
          >
            Ingen måltid planerad
          </Text>
        </Box>
        <Button
          size="xs"
          color="sage"
          onClick={() => navigate('/meal-plan')}
          style={{ fontFamily: '"Manrope", sans-serif' }}
        >
          Planera
        </Button>
      </Group>
    </Box>
  )
}
