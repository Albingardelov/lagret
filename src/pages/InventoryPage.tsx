import { useState, useEffect, useMemo } from 'react'
import {
  Button,
  Stack,
  Text,
  Group,
  Loader,
  Center,
  Box,
  ActionIcon,
  UnstyledButton,
} from '@mantine/core'
import { IconPlus, IconAlertTriangle, IconCooker, IconBarcode } from '@tabler/icons-react'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { ItemCard } from '../components/ItemCard'
import { AddItemModal } from '../components/AddItemModal'
import { EditItemModal } from '../components/EditItemModal'
import { CookingMode } from '../components/CookingMode'
import { useErrorNotification } from '../hooks/useErrorNotification'
import { NotificationBanner } from '../components/NotificationBanner'
import type { LocationIcon } from '../types'

const BG = '#F7F2EB'
const TERRA = '#B5432A'

type TabKey = 'all' | LocationIcon

const TAB_LABELS: Record<TabKey, string> = {
  all: 'Allt',
  fridge: 'Kyl',
  freezer: 'Frys',
  pantry: 'Skafferi',
}

export function InventoryPage() {
  const { loading, error, fetchItems, deleteItem, getExpiringSoon, subscribeRealtime, items } =
    useInventoryStore()
  const { locations, fetchLocations } = useLocationsStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null as import('../types').InventoryItem | null)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [cookingOpen, setCookingOpen] = useState(false)
  useErrorNotification(error, 'Lagerfel')
  const expiring = getExpiringSoon(3)

  useEffect(() => {
    fetchItems()
    fetchLocations()
    const unsubscribe = subscribeRealtime()
    return unsubscribe
  }, [fetchItems, fetchLocations, subscribeRealtime])

  // Derive which location icon types actually exist
  const availableIcons = useMemo(() => {
    const icons = new Set(locations.map((l) => l.icon as LocationIcon))
    return icons
  }, [locations])

  // Build location-id → icon map
  const locationIconMap = useMemo(() => {
    const m: Record<string, LocationIcon> = {}
    for (const loc of locations) m[loc.id] = loc.icon as LocationIcon
    return m
  }, [locations])

  // Build location-id → name map
  const locationNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const loc of locations) m[loc.id] = loc.name
    return m
  }, [locations])

  const filteredItems = useMemo(() => {
    let result = [...items]
    if (activeTab !== 'all') {
      result = result.filter((item) => locationIconMap[item.location] === activeTab)
    }
    // Sort: expiring first, then zero-stock last
    return result.sort((a, b) => {
      const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
      const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
      if (a.quantity === 0 && b.quantity !== 0) return 1
      if (a.quantity !== 0 && b.quantity === 0) return -1
      return aExpiry - bExpiry
    })
  }, [items, activeTab, locationIconMap])

  const tabs: TabKey[] = [
    'all',
    ...(['fridge', 'freezer', 'pantry'] as LocationIcon[]).filter((t) => availableIcons.has(t)),
  ]

  return (
    <Stack gap={0} style={{ background: BG, minHeight: '100%' }}>
      <NotificationBanner />

      {/* Hero header */}
      <Box px="md" pt="lg" pb="md">
        <Text
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: TERRA,
            marginBottom: 6,
          }}
        >
          Välkommen tillbaka
        </Text>
        <Text
          style={{
            fontFamily: '"Epilogue", sans-serif',
            fontWeight: 900,
            fontSize: 28,
            color: '#1C1410',
            lineHeight: 1.15,
            letterSpacing: '-0.5px',
            marginBottom: 2,
          }}
        >
          Håll koll på dina <em style={{ color: TERRA, fontStyle: 'italic' }}>råvaror.</em>
        </Text>

        {/* Stats row */}
        <Group gap="sm" mt={8} align="center">
          <Text style={{ fontFamily: '"Manrope", sans-serif', fontSize: 13, color: '#7A6A5A' }}>
            {items.length} varor totalt
          </Text>
          {expiring.length > 0 && (
            <Group gap={4} align="center">
              <IconAlertTriangle size={13} color="#EA580C" />
              <Text
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: 13,
                  color: '#EA580C',
                  fontWeight: 600,
                }}
              >
                {expiring.length} utgår snart
              </Text>
            </Group>
          )}
        </Group>

        {/* INSKANNING chip + Laga mat button */}
        <Group gap={8} mt={12}>
          <UnstyledButton
            onClick={() => setModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#E8E0D8',
              borderRadius: 20,
              padding: '7px 14px',
            }}
          >
            <IconBarcode size={14} color="#4A3728" />
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 12,
                fontWeight: 700,
                color: '#4A3728',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Inskanning
            </Text>
          </UnstyledButton>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconCooker size={14} />}
            onClick={() => setCookingOpen(true)}
            style={{
              fontFamily: '"Manrope", sans-serif',
              color: TERRA,
              fontWeight: 600,
            }}
          >
            Laga mat
          </Button>
        </Group>
      </Box>

      {/* Filter tabs */}
      <Box
        style={{
          borderBottom: '1px solid rgba(180,160,140,0.25)',
          paddingBottom: 0,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <Group gap={0} wrap="nowrap">
          {tabs.map((tab) => {
            const active = activeTab === tab
            return (
              <UnstyledButton
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 16px',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{
                    fontFamily: '"Manrope", sans-serif',
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? TERRA : '#7A6A5A',
                    lineHeight: 1,
                    transition: 'color 0.15s ease',
                  }}
                >
                  {TAB_LABELS[tab]}
                </Text>
                {active && (
                  <Box
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 16,
                      right: 16,
                      height: 2,
                      borderRadius: 2,
                      background: TERRA,
                    }}
                  />
                )}
              </UnstyledButton>
            )
          })}
        </Group>
      </Box>

      {/* Items */}
      {loading ? (
        <Center h={200}>
          <Loader color="terra" />
        </Center>
      ) : filteredItems.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Text style={{ fontSize: 32 }}>🥬</Text>
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                color: '#7A6A5A',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Inga varor här ännu
            </Text>
          </Stack>
        </Center>
      ) : (
        <Stack gap="xs" px="md" pt="md" pb={100}>
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={{
                ...item,
                category: item.category ?? locationNameMap[item.location] ?? undefined,
              }}
              onEdit={setEditItem}
              onDelete={deleteItem}
            />
          ))}
        </Stack>
      )}

      {/* FAB */}
      <Box
        style={{
          position: 'fixed',
          bottom: 84,
          right: 20,
          zIndex: 100,
        }}
      >
        <ActionIcon
          size={52}
          radius="50%"
          onClick={() => setModalOpen(true)}
          style={{
            background: TERRA,
            border: 'none',
            boxShadow: '0 4px 16px rgba(181,67,42,0.4), 0 0 0 1.5px rgba(247,242,235,0.9)',
          }}
          aria-label="Lägg till vara"
        >
          <IconPlus size={24} color="#fff" />
        </ActionIcon>
      </Box>

      <AddItemModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultLocation={locations[0]?.id ?? ''}
      />
      <EditItemModal item={editItem} onClose={() => setEditItem(null)} />
      <CookingMode opened={cookingOpen} onClose={() => setCookingOpen(false)} />
    </Stack>
  )
}
