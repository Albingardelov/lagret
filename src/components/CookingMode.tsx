// Re-export utility functions so tests can import them from this file
export { getSmallStep, getLargeStep, formatQty } from './cookingModeUtils'
import {
  getSmallStep,
  getLargeStep,
  formatQty,
  loadCustomSteps,
  saveCustomSteps,
  loadCookingUnits,
  saveCookingUnits,
} from './cookingModeUtils'
import { suggestCookingUnit } from '../lib/cookingUnitSuggestions'

import { useState, useMemo, useEffect } from 'react'
import {
  Modal,
  Stack,
  Group,
  Text,
  TextInput,
  ScrollArea,
  Box,
  UnstyledButton,
  NumberInput,
  Popover,
  NativeSelect,
} from '@mantine/core'
import { IconSearch, IconPlus, IconChevronLeft, IconPencil } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { AddItemModal } from './AddItemModal'

interface Props {
  opened: boolean
  onClose: () => void
}

export function CookingMode({ opened, onClose }: Props) {
  const items = useInventoryStore((s) => s.items)
  const updateItem = useInventoryStore((s) => s.updateItem)
  const locations = useLocationsStore((s) => s.locations)

  const [search, setSearch] = useState('')
  const [activeLocation, setActiveLocation] = useState<string | null>(null)
  const [customSteps, setCustomSteps] = useState<Record<string, number>>({})
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [popoverValue, setPopoverValue] = useState<number | string>('')
  const [cookingUnits, setCookingUnits] = useState<Record<string, string>>({})
  const [editingUnit, setEditingUnit] = useState<string | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (opened) {
      setCustomSteps(loadCustomSteps())
      setCookingUnits(loadCookingUnits())
    }
  }, [opened])
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(() => {
    const matching = items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchesLocation = !activeLocation || item.location === activeLocation
      return matchesSearch && matchesLocation
    })
    return [...matching].sort((a, b) => {
      if (a.quantity === 0 && b.quantity !== 0) return 1
      if (a.quantity !== 0 && b.quantity === 0) return -1
      return 0
    })
  }, [items, search, activeLocation])

  const getLocationName = (locationId: string) =>
    locations.find((l) => l.id === locationId)?.name ?? ''

  const adjust = (id: string, qty: number, step: number, unit: string) => {
    const next = Math.max(0, Math.round((qty - step) * 1000) / 1000)
    updateItem(id, { quantity: next }).catch(() => {})
    notifications.show({
      message: `-${formatQty(step)} ${unit} avdraget`,
      color: 'sage',
      autoClose: 3000,
      withCloseButton: true,
    })
  }

  const setCustomStep = (itemId: string, value: number) => {
    const next = { ...customSteps, [itemId]: value }
    setCustomSteps(next)
    saveCustomSteps(next)
    setEditingStep(null)
  }

  const setCookingUnit = (itemId: string, unit: string) => {
    const next = { ...cookingUnits, [itemId]: unit }
    setCookingUnits(next)
    saveCookingUnits(next)
    setEditingUnit(null)
  }

  const bg = '#f7f8f4'
  const cardBg = '#ffffff'
  const chipActive = '#53642e'
  const chipInactive = '#e8eee0'
  const badgeBg = '#ecefe3'
  const btnBg = '#f2f4ed'
  const locationColor = '#53642e'

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        fullScreen
        radius={0}
        withCloseButton={false}
        styles={{
          body: { background: bg, padding: '16px 16px 80px', height: '100%' },
          content: { background: bg },
        }}
      >
        <Stack gap="md" h="100%">
          {/* Sticky nav bar */}
          <Box
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: bg,
              borderBottom: '1px solid #e8eee0',
              margin: '-16px -16px 0',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <UnstyledButton
              onClick={onClose}
              aria-label="Tillbaka"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#53642e',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <IconChevronLeft size={20} stroke={2.5} />
              <Text fw={600} size="sm" c="#53642e">
                Tillbaka
              </Text>
            </UnstyledButton>
            <Text
              fw={700}
              size="lg"
              c="#2c340d"
              style={{ fontFamily: '"Epilogue", sans-serif', flex: 1, textAlign: 'center' }}
            >
              Laga mat
            </Text>
            {/* Spacer to balance the back button */}
            <Box style={{ width: 80 }} />
          </Box>

          {/* Search */}
          <TextInput
            placeholder="Sök ingredienser..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            radius="xl"
            styles={{
              input: { background: '#ede8df', border: 'none', fontSize: 15 },
            }}
          />

          {/* Location filter */}
          <ScrollArea scrollbarSize={0}>
            <Group gap={8} wrap="nowrap" pb={4}>
              {[{ id: null as string | null, name: 'Alla' }, ...locations].map((loc) => {
                const isActive = activeLocation === loc.id
                return (
                  <UnstyledButton
                    key={loc.id ?? 'all'}
                    onClick={() => setActiveLocation(loc.id)}
                    style={{
                      padding: '7px 18px',
                      borderRadius: 999,
                      background: isActive ? chipActive : chipInactive,
                      color: isActive ? '#fff' : '#555',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: 14,
                      whiteSpace: 'nowrap',
                      transition: 'background 0.15s',
                    }}
                  >
                    {loc.name}
                  </UnstyledButton>
                )
              })}
            </Group>
          </ScrollArea>

          {/* Item list */}
          <ScrollArea flex={1} offsetScrollbars>
            <Stack gap="md">
              {filtered.map((item) => {
                const locationName = (getLocationName(item.location) || 'OKÄND').toUpperCase()
                const cookingUnit =
                  cookingUnits[item.id] ?? suggestCookingUnit(item.name, item.unit)
                const smallStep = getSmallStep(cookingUnit)
                const largeStep = getLargeStep(cookingUnit)
                const customStep = customSteps[item.id]
                const unitLabel = cookingUnit.toUpperCase()

                return (
                  <Box
                    key={item.id}
                    style={{
                      background: cardBg,
                      borderRadius: 16,
                      padding: '14px 16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      opacity: item.quantity === 0 ? 0.45 : 1,
                    }}
                  >
                    {/* Top row: location + quantity badge */}
                    <Group justify="space-between" align="flex-start" mb={4}>
                      <Text
                        style={{
                          fontSize: 11,
                          letterSpacing: '0.08em',
                          color: locationColor,
                          fontWeight: 600,
                        }}
                      >
                        {locationName}
                      </Text>
                      <Box
                        style={{
                          background: badgeBg,
                          borderRadius: 999,
                          padding: '3px 12px',
                        }}
                      >
                        <Text fw={600} size="sm" c="#53642e">
                          {formatQty(item.quantity)} {item.unit}
                        </Text>
                      </Box>
                    </Group>

                    {/* Item name + unit picker */}
                    <Group justify="space-between" align="center" mb={12}>
                      <Text fw={700} size="xl" c="#1a1a1a">
                        {item.name}
                      </Text>
                      <Popover
                        opened={editingUnit === item.id}
                        onClose={() => setEditingUnit(null)}
                        position="bottom-end"
                        withArrow
                      >
                        <Popover.Target>
                          <UnstyledButton
                            aria-label="byt enhet"
                            onClick={() => setEditingUnit(editingUnit === item.id ? null : item.id)}
                            style={{
                              background: '#d5dbc0',
                              borderRadius: 999,
                              padding: '2px 10px',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#47551f',
                              letterSpacing: '0.05em',
                            }}
                          >
                            <Group gap={3} align="center" wrap="nowrap">
                              <span>{unitLabel}</span>
                              <IconPencil size={9} stroke={2} />
                            </Group>
                          </UnstyledButton>
                        </Popover.Target>
                        <Popover.Dropdown>
                          <NativeSelect
                            size="xs"
                            data={['st', 'g', 'kg', 'dl', 'l', 'ml', 'msk', 'tsk', 'krm']}
                            value={cookingUnit}
                            onChange={(e) => setCookingUnit(item.id, e.currentTarget.value)}
                            label="Kokenhet"
                          />
                        </Popover.Dropdown>
                      </Popover>
                    </Group>

                    {/* Decrement buttons */}
                    <Group gap={8} grow>
                      {/* Small step */}
                      <UnstyledButton
                        disabled={item.quantity === 0}
                        onClick={() => adjust(item.id, item.quantity, smallStep, cookingUnit)}
                        style={{
                          background: btnBg,
                          borderRadius: 10,
                          padding: '8px 4px',
                          textAlign: 'center',
                          opacity: item.quantity === 0 ? 0.4 : 1,
                        }}
                      >
                        <Text fw={600} size="sm" c="#333">
                          -{formatQty(smallStep)}
                        </Text>
                        <Text size="xs" c="#888" style={{ letterSpacing: '0.05em' }}>
                          {unitLabel}
                        </Text>
                      </UnstyledButton>

                      {/* Large step */}
                      <UnstyledButton
                        disabled={item.quantity === 0}
                        onClick={() => adjust(item.id, item.quantity, largeStep, cookingUnit)}
                        style={{
                          background: btnBg,
                          borderRadius: 10,
                          padding: '8px 4px',
                          textAlign: 'center',
                          opacity: item.quantity === 0 ? 0.4 : 1,
                        }}
                      >
                        <Text fw={600} size="sm" c="#333">
                          -{formatQty(largeStep)}
                        </Text>
                        <Text size="xs" c="#888" style={{ letterSpacing: '0.05em' }}>
                          {unitLabel}
                        </Text>
                      </UnstyledButton>

                      {/* Custom step */}
                      <Popover
                        opened={editingStep === item.id}
                        onClose={() => setEditingStep(null)}
                        position="top"
                        withArrow
                      >
                        <Popover.Target>
                          <UnstyledButton
                            disabled={item.quantity === 0}
                            onClick={() => {
                              if (customStep !== undefined) {
                                adjust(item.id, item.quantity, customStep, cookingUnit)
                              } else {
                                setPopoverValue('')
                                setEditingStep(item.id)
                              }
                            }}
                            style={{
                              background: btnBg,
                              borderRadius: 10,
                              padding: '8px 4px',
                              textAlign: 'center',
                              opacity: item.quantity === 0 ? 0.4 : 1,
                            }}
                          >
                            {customStep !== undefined ? (
                              <>
                                <Text fw={600} size="sm" c="#333">
                                  -{formatQty(customStep)}
                                </Text>
                                <Text size="xs" c="#888" style={{ letterSpacing: '0.05em' }}>
                                  {unitLabel}
                                </Text>
                              </>
                            ) : (
                              <>
                                <Text fw={600} size="sm" c="#aaa">
                                  —
                                </Text>
                                <Text size="xs" c="#506148" style={{ letterSpacing: '0.04em' }}>
                                  EGET
                                </Text>
                              </>
                            )}
                          </UnstyledButton>
                        </Popover.Target>
                        <Popover.Dropdown>
                          <Stack gap={8}>
                            <Text size="xs" c="#888">
                              Ange eget steg ({cookingUnit})
                            </Text>
                            <NumberInput
                              min={0.1}
                              step={getSmallStep(cookingUnit)}
                              decimalScale={2}
                              placeholder={`ex. ${getLargeStep(cookingUnit)}`}
                              value={popoverValue}
                              onChange={setPopoverValue}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const v =
                                    typeof popoverValue === 'number'
                                      ? popoverValue
                                      : parseFloat(String(popoverValue))
                                  if (!isNaN(v) && v > 0) setCustomStep(item.id, v)
                                }
                              }}
                              onBlur={() => {
                                const v =
                                  typeof popoverValue === 'number'
                                    ? popoverValue
                                    : parseFloat(String(popoverValue))
                                if (!isNaN(v) && v > 0) setCustomStep(item.id, v)
                              }}
                              styles={{ input: { width: 100 } }}
                            />
                          </Stack>
                        </Popover.Dropdown>
                      </Popover>
                    </Group>
                  </Box>
                )
              })}

              {/* Empty state */}
              {filtered.length === 0 && (
                <Box
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                  }}
                >
                  <Text size="xl" mb={8}>
                    🥬
                  </Text>
                  <Text fw={600} c="#53642e" size="sm">
                    Inga varor hittades
                  </Text>
                  <Text size="xs" c="#53642e" mt={4}>
                    Prova ett annat sökord eller byt plats
                  </Text>
                </Box>
              )}

              {/* Add item button */}
              <UnstyledButton
                onClick={() => setAddItemOpen(true)}
                style={{
                  border: '2px dashed #bcc89c',
                  borderRadius: 16,
                  padding: '20px 16px',
                  textAlign: 'center',
                  marginTop: 4,
                }}
              >
                <Stack gap={6} align="center">
                  <Box
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#d5dbc0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconPlus size={18} color="#53642e" />
                  </Box>
                  <Text size="xs" fw={700} c="#53642e" style={{ letterSpacing: '0.1em' }}>
                    LÄGG TILL INGREDIENS
                  </Text>
                </Stack>
              </UnstyledButton>
            </Stack>
          </ScrollArea>
        </Stack>
      </Modal>

      <AddItemModal opened={addItemOpen} onClose={() => setAddItemOpen(false)} />
    </>
  )
}
