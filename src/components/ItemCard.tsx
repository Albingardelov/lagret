import { Card, Text, Badge, Group, ActionIcon, Stack } from '@mantine/core'
import { IconTrash, IconEdit } from '@tabler/icons-react'
import dayjs from 'dayjs'
import type { InventoryItem } from '../types'

interface ItemCardProps {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  onDelete: (id: string) => void
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

  return (
    <Card shadow="xs" padding="sm" radius="md" withBorder>
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
        </Stack>
        <Group gap={4}>
          <ActionIcon variant="subtle" onClick={() => onEdit(item)}>
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => onDelete(item.id)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  )
}
