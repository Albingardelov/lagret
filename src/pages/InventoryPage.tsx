import { useState, useEffect, useMemo } from 'react'
import {
  Button,
  Stack,
  Text,
  Group,
  Loader,
  Center,
  ScrollArea,
  Box,
  ActionIcon,
} from '@mantine/core'
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
  pantry: <IconBox size={15} />,
  fridge: <IconFridge size={15} />,
  freezer: <IconSnowflake size={15} />,
}

// Unsplash photo IDs for each category — no API key needed via images.unsplash.com
const CATEGORY_IMAGES: Record<string, string> = {
  Mejeri: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=160&h=160&fit=crop&q=80',
  Kött: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=160&h=160&fit=crop&q=80',
  'Fisk & skaldjur':
    'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=160&h=160&fit=crop&q=80',
  Grönsaker:
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=160&h=160&fit=crop&q=80',
  Frukt: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=160&h=160&fit=crop&q=80',
  'Pasta & ris':
    'https://images.unsplash.com/photo-1551892374-ecf8a916e814?w=160&h=160&fit=crop&q=80',
  Bakning: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&h=160&fit=crop&q=80',
  Frukost: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=160&h=160&fit=crop&q=80',
  Konserver:
    'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=160&h=160&fit=crop&q=80',
  Snacks: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=160&h=160&fit=crop&q=80',
  Dryck: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=160&h=160&fit=crop&q=80',
  Skafferi:
    'https://images.unsplash.com/photo-1601493700631-2851524994e3?w=160&h=160&fit=crop&q=80',
  'Såser & kryddor':
    'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=160&h=160&fit=crop&q=80',
  'Örter & kryddor':
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=160&h=160&fit=crop&q=80',
  Bröd: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=160&h=160&fit=crop&q=80',
}

const CATEGORY_COLORS: Record<string, string> = {
  Mejeri: '#74b9ff',
  Kött: '#ff7675',
  'Fisk & skaldjur': '#00cec9',
  Grönsaker: '#55efc4',
  Frukt: '#fdcb6e',
  'Pasta & ris': '#fab1a0',
  Bakning: '#e17055',
  Frukost: '#ffeaa7',
  Konserver: '#a29bfe',
  Snacks: '#fd79a8',
  Dryck: '#00b894',
  Skafferi: '#b2bec3',
  'Såser & kryddor': '#e84393',
  'Örter & kryddor': '#6ab04c',
}

interface CategoryButtonProps {
  label: string
  imageUrl?: string
  count: number
  active: boolean
  color?: string
  onClick: () => void
}

function CategoryButton({ label, imageUrl, count, active, onClick }: CategoryButtonProps) {
  if (imageUrl) {
    return (
      <Box
        onClick={onClick}
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          width: 80,
          flexShrink: 0,
          cursor: 'pointer',
          position: 'relative',
          userSelect: 'none',
          outline: active ? '2.5px solid #53642e' : '2.5px solid transparent',
          outlineOffset: 2,
          transition: 'outline-color 0.15s ease',
        }}
      >
        <img
          src={imageUrl}
          alt={label}
          style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }}
        />
        <Box
          style={{
            background: active ? '#53642e' : 'rgba(25,29,22,0.55)',
            padding: '5px 6px 6px',
            transition: 'background 0.15s ease',
          }}
        >
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 10,
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '0.01em',
              lineHeight: 1.2,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 10,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            {count}
          </Text>
        </Box>
      </Box>
    )
  }

  // "Alla"-knapp utan bild
  return (
    <Box
      onClick={onClick}
      style={{
        borderRadius: 18,
        background: active ? '#53642e' : '#ecefe3',
        padding: '10px 18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        transition: 'background 0.15s ease',
        flexShrink: 0,
        userSelect: 'none',
        height: 98,
      }}
    >
      <Text
        style={{
          fontFamily: '"Manrope", sans-serif',
          fontSize: 13,
          fontWeight: 700,
          color: active ? '#ffffff' : '#191d16',
          lineHeight: 1.2,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: '"Manrope", sans-serif',
          fontSize: 11,
          color: active ? 'rgba(255,255,255,0.7)' : '#506148',
          lineHeight: 1,
        }}
      >
        {count}
      </Text>
    </Box>
  )
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
    items,
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
    <Stack gap={0}>
      <NotificationBanner />

      {/* Hero header */}
      <Box px="md" pt="lg" pb="sm">
        <Text
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#53642e',
            marginBottom: 4,
          }}
        >
          Nuvarande lager
        </Text>
        <Group justify="space-between" align="flex-end">
          <Text
            style={{
              fontFamily: '"Epilogue", sans-serif',
              fontWeight: 900,
              fontSize: 30,
              color: '#191d16',
              lineHeight: 1.1,
              letterSpacing: '-0.5px',
            }}
          >
            Råvaruöversikt
          </Text>
          <Button
            variant="subtle"
            color="sage"
            leftSection={<IconCooker size={16} />}
            onClick={() => setCookingOpen(true)}
            size="sm"
            style={{ fontFamily: '"Manrope", sans-serif' }}
          >
            Laga mat
          </Button>
        </Group>

        {/* Stats row */}
        <Group gap="md" mt={6}>
          <Text style={{ fontFamily: '"Manrope", sans-serif', fontSize: 13, color: '#506148' }}>
            {items.length} varor totalt
          </Text>
          {expiring.length > 0 && (
            <Group gap={4} align="center">
              <IconAlertTriangle size={13} color="#c07030" />
              <Text
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: 13,
                  color: '#c07030',
                  fontWeight: 600,
                }}
              >
                {expiring.length} utgår snart
              </Text>
            </Group>
          )}
        </Group>
      </Box>

      {/* Location pills + items */}
      {loading ? (
        <Center h={200}>
          <Loader color="sage" />
        </Center>
      ) : (
        <>
          <ScrollArea
            scrollbarSize={0}
            px="md"
            pb={4}
            style={{ borderBottom: '1px solid #ecefe3' }}
          >
            <Group gap={8} wrap="nowrap" py={10}>
              {locations.map((loc) => {
                const active = effectiveTab === loc.id
                const count = getByLocation(loc.id).length
                return (
                  <Box
                    key={loc.id}
                    onClick={() => setActiveTab(loc.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 20,
                      background: active ? '#53642e' : '#ecefe3',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background 0.15s ease',
                      userSelect: 'none',
                    }}
                  >
                    <Box style={{ color: active ? '#ffffff' : '#506148', display: 'flex' }}>
                      {ICON_MAP[loc.icon]}
                    </Box>
                    <Text
                      style={{
                        fontFamily: '"Manrope", sans-serif',
                        fontSize: 13,
                        fontWeight: 600,
                        color: active ? '#ffffff' : '#191d16',
                        whiteSpace: 'nowrap',
                        lineHeight: 1,
                      }}
                    >
                      {loc.name}
                    </Text>
                    <Box
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: active ? 'rgba(255,255,255,0.2)' : 'rgba(83,100,46,0.12)',
                        color: active ? '#ffffff' : '#506148',
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: '"Manrope", sans-serif',
                      }}
                    >
                      {count}
                    </Box>
                  </Box>
                )
              })}
            </Group>
          </ScrollArea>

          {locations.map((loc) => {
            if (loc.id !== effectiveTab) return null
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
              <Stack key={loc.id} gap="md" pt="md">
                {/* Category filter buttons */}
                {categories.length > 0 && (
                  <ScrollArea scrollbarSize={0} px="md">
                    <Group gap="xs" wrap="nowrap" pb={4}>
                      <CategoryButton
                        label="Alla"
                        count={allItems.length}
                        active={activeFilter === null}
                        onClick={() => setFilter(null)}
                      />
                      {categories.map((cat) => (
                        <CategoryButton
                          key={cat}
                          label={cat}
                          imageUrl={CATEGORY_IMAGES[cat]}
                          count={allItems.filter((i) => i.category === cat).length}
                          active={activeFilter === cat}
                          color={CATEGORY_COLORS[cat]}
                          onClick={() => setFilter(activeFilter === cat ? null : cat)}
                        />
                      ))}
                    </Group>
                  </ScrollArea>
                )}

                {/* Item cards */}
                {filtered.length === 0 ? (
                  <Center py="xl">
                    <Stack align="center" gap="xs">
                      <IconPackage size={40} opacity={0.2} color="#53642e" />
                      <Text
                        style={{
                          fontFamily: '"Manrope", sans-serif',
                          color: '#5c6b57',
                          fontSize: 14,
                        }}
                      >
                        Inga varor här ännu
                      </Text>
                    </Stack>
                  </Center>
                ) : (
                  <Stack gap="sm" px="md" pb={80}>
                    {filtered.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onEdit={setEditItem}
                        onDelete={deleteItem}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            )
          })}
        </>
      )}

      {/* FAB — floating add button */}
      <Box
        style={{
          position: 'fixed',
          bottom: 88,
          right: 20,
          zIndex: 100,
        }}
      >
        <ActionIcon
          size={52}
          radius="50%"
          onClick={() => setModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #53642e 0%, #889a5e 100%)',
            border: 'none',
            boxShadow: '0 4px 16px rgba(83,100,46,0.35), 0 0 0 1.5px rgba(248,251,238,0.92)',
          }}
          aria-label="Lägg till vara"
        >
          <IconPlus size={24} color="#fff" />
        </ActionIcon>
      </Box>

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
