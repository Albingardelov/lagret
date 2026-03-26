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
} from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useShoppingStore } from '../store/shoppingStore'

export function ShoppingListPage() {
  const { items, loading, fetchItems, addItem, toggleBought, clearBought, subscribeRealtime } =
    useShoppingStore()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

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
    await addItem(trimmed, note.trim() || undefined)
    setName('')
    setNote('')
  }

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

      <Stack gap="xs">
        {pending.map((item) => (
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
              </Paper>
            ))}
          </Stack>
        </>
      )}
    </Stack>
  )
}
