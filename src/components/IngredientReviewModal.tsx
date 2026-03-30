import { useState, useMemo, useCallback } from 'react'
import { Stack, Text, Checkbox, Button, Group, Box } from '@mantine/core'
import { IconShoppingCart } from '@tabler/icons-react'
import { BottomSheet } from './BottomSheet'
import { useShoppingStore } from '../store/shoppingStore'
import { useInventoryStore } from '../store/inventoryStore'
import { getAllIngredients, ingredientsMatch } from '../lib/recipeMatching'
import { parseShoppingInput } from '../lib/parseShoppingInput'
import type { MealPlan, Recipe } from '../types'

interface IngredientReviewModalProps {
  opened: boolean
  onClose: () => void
  mealPlans: MealPlan[]
  recipes: Record<string, Recipe>
}

interface IngredientEntry {
  ingredient: string
  recipeName: string
  inInventory: boolean
  key: string
}

function IngredientReviewContent({
  mealPlans,
  recipes,
}: {
  mealPlans: MealPlan[]
  recipes: Record<string, Recipe>
}) {
  const inventoryItems = useInventoryStore((s) => s.items)
  const shoppingItems = useShoppingStore((s) => s.items)
  const addItem = useShoppingStore((s) => s.addItem)

  const [added, setAdded] = useState(false)

  // Build ingredient list grouped by recipe
  const recipeGroups = useMemo(() => {
    const inventoryNames = inventoryItems.map((i) => i.name)
    const groups: { recipeName: string; ingredients: IngredientEntry[] }[] = []

    for (const plan of mealPlans) {
      if (!plan.recipeId) continue
      const recipe = recipes[String(plan.recipeId)]
      if (!recipe) continue

      const recipeName = recipe.name ?? plan.title
      const allIngredients = getAllIngredients(recipe)
      const ingredients: IngredientEntry[] = allIngredients.map((ing) => {
        const inInventory = inventoryNames.some((invName) => ingredientsMatch(ing, invName))
        const key = `${recipeName}::${ing}`
        return { ingredient: ing, recipeName, inInventory, key }
      })

      groups.push({ recipeName, ingredients })
    }

    return groups
  }, [mealPlans, recipes, inventoryItems])

  const allEntries = useMemo(() => recipeGroups.flatMap((g) => g.ingredients), [recipeGroups])

  // Initialize selected: missing ingredients are pre-checked
  const initialSelected = useMemo(() => {
    const set = new Set<string>()
    for (const entry of allEntries) {
      if (!entry.inInventory) {
        set.add(entry.key)
      }
    }
    return set
  }, [allEntries])

  const [toggles, setToggles] = useState<Record<string, boolean>>({})

  // Compute effective selection: initial + user toggles
  const selected = useMemo(() => {
    const set = new Set<string>()
    for (const entry of allEntries) {
      const toggled = toggles[entry.key]
      const isSelected = toggled !== undefined ? toggled : initialSelected.has(entry.key)
      if (isSelected) {
        set.add(entry.key)
      }
    }
    return set
  }, [allEntries, initialSelected, toggles])

  const handleToggle = useCallback((key: string, currentlySelected: boolean) => {
    setToggles((prev) => ({
      ...prev,
      [key]: !currentlySelected,
    }))
    setAdded(false)
  }, [])

  const handleAdd = useCallback(async () => {
    const existingNames = shoppingItems.filter((i) => !i.isBought).map((i) => i.name.toLowerCase())

    for (const entry of allEntries) {
      if (!selected.has(entry.key)) continue

      const parsed = parseShoppingInput(entry.ingredient)
      const name = parsed.name || entry.ingredient

      if (existingNames.includes(name.toLowerCase())) continue

      await addItem(name, parsed.quantity, parsed.unit, entry.recipeName)
    }

    setAdded(true)
  }, [selected, allEntries, shoppingItems, addItem])

  if (recipeGroups.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        Inga recept-kopplade måltider den här veckan.
      </Text>
    )
  }

  return (
    <Stack gap="md">
      {recipeGroups.map((group) => (
        <Box key={group.recipeName}>
          <Text fw={600} size="sm" mb="xs">
            {group.recipeName}
          </Text>
          <Stack gap={4}>
            {group.ingredients.map((entry) => {
              const isSelected = selected.has(entry.key)
              return (
                <Checkbox
                  key={entry.key}
                  label={entry.ingredient}
                  checked={isSelected}
                  onChange={() => handleToggle(entry.key, isSelected)}
                  styles={
                    entry.inInventory
                      ? {
                          label: {
                            textDecoration: 'line-through',
                            color: 'var(--mantine-color-gray-5)',
                          },
                        }
                      : undefined
                  }
                />
              )
            })}
          </Stack>
        </Box>
      ))}

      <Group justify="center" mt="md">
        <Button
          leftSection={<IconShoppingCart size={18} />}
          disabled={selected.size === 0 || added}
          onClick={handleAdd}
        >
          {added ? 'Tillagd i inköpslistan!' : `Lägg till i inköpslistan (${selected.size})`}
        </Button>
      </Group>
    </Stack>
  )
}

export function IngredientReviewModal({
  opened,
  onClose,
  mealPlans,
  recipes,
}: IngredientReviewModalProps) {
  // Use key to reset internal state when modal reopens
  const [resetKey, setResetKey] = useState(0)

  const handleClose = useCallback(() => {
    onClose()
    setResetKey((k) => k + 1)
  }, [onClose])

  return (
    <BottomSheet opened={opened} onClose={handleClose} title="Inköpslista">
      <IngredientReviewContent key={resetKey} mealPlans={mealPlans} recipes={recipes} />
    </BottomSheet>
  )
}
