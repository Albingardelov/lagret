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
  Popover,
  NativeSelect,
  NumberInput,
} from '@mantine/core'
import { IconSearch, IconPlus, IconX, IconCheck, IconPencil } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { AddItemModal } from './AddItemModal'
import type { LocationIcon } from '../types'

interface Props {
  opened: boolean
  onClose: () => void
}

const TERRA = '#B5432A'
const BG = '#F7F2EB'
const CARD_BG = '#FFFFFF'

type TabKey = 'all' | LocationIcon

const TAB_LABELS: Record<TabKey, string> = {
  all: 'Alla',
  fridge: 'Kyl',
  freezer: 'Frys',
  pantry: 'Skafferi',
}

export function CookingMode({ opened, onClose }: Props) {
  const items = useInventoryStore((s) => s.items)
  const updateItem = useInventoryStore((s) => s.updateItem)
  const locations = useLocationsStore((s) => s.locations)

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('all')
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

  // Build location-id → icon map
  const locationIconMap = useMemo(() => {
    const m: Record<string, LocationIcon> = {}
    for (const loc of locations) m[loc.id] = loc.icon as LocationIcon
    return m
  }, [locations])

  const availableIcons = useMemo(() => {
    const icons = new Set(locations.map((l) => l.icon as LocationIcon))
    return icons
  }, [locations])

  const filtered = useMemo(() => {
    const matching = items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchesTab = activeTab === 'all' || locationIconMap[item.location] === activeTab
      return matchesSearch && matchesTab
    })
    return [...matching].sort((a, b) => {
      if (a.quantity === 0 && b.quantity !== 0) return 1
      if (a.quantity !== 0 && b.quantity === 0) return -1
      return 0
    })
  }, [items, search, activeTab, locationIconMap])

  const tabs: TabKey[] = [
    'all',
    ...(['fridge', 'freezer', 'pantry'] as LocationIcon[]).filter((t) => availableIcons.has(t)),
  ]

  const decrement = (id: string, qty: number, step: number, unit: string) => {
    const next = Math.max(0, Math.round((qty - step) * 1000) / 1000)
    updateItem(id, { quantity: next }).catch(() => {})
    notifications.show({
      message: `-${formatQty(step)} ${unit} avdraget`,
      color: 'terra',
      autoClose: 2000,
      withCloseButton: true,
    })
  }

  const increment = (id: string, qty: number, step: number) => {
    const next = Math.round((qty + step) * 1000) / 1000
    updateItem(id, { quantity: next }).catch(() => {})
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

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        fullScreen
        radius={0}
        withCloseButton={false}
        styles={{
          body: { background: BG, padding: 0, height: '100%' },
          content: { background: BG },
        }}
      >
        <Stack gap={0} h="100%">
          {/* Sticky header */}
          <Box
            style={{
              background: BG,
              borderBottom: '1px solid rgba(180,160,140,0.2)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <UnstyledButton
              onClick={onClose}
              aria-label="Stäng"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#E8E0D8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconX size={18} color="#4A3728" />
            </UnstyledButton>

            <Text
              style={{
                fontFamily: '"Epilogue", sans-serif',
                fontWeight: 800,
                fontSize: 18,
                color: '#1C1410',
              }}
            >
              Laga mat
            </Text>

            <UnstyledButton
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#DCFCE7',
                borderRadius: 20,
                padding: '7px 14px',
              }}
            >
              <IconCheck size={13} color="#166534" stroke={3} />
              <Text
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#166534',
                }}
              >
                Färdig
              </Text>
            </UnstyledButton>
          </Box>

          {/* Search */}
          <Box px={16} pt={12} pb={8}>
            <TextInput
              placeholder="Sök ingredienser..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              radius="xl"
              styles={{
                input: {
                  background: '#EDE8E2',
                  border: 'none',
                  fontSize: 14,
                  '&:focus': { border: `1.5px solid ${TERRA}` },
                },
              }}
            />
          </Box>

          {/* Category tabs */}
          <Box
            style={{
              borderBottom: '1px solid rgba(180,160,140,0.2)',
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
                      padding: '10px 14px',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: '"Manrope", sans-serif',
                        fontSize: 13,
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
                          left: 14,
                          right: 14,
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

          {/* Item list */}
          <ScrollArea flex={1} offsetScrollbars style={{ padding: '12px 16px' }}>
            <Stack gap={10} py={4}>
              {filtered.map((item) => {
                const cookingUnit =
                  cookingUnits[item.id] ?? suggestCookingUnit(item.name, item.unit)
                const smallStep = getSmallStep(cookingUnit)
                const customStep = customSteps[item.id]
                const activeStep = customStep ?? smallStep

                return (
                  <Box
                    key={item.id}
                    style={{
                      background: CARD_BG,
                      borderRadius: 16,
                      padding: '14px 16px',
                      boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
                      opacity: item.quantity === 0 ? 0.45 : 1,
                    }}
                  >
                    <Group justify="space-between" align="center" wrap="nowrap">
                      {/* Item name + info */}
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 11,
                            fontWeight: 700,
                            color: TERRA,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                          }}
                        >
                          {(
                            locations.find((l) => l.id === item.location)?.name ?? 'OKÄND'
                          ).toUpperCase()}
                        </Text>
                        <Text
                          style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#1C1410',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.name}
                        </Text>
                        <Group gap={6} align="center">
                          <Text
                            style={{
                              fontFamily: '"Manrope", sans-serif',
                              fontSize: 12,
                              color: '#7A6A5A',
                            }}
                          >
                            {formatQty(item.quantity)} {item.unit} kvar
                          </Text>
                          {/* Unit picker */}
                          <Popover
                            opened={editingUnit === item.id}
                            onClose={() => setEditingUnit(null)}
                            position="bottom-start"
                            withArrow
                          >
                            <Popover.Target>
                              <UnstyledButton
                                aria-label="byt enhet"
                                onClick={() =>
                                  setEditingUnit(editingUnit === item.id ? null : item.id)
                                }
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  background: '#EDE8E2',
                                  borderRadius: 8,
                                  padding: '2px 6px',
                                }}
                              >
                                <Text
                                  style={{
                                    fontFamily: '"Manrope", sans-serif',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: '#4A3728',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {cookingUnit}
                                </Text>
                                <IconPencil size={9} color="#7A6A5A" stroke={2} />
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
                      </Box>

                      {/* Quantity controls */}
                      <Group gap={8} wrap="nowrap" style={{ flexShrink: 0 }}>
                        {/* Decrement */}
                        <UnstyledButton
                          disabled={item.quantity === 0}
                          onClick={() => decrement(item.id, item.quantity, activeStep, cookingUnit)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: item.quantity === 0 ? '#EDE8E2' : '#FBEAEA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: item.quantity === 0 ? 0.5 : 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: 300,
                              color: '#C42A2A',
                              lineHeight: 1,
                            }}
                          >
                            −
                          </Text>
                        </UnstyledButton>

                        {/* Step value — tappable to set custom step */}
                        <Popover
                          opened={editingStep === item.id}
                          onClose={() => setEditingStep(null)}
                          position="top"
                          withArrow
                        >
                          <Popover.Target>
                            <UnstyledButton
                              onClick={() => {
                                setPopoverValue('')
                                setEditingStep(editingStep === item.id ? null : item.id)
                              }}
                              style={{
                                minWidth: 36,
                                textAlign: 'center',
                                padding: '2px 4px',
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: '"Manrope", sans-serif',
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: '#1C1410',
                                  lineHeight: 1,
                                }}
                              >
                                {formatQty(activeStep)}
                              </Text>
                              <Text
                                style={{
                                  fontFamily: '"Manrope", sans-serif',
                                  fontSize: 10,
                                  color: '#9A8A7A',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {cookingUnit.toUpperCase()}
                              </Text>
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

                        {/* Increment */}
                        <UnstyledButton
                          onClick={() => increment(item.id, item.quantity, activeStep)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: TERRA,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: 300,
                              color: '#FFFFFF',
                              lineHeight: 1,
                            }}
                          >
                            +
                          </Text>
                        </UnstyledButton>
                      </Group>
                    </Group>
                  </Box>
                )
              })}

              {/* Empty state */}
              {filtered.length === 0 && (
                <Box style={{ textAlign: 'center', padding: '48px 16px' }}>
                  <Text size="xl" mb={8}>
                    🥬
                  </Text>
                  <Text
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontWeight: 600,
                      color: '#7A6A5A',
                      fontSize: 14,
                    }}
                  >
                    Inga varor hittades
                  </Text>
                  <Text
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontSize: 13,
                      color: '#9A8A7A',
                      marginTop: 4,
                    }}
                  >
                    Prova ett annat sökord eller byt kategori
                  </Text>
                </Box>
              )}

              {/* Add item button */}
              <UnstyledButton
                onClick={() => setAddItemOpen(true)}
                style={{
                  border: '2px dashed #D0C4B8',
                  borderRadius: 16,
                  padding: '20px 16px',
                  textAlign: 'center',
                  width: '100%',
                  marginTop: 4,
                }}
              >
                <Stack gap={6} align="center">
                  <Box
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#EDE8E2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconPlus size={18} color={TERRA} />
                  </Box>
                  <Text
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontSize: 12,
                      fontWeight: 700,
                      color: TERRA,
                      letterSpacing: '0.08em',
                    }}
                  >
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
