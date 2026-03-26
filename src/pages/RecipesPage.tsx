import { useState } from 'react'
import {
  Stack, Text, Button, Card, Image, Group, Badge, Loader, Center,
  TextInput, Modal, ScrollArea, List
} from '@mantine/core'
import { IconSearch, IconChefHat } from '@tabler/icons-react'
import { useInventoryStore } from '../store/inventoryStore'
import { suggestRecipes, searchRecipesByName } from '../lib/recipes'
import type { Recipe } from '../types'

export function RecipesPage() {
  const items = useInventoryStore((s) => s.items)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<Recipe | null>(null)

  const handleSuggest = async () => {
    setLoading(true)
    const names = items.map((i) => i.name)
    const results = await suggestRecipes(names)
    setRecipes(results)
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    const results = await searchRecipesByName(searchQuery)
    setRecipes(results)
    setLoading(false)
  }

  return (
    <Stack p="md">
      <Text fw={700} size="xl">Recept</Text>

      <Button
        leftSection={<IconChefHat size={16} />}
        onClick={handleSuggest}
        loading={loading}
        variant="filled"
      >
        Föreslå recept från mitt lager
      </Button>

      <Group>
        <TextInput
          placeholder="Sök recept..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1 }}
        />
        <Button leftSection={<IconSearch size={16} />} onClick={handleSearch} loading={loading}>
          Sök
        </Button>
      </Group>

      {loading ? (
        <Center h={200}><Loader /></Center>
      ) : (
        <Stack gap="xs">
          {recipes.map((recipe) => (
            <Card
              key={recipe.idMeal}
              shadow="xs"
              radius="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(recipe)}
            >
              <Group>
                <Image src={recipe.strMealThumb} w={64} h={64} radius="md" />
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text fw={600}>{recipe.strMeal}</Text>
                  <Group gap={4}>
                    <Badge size="xs" variant="light">{recipe.strCategory}</Badge>
                    <Badge size="xs" variant="light" color="teal">{recipe.strArea}</Badge>
                  </Group>
                </Stack>
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      <Modal
        opened={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.strMeal}
        size="lg"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {selected && (
          <Stack>
            <Image src={selected.strMealThumb} radius="md" />
            <Text fw={600}>Ingredienser</Text>
            <List>
              {selected.ingredients.map((ing, i) => (
                <List.Item key={i}>
                  {ing.measure} {ing.name}
                </List.Item>
              ))}
            </List>
            <Text fw={600}>Instruktioner</Text>
            <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
              {selected.strInstructions}
            </Text>
          </Stack>
        )}
      </Modal>
    </Stack>
  )
}
