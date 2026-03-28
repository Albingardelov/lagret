// Re-export utility functions so tests can import them from this file
export { getSmallStep, getLargeStep, formatQty } from './cookingModeUtils'
import {
  getSmallStep,
  getLargeStep,
  formatQty,
  loadCustomSteps,
  saveCustomSteps,
} from './cookingModeUtils'

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
} from '@mantine/core'
import { IconSearch, IconPlus } from '@tabler/icons-react'
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (opened) setCustomSteps(loadCustomSteps())
  }, [opened])
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
        const matchesLocation = !activeLocation || item.location === activeLocation
        return matchesSearch && matchesLocation
      }),
    [items, search, activeLocation]
  )

  const getLocationName = (locationId: string) =>
    locations.find((l) => l.id === locationId)?.name ?? ''

  const adjust = (id: string, qty: number, step: number) => {
    const next = Math.max(0, Math.round((qty - step) * 1000) / 1000)
    updateItem(id, { quantity: next }).catch(() => {})
  }

  const setCustomStep = (itemId: string, value: number) => {
    const next = { ...customSteps, [itemId]: value }
    setCustomSteps(next)
    saveCustomSteps(next)
    setEditingStep(null)
  }

  const bg = '#f5f0e8'
  const cardBg = '#ffffff'
  const chipActive = '#e8956d'
  const chipInactive = '#e8e0d0'
  const badgeBg = '#e8e0d0'
  const btnBg = '#f0ece6'
  const locationColor = '#999'

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
          {/* Header */}
          <Box>
            <Text fw={800} size="28px" lh={1.1} c="#1a1a1a">
              Improvisera i köket
            </Text>
            <Text size="sm" c="#888" mt={4}>
              Uppdatera ditt lager medan du skapar magi vid spisen.
            </Text>
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
                const smallStep = getSmallStep(item.unit)
                const largeStep = getLargeStep(item.unit)
                const customStep = customSteps[item.id]
                const unit = item.unit.toUpperCase()

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
                        <Text fw={600} size="sm" c="#6b5a3e">
                          {formatQty(item.quantity)} {item.unit}
                        </Text>
                      </Box>
                    </Group>

                    {/* Item name */}
                    <Text fw={700} size="xl" c="#1a1a1a" mb={12}>
                      {item.name}
                    </Text>

                    {/* Decrement buttons */}
                    <Group gap={8} grow>
                      {/* Small step */}
                      <UnstyledButton
                        disabled={item.quantity === 0}
                        onClick={() => adjust(item.id, item.quantity, smallStep)}
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
                          {unit}
                        </Text>
                      </UnstyledButton>

                      {/* Large step */}
                      <UnstyledButton
                        disabled={item.quantity === 0}
                        onClick={() => adjust(item.id, item.quantity, largeStep)}
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
                          {unit}
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
                                adjust(item.id, item.quantity, customStep)
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
                                  {unit}
                                </Text>
                              </>
                            ) : (
                              <Text fw={600} size="sm" c="#aaa">
                                —
                              </Text>
                            )}
                          </UnstyledButton>
                        </Popover.Target>
                        <Popover.Dropdown>
                          <Stack gap={8}>
                            <Text size="xs" c="#888">
                              Ange eget steg ({item.unit})
                            </Text>
                            <NumberInput
                              min={0.1}
                              step={getSmallStep(item.unit)}
                              decimalScale={2}
                              placeholder={`ex. ${getLargeStep(item.unit)}`}
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

              {/* Add item button */}
              <UnstyledButton
                onClick={() => setAddItemOpen(true)}
                style={{
                  border: '2px dashed #c8bfb0',
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
                      background: '#e8e0d0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconPlus size={18} color="#6b5a3e" />
                  </Box>
                  <Text size="xs" fw={700} c="#6b5a3e" style={{ letterSpacing: '0.1em' }}>
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
