import { useState, useEffect } from 'react'
import { Tabs, Button, Stack, Text, Group, Badge, Loader, Center } from '@mantine/core'
import { IconPlus, IconFridge, IconBox, IconSnowflake } from '@tabler/icons-react'
import { useInventoryStore } from '../store/inventoryStore'
import { ItemCard } from '../components/ItemCard'
import { AddItemModal } from '../components/AddItemModal'
import { useErrorNotification } from '../hooks/useErrorNotification'
import type { StorageLocation } from '../types'

const TABS: { value: StorageLocation; label: string; icon: React.ReactNode }[] = [
  { value: 'pantry', label: 'Skafferi', icon: <IconBox size={16} /> },
  { value: 'fridge', label: 'Kylskåp', icon: <IconFridge size={16} /> },
  { value: 'freezer', label: 'Frys', icon: <IconSnowflake size={16} /> },
]

export function InventoryPage() {
  const {
    loading,
    error,
    fetchItems,
    deleteItem,
    getByLocation,
    getExpiringSoon,
    subscribeRealtime,
  } = useInventoryStore()
  const [modalOpen, setModalOpen] = useState(false)
  useErrorNotification(error, 'Lagerfel')
  const expiring = getExpiringSoon(3)

  useEffect(() => {
    fetchItems()
    const unsubscribe = subscribeRealtime()
    return unsubscribe
  }, [fetchItems, subscribeRealtime])

  return (
    <Stack p="md">
      {expiring.length > 0 && (
        <Badge color="orange" size="lg" fullWidth>
          {expiring.length} vara{expiring.length > 1 ? 'r' : ''} går snart ut!
        </Badge>
      )}

      <Group justify="space-between">
        <Text fw={700} size="xl">
          Lagret
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Lägg till
        </Button>
      </Group>

      {loading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : (
        <Tabs defaultValue="pantry">
          <Tabs.List>
            {TABS.map((t) => (
              <Tabs.Tab key={t.value} value={t.value} leftSection={t.icon}>
                {t.label}
                <Badge ml={6} size="xs" variant="light">
                  {getByLocation(t.value).length}
                </Badge>
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {TABS.map((t) => (
            <Tabs.Panel key={t.value} value={t.value} pt="md">
              <Stack gap="xs">
                {getByLocation(t.value).length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    Tomt här!
                  </Text>
                ) : (
                  getByLocation(t.value).map((item) => (
                    <ItemCard key={item.id} item={item} onEdit={() => {}} onDelete={deleteItem} />
                  ))
                )}
              </Stack>
            </Tabs.Panel>
          ))}
        </Tabs>
      )}

      <AddItemModal opened={modalOpen} onClose={() => setModalOpen(false)} />
    </Stack>
  )
}
