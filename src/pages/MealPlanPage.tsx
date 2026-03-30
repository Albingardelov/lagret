import { useState, useEffect, useCallback, useMemo } from 'react'
import { Stack, Text, Group, Box, Button, ActionIcon, Loader, Center } from '@mantine/core'
import { IconChevronLeft, IconChevronRight, IconPlus, IconX } from '@tabler/icons-react'
import dayjs from 'dayjs'
import 'dayjs/locale/sv'
import isoWeek from 'dayjs/plugin/isoWeek'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { useMealPlanStore } from '../store/mealPlanStore'
import { useInventoryStore } from '../store/inventoryStore'
import { getRecipeById } from '../lib/recipes'
import { matchRecipe, getAllIngredients, getCached, setCache } from '../lib/recipeMatching'
import { AddMealModal } from '../components/AddMealModal'
import { IngredientReviewModal } from '../components/IngredientReviewModal'
import type { Recipe } from '../types'

dayjs.extend(isoWeek)
dayjs.extend(weekOfYear)
dayjs.locale('sv')

function getWeekStart(date: dayjs.Dayjs) {
  return date.startOf('isoWeek')
}

function getWeekEnd(date: dayjs.Dayjs) {
  return date.endOf('isoWeek')
}

function formatDateRange(start: dayjs.Dayjs, end: dayjs.Dayjs) {
  const s = start.format('D MMM')
  const e = end.format('D MMM')
  return `${s} – ${e}`
}

export function MealPlanPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [addModalDate, setAddModalDate] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({})

  const { items, loading, fetchItems, removeItem, subscribeRealtime } = useMealPlanStore()
  const inventoryItems = useInventoryStore((s) => s.items)

  const today = useMemo(() => dayjs(), [])
  const weekStart = useMemo(() => getWeekStart(today.add(weekOffset, 'week')), [today, weekOffset])
  const weekEnd = useMemo(() => getWeekEnd(today.add(weekOffset, 'week')), [today, weekOffset])
  const weekNumber = weekStart.isoWeek()

  const days = useMemo(() => {
    const result: dayjs.Dayjs[] = []
    for (let i = 0; i < 7; i++) {
      result.push(weekStart.add(i, 'day'))
    }
    return result
  }, [weekStart])

  const startStr = weekStart.format('YYYY-MM-DD')
  const endStr = weekEnd.format('YYYY-MM-DD')

  useEffect(() => {
    fetchItems(startStr, endStr)
  }, [fetchItems, startStr, endStr])

  useEffect(() => {
    return subscribeRealtime()
  }, [subscribeRealtime])

  // Fetch recipe data for items with recipeId
  useEffect(() => {
    const recipeItems = items.filter((i) => i.recipeId !== null)
    const missingIds = recipeItems
      .filter((i) => !recipes[String(i.recipeId)])
      .map((i) => i.recipeId!)

    const uniqueIds = [...new Set(missingIds)]
    if (uniqueIds.length === 0) return

    uniqueIds.forEach(async (id) => {
      const cacheKey = `recipe_${id}`
      const cached = getCached<Recipe>(cacheKey)
      if (cached) {
        setRecipes((prev) => ({ ...prev, [String(id)]: cached }))
        return
      }
      const recipe = await getRecipeById(id)
      if (recipe) {
        setCache(cacheKey, recipe)
        setRecipes((prev) => ({ ...prev, [String(id)]: recipe }))
      }
    })
  }, [items, recipes])

  const inventoryNames = useMemo(() => inventoryItems.map((i) => i.name), [inventoryItems])

  const getIngredientStatus = useCallback(
    (recipeId: number) => {
      const recipe = recipes[String(recipeId)]
      if (!recipe) return null
      const all = getAllIngredients(recipe)
      if (all.length === 0) return null
      const result = matchRecipe(recipe, inventoryNames)
      return { matched: result.matched.length, total: all.length }
    },
    [recipes, inventoryNames]
  )

  const hasRecipeLinkedMeals = items.some((i) => i.recipeId !== null)

  const handleRemove = async (id: string) => {
    try {
      await removeItem(id)
    } catch {
      // Silently handle error
    }
  }

  const todayStr = today.format('YYYY-MM-DD')

  return (
    <Box p="md" pb={100}>
      {/* Week navigation */}
      <Group justify="center" gap="sm" mb="md">
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setWeekOffset((o) => o - 1)}
          aria-label="Föregående vecka"
        >
          <IconChevronLeft size={20} />
        </ActionIcon>
        <Text
          fw={700}
          size="lg"
          style={{ fontFamily: '"Manrope", sans-serif', minWidth: 220, textAlign: 'center' }}
        >
          Vecka {weekNumber} · {formatDateRange(weekStart, weekEnd)}
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Nästa vecka"
        >
          <IconChevronRight size={20} />
        </ActionIcon>
      </Group>

      {loading ? (
        <Center py="xl">
          <Loader color="sage" />
        </Center>
      ) : (
        <Stack gap="sm">
          {days.map((day) => {
            const dateStr = day.format('YYYY-MM-DD')
            const isToday = dateStr === todayStr
            const meal = items.find((i) => i.date === dateStr)
            const dayLabel = day.format('ddd D MMM')

            return (
              <Box
                key={dateStr}
                p="sm"
                style={{
                  borderRadius: 12,
                  border: meal ? '1px solid #dde4d0' : '1px dashed #c5ccb8',
                  borderLeft: isToday ? '4px solid #6b8e3a' : undefined,
                  background: meal ? '#f8fbee' : 'transparent',
                }}
              >
                {meal ? (
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="xs" c="dimmed" tt="capitalize">
                        {isToday ? `Idag · ${dayLabel}` : dayLabel}
                      </Text>
                      <Text fw={600} mt={2} truncate>
                        {meal.title}
                      </Text>
                      {meal.recipeId !== null &&
                        (() => {
                          const status = getIngredientStatus(meal.recipeId)
                          if (!status) return null
                          return (
                            <Text size="xs" c="dimmed" mt={2}>
                              {status.matched} av {status.total} ingredienser hemma
                            </Text>
                          )
                        })()}
                    </Box>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={() => handleRemove(meal.id)}
                      aria-label="Ta bort måltid"
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                ) : (
                  <Group justify="space-between" align="center">
                    <Box>
                      <Text size="xs" c="dimmed" tt="capitalize">
                        {isToday ? `Idag · ${dayLabel}` : dayLabel}
                      </Text>
                      <Text size="sm" c="dimmed" mt={2}>
                        Ingen måltid planerad
                      </Text>
                    </Box>
                    <Button
                      variant="light"
                      color="sage"
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => setAddModalDate(dateStr)}
                    >
                      Lägg till
                    </Button>
                  </Group>
                )}
              </Box>
            )
          })}
        </Stack>
      )}

      {/* Generate shopping list button */}
      <Button
        fullWidth
        mt="lg"
        color="sage"
        disabled={!hasRecipeLinkedMeals}
        onClick={() => setReviewOpen(true)}
      >
        Generera inköpslista för veckan
      </Button>

      <AddMealModal
        opened={addModalDate !== null}
        onClose={() => setAddModalDate(null)}
        date={addModalDate}
      />

      <IngredientReviewModal
        opened={reviewOpen}
        onClose={() => setReviewOpen(false)}
        mealPlans={items.filter((i) => i.recipeId !== null)}
        recipes={recipes}
      />
    </Box>
  )
}
