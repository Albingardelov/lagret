import { useEffect, useState } from 'react'
import {
  Stack,
  Text,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Box,
  ActionIcon,
  Checkbox,
  Alert,
  UnstyledButton,
} from '@mantine/core'
import { IconPlus, IconTrash, IconPackage, IconCheck, IconSearch } from '@tabler/icons-react'
import { useShoppingStore } from '../store/shoppingStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { useErrorNotification } from '../hooks/useErrorNotification'
import { AddItemModal } from '../components/AddItemModal'
import { ITEM_CATEGORIES } from '../lib/categories'
import { UNITS_FLAT } from '../lib/units'
import { parseShoppingInput } from '../lib/parseShoppingInput'
import { BottomSheet } from '../components/BottomSheet'

const BG = '#F7F2EB'
const TERRA = '#B5432A'
const CARD_BG = '#FFFFFF'

export function ShoppingListPage() {
  const {
    items,
    loading,
    error,
    fetchItems,
    addItem,
    toggleBought,
    removeItem,
    clearBought,
    subscribeRealtime,
  } = useShoppingStore()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailName, setDetailName] = useState('')
  const [detailQuantity, setDetailQuantity] = useState<number>(1)
  const [detailUnit, setDetailUnit] = useState<string>('st')
  const [detailNote, setDetailNote] = useState('')
  const [detailCategory, setDetailCategory] = useState<string | null>(null)
  const [inventoryItem, setInventoryItem] = useState<{ id: string; name: string } | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkLocations, setBulkLocations] = useState<Record<string, string>>({})
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkDone, setBulkDone] = useState(false)
  const addInventoryItem = useInventoryStore((s) => s.addItem)
  const locations = useLocationsStore((s) => s.locations)
  useErrorNotification(error, 'Inköpslistefel')

  useEffect(() => {
    fetchItems()
    const unsubscribe = subscribeRealtime()
    return unsubscribe
  }, [fetchItems, subscribeRealtime])

  const pending = items.filter((i) => !i.isBought)
  const bought = items.filter((i) => i.isBought)

  function handleNameChange(value: string) {
    setDetailName(value)
    const parsed = parseShoppingInput(value)
    if (parsed.name !== value) {
      setDetailQuantity(parsed.quantity)
      setDetailUnit(parsed.unit)
    }
  }

  async function handleDetailAdd() {
    const trimmed = detailName.trim()
    if (!trimmed) return
    const parsed = parseShoppingInput(trimmed)
    const name = parsed.name || trimmed
    await addItem(
      name,
      detailQuantity,
      detailUnit,
      detailNote.trim() || undefined,
      detailCategory ?? undefined
    )
    setDetailName('')
    setDetailQuantity(1)
    setDetailUnit('st')
    setDetailNote('')
    setDetailCategory(null)
    setDetailsOpen(false)
  }

  function openBulkWizard() {
    const defaultLoc = locations[0]?.id ?? ''
    const locs: Record<string, string> = {}
    for (const item of bought) {
      locs[item.id] = defaultLoc
    }
    setBulkLocations(locs)
    setBulkDone(false)
    setBulkOpen(true)
  }

  async function handleBulkAdd() {
    setBulkSubmitting(true)
    try {
      for (const item of bought) {
        const loc = bulkLocations[item.id] || locations[0]?.id
        if (!loc) continue
        await addInventoryItem({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          location: loc,
        })
        await removeItem(item.id)
      }
      setBulkDone(true)
    } finally {
      setBulkSubmitting(false)
    }
  }

  // Group pending items by note (recipe/category) for visual grouping
  const pendingByNote = (() => {
    const groups: { note: string; items: typeof pending }[] = []
    const noteMap = new Map<string, typeof pending>()
    for (const item of pending) {
      const key = item.note ?? ''
      if (!noteMap.has(key)) noteMap.set(key, [])
      noteMap.get(key)!.push(item)
    }
    const noNote = noteMap.get('') ?? []
    if (noNote.length > 0) groups.push({ note: '', items: noNote })
    for (const [note, items] of noteMap) {
      if (note) groups.push({ note, items })
    }
    return groups
  })()

  return (
    <Stack gap={0} style={{ background: BG, minHeight: '100%', paddingBottom: 100 }}>
      {/* Header */}
      <Box px="md" pt="lg" pb="md">
        <Text
          style={{
            fontFamily: '"Epilogue", sans-serif',
            fontWeight: 900,
            fontSize: 30,
            color: '#1C1410',
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
          }}
        >
          Inköpslista
        </Text>
        <Text
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 13,
            color: '#7A6A5A',
            marginTop: 4,
          }}
        >
          Organisera din handling och fyll på förrådet.
        </Text>
      </Box>

      {/* Add bar */}
      <Box px="md" pb="md">
        <Group gap={8} wrap="nowrap">
          <UnstyledButton
            onClick={() => setDetailsOpen(true)}
            aria-label="Öppna inmatningsfält"
            style={{
              flex: 1,
              background: CARD_BG,
              borderRadius: 14,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
            }}
          >
            <IconSearch size={16} color="#9A8A7A" />
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 14,
                color: '#9A8A7A',
              }}
            >
              Lägg till vara manuellt...
            </Text>
          </UnstyledButton>
          <ActionIcon
            size={46}
            radius={12}
            onClick={() => setDetailsOpen(true)}
            style={{
              background: TERRA,
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(181,67,42,0.3)',
            }}
            aria-label="Lägg till vara"
          >
            <IconPlus size={22} color="#fff" />
          </ActionIcon>
        </Group>
      </Box>

      {loading && (
        <Text c="dimmed" size="sm" px="md">
          Laddar...
        </Text>
      )}

      {/* Pending items grouped by note */}
      <Stack gap={0} px="md">
        {pendingByNote.map(({ note, items: groupItems }) => (
          <Box key={note || '__no_note__'} mb={note ? 'md' : 0}>
            {note && (
              <Group gap={6} mb={6} mt={4}>
                <Text
                  style={{
                    fontFamily: '"Manrope", sans-serif',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#7A6A5A',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {note}
                </Text>
                <Box
                  style={{
                    background: '#E8E0D8',
                    borderRadius: 20,
                    padding: '1px 8px',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: 700, color: '#7A6A5A' }}>
                    {groupItems.length} vara{groupItems.length !== 1 ? 'r' : ''}
                  </Text>
                </Box>
              </Group>
            )}
            <Stack gap={6}>
              {groupItems.map((item) => (
                <Box
                  key={item.id}
                  style={{
                    background: CARD_BG,
                    borderRadius: 14,
                    padding: '12px 16px',
                    boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Checkbox
                      checked={false}
                      onChange={() => toggleBought(item.id)}
                      styles={{
                        body: { alignItems: 'center' },
                        label: { paddingLeft: 10 },
                        input: {
                          borderRadius: 6,
                          border: '1.5px solid #D0C4B8',
                          cursor: 'pointer',
                        },
                      }}
                      label={
                        <Box>
                          <Text
                            style={{
                              fontFamily: '"Manrope", sans-serif',
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#1C1410',
                              lineHeight: 1.3,
                            }}
                          >
                            {item.name}
                          </Text>
                          {(item.quantity !== 1 || item.unit !== 'st') && (
                            <Text
                              style={{
                                fontFamily: '"Manrope", sans-serif',
                                fontSize: 12,
                                color: '#7A6A5A',
                                lineHeight: 1.2,
                              }}
                            >
                              {item.quantity} {item.unit}
                            </Text>
                          )}
                        </Box>
                      }
                    />
                    <Box
                      style={{
                        width: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {[0, 1, 2].map((i) => (
                        <Box
                          key={i}
                          style={{
                            width: 3,
                            height: 3,
                            borderRadius: '50%',
                            background: '#C8B8A8',
                          }}
                        />
                      ))}
                    </Box>
                  </Group>
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      {/* Bought items */}
      {bought.length > 0 && (
        <Box mt="md" px="md">
          <Group justify="space-between" mb={8}>
            <Group gap={6}>
              <Text
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#7A6A5A',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Köpta varor
              </Text>
              <Box
                style={{
                  background: '#E8E0D8',
                  borderRadius: 20,
                  padding: '1px 8px',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: 700, color: '#7A6A5A' }}>
                  {bought.length}
                </Text>
              </Box>
            </Group>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={clearBought}
              aria-label="Rensa köpta varor"
              style={{ color: '#9A8A7A' }}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
          <Stack gap={6}>
            {bought.map((item) => (
              <Box
                key={item.id}
                style={{
                  background: CARD_BG,
                  borderRadius: 14,
                  padding: '12px 16px',
                  boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
                  opacity: 0.7,
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Checkbox
                    checked={true}
                    onChange={() => toggleBought(item.id)}
                    styles={{
                      body: { alignItems: 'center' },
                      label: { paddingLeft: 10 },
                      input: {
                        borderRadius: 6,
                        background: TERRA,
                        borderColor: TERRA,
                        cursor: 'pointer',
                      },
                    }}
                    label={
                      <Box>
                        <Text
                          style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#7A6A5A',
                            textDecoration: 'line-through',
                            lineHeight: 1.3,
                          }}
                        >
                          {item.name}
                        </Text>
                        {(item.quantity !== 1 || item.unit !== 'st') && (
                          <Text
                            style={{
                              fontFamily: '"Manrope", sans-serif',
                              fontSize: 12,
                              color: '#9A8A7A',
                              lineHeight: 1.2,
                            }}
                          >
                            {item.quantity} {item.unit}
                          </Text>
                        )}
                        {item.note && (
                          <Text
                            style={{
                              fontFamily: '"Manrope", sans-serif',
                              fontSize: 11,
                              color: '#9A8A7A',
                              lineHeight: 1.2,
                            }}
                          >
                            {item.note}
                          </Text>
                        )}
                      </Box>
                    }
                  />
                  <ActionIcon
                    size={30}
                    radius={8}
                    variant="light"
                    onClick={() => setInventoryItem({ id: item.id, name: item.name })}
                    aria-label="Lägg i lagret"
                    style={{ background: '#EDE8E2', color: '#4A3728', flexShrink: 0 }}
                  >
                    <IconPackage size={14} />
                  </ActionIcon>
                </Group>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Empty state */}
      {!loading && pending.length === 0 && bought.length === 0 && (
        <Box py="xl" style={{ textAlign: 'center' }}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🛒</Text>
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 14,
              color: '#7A6A5A',
              fontWeight: 600,
            }}
          >
            Inköpslistan är tom
          </Text>
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 13,
              color: '#9A8A7A',
              marginTop: 4,
            }}
          >
            Tryck på + för att lägga till varor
          </Text>
        </Box>
      )}

      {/* Sticky CTA — only show when there are bought items */}
      {bought.length > 0 && (
        <Box
          style={{
            position: 'fixed',
            bottom: 76,
            left: 16,
            right: 16,
            zIndex: 100,
          }}
        >
          <Button
            fullWidth
            size="lg"
            radius="xl"
            leftSection={<IconPackage size={18} />}
            onClick={openBulkWizard}
            style={{
              background: TERRA,
              boxShadow: '0 4px 20px rgba(181,67,42,0.4)',
              fontFamily: '"Manrope", sans-serif',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Köp och flytta till lagret
          </Button>
        </Box>
      )}

      {/* Detail add bottom sheet */}
      <BottomSheet
        opened={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Lägg till vara"
      >
        <Stack>
          <TextInput
            label="Namn"
            placeholder="T.ex. 2 kg Mjöl"
            value={detailName}
            onChange={(e) => handleNameChange(e.currentTarget.value)}
          />
          <Group grow>
            <NumberInput
              label="Antal"
              value={detailQuantity}
              onChange={(v) => setDetailQuantity(typeof v === 'number' ? v : 1)}
              min={0.01}
              step={1}
              decimalScale={2}
            />
            <Select
              label="Enhet"
              data={UNITS_FLAT}
              value={detailUnit}
              onChange={(v) => setDetailUnit(v ?? 'st')}
              allowDeselect={false}
              searchable
            />
          </Group>
          <Select
            label="Kategori"
            placeholder="Valfritt"
            data={ITEM_CATEGORIES}
            value={detailCategory}
            onChange={setDetailCategory}
            clearable
            searchable
          />
          <TextInput
            label="Notering"
            placeholder="Valfritt"
            value={detailNote}
            onChange={(e) => setDetailNote(e.currentTarget.value)}
          />
          <Button onClick={handleDetailAdd} disabled={!detailName.trim()} fullWidth>
            Lägg till
          </Button>
        </Stack>
      </BottomSheet>

      {/* Bulk add to inventory wizard */}
      <BottomSheet opened={bulkOpen} onClose={() => setBulkOpen(false)} title="Flytta till lagret">
        {bulkDone ? (
          <Alert color="green" icon={<IconCheck size={16} />}>
            Alla varor har lagts in i lagret!
          </Alert>
        ) : (
          <Stack>
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 13,
                color: '#7A6A5A',
              }}
            >
              Välj förvaringsplats för varje vara
            </Text>
            {bought.map((item, idx) => (
              <Box
                key={item.id}
                py="sm"
                style={{
                  borderBottom: idx < bought.length - 1 ? '1px solid #EDE8E2' : undefined,
                }}
              >
                <Text
                  style={{
                    fontFamily: '"Manrope", sans-serif',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1C1410',
                  }}
                >
                  {item.quantity !== 1 || item.unit !== 'st'
                    ? `${item.quantity} ${item.unit} `
                    : ''}
                  {item.name}
                </Text>
                {item.note && (
                  <Text
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontSize: 11,
                      color: '#7A6A5A',
                      marginBottom: 6,
                    }}
                  >
                    {item.note}
                  </Text>
                )}
                <Select
                  size="xs"
                  mt={6}
                  data={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
                  value={bulkLocations[item.id] ?? locations[0]?.id ?? ''}
                  onChange={(v) => setBulkLocations((prev) => ({ ...prev, [item.id]: v ?? '' }))}
                  allowDeselect={false}
                />
              </Box>
            ))}
            <Button
              fullWidth
              leftSection={<IconPackage size={16} />}
              onClick={handleBulkAdd}
              loading={bulkSubmitting}
            >
              Lägg in {bought.length} varor i lagret
            </Button>
          </Stack>
        )}
      </BottomSheet>

      <AddItemModal
        opened={inventoryItem !== null}
        onClose={() => setInventoryItem(null)}
        defaultName={inventoryItem?.name ?? ''}
        onAdded={() => {
          if (inventoryItem) removeItem(inventoryItem.id)
        }}
      />
    </Stack>
  )
}
