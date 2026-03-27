import { useState, useEffect, useMemo } from 'react'
import { Tabs, Button, Stack, Text, Group, Badge, Loader, Center, Chip } from '@mantine/core'
import {
  IconPlus,
  IconFridge,
  IconBox,
  IconSnowflake,
  IconAlertTriangle,
  IconPackage,
  IconCooker,
} from '@tabler/icons-react'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { ItemCard } from '../components/ItemCard'
import { AddItemModal } from '../components/AddItemModal'
import { EditItemModal } from '../components/EditItemModal'
import { CookingMode } from '../components/CookingMode'
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
  const [cookingOpen, setCookingOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, string | null>>({})
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
        <Group gap="xs">
          <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
          <Text size="sm" c="orange">
            {expiring.length} vara{expiring.length > 1 ? 'r' : ''} går ut inom 3 dagar
          </Text>
        </Group>
      )}

      <Group justify="space-between">
        <Text fw={700} size="xl">
          Lagret
        </Text>
        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<IconCooker size={16} />}
            onClick={() => setCookingOpen(true)}
          >
            Laga mat
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
            Lägg till
          </Button>
        </Group>
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

          {locations.map((loc) => {
            const allItems = getByLocation(loc.id)
            const categories = [
              ...new Set(allItems.map((i) => i.category).filter(Boolean)),
            ] as string[]
            const activeFilter = filters[loc.id] ?? null
            const setFilter = (val: string | null) =>
              setFilters((prev) => ({ ...prev, [loc.id]: val }))
            const filtered = activeFilter
              ? allItems.filter((i) => i.category === activeFilter)
              : allItems

            return (
              <Tabs.Panel key={loc.id} value={loc.id} pt="md">
                <Stack gap="xs">
                  {categories.length > 0 && (
                    <Group gap="xs" wrap="wrap">
                      <Chip
                        size="xs"
                        checked={activeFilter === null}
                        onChange={() => setFilter(null)}
                      >
                        Alla
                      </Chip>
                      {categories.map((cat) => (
                        <Chip
                          key={cat}
                          size="xs"
                          checked={activeFilter === cat}
                          onChange={() => setFilter(activeFilter === cat ? null : cat)}
                        >
                          {cat}
                        </Chip>
                      ))}
                    </Group>
                  )}

                  {filtered.length === 0 ? (
                    <Center py="xl">
                      <Stack align="center" gap="xs">
                        <IconPackage size={40} opacity={0.25} />
                        <Text c="dimmed" size="sm">
                          Inga varor här ännu
                        </Text>
                      </Stack>
                    </Center>
                  ) : (
                    filtered.map((item) => (
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
            )
          })}
        </Tabs>
      )}

      <AddItemModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultLocation={effectiveTab}
      />
      <EditItemModal item={editItem} onClose={() => setEditItem(null)} />
      <CookingMode opened={cookingOpen} onClose={() => setCookingOpen(false)} />
    </Stack>
  )
}
