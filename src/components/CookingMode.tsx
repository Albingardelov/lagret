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

import { useState, useMemo, useEffect, useRef } from 'react'
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
import {
  IconSearch,
  IconPlus,
  IconX,
  IconCheck,
  IconPencil,
  IconMilk,
  IconMeat,
  IconFish,
  IconLeaf,
  IconApple,
  IconGrain,
  IconFlame,
  IconEgg,
  IconBottle,
  IconPackage,
  IconSalt,
  IconBread,
  IconPlant,
  IconClock,
  IconShoppingCart,
  IconPlayerPlay,
  IconPlayerPause,
  IconRefresh,
  IconArrowLeft,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { AddItemModal } from './AddItemModal'

interface Props {
  opened: boolean
  onClose: () => void
}

const TERRA = '#B5432A'
const BG = '#F7F2EB'
const CARD_BG = '#FFFFFF'

const CATEGORY_ORDER = [
  'Mejeri',
  'Kött',
  'Fisk & skaldjur',
  'Grönsaker',
  'Frukt',
  'Pasta & ris',
  'Bakning',
  'Frukost',
  'Konserver',
  'Snacks',
  'Dryck',
  'Skafferi',
  'Såser & kryddor',
  'Örter & kryddor',
  'Bröd',
]

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Mejeri: <IconMilk size={24} />,
  Kött: <IconMeat size={24} />,
  'Fisk & skaldjur': <IconFish size={24} />,
  Grönsaker: <IconPlant size={24} />,
  Frukt: <IconApple size={24} />,
  'Pasta & ris': <IconGrain size={24} />,
  Bakning: <IconFlame size={24} />,
  Frukost: <IconEgg size={24} />,
  Konserver: <IconPackage size={24} />,
  Snacks: <IconPackage size={24} />,
  Dryck: <IconBottle size={24} />,
  Skafferi: <IconPackage size={24} />,
  'Såser & kryddor': <IconSalt size={24} />,
  'Örter & kryddor': <IconLeaf size={24} />,
  Bröd: <IconBread size={24} />,
}

const CATEGORY_COLORS: Record<string, { bg: string; icon: string }> = {
  Mejeri: { bg: '#EBF3FB', icon: '#2A80C4' },
  Kött: { bg: '#FBEAEA', icon: '#C42A2A' },
  'Fisk & skaldjur': { bg: '#E8F6F6', icon: '#1A9090' },
  Grönsaker: { bg: '#E8F5EE', icon: '#1A8A4A' },
  Frukt: { bg: '#FEF3E8', icon: '#C47820' },
  'Pasta & ris': { bg: '#FDF0EC', icon: '#B54A2A' },
  Bakning: { bg: '#FBF0E8', icon: '#A05025' },
  Frukost: { bg: '#FEFAE8', icon: '#C4A020' },
  Konserver: { bg: '#F0EEF8', icon: '#5A4AAA' },
  Snacks: { bg: '#FBEAF3', icon: '#A42A6A' },
  Dryck: { bg: '#E8F8F4', icon: '#1A9070' },
  Skafferi: { bg: '#EEF0F2', icon: '#5A6670' },
  'Såser & kryddor': { bg: '#FBEAF3', icon: '#982260' },
  'Örter & kryddor': { bg: '#EAF5EA', icon: '#2A8A2A' },
  Bröd: { bg: '#FBF0E8', icon: '#A06030' },
}

const DEFAULT_ICON_STYLE = { bg: '#F0EEE8', icon: '#7A6A5A' }

interface TimerPreset {
  id: string
  label: string
  seconds: number
}

const PRESETS_KEY = 'lagret:timer-presets'

const DEFAULT_PRESETS: TimerPreset[] = [
  { id: 'egg-soft', label: 'Ägg (löskokt)', seconds: 4 * 60 },
  { id: 'egg-hard', label: 'Ägg (hårdkokt)', seconds: 10 * 60 },
  { id: 'pasta', label: 'Pasta', seconds: 8 * 60 },
  { id: 'ris', label: 'Ris', seconds: 18 * 60 },
]

function loadPresets(): TimerPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    return raw ? (JSON.parse(raw) as TimerPreset[]) : DEFAULT_PRESETS
  } catch {
    return DEFAULT_PRESETS
  }
}

function savePresets(presets: TimerPreset[]) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
  } catch {
    // ignore
  }
}

const timeInputStyle: React.CSSProperties = {
  width: 52,
  height: 40,
  borderRadius: 10,
  border: '1.5px solid #E8E0D8',
  background: '#FFFFFF',
  fontFamily: '"Manrope", sans-serif',
  fontSize: 16,
  fontWeight: 700,
  color: '#1C1410',
  textAlign: 'center',
  outline: 'none',
}

const timeLabelStyle: React.CSSProperties = {
  fontFamily: '"Manrope", sans-serif',
  fontSize: 12,
  color: '#7A6A5A',
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function CookingMode({ opened, onClose }: Props) {
  const items = useInventoryStore((s) => s.items)
  const updateItem = useInventoryStore((s) => s.updateItem)
  const locations = useLocationsStore((s) => s.locations)

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [customSteps, setCustomSteps] = useState<Record<string, number>>({})
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [popoverValue, setPopoverValue] = useState<number | string>('')
  const [cookingUnits, setCookingUnits] = useState<Record<string, string>>({})
  const [editingUnit, setEditingUnit] = useState<string | null>(null)
  const [timerOpen, setTimerOpen] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [presets, setPresets] = useState<TimerPreset[]>(DEFAULT_PRESETS)
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editMin, setEditMin] = useState('')
  const [editSec, setEditSec] = useState('')
  const [addingPreset, setAddingPreset] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newMin, setNewMin] = useState('')
  const [newSec, setNewSec] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (opened) {
      setCustomSteps(loadCustomSteps())
      setCookingUnits(loadCookingUnits())
      setPresets(loadPresets())
    } else {
      setTimerRunning(false)
      setTimerOpen(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [opened])

  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((s) => {
          if (s <= 1) {
            setTimerRunning(false)
            notifications.show({
              message: 'Timern är klar! 🔔',
              color: 'green',
              autoClose: 6000,
            })
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning])

  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    items.forEach((item) => {
      if (item.category) cats.add(item.category)
    })
    return CATEGORY_ORDER.filter((c) => cats.has(c))
  }, [items])

  const filtered = useMemo(() => {
    const matching = items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = activeCategory === null || item.category === activeCategory
      return matchesSearch && matchesCategory
    })
    return [...matching].sort((a, b) => {
      if (a.quantity === 0 && b.quantity !== 0) return 1
      if (a.quantity !== 0 && b.quantity === 0) return -1
      const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity
      const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity
      return aExpiry - bExpiry
    })
  }, [items, search, activeCategory])

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

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false
    return dayjs(expiryDate).diff(dayjs(), 'day') <= 3
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

          {/* Timer panel */}
          {timerOpen ? (
            <ScrollArea flex={1} offsetScrollbars>
              <Box style={{ padding: '20px 16px' }}>
                <UnstyledButton
                  onClick={() => setTimerOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 20,
                    color: '#7A6A5A',
                  }}
                >
                  <IconArrowLeft size={16} />
                  <Text
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#7A6A5A',
                    }}
                  >
                    Tillbaka
                  </Text>
                </UnstyledButton>

                <Text
                  style={{
                    fontFamily: '"Epilogue", sans-serif',
                    fontWeight: 900,
                    fontSize: 26,
                    color: '#1C1410',
                    marginBottom: 20,
                  }}
                >
                  Snabb-timer
                </Text>

                {/* Preset list */}
                <Stack gap={8} mb={16}>
                  {presets.map((p) => {
                    const active = timerSeconds === p.seconds && !timerRunning
                    const isEditing = editingPresetId === p.id
                    if (isEditing) {
                      return (
                        <Box
                          key={p.id}
                          style={{
                            background: '#FFFFFF',
                            borderRadius: 14,
                            padding: '12px 14px',
                            boxShadow: '0 1px 4px rgba(74,55,40,0.08)',
                          }}
                        >
                          <input
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.currentTarget.value)}
                            placeholder="Namn"
                            style={{
                              width: '100%',
                              marginBottom: 10,
                              border: 'none',
                              borderBottom: `1.5px solid ${TERRA}`,
                              background: 'transparent',
                              fontFamily: '"Manrope", sans-serif',
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#1C1410',
                              outline: 'none',
                              padding: '2px 0',
                            }}
                          />
                          <Group gap={6} align="center">
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={editMin}
                              onChange={(e) => setEditMin(e.currentTarget.value)}
                              style={timeInputStyle}
                            />
                            <Text style={timeLabelStyle}>min</Text>
                            <input
                              type="number"
                              min={0}
                              max={59}
                              value={editSec}
                              onChange={(e) => setEditSec(e.currentTarget.value)}
                              style={timeInputStyle}
                            />
                            <Text style={timeLabelStyle}>sek</Text>
                            <UnstyledButton
                              onClick={() => {
                                const m = parseInt(editMin || '0', 10)
                                const s = parseInt(editSec || '0', 10)
                                const total = m * 60 + s
                                if (total > 0 && editLabel.trim()) {
                                  const updated = presets.map((x) =>
                                    x.id === p.id
                                      ? { ...x, label: editLabel.trim(), seconds: total }
                                      : x
                                  )
                                  setPresets(updated)
                                  savePresets(updated)
                                }
                                setEditingPresetId(null)
                              }}
                              style={{
                                marginLeft: 4,
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: TERRA,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <IconCheck size={14} color="#fff" stroke={2.5} />
                            </UnstyledButton>
                            <UnstyledButton
                              onClick={() => setEditingPresetId(null)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: '#EDE8E2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <IconX size={14} color="#7A6A5A" />
                            </UnstyledButton>
                          </Group>
                        </Box>
                      )
                    }
                    return (
                      <Box
                        key={p.id}
                        style={{
                          background: active ? TERRA : '#FFFFFF',
                          borderRadius: 14,
                          padding: '12px 14px',
                          boxShadow: active
                            ? '0 2px 8px rgba(181,67,42,0.25)'
                            : '0 1px 4px rgba(74,55,40,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          transition: 'background 0.15s ease',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setTimerSeconds(p.seconds)
                          setTimerRunning(false)
                        }}
                      >
                        <Box style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: '"Manrope", sans-serif',
                              fontSize: 14,
                              fontWeight: 600,
                              color: active ? '#fff' : '#1C1410',
                              lineHeight: 1.2,
                            }}
                          >
                            {p.label}
                          </Text>
                          <Text
                            style={{
                              fontFamily: '"Manrope", sans-serif',
                              fontSize: 12,
                              color: active ? 'rgba(255,255,255,0.75)' : '#7A6A5A',
                            }}
                          >
                            {formatTime(p.seconds)}
                          </Text>
                        </Box>
                        <UnstyledButton
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditLabel(p.label)
                            const m = Math.floor(p.seconds / 60)
                            const s = p.seconds % 60
                            setEditMin(String(m))
                            setEditSec(s > 0 ? String(s) : '')
                            setEditingPresetId(p.id)
                          }}
                          style={{
                            padding: 6,
                            color: active ? 'rgba(255,255,255,0.7)' : '#9A8A7A',
                          }}
                          aria-label={`Redigera ${p.label}`}
                        >
                          <IconPencil size={14} />
                        </UnstyledButton>
                        <UnstyledButton
                          onClick={(e) => {
                            e.stopPropagation()
                            const updated = presets.filter((x) => x.id !== p.id)
                            setPresets(updated)
                            savePresets(updated)
                          }}
                          style={{
                            padding: 6,
                            color: active ? 'rgba(255,255,255,0.7)' : '#C42A2A',
                          }}
                          aria-label={`Ta bort ${p.label}`}
                        >
                          <IconX size={14} />
                        </UnstyledButton>
                      </Box>
                    )
                  })}
                </Stack>

                {/* Add new preset */}
                {addingPreset ? (
                  <Box
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 14,
                      padding: '12px 14px',
                      boxShadow: '0 1px 4px rgba(74,55,40,0.08)',
                      marginBottom: 24,
                    }}
                  >
                    <input
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.currentTarget.value)}
                      placeholder="Namn på preset"
                      style={{
                        width: '100%',
                        marginBottom: 10,
                        border: 'none',
                        borderBottom: `1.5px solid ${TERRA}`,
                        background: 'transparent',
                        fontFamily: '"Manrope", sans-serif',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#1C1410',
                        outline: 'none',
                        padding: '2px 0',
                      }}
                    />
                    <Group gap={6} align="center">
                      <input
                        type="number"
                        min={0}
                        max={99}
                        placeholder="0"
                        value={newMin}
                        onChange={(e) => setNewMin(e.currentTarget.value)}
                        style={timeInputStyle}
                      />
                      <Text style={timeLabelStyle}>min</Text>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        placeholder="0"
                        value={newSec}
                        onChange={(e) => setNewSec(e.currentTarget.value)}
                        style={timeInputStyle}
                      />
                      <Text style={timeLabelStyle}>sek</Text>
                      <UnstyledButton
                        onClick={() => {
                          const m = parseInt(newMin || '0', 10)
                          const s = parseInt(newSec || '0', 10)
                          const total = m * 60 + s
                          if (total > 0 && newLabel.trim()) {
                            const updated = [
                              ...presets,
                              { id: Date.now().toString(), label: newLabel.trim(), seconds: total },
                            ]
                            setPresets(updated)
                            savePresets(updated)
                            setNewLabel('')
                            setNewMin('')
                            setNewSec('')
                            setAddingPreset(false)
                          }
                        }}
                        style={{
                          marginLeft: 4,
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: TERRA,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconCheck size={14} color="#fff" stroke={2.5} />
                      </UnstyledButton>
                      <UnstyledButton
                        onClick={() => setAddingPreset(false)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#EDE8E2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconX size={14} color="#7A6A5A" />
                      </UnstyledButton>
                    </Group>
                  </Box>
                ) : (
                  <UnstyledButton
                    onClick={() => setAddingPreset(true)}
                    style={{
                      border: '2px dashed #D0C4B8',
                      borderRadius: 14,
                      padding: '12px 14px',
                      width: '100%',
                      marginBottom: 24,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <IconPlus size={14} color={TERRA} />
                    <Text
                      style={{
                        fontFamily: '"Manrope", sans-serif',
                        fontSize: 13,
                        fontWeight: 700,
                        color: TERRA,
                        letterSpacing: '0.04em',
                      }}
                    >
                      Lägg till preset
                    </Text>
                  </UnstyledButton>
                )}

                <Box style={{ textAlign: 'center', marginBottom: 32 }}>
                  <Text
                    style={{
                      fontFamily: '"Epilogue", sans-serif',
                      fontWeight: 900,
                      fontSize: 80,
                      color: timerSeconds === 0 ? '#D0C4B8' : timerRunning ? TERRA : '#1C1410',
                      letterSpacing: '-3px',
                      lineHeight: 1,
                      transition: 'color 0.3s ease',
                    }}
                  >
                    {formatTime(timerSeconds)}
                  </Text>
                  {timerRunning && (
                    <Text
                      style={{
                        fontFamily: '"Manrope", sans-serif',
                        fontSize: 12,
                        color: '#7A6A5A',
                        marginTop: 8,
                      }}
                    >
                      Kör…
                    </Text>
                  )}
                </Box>

                <Group justify="center" gap={16}>
                  <UnstyledButton
                    onClick={() => setTimerRunning((r) => !r)}
                    disabled={timerSeconds === 0}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: timerSeconds === 0 ? '#EDE8E2' : TERRA,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {timerRunning ? (
                      <IconPlayerPause size={24} color="#fff" />
                    ) : (
                      <IconPlayerPlay size={24} color={timerSeconds === 0 ? '#B0A090' : '#fff'} />
                    )}
                  </UnstyledButton>
                  <UnstyledButton
                    onClick={() => {
                      setTimerRunning(false)
                      setTimerSeconds(0)
                    }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: '#EDE8E2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconRefresh size={22} color="#7A6A5A" />
                  </UnstyledButton>
                </Group>
              </Box>
            </ScrollArea>
          ) : (
            <>
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
                    },
                  }}
                />
              </Box>

              {/* Category chips */}
              <ScrollArea scrollbarSize={0} offsetScrollbars={false}>
                <Group gap={10} px={16} pb={16} wrap="nowrap">
                  {[null, ...availableCategories].map((cat) => {
                    const active = activeCategory === cat
                    const iconStyle = cat
                      ? (CATEGORY_COLORS[cat] ?? DEFAULT_ICON_STYLE)
                      : DEFAULT_ICON_STYLE
                    const icon = cat ? (
                      (CATEGORY_ICONS[cat] ?? <IconPackage size={24} />)
                    ) : (
                      <IconPackage size={24} />
                    )
                    const label = cat ?? 'Alla'
                    return (
                      <UnstyledButton
                        key={cat ?? 'all'}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                          width: 88,
                          borderRadius: 18,
                          background: active ? TERRA : CARD_BG,
                          boxShadow: active
                            ? '0 2px 8px rgba(181,67,42,0.3)'
                            : '0 1px 4px rgba(74,55,40,0.08)',
                          padding: '14px 8px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          flexShrink: 0,
                          transition: 'background 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <Box
                          style={{
                            color: active ? 'rgba(255,255,255,0.9)' : iconStyle.icon,
                          }}
                        >
                          {icon}
                        </Box>
                        <Text
                          style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 10,
                            fontWeight: 700,
                            color: active ? '#FFFFFF' : '#4A3728',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            lineHeight: 1.2,
                          }}
                        >
                          {label}
                        </Text>
                      </UnstyledButton>
                    )
                  })}
                </Group>
              </ScrollArea>

              {/* Category heading */}
              <Box px={16} pb={10}>
                <Group align="baseline" gap={10}>
                  <Text
                    style={{
                      fontFamily: '"Epilogue", sans-serif',
                      fontWeight: 900,
                      fontSize: 26,
                      color: '#1C1410',
                      lineHeight: 1,
                    }}
                  >
                    {activeCategory ?? 'Alla varor'}
                  </Text>
                  <Text
                    style={{
                      fontFamily: '"Manrope", sans-serif',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#7A6A5A',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {filtered.length} artiklar i lager
                  </Text>
                </Group>
              </Box>

              {/* Item list */}
              <ScrollArea flex={1} offsetScrollbars style={{ padding: '0 16px' }}>
                <Stack gap={10} pb={4}>
                  {filtered.map((item) => {
                    const cookingUnit =
                      cookingUnits[item.id] ?? suggestCookingUnit(item.name, item.unit)
                    const smallStep = getSmallStep(cookingUnit)
                    const customStep = customSteps[item.id]
                    const activeStep = customStep ?? smallStep
                    const iconStyle = item.category
                      ? (CATEGORY_COLORS[item.category] ?? DEFAULT_ICON_STYLE)
                      : DEFAULT_ICON_STYLE
                    const icon = item.category ? (
                      (CATEGORY_ICONS[item.category] ?? <IconPackage size={20} />)
                    ) : (
                      <IconPackage size={20} />
                    )
                    const expiringSoon = isExpiringSoon(item.expiryDate)
                    const locationName =
                      locations.find((l) => l.id === item.location)?.name ?? 'OKÄND'

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
                        <Group justify="space-between" align="center" wrap="nowrap" gap={12}>
                          {/* Category icon */}
                          <Box
                            style={{
                              width: 54,
                              height: 54,
                              borderRadius: 14,
                              background: iconStyle.bg,
                              color: iconStyle.icon,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {icon}
                          </Box>

                          {/* Item info */}
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            {/* Location name hidden in DOM for legacy compat */}
                            <Text
                              aria-hidden
                              style={{
                                fontFamily: '"Manrope", sans-serif',
                                fontSize: 0,
                                height: 0,
                                overflow: 'hidden',
                                position: 'absolute',
                              }}
                            >
                              {locationName.toUpperCase()}
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

                            {expiringSoon ? (
                              <Text
                                style={{
                                  fontFamily: '"Manrope", sans-serif',
                                  fontSize: 12,
                                  color: '#DC2626',
                                  fontWeight: 600,
                                  lineHeight: 1.3,
                                  marginBottom: 4,
                                }}
                              >
                                Bör användas snart
                              </Text>
                            ) : (
                              <Text
                                style={{
                                  fontFamily: '"Manrope", sans-serif',
                                  fontSize: 12,
                                  color: '#7A6A5A',
                                  lineHeight: 1.3,
                                }}
                              >
                                {formatQty(item.quantity)} {item.unit} kvar
                              </Text>
                            )}

                            {/* Unit picker — always rendered */}
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
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    background: '#EDE8E2',
                                    borderRadius: 8,
                                    padding: '2px 6px',
                                    marginTop: 4,
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
                          </Box>

                          {/* Quantity controls */}
                          <Group gap={10} wrap="nowrap" style={{ flexShrink: 0 }} align="center">
                            <UnstyledButton
                              disabled={item.quantity === 0}
                              onClick={() =>
                                decrement(item.id, item.quantity, activeStep, cookingUnit)
                              }
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: '50%',
                                background: '#EDE8E2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: item.quantity === 0 ? 0.4 : 1,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 24,
                                  fontWeight: 300,
                                  color: '#4A3728',
                                  lineHeight: 1,
                                }}
                              >
                                −
                              </Text>
                            </UnstyledButton>

                            {/* Quantity display + step popover */}
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
                                  style={{ minWidth: 32, textAlign: 'center' }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: '"Manrope", sans-serif',
                                      fontSize: 18,
                                      fontWeight: 700,
                                      color: '#1C1410',
                                      lineHeight: 1,
                                    }}
                                  >
                                    {formatQty(item.quantity)}
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

                            <UnstyledButton
                              onClick={() => increment(item.id, item.quantity, activeStep)}
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: '50%',
                                background: TERRA,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 24,
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
                      padding: '16px',
                      textAlign: 'center',
                      width: '100%',
                      marginTop: 4,
                    }}
                  >
                    <Group justify="center" gap={8}>
                      <IconPlus size={16} color={TERRA} />
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
                    </Group>
                  </UnstyledButton>

                  {/* Action cards */}
                  <Group grow gap={10} mt={8} mb={24} align="stretch">
                    <UnstyledButton
                      onClick={() => setTimerOpen(true)}
                      style={{
                        background: '#F0EEE8',
                        borderRadius: 18,
                        padding: '16px 14px',
                        textAlign: 'left',
                      }}
                    >
                      <Stack gap={8}>
                        <IconClock size={24} color="#4A5568" />
                        <Text
                          style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 14,
                            fontWeight: 700,
                            color: TERRA,
                            lineHeight: 1.2,
                          }}
                        >
                          Snabb-timer
                        </Text>
                        <Text
                          style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 12,
                            color: '#7A6A5A',
                            lineHeight: 1.3,
                          }}
                        >
                          För ägg, pasta eller kaffe
                        </Text>
                      </Stack>
                    </UnstyledButton>

                    <Box
                      style={{
                        background: '#EFF6EE',
                        borderRadius: 18,
                        padding: '16px 14px',
                      }}
                    >
                      <Stack gap={8}>
                        <IconShoppingCart size={24} color="#2A7A4A" />
                        <Text
                          style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#1A5A35',
                            lineHeight: 1.2,
                          }}
                        >
                          Slut i lager?
                        </Text>
                        <Text
                          style={{
                            fontFamily: '"Manrope", sans-serif',
                            fontSize: 12,
                            color: '#4A7A5A',
                            lineHeight: 1.3,
                          }}
                        >
                          Varan läggs till i inköpslistan automatiskt.
                        </Text>
                      </Stack>
                    </Box>
                  </Group>
                </Stack>
              </ScrollArea>
            </>
          )}
        </Stack>
      </Modal>

      <AddItemModal opened={addItemOpen} onClose={() => setAddItemOpen(false)} />
    </>
  )
}
