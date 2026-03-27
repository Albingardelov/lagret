import { Card, Text, Badge, Group, ActionIcon, Stack } from '@mantine/core'
import { IconTrash, IconEdit } from '@tabler/icons-react'
import dayjs from 'dayjs'
import type { InventoryItem } from '../types'

interface ItemCardProps {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  onDelete: (id: string) => void
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

function expiryColor(dateStr?: string): string {
  if (!dateStr) return 'gray'
  const diff = dayjs(dateStr).diff(dayjs(), 'day')
  if (diff < 0) return 'red'
  if (diff <= 3) return 'orange'
  if (diff <= 7) return 'yellow'
  return 'green'
}

export function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const color = expiryColor(item.expiryDate)
  const categoryColor = item.category ? (CATEGORY_COLORS[item.category] ?? '#dfe6e9') : undefined

  return (
    <Card
      shadow="xs"
      padding="sm"
      radius="md"
      withBorder
      style={{
        borderLeft: categoryColor ? `4px solid ${categoryColor}` : undefined,
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap={2} style={{ flex: 1 }}>
          <Text fw={600}>{item.name}</Text>
          <Text size="sm" c="dimmed">
            {item.quantity} {item.unit}
          </Text>
          {item.expiryDate && (
            <Badge color={color} size="sm">
              Bäst före: {dayjs(item.expiryDate).format('D MMM YYYY')}
            </Badge>
          )}
          {item.minQuantity !== undefined &&
            item.minQuantity > 0 &&
            item.quantity < item.minQuantity && (
              <Badge color="red" size="sm" variant="light">
                Lågt lager – min {item.minQuantity} {item.unit}
              </Badge>
            )}
        </Stack>
        <Group gap={4}>
          <ActionIcon
            variant="subtle"
            onClick={() => onEdit(item)}
            aria-label={`Redigera ${item.name}`}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => onDelete(item.id)}
            aria-label={`Ta bort ${item.name}`}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  )
}
