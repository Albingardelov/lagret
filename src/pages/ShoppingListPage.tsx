import { useEffect, useState } from 'react'
import {
  Stack,
  Text,
  TextInput,
  Select,
  Button,
  Group,
  Box,
  ActionIcon,
  Checkbox,
  Alert,
} from '@mantine/core'
import { IconPlus, IconTrash, IconPackage, IconCheck } from '@tabler/icons-react'
import { useShoppingStore } from '../store/shoppingStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { useErrorNotification } from '../hooks/useErrorNotification'
import { AddItemModal } from '../components/AddItemModal'
import { ITEM_CATEGORIES } from '../lib/categories'
import { BottomSheet } from '../components/BottomSheet'

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

  async function handleDetailAdd() {
    const trimmed = detailName.trim()
    if (!trimmed) return
    await addItem(trimmed, detailNote.trim() || undefined, detailCategory ?? undefined)
    setDetailName('')
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
          quantity: 1,
          unit: 'st',
          location: loc,
        })
        await removeItem(item.id)
      }
      setBulkDone(true)
    } finally {
      setBulkSubmitting(false)
    }
  }

  // Group pending items by note (recipe name) for visual grouping
  const pendingByNote = (() => {
    const groups: { note: string; items: typeof pending }[] = []
    const noteMap = new Map<string, typeof pending>()
    for (const item of pending) {
      const key = item.note ?? ''
      if (!noteMap.has(key)) noteMap.set(key, [])
      noteMap.get(key)!.push(item)
    }
    // Items without note first, then grouped by note
    const noNote = noteMap.get('') ?? []
    if (noNote.length > 0) groups.push({ note: '', items: noNote })
    for (const [note, items] of noteMap) {
      if (note) groups.push({ note, items })
    }
    return groups
  })()

  return (
    <Stack gap={0}>
      {/* Header */}
      <Box px="md" pt="lg" pb="sm">
        <Text
          style={{
            fontFamily: '"Epilogue", sans-serif',
            fontWeight: 900,
            fontSize: 28,
            color: '#191d16',
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
            color: '#7a8a6a',
            marginTop: 4,
          }}
        >
          {pending.length} att handla{bought.length > 0 ? ` · ${bought.length} köpta` : ''}
        </Text>
      </Box>

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
          onClick={() => setDetailsOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #53642e 0%, #889a5e 100%)',
            border: 'none',
            boxShadow: '0 4px 16px rgba(83,100,46,0.35), 0 0 0 3px rgba(248,251,238,0.92)',
          }}
          aria-label="Lägg till vara"
        >
          <IconPlus size={24} color="#fff" />
        </ActionIcon>
      </Box>

      {loading && (
        <Text c="dimmed" size="sm" px="md">
          Laddar...
        </Text>
      )}

      {/* Pending items grouped by note/recipe */}
      <Stack gap={0} px="md">
        {pendingByNote.map(({ note, items: groupItems }) => (
          <Box key={note || '__no_note__'}>
            {note && (
              <Group gap={6} mt="sm" mb={4}>
                <Box
                  style={{
                    width: 3,
                    height: 14,
                    borderRadius: 2,
                    background: '#889a5e',
                    flexShrink: 0,
                  }}
                />
                <Text
                  style={{
                    fontFamily: '"Manrope", sans-serif',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#889a5e',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}
                >
                  {note}
                </Text>
              </Group>
            )}
            {groupItems.map((item, idx) => (
              <Box
                key={item.id}
                py={10}
                style={{
                  borderBottom:
                    idx < groupItems.length - 1 ? '1px solid #ecefe3' : '1px solid #dde3d3',
                }}
              >
                <Checkbox
                  checked={false}
                  onChange={() => toggleBought(item.id)}
                  styles={{
                    body: { alignItems: 'center' },
                    label: { paddingLeft: 8 },
                    input: {
                      borderRadius: 6,
                      border: '1.5px solid #c5ccb8',
                    },
                  }}
                  label={
                    <Text
                      style={{
                        fontFamily: '"Manrope", sans-serif',
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#191d16',
                      }}
                    >
                      {item.name}
                    </Text>
                  }
                />
              </Box>
            ))}
          </Box>
        ))}
      </Stack>

      {/* Bought items */}
      {bought.length > 0 && (
        <Box mt="md">
          <Group justify="space-between" px="md" mb={6}>
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 12,
                fontWeight: 700,
                color: '#a8b4a0',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Köpta varor
            </Text>
            <Group gap={8}>
              <Button
                size="compact-xs"
                variant="light"
                color="green"
                leftSection={<IconPackage size={13} />}
                onClick={openBulkWizard}
                style={{ fontFamily: '"Manrope", sans-serif', fontWeight: 600 }}
              >
                Lägg in i lagret
              </Button>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={clearBought}
                aria-label="Rensa köpta varor"
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Group>
          <Stack gap={0} px="md">
            {bought.map((item, idx) => (
              <Box
                key={item.id}
                py={8}
                style={{
                  borderBottom: idx < bought.length - 1 ? '1px solid #ecefe3' : undefined,
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Checkbox
                    checked={true}
                    onChange={() => toggleBought(item.id)}
                    styles={{
                      body: { alignItems: 'center' },
                      label: { paddingLeft: 8 },
                      input: {
                        borderRadius: 6,
                        background: '#889a5e',
                        borderColor: '#889a5e',
                      },
                    }}
                    label={
                      <Stack gap={0}>
                        <Text
                          style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#a8b4a0',
                            textDecoration: 'line-through',
                          }}
                        >
                          {item.name}
                        </Text>
                        {item.note && (
                          <Text
                            style={{
                              fontFamily: '"Manrope", sans-serif',
                              fontSize: 11,
                              color: '#c5ccb8',
                            }}
                          >
                            {item.note}
                          </Text>
                        )}
                      </Stack>
                    }
                  />
                  <ActionIcon
                    size={28}
                    radius={8}
                    variant="light"
                    color="green"
                    onClick={() => setInventoryItem({ id: item.id, name: item.name })}
                    aria-label="Lägg i lagret"
                    title="Lägg i lagret"
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
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 14,
              color: '#a8b4a0',
            }}
          >
            Inköpslistan är tom
          </Text>
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
            placeholder="T.ex. Mjölk"
            value={detailName}
            onChange={(e) => setDetailName(e.currentTarget.value)}
          />
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
      <BottomSheet
        opened={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Lägg in varor i lagret"
      >
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
                color: '#7a8a6a',
              }}
            >
              Välj förvaringsplats för varje vara
            </Text>
            {bought.map((item) => (
              <Group key={item.id} justify="space-between" wrap="nowrap" gap="sm">
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    truncate
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {item.name}
                  </Text>
                  {item.note && (
                    <Text
                      style={{
                        fontFamily: '"Manrope", sans-serif',
                        fontSize: 11,
                        color: '#a8b4a0',
                      }}
                    >
                      {item.note}
                    </Text>
                  )}
                </Stack>
                <Select
                  size="xs"
                  w={140}
                  data={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
                  value={bulkLocations[item.id] ?? locations[0]?.id ?? ''}
                  onChange={(v) => setBulkLocations((prev) => ({ ...prev, [item.id]: v ?? '' }))}
                  allowDeselect={false}
                />
              </Group>
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
