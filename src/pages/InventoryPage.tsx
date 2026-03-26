import { useState, useEffect, useMemo } from 'react'
import { Tabs, Button, Stack, Text, Group, Badge, Loader, Center } from '@mantine/core'
import { IconPlus, IconFridge, IconBox, IconSnowflake } from '@tabler/icons-react'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { ItemCard } from '../components/ItemCard'
import { AddItemModal } from '../components/AddItemModal'
import { EditItemModal } from '../components/EditItemModal'
import { useErrorNotification } from '../hooks/useErrorNotification'
import { NotificationBanner } from '../components/NotificationBanner'
import type { LocationIcon } from '../types'

const ICON_MAP: Record<LocationIcon, React.ReactNode> = {
  pantry: <IconBox size={16} />,
  fridge: <IconFridge size={16} />,
  freezer: <IconSnowflake size={16} />,
}

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
  const { locations, fetchLocations } = useLocationsStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null as import('../types').InventoryItem | null)
  const [activeTab, setActiveTab] = useState<string>('')
  useErrorNotification(error, 'Lagerfel')
  const expiring = getExpiringSoon(3)

  useEffect(() => {
    fetchItems()
    fetchLocations()
    const unsubscribe = subscribeRealtime()
    return unsubscribe
  }, [fetchItems, fetchLocations, subscribeRealtime])

  const effectiveTab = useMemo(() => activeTab || locations[0]?.id || '', [activeTab, locations])

  return (
    <Stack p="md">
      <NotificationBanner />
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
        <Tabs value={effectiveTab} onChange={(v) => setActiveTab(v ?? '')}>
          <Tabs.List>
            {locations.map((loc) => (
              <Tabs.Tab key={loc.id} value={loc.id} leftSection={ICON_MAP[loc.icon]}>
                {loc.name}
                <Badge ml={6} size="xs" variant="light">
                  {getByLocation(loc.id).length}
                </Badge>
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {locations.map((loc) => (
            <Tabs.Panel key={loc.id} value={loc.id} pt="md">
              <Stack gap="xs">
                {getByLocation(loc.id).length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    Tomt här!
                  </Text>
                ) : (
                  getByLocation(loc.id).map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={setEditItem}
                      onDelete={deleteItem}
                    />
                  ))
                )}
              </Stack>
            </Tabs.Panel>
          ))}
        </Tabs>
      )}

      <AddItemModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultLocation={effectiveTab}
      />
      <EditItemModal item={editItem} onClose={() => setEditItem(null)} />
    </Stack>
  )
}
