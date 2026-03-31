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
import { useTranslation } from 'react-i18next'
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
const MANROPE = '"Manrope", sans-serif'
const EPILOGUE = '"Epilogue", sans-serif'

const flexCenter: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const presetCardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 14,
  padding: '12px 14px',
  boxShadow: '0 1px 4px rgba(74,55,40,0.08)',
}

const presetNameInputStyle: React.CSSProperties = {
  width: '100%',
  marginBottom: 10,
  border: 'none',
  borderBottom: `1.5px solid ${TERRA}`,
  background: 'transparent',
  fontFamily: MANROPE,
  fontSize: 14,
  fontWeight: 600,
  color: '#1C1410',
  outline: 'none',
  padding: '2px 0',
}

const circleConfirmStyle: React.CSSProperties = {
  marginLeft: 4,
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: TERRA,
  ...flexCenter,
}

const circleCancelStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: '#EDE8E2',
  ...flexCenter,
}

const roundButtonStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: '50%',
  ...flexCenter,
  flexShrink: 0,
}

const timerButtonStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  ...flexCenter,
}

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
  fontFamily: MANROPE,
  fontSize: 16,
  fontWeight: 700,
  color: '#1C1410',
  textAlign: 'center',
  outline: 'none',
}

const timeLabelStyle: React.CSSProperties = {
  fontFamily: MANROPE,
  fontSize: 12,
  color: '#7A6A5A',
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function CookingMode({ opened, onClose }: Props) {
  const { t } = useTranslation()
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
  const [zeroPuffId, setZeroPuffId] = useState<string | null>(null)
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
              message: t('cookingMode.timerDone'),
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
    if (next === 0) {
      setZeroPuffId(id)
      setTimeout(() => setZeroPuffId(null), 500)
    }
    notifications.show({
      message: t('cookingMode.decremented', { amount: formatQty(step), unit }),
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

  const parsePopoverValue = (): number => {
    if (typeof popoverValue === 'number') return popoverValue
    return parseFloat(String(popoverValue))
  }

  const trySetCustomStep = (itemId: string) => {
    const v = parsePopoverValue()
    if (!isNaN(v) && v > 0) setCustomStep(itemId, v)
  }

  return (
    <>
      <style>{`
        .cm-press { transition: transform 0.12s ease, opacity 0.12s ease; }
        .cm-press:active { transform: scale(0.93); opacity: 0.85; }
        .cm-press-sm:active { transform: scale(0.96); }
        .cm-press-sm { transition: transform 0.12s ease; }
        @keyframes timerTick {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
        .timer-running-text { animation: timerTick 1s ease-in-out infinite; }
        @keyframes itemFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cm-item { animation: itemFadeIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes zeroPuff {
          0%   { transform: translateX(0) scale(1); }
          15%  { transform: translateX(-7px) scale(0.98); }
          35%  { transform: translateX(6px) scale(1.01); }
          55%  { transform: translateX(-4px) scale(0.99); }
          75%  { transform: translateX(3px); }
          100% { transform: translateX(0) scale(1); }
        }
        .cm-zero-puff { animation: zeroPuff 0.45s cubic-bezier(0.36,0.07,0.19,0.97) both; }
      `}</style>

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
          {/* Header */}
          <Box
            style={{
              background: '#1C1410',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <UnstyledButton
              onClick={onClose}
              aria-label={t('common.buttons.close')}
              className="cm-press"
              style={{
                ...flexCenter,
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.1)',
              }}
            >
              <IconX size={18} color="rgba(255,255,255,0.8)" />
            </UnstyledButton>

            <Text
              style={{
                fontFamily: EPILOGUE,
                fontWeight: 900,
                fontSize: 18,
                color: '#FFFFFF',
                letterSpacing: '-0.3px',
              }}
            >
              {t('cookingMode.title')}
            </Text>

            <UnstyledButton
              onClick={onClose}
              className="cm-press-sm"
              style={{
                ...flexCenter,
                gap: 6,
                background: '#2A7A4A',
                borderRadius: 20,
                padding: '8px 16px',
              }}
            >
              <IconCheck size={13} color="#fff" stroke={3} />
              <Text
                style={{
                  fontFamily: MANROPE,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {t('cookingMode.done')}
              </Text>
            </UnstyledButton>
          </Box>

          {/* Timer panel */}
          {timerOpen ? (
            <ScrollArea flex={1} offsetScrollbars>
              <Box style={{ padding: '20px 16px' }}>
                <UnstyledButton
                  onClick={() => setTimerOpen(false)}
                  className="cm-press-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 24,
                  }}
                >
                  <IconArrowLeft size={16} color="#7A6A5A" />
                  <Text
                    style={{
                      fontFamily: MANROPE,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#7A6A5A',
                    }}
                  >
                    {t('common.buttons.back')}
                  </Text>
                </UnstyledButton>

                {/* Countdown — always visible, above presets */}
                <Box
                  style={{
                    background: timerRunning ? '#1C1410' : timerSeconds > 0 ? '#F7F2EB' : '#F0EEE8',
                    borderRadius: 24,
                    padding: '28px 20px',
                    textAlign: 'center',
                    marginBottom: 20,
                    transition: 'background 0.4s ease',
                  }}
                >
                  <Text
                    className={timerRunning ? 'timer-running-text' : undefined}
                    style={{
                      fontFamily: EPILOGUE,
                      fontWeight: 900,
                      fontSize: 72,
                      color: timerSeconds === 0 ? '#C0B4A8' : timerRunning ? TERRA : '#1C1410',
                      letterSpacing: '-4px',
                      lineHeight: 1,
                      transition: 'color 0.3s ease',
                    }}
                  >
                    {formatTime(timerSeconds)}
                  </Text>
                  {timerRunning && (
                    <Text
                      style={{
                        fontFamily: MANROPE,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.5)',
                        marginTop: 8,
                      }}
                    >
                      {t('cookingMode.running')}
                    </Text>
                  )}
                  <Group justify="center" gap={12} mt={20}>
                    <UnstyledButton
                      onClick={() => setTimerRunning((r) => !r)}
                      disabled={timerSeconds === 0}
                      className="cm-press"
                      style={{
                        ...timerButtonStyle,
                        background: timerSeconds === 0 ? '#EDE8E2' : TERRA,
                        boxShadow: timerSeconds > 0 ? '0 4px 16px rgba(181,67,42,0.35)' : 'none',
                        transition: 'background 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      {timerRunning ? (
                        <IconPlayerPause size={22} color="#fff" />
                      ) : (
                        <IconPlayerPlay size={22} color={timerSeconds === 0 ? '#B0A090' : '#fff'} />
                      )}
                    </UnstyledButton>
                    <UnstyledButton
                      onClick={() => {
                        setTimerRunning(false)
                        setTimerSeconds(0)
                      }}
                      className="cm-press"
                      style={{
                        ...timerButtonStyle,
                        background: timerRunning ? 'rgba(255,255,255,0.12)' : '#EDE8E2',
                        transition: 'background 0.3s ease',
                      }}
                    >
                      <IconRefresh
                        size={20}
                        color={timerRunning ? 'rgba(255,255,255,0.7)' : '#7A6A5A'}
                      />
                    </UnstyledButton>
                  </Group>
                </Box>

                <Text
                  style={{
                    fontFamily: MANROPE,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#7A6A5A',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  {t('cookingMode.presets')}
                </Text>

                {/* Preset list */}
                <Stack gap={8} mb={16}>
                  {presets.map((p) => {
                    const active = timerSeconds === p.seconds && !timerRunning
                    const isEditing = editingPresetId === p.id
                    if (isEditing) {
                      return (
                        <Box key={p.id} style={presetCardStyle}>
                          <input
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.currentTarget.value)}
                            placeholder={t('common.fields.name')}
                            style={presetNameInputStyle}
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
                            <Text style={timeLabelStyle}>{t('cookingMode.min')}</Text>
                            <input
                              type="number"
                              min={0}
                              max={59}
                              value={editSec}
                              onChange={(e) => setEditSec(e.currentTarget.value)}
                              style={timeInputStyle}
                            />
                            <Text style={timeLabelStyle}>{t('cookingMode.sec')}</Text>
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
                              style={circleConfirmStyle}
                            >
                              <IconCheck size={14} color="#fff" stroke={2.5} />
                            </UnstyledButton>
                            <UnstyledButton
                              onClick={() => setEditingPresetId(null)}
                              style={circleCancelStyle}
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
                              fontFamily: MANROPE,
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
                              fontFamily: MANROPE,
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
                          aria-label={t('cookingMode.editPreset', { name: p.label })}
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
                          aria-label={t('cookingMode.deletePreset', { name: p.label })}
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
                      ...presetCardStyle,
                      marginBottom: 24,
                    }}
                  >
                    <input
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.currentTarget.value)}
                      placeholder={t('cookingMode.presetName')}
                      style={presetNameInputStyle}
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
                        style={circleConfirmStyle}
                      >
                        <IconCheck size={14} color="#fff" stroke={2.5} />
                      </UnstyledButton>
                      <UnstyledButton
                        onClick={() => setAddingPreset(false)}
                        style={circleCancelStyle}
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
                        fontFamily: MANROPE,
                        fontSize: 13,
                        fontWeight: 700,
                        color: TERRA,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {t('cookingMode.addPreset')}
                    </Text>
                  </UnstyledButton>
                )}

                {/* (countdown moved above presets) */}
              </Box>
            </ScrollArea>
          ) : (
            <>
              {/* Search */}
              <Box px={16} pt={12} pb={8}>
                <TextInput
                  placeholder={t('cookingMode.searchIngredients')}
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

              {/* Category chips — horizontal pills */}
              <ScrollArea scrollbarSize={0} offsetScrollbars={false}>
                <Group gap={8} px={16} pt={14} pb={12} wrap="nowrap">
                  {[null, ...availableCategories].map((cat) => {
                    const active = activeCategory === cat
                    const iconStyle = cat
                      ? (CATEGORY_COLORS[cat] ?? DEFAULT_ICON_STYLE)
                      : DEFAULT_ICON_STYLE
                    const icon = cat ? (
                      (CATEGORY_ICONS[cat] ?? <IconPackage size={18} />)
                    ) : (
                      <IconPackage size={18} />
                    )
                    return (
                      <UnstyledButton
                        key={cat ?? 'all'}
                        onClick={() => setActiveCategory(cat)}
                        className="cm-press-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          flexShrink: 0,
                          padding: '9px 16px 9px 12px',
                          borderRadius: 24,
                          background: active ? '#1C1410' : CARD_BG,
                          boxShadow: active
                            ? '0 2px 10px rgba(28,20,16,0.22)'
                            : '0 1px 3px rgba(74,55,40,0.1)',
                          transition:
                            'background 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s cubic-bezier(0.34,1.56,0.64,1), transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                        }}
                      >
                        <Box
                          style={{
                            color: active ? TERRA : iconStyle.icon,
                            display: 'flex',
                            flexShrink: 0,
                          }}
                        >
                          {icon}
                        </Box>
                        <Text
                          style={{
                            fontFamily: MANROPE,
                            fontSize: 13,
                            fontWeight: 700,
                            color: active ? '#FFFFFF' : '#1C1410',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cat ?? t('cookingMode.all')}
                        </Text>
                      </UnstyledButton>
                    )
                  })}
                </Group>
              </ScrollArea>

              {/* Category heading */}
              <Box px={16} pb={8} style={{ borderBottom: '1px solid rgba(180,160,140,0.18)' }}>
                <Group align="center" justify="space-between">
                  <Text
                    style={{
                      fontFamily: EPILOGUE,
                      fontWeight: 900,
                      fontSize: 22,
                      color: '#1C1410',
                      lineHeight: 1,
                    }}
                  >
                    {activeCategory ?? t('cookingMode.allItems')}
                  </Text>
                  <Text
                    style={{
                      fontFamily: MANROPE,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#9A8A7A',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('cookingMode.itemCount', { count: filtered.length })}
                  </Text>
                </Group>
              </Box>

              {/* Item list */}
              <ScrollArea flex={1} offsetScrollbars style={{ padding: '0 16px' }}>
                <Stack gap={10} pb={4} key={activeCategory ?? '__all__'}>
                  {filtered.map((item, index) => {
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
                      locations.find((l) => l.id === item.location)?.name ??
                      t('cookingMode.unknownLocation')

                    return (
                      <Box
                        key={item.id}
                        className={`cm-item${zeroPuffId === item.id ? ' cm-zero-puff' : ''}`}
                        style={{
                          background: CARD_BG,
                          borderRadius: 16,
                          overflow: 'hidden',
                          boxShadow: '0 1px 6px rgba(74,55,40,0.08)',
                          opacity: item.quantity === 0 ? 0.4 : 1,
                          borderLeft: `4px solid ${iconStyle.icon}`,
                          animationDelay: `${Math.min(index * 0.04, 0.28)}s`,
                        }}
                      >
                        {expiringSoon && (
                          <Box
                            style={{
                              background: '#FEF2F2',
                              padding: '5px 14px',
                              borderBottom: '1px solid #FCA5A5',
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: MANROPE,
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#DC2626',
                                letterSpacing: '0.05em',
                              }}
                            >
                              {t('cookingMode.expiringSoon')}
                            </Text>
                          </Box>
                        )}
                        <Box style={{ padding: '12px 14px 12px 12px' }}>
                          <Group justify="space-between" align="center" wrap="nowrap" gap={10}>
                            {/* Category icon */}
                            <Box
                              style={{
                                ...flexCenter,
                                width: 46,
                                height: 46,
                                borderRadius: 12,
                                background: iconStyle.bg,
                                color: iconStyle.icon,
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
                                  fontFamily: MANROPE,
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: '#1C1410',
                                  lineHeight: 1.25,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.name}
                              </Text>
                              <Text
                                style={{
                                  fontFamily: MANROPE,
                                  fontSize: 12,
                                  color: '#9A8A7A',
                                  lineHeight: 1.3,
                                }}
                              >
                                {t('cookingMode.remaining', {
                                  quantity: formatQty(item.quantity),
                                  unit: item.unit,
                                })}
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
                                    aria-label={t('cookingMode.changeUnit')}
                                    onClick={() =>
                                      setEditingUnit(editingUnit === item.id ? null : item.id)
                                    }
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 3,
                                      background: '#F0EEE8',
                                      borderRadius: 6,
                                      padding: '2px 7px',
                                      marginTop: 5,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontFamily: MANROPE,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: '#4A3728',
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      {cookingUnit}
                                    </Text>
                                    <IconPencil size={9} color="#9A8A7A" stroke={2} />
                                  </UnstyledButton>
                                </Popover.Target>
                                <Popover.Dropdown>
                                  <NativeSelect
                                    size="xs"
                                    data={['st', 'g', 'kg', 'dl', 'l', 'ml', 'msk', 'tsk', 'krm']}
                                    value={cookingUnit}
                                    onChange={(e) => setCookingUnit(item.id, e.currentTarget.value)}
                                    label={t('cookingMode.cookingUnit')}
                                  />
                                </Popover.Dropdown>
                              </Popover>
                            </Box>

                            {/* Quantity controls */}
                            <Group gap={8} wrap="nowrap" style={{ flexShrink: 0 }} align="center">
                              <UnstyledButton
                                disabled={item.quantity === 0}
                                onClick={() =>
                                  decrement(item.id, item.quantity, activeStep, cookingUnit)
                                }
                                className="cm-press"
                                style={{
                                  ...roundButtonStyle,
                                  background: '#EDE8E2',
                                  opacity: item.quantity === 0 ? 0.35 : 1,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 26,
                                    fontWeight: 300,
                                    color: '#4A3728',
                                    lineHeight: 1,
                                  }}
                                >
                                  −
                                </Text>
                              </UnstyledButton>

                              {/* Qty + step popover */}
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
                                    style={{ minWidth: 36, textAlign: 'center' }}
                                  >
                                    <Text
                                      style={{
                                        fontFamily: MANROPE,
                                        fontSize: 20,
                                        fontWeight: 800,
                                        color: '#1C1410',
                                        lineHeight: 1,
                                      }}
                                    >
                                      {formatQty(item.quantity)}
                                    </Text>
                                    <Text
                                      style={{
                                        fontFamily: MANROPE,
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
                                      {t('cookingMode.customStep', { unit: cookingUnit })}
                                    </Text>
                                    <NumberInput
                                      min={0.1}
                                      step={getSmallStep(cookingUnit)}
                                      decimalScale={2}
                                      placeholder={`ex. ${getLargeStep(cookingUnit)}`}
                                      value={popoverValue}
                                      onChange={setPopoverValue}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') trySetCustomStep(item.id)
                                      }}
                                      onBlur={() => trySetCustomStep(item.id)}
                                      styles={{ input: { width: 100 } }}
                                    />
                                  </Stack>
                                </Popover.Dropdown>
                              </Popover>

                              <UnstyledButton
                                onClick={() => increment(item.id, item.quantity, activeStep)}
                                className="cm-press"
                                style={{
                                  ...roundButtonStyle,
                                  background: TERRA,
                                  boxShadow: '0 2px 8px rgba(181,67,42,0.3)',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 26,
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
                          fontFamily: MANROPE,
                          fontWeight: 600,
                          color: '#7A6A5A',
                          fontSize: 14,
                        }}
                      >
                        {t('cookingMode.noItems')}
                      </Text>
                      <Text
                        style={{
                          fontFamily: MANROPE,
                          fontSize: 13,
                          color: '#9A8A7A',
                          marginTop: 4,
                        }}
                      >
                        {t('cookingMode.noItemsHint')}
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
                          fontFamily: MANROPE,
                          fontSize: 12,
                          fontWeight: 700,
                          color: TERRA,
                          letterSpacing: '0.08em',
                        }}
                      >
                        {t('cookingMode.addItem').toUpperCase()}
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
                            fontFamily: MANROPE,
                            fontSize: 14,
                            fontWeight: 700,
                            color: TERRA,
                            lineHeight: 1.2,
                          }}
                        >
                          {t('cookingMode.quickTimer')}
                        </Text>
                        <Text
                          style={{
                            fontFamily: MANROPE,
                            fontSize: 12,
                            color: '#7A6A5A',
                            lineHeight: 1.3,
                          }}
                        >
                          {t('cookingMode.quickTimerHint')}
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
                            fontFamily: MANROPE,
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#1A5A35',
                            lineHeight: 1.2,
                          }}
                        >
                          {t('cookingMode.outOfStock')}
                        </Text>
                        <Text
                          style={{
                            fontFamily: MANROPE,
                            fontSize: 12,
                            color: '#4A7A5A',
                            lineHeight: 1.3,
                          }}
                        >
                          {t('cookingMode.outOfStockHint')}
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
