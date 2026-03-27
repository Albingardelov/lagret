import { useEffect, useState } from 'react'
import {
  Stack,
  TextInput,
  Button,
  Checkbox,
  Text,
  Group,
  Paper,
  Divider,
  ActionIcon,
  Select,
} from '@mantine/core'
import { IconPlus, IconTrash, IconPackage } from '@tabler/icons-react'
import { useShoppingStore } from '../store/shoppingStore'
import { useErrorNotification } from '../hooks/useErrorNotification'
import { AddItemModal } from '../components/AddItemModal'
import { ITEM_CATEGORIES } from '../lib/categories'

export function ShoppingListPage() {
  const {
    items,
    loading,
    error,
    fetchItems,
    addItem,
    toggleBought,
    clearBought,
    subscribeRealtime,
  } = useShoppingStore()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [inventoryName, setInventoryName] = useState<string | null>(null)
  useErrorNotification(error, 'Inköpslistefel')

  useEffect(() => {
    fetchItems()
    const unsubscribe = subscribeRealtime()
    return unsubscribe
  }, [fetchItems, subscribeRealtime])

  const pending = items.filter((i) => !i.isBought)
  const bought = items.filter((i) => i.isBought)

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    await addItem(trimmed, note.trim() || undefined, category ?? undefined)
    setName('')
    setNote('')
    setCategory(null)
  }

  // Group pending items by category
  const pendingCategories = [...new Set(pending.map((i) => i.category ?? ''))]
  const grouped = pendingCategories.reduce<Record<string, typeof pending>>((acc, cat) => {
    acc[cat] = pending.filter((i) => (i.category ?? '') === cat)
    return acc
  }, {})

  return (
    <Stack gap="md">
      <Text size="xl" fw={700}>
        Inköpslista
      </Text>

      <Paper withBorder p="sm" radius="md">
        <Stack gap="xs">
          <TextInput
            placeholder="Lägg till vara..."
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Select
            placeholder="Kategori (valfritt)"
            data={ITEM_CATEGORIES}
            value={category}
            onChange={setCategory}
            clearable
            searchable
          />
          <TextInput
            placeholder="Notering (valfritt)"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={handleAdd} disabled={!name.trim()}>
            Lägg till
          </Button>
        </Stack>
      </Paper>

      {loading && (
        <Text c="dimmed" size="sm">
          Laddar...
        </Text>
      )}

      <Stack gap="md">
        {pendingCategories.map((cat) => (
          <Stack key={cat} gap="xs">
            {cat && (
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                {cat}
              </Text>
            )}
            {grouped[cat].map((item) => (
              <Paper key={item.id} withBorder px="sm" py="xs" radius="md">
                <Group justify="space-between">
                  <Checkbox
                    label={
                      <Stack gap={0}>
                        <Text size="sm">{item.name}</Text>
                        {item.note && (
                          <Text size="xs" c="dimmed">
                            {item.note}
                          </Text>
                        )}
                      </Stack>
                    }
                    checked={false}
                    onChange={() => toggleBought(item.id)}
                  />
                </Group>
              </Paper>
            ))}
          </Stack>
        ))}
      </Stack>

      {bought.length > 0 && (
        <>
          <Divider label="Köpta varor" labelPosition="left" />
          <Group justify="flex-end">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={clearBought}
              aria-label="Rensa köpta varor"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
          <Stack gap="xs">
            {bought.map((item) => (
              <Paper key={item.id} withBorder px="sm" py="xs" radius="md">
                <Group justify="space-between">
                  <Checkbox
                    label={
                      <Stack gap={0}>
                        <Text size="sm" td="line-through" c="dimmed">
                          {item.name}
                        </Text>
                        {item.note && (
                          <Text size="xs" c="dimmed">
                            {item.note}
                          </Text>
                        )}
                      </Stack>
                    }
                    checked={true}
                    onChange={() => toggleBought(item.id)}
                  />
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="blue"
                    onClick={() => setInventoryName(item.name)}
                    aria-label="Lägg i lagret"
                    title="Lägg i lagret"
                  >
                    <IconPackage size={14} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      <AddItemModal
        opened={inventoryName !== null}
        onClose={() => setInventoryName(null)}
        defaultName={inventoryName ?? ''}
      />
    </Stack>
  )
}
