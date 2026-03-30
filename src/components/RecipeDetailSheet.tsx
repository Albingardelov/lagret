import { useState } from 'react'
import {
  Stack,
  Text,
  Button,
  Image,
  Group,
  List,
  ThemeIcon,
  Checkbox,
  Divider,
  Alert,
  Box,
} from '@mantine/core'
import { IconCooker, IconCheck, IconShoppingCart } from '@tabler/icons-react'
import { BottomSheet } from './BottomSheet'
import { useInventoryStore } from '../store/inventoryStore'
import { useShoppingStore } from '../store/shoppingStore'
import { parseShoppingInput } from '../lib/parseShoppingInput'
import { matchRecipe, ingredientsMatch, getAllIngredients } from '../lib/recipeMatching'
import type { Recipe, IngredientGroup } from '../types'

/** Merge all null-named groups into one, keeping named groups as-is */
function mergeUnnamedGroups(groups: IngredientGroup[]): IngredientGroup[] {
  const unnamed = groups.filter((g) => !g.name)
  const named = groups.filter((g) => g.name)
  const merged: IngredientGroup[] = []
  if (unnamed.length > 0) {
    merged.push({ name: null, items: unnamed.flatMap((g) => g.items) })
  }
  return [...merged, ...named]
}

interface RecipeDetailSheetProps {
  recipe: Recipe | null
  opened: boolean
  onClose: () => void
}

export function RecipeDetailSheet({ recipe, opened, onClose }: RecipeDetailSheetProps) {
  const items = useInventoryStore((s) => s.items)
  const updateItem = useInventoryStore((s) => s.updateItem)
  const addShoppingItem = useShoppingStore((s) => s.addItem)

  const [cooking, setCooking] = useState(false)
  const [cookChecked, setCookChecked] = useState<Set<string>>(new Set())
  const [cookDone, setCookDone] = useState(false)
  const [addingToList, setAddingToList] = useState(false)
  const [addedToList, setAddedToList] = useState(false)

  if (!recipe) return null

  const inventoryNames = items.map((i) => i.name)
  const result = matchRecipe(recipe, inventoryNames)
  const allIngredients = getAllIngredients(recipe)
  const matchedInventoryItems = items.filter((inv) =>
    result.matched.some((m) => ingredientsMatch(m, inv.name))
  )

  const openCook = () => {
    const preChecked = new Set<string>()
    mergeUnnamedGroups(recipe.ingredientGroups).forEach((group, gi) => {
      group.items.forEach((ingredient, i) => {
        const hasInInventory = matchedInventoryItems.some((inv) =>
          ingredientsMatch(ingredient, inv.name)
        )
        if (hasInInventory) preChecked.add(`${gi}-${i}`)
      })
    })
    setCookChecked(preChecked)
    setCookDone(false)
    setCooking(true)
  }

  const handleCook = async () => {
    const toDecrement = new Set<string>()
    mergeUnnamedGroups(recipe.ingredientGroups).forEach((group, gi) => {
      group.items.forEach((ingredient, i) => {
        if (!cookChecked.has(`${gi}-${i}`)) return
        const inv = matchedInventoryItems.find((it) => ingredientsMatch(ingredient, it.name))
        if (inv) toDecrement.add(inv.id)
      })
    })
    await Promise.all(
      matchedInventoryItems
        .filter((i) => toDecrement.has(i.id))
        .map((i) => updateItem(i.id, { quantity: Math.max(0, i.quantity - 1) }))
    )
    setCookDone(true)
  }

  const handleAddMissingToShoppingList = async () => {
    if (result.missing.length === 0) return
    setAddingToList(true)
    try {
      const recipeName = recipe.name
      await Promise.all(
        result.missing.map((ingredient) => {
          const parsed = parseShoppingInput(ingredient)
          const name = parsed.name || ingredient
          const note =
            parsed.quantity !== 1 || parsed.unit !== 'st'
              ? `${parsed.quantity} ${parsed.unit} — ${recipeName}`
              : (recipeName ?? undefined)
          return addShoppingItem(name, 1, 'st', note)
        })
      )
      setAddedToList(true)
    } finally {
      setAddingToList(false)
    }
  }

  const handleClose = () => {
    onClose()
    setCooking(false)
    setCookDone(false)
    setAddedToList(false)
  }

  return (
    <BottomSheet opened={opened} onClose={handleClose} title={recipe.name} size="xl">
      <Stack>
        {recipe.imageUrls?.[0] && <Image src={recipe.imageUrls[0]} radius="md" />}
        <Group gap="xs">
          {recipe.servings && (
            <Text size="sm" c="dimmed">
              {recipe.servings} portioner
            </Text>
          )}
          {recipe.totalTime && (
            <Text size="sm" c="dimmed">
              · {recipe.totalTime} min
            </Text>
          )}
        </Group>

        {!cooking ? (
          <>
            <Group justify="space-between">
              <Text fw={600}>
                Ingredienser ({result.matched.length}/{allIngredients.length} hemma)
              </Text>
              <Group gap="xs">
                {result.missing.length > 0 && (
                  <Button
                    size="xs"
                    variant="light"
                    color={addedToList ? 'green' : undefined}
                    leftSection={
                      addedToList ? <IconCheck size={14} /> : <IconShoppingCart size={14} />
                    }
                    onClick={handleAddMissingToShoppingList}
                    loading={addingToList}
                    disabled={addedToList}
                  >
                    {addedToList ? 'Tillagda' : 'Handla saknade'}
                  </Button>
                )}
                {matchedInventoryItems.length > 0 && (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconCooker size={14} />}
                    onClick={openCook}
                  >
                    Laga rätten
                  </Button>
                )}
              </Group>
            </Group>
            {mergeUnnamedGroups(recipe.ingredientGroups).map((group, gi) => (
              <Stack key={gi} gap={4}>
                {group.name && (
                  <Text fw={600} size="sm" mt={gi > 0 ? 'xs' : 0}>
                    {group.name}
                  </Text>
                )}
                <List>
                  {group.items.map((ingredient, i) => {
                    const have = result.matched.some(
                      (m) => m.toLowerCase() === ingredient.toLowerCase()
                    )
                    return (
                      <List.Item
                        key={i}
                        icon={
                          <ThemeIcon color={have ? 'green' : 'red'} size={16} radius="xl">
                            <span style={{ fontSize: 10 }}>{have ? '✓' : '✗'}</span>
                          </ThemeIcon>
                        }
                      >
                        <Text size="sm" c={have ? undefined : 'dimmed'}>
                          {ingredient}
                        </Text>
                      </List.Item>
                    )
                  })}
                </List>
              </Stack>
            ))}
            <Divider />
            <Text fw={600}>Instruktioner</Text>
            <List type="ordered">
              {recipe.instructions.map((step, i) => (
                <List.Item key={i}>
                  <Text size="sm">{step}</Text>
                </List.Item>
              ))}
            </List>

            {recipe.url && (
              <>
                <Divider />
                <Box>
                  <Button
                    component="a"
                    href={recipe.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="subtle"
                    size="xs"
                    color="gray"
                  >
                    Visa originalrecept
                  </Button>
                </Box>
              </>
            )}
          </>
        ) : cookDone ? (
          <Alert color="green" icon={<IconCheck size={16} />}>
            Lagret uppdaterat! Smaklig måltid.
          </Alert>
        ) : (
          <>
            <Text fw={600}>Bocka av ingredienser du använt</Text>
            <Text size="sm" c="dimmed">
              Varor från lagret minskas med 1 st.
            </Text>
            {mergeUnnamedGroups(recipe.ingredientGroups).map((group, gi) => (
              <Stack key={gi} gap="xs">
                {group.name && (
                  <Text fw={600} size="sm" mt={gi > 0 ? 'xs' : 0}>
                    {group.name}
                  </Text>
                )}
                {group.items.map((ingredient, i) => {
                  const invItem = matchedInventoryItems.find((inv) =>
                    ingredientsMatch(ingredient, inv.name)
                  )
                  const key = `${gi}-${i}`
                  return (
                    <Checkbox
                      key={key}
                      checked={cookChecked.has(key)}
                      onChange={() =>
                        setCookChecked((prev) => {
                          const next = new Set(prev)
                          if (next.has(key)) next.delete(key)
                          else next.add(key)
                          return next
                        })
                      }
                      label={
                        <Text size="sm">
                          {ingredient}
                          {invItem && (
                            <Text span c="dimmed">
                              {' '}
                              ({invItem.quantity} {invItem.unit} i lager)
                            </Text>
                          )}
                        </Text>
                      }
                    />
                  )
                })}
              </Stack>
            ))}
            <Group>
              <Button variant="subtle" color="gray" onClick={() => setCooking(false)}>
                Avbryt
              </Button>
              <Button onClick={handleCook} disabled={cookChecked.size === 0}>
                Bekräfta
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </BottomSheet>
  )
}
