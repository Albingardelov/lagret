import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
  ScrollArea,
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
import { TodayMealWidget } from '../components/TodayMealWidget'
import { searchRecipes } from '../lib/recipes'
import { useNavigate } from 'react-router-dom'
const BG = '#F7F2EB'
const TERRA = '#B5432A'
const MANROPE = '"Manrope", sans-serif'
const EPILOGUE = '"Epilogue", sans-serif'

export function InventoryPage() {
  const { t } = useTranslation()
  const { loading, error, fetchItems, deleteItem, getExpiringSoon, subscribeRealtime, items } =
    useInventoryStore()
  const { locations, fetchLocations } = useLocationsStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null as import('../types').InventoryItem | null)
  // activeTab: 'all' | location.id
  const [activeTab, setActiveTab] = useState<string>('all')
  const [cookingOpen, setCookingOpen] = useState(false)
  const [inspirationImage, setInspirationImage] = useState<string | null>(null)
  const navigate = useNavigate()
  const notifyError = useErrorNotification()
  useEffect(() => {
    if (error) notifyError(error, t('inventory.errorLabel'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])
  const expiring = getExpiringSoon(3)
  const featuredItem = expiring[0] ?? null

  useEffect(() => {
    fetchItems()
    fetchLocations()
    const unsubscribe = subscribeRealtime()
    return unsubscribe
  }, [fetchItems, fetchLocations, subscribeRealtime])

  useEffect(() => {
    if (!featuredItem) return
    searchRecipes(featuredItem.name, 1).then((results) => {
      const img = results[0]?.imageUrls?.[0] ?? null
      setInspirationImage(img)
    })
  }, [featuredItem?.name])

  const filteredItems = useMemo(() => {
    let result = [...items]
    if (activeTab !== 'all') {
      result = result.filter((item) => item.location === activeTab)
    }
    // Sort: expiring first, then zero-stock last
    return result.sort((a, b) => {
      const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
      const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
      if (a.quantity === 0 && b.quantity !== 0) return 1
      if (a.quantity !== 0 && b.quantity === 0) return -1
      return aExpiry - bExpiry
    })
  }, [items, activeTab])

  return (
    <Stack gap={0} style={{ background: BG, minHeight: '100%' }}>
      <NotificationBanner />
      <TodayMealWidget />

      {/* Hero header */}
      <Box px="md" pt="lg" pb="md">
        <Text
          style={{
            fontFamily: MANROPE,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: TERRA,
            marginBottom: 6,
          }}
        >
          {t('inventory.welcome')}
        </Text>
        <Text
          style={{
            fontFamily: EPILOGUE,
            fontWeight: 900,
            fontSize: 28,
            color: '#1C1410',
            lineHeight: 1.15,
            letterSpacing: '-0.5px',
            marginBottom: 2,
          }}
        >
          {t('inventory.subtitle')}
        </Text>

        {/* Stats row */}
        <Group gap="sm" mt={8} align="center">
          <Text style={{ fontFamily: MANROPE, fontSize: 13, color: '#7A6A5A' }}>
            {t('inventory.totalItems', { count: items.length })}
          </Text>
          {expiring.length > 0 && (
            <Group gap={4} align="center">
              <IconAlertTriangle size={13} color="#EA580C" />
              <Text
                style={{
                  fontFamily: MANROPE,
                  fontSize: 13,
                  color: '#EA580C',
                  fontWeight: 600,
                }}
              >
                {t('inventory.expiringSoon', { count: expiring.length })}
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
                fontFamily: MANROPE,
                fontSize: 12,
                fontWeight: 700,
                color: '#4A3728',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t('inventory.scan')}
            </Text>
          </UnstyledButton>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconCooker size={14} />}
            onClick={() => setCookingOpen(true)}
            style={{
              fontFamily: MANROPE,
              color: TERRA,
              fontWeight: 600,
            }}
          >
            {t('inventory.cook')}
          </Button>
        </Group>
      </Box>

      {/* Filter tabs */}
      <Box style={{ borderBottom: '1px solid rgba(180,160,140,0.25)' }}>
        <ScrollArea scrollbarSize={0} offsetScrollbars={false} px="md">
          <Group gap={0} wrap="nowrap">
            {[{ id: 'all', name: t('inventory.all') }, ...locations].map((loc) => {
              const active = activeTab === loc.id
              return (
                <UnstyledButton
                  key={loc.id}
                  onClick={() => setActiveTab(loc.id)}
                  style={{
                    padding: '10px 16px',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: MANROPE,
                      fontSize: 14,
                      fontWeight: active ? 700 : 500,
                      color: active ? TERRA : '#7A6A5A',
                      lineHeight: 1,
                      transition: 'color 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {loc.name}
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
        </ScrollArea>
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
                fontFamily: MANROPE,
                color: '#7A6A5A',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {t('inventory.empty')}
            </Text>
          </Stack>
        </Center>
      ) : (
        <Stack gap="xs" px="md" pt="md" pb={100}>
          {filteredItems.map((item, index) => (
            <>
              <ItemCard key={item.id} item={item} onEdit={setEditItem} onDelete={deleteItem} />
              {index === 2 && featuredItem && (
                <Box
                  key="inspiration-card"
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 18,
                    overflow: 'hidden',
                    boxShadow: '0 1px 6px rgba(74,55,40,0.09)',
                    marginTop: 4,
                    marginBottom: 4,
                  }}
                >
                  <Box style={{ padding: '16px 16px 0' }}>
                    <Text
                      style={{
                        fontFamily: MANROPE,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: TERRA,
                        marginBottom: 8,
                      }}
                    >
                      {t('inventory.inspiration')}
                    </Text>
                    <Text
                      style={{
                        fontFamily: EPILOGUE,
                        fontWeight: 800,
                        fontSize: 20,
                        color: '#1C1410',
                        lineHeight: 1.2,
                        marginBottom: 6,
                      }}
                    >
                      {t('inventory.inspirationQuestion', {
                        name: featuredItem.name.toLowerCase(),
                      })}
                    </Text>
                    <Text
                      style={{
                        fontFamily: MANROPE,
                        fontSize: 13,
                        color: '#7A6A5A',
                        marginBottom: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      {t('inventory.inspirationHint')}
                    </Text>
                    <Button
                      size="sm"
                      radius="xl"
                      onClick={() => navigate('/recipes')}
                      style={{
                        background: '#1C1410',
                        color: '#FFFFFF',
                        fontFamily: MANROPE,
                        fontWeight: 700,
                        marginBottom: inspirationImage ? 14 : 16,
                      }}
                    >
                      {t('inventory.seeRecipes')}
                    </Button>
                  </Box>
                  {inspirationImage && (
                    <img
                      src={inspirationImage}
                      alt={featuredItem.name}
                      style={{
                        width: '100%',
                        height: 180,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  )}
                </Box>
              )}
            </>
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
          aria-label={t('inventory.addItem')}
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
