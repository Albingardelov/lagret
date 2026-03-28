import { useState, useMemo } from 'react'
import {
  Modal,
  Stack,
  Group,
  Text,
  TextInput,
  ActionIcon,
  Chip,
  ScrollArea,
  Badge,
  Box,
} from '@mantine/core'
import { IconMinus, IconPlus, IconSearch } from '@tabler/icons-react'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'

interface Props {
  opened: boolean
  onClose: () => void
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

export function CookingMode({ opened, onClose }: Props) {
  const items = useInventoryStore((s) => s.items)
  const updateItem = useInventoryStore((s) => s.updateItem)
  const locations = useLocationsStore((s) => s.locations)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))] as string[],
    [items]
  )

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !activeCategory || item.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [items, search, activeCategory])

  const getStep = (unit: string): number => {
    switch (unit) {
      case 'kg':
        return 0.5
      case 'hg':
        return 1
      case 'g':
        return 50
      case 'l':
        return 0.5
      case 'dl':
        return 0.5
      case 'ml':
        return 50
      case 'msk':
        return 1
      case 'tsk':
        return 1
      case 'krm':
        return 1
      default:
        return 1
    }
  }

  const formatQty = (qty: number): string => {
    if (Number.isInteger(qty)) return qty.toString()
    return qty.toFixed(1).replace(/\.0$/, '')
  }

  const adjust = (id: string, currentQty: number, unit: string, delta: number) => {
    const step = getStep(unit)
    const next = Math.max(0, Math.round((currentQty + delta * step) * 100) / 100)
    updateItem(id, { quantity: next }).catch(() => {})
  }

  const getLocationName = (locationId: string) =>
    locations.find((l) => l.id === locationId)?.name ?? ''

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="lg">
          🍳 Laga mat
        </Text>
      }
      fullScreen
      radius={0}
    >
      <Stack gap="sm" h="100%">
        {/* Search */}
        <TextInput
          placeholder="Sök vara..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          size="md"
        />

        {/* Category filter */}
        {categories.length > 0 && (
          <ScrollArea scrollbarSize={0}>
            <Group gap="xs" wrap="nowrap" pb={4}>
              <Chip
                size="sm"
                checked={activeCategory === null}
                onChange={() => setActiveCategory(null)}
              >
                Alla
              </Chip>
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  size="sm"
                  checked={activeCategory === cat}
                  onChange={() => setActiveCategory(activeCategory === cat ? null : cat)}
                >
                  {cat}
                </Chip>
              ))}
            </Group>
          </ScrollArea>
        )}

        {/* Item list */}
        <ScrollArea flex={1} offsetScrollbars>
          <Stack gap="xs">
            {filtered.map((item) => {
              const categoryColor = item.category
                ? (CATEGORY_COLORS[item.category] ?? '#dfe6e9')
                : '#dfe6e9'
              const isEmpty = item.quantity === 0

              return (
                <Box
                  key={item.id}
                  style={{
                    borderRadius: 10,
                    borderLeft: `4px solid ${categoryColor}`,
                    padding: '6px 10px',
                    opacity: isEmpty ? 0.4 : 1,
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {/* Name + location */}
                  <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} truncate style={{ fontSize: 13, lineHeight: 1.2 }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#999' }}>
                      {getLocationName(item.location)}
                    </Text>
                  </Stack>

                  {/* Quantity + controls */}
                  <Group gap={4} align="center" wrap="nowrap">
                    <ActionIcon
                      size={32}
                      radius="xl"
                      variant="light"
                      color="red"
                      disabled={isEmpty}
                      onClick={() => adjust(item.id, item.quantity, item.unit, -1)}
                      aria-label={`Minska med ${getStep(item.unit)} ${item.unit}`}
                    >
                      <IconMinus size={14} />
                    </ActionIcon>

                    <Stack gap={0} align="center" style={{ minWidth: 40 }}>
                      <Text fw={700} ta="center" style={{ fontSize: 15, lineHeight: 1 }}>
                        {formatQty(item.quantity)}
                      </Text>
                      <Text ta="center" style={{ fontSize: 10, color: '#999' }}>
                        {item.unit}
                      </Text>
                    </Stack>

                    <ActionIcon
                      size={32}
                      radius="xl"
                      variant="light"
                      color="green"
                      onClick={() => adjust(item.id, item.quantity, item.unit, 1)}
                      aria-label={`Öka med ${getStep(item.unit)} ${item.unit}`}
                    >
                      <IconPlus size={14} />
                    </ActionIcon>
                  </Group>

                  {item.minQuantity !== undefined &&
                    item.minQuantity > 0 &&
                    item.quantity < item.minQuantity && (
                      <Badge color="red" size="xs" variant="light" style={{ flexShrink: 0 }}>
                        Lågt
                      </Badge>
                    )}
                </Box>
              )
            })}
          </Stack>
        </ScrollArea>
      </Stack>
    </Modal>
  )
}
