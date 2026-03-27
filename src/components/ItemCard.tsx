import { Text, Group, ActionIcon, Box, Badge } from '@mantine/core'
import { IconTrash, IconEdit } from '@tabler/icons-react'
import dayjs from 'dayjs'
import type { InventoryItem } from '../types'

interface ItemCardProps {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  onDelete: (id: string) => void
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Mejeri: 'linear-gradient(135deg, #2c5282 0%, #4a9eda 100%)',
  Kött: 'linear-gradient(135deg, #742a2a 0%, #c0504d 100%)',
  'Fisk & skaldjur': 'linear-gradient(135deg, #1a4a5e 0%, #2a9d9d 100%)',
  Grönsaker: 'linear-gradient(135deg, #1a4731 0%, #3a8a64 100%)',
  Frukt: 'linear-gradient(135deg, #7c3c00 0%, #d4854a 100%)',
  'Pasta & ris': 'linear-gradient(135deg, #7a3520 0%, #c4795a 100%)',
  Bakning: 'linear-gradient(135deg, #4a2e1a 0%, #9a6042 100%)',
  Frukost: 'linear-gradient(135deg, #7a5200 0%, #c4962a 100%)',
  Konserver: 'linear-gradient(135deg, #2d1f6e 0%, #6b5abf 100%)',
  Snacks: 'linear-gradient(135deg, #6b0f3a 0%, #c44880 100%)',
  Dryck: 'linear-gradient(135deg, #004d40 0%, #009688 100%)',
  Skafferi: 'linear-gradient(135deg, #2e3d47 0%, #607d8b 100%)',
  'Såser & kryddor': 'linear-gradient(135deg, #5c0e35 0%, #b52e6a 100%)',
  'Örter & kryddor': 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)',
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #3a4820 0%, #6e8242 100%)'

function expiryStatus(dateStr?: string) {
  if (!dateStr) return null
  const diff = dayjs(dateStr).diff(dayjs(), 'day')
  if (diff < 0) return { label: 'Utgången', color: 'red' }
  if (diff === 0) return { label: 'Utgår idag', color: 'orange' }
  if (diff <= 3) return { label: `${diff}d kvar`, color: 'orange' }
  return null
}

export function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const gradient = item.category
    ? (CATEGORY_GRADIENTS[item.category] ?? DEFAULT_GRADIENT)
    : DEFAULT_GRADIENT
  const expiry = expiryStatus(item.expiryDate)
  const isLowStock =
    item.minQuantity !== undefined && item.minQuantity > 0 && item.quantity < item.minQuantity

  return (
    <Box
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        height: 150,
        position: 'relative',
        background: gradient,
        flexShrink: 0,
      }}
    >
      {/* Food photo if available */}
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {/* Dark gradient overlay for text legibility */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(10,14,8,0.80) 0%, rgba(10,14,8,0.20) 55%, transparent 100%)',
        }}
      />

      {/* Top-right: quantity + actions */}
      <Group gap={4} style={{ position: 'absolute', top: 10, right: 10 }} align="center">
        <Box
          style={{
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            borderRadius: 10,
            padding: '3px 10px',
          }}
        >
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 12,
              fontWeight: 600,
              color: '#ffffff',
              lineHeight: 1.4,
            }}
          >
            {item.quantity} {item.unit}
          </Text>
        </Box>
        <ActionIcon
          variant="filled"
          onClick={() => onEdit(item)}
          aria-label={`Redigera ${item.name}`}
          size="sm"
          style={{
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
          }}
        >
          <IconEdit size={13} />
        </ActionIcon>
        <ActionIcon
          variant="filled"
          onClick={() => onDelete(item.id)}
          aria-label={`Ta bort ${item.name}`}
          size="sm"
          style={{
            background: 'rgba(220,80,60,0.5)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
          }}
        >
          <IconTrash size={13} />
        </ActionIcon>
      </Group>

      {/* Bottom: name + category + badges */}
      <Box
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
        }}
      >
        <Group justify="space-between" align="flex-end" wrap="nowrap">
          <Box style={{ minWidth: 0 }}>
            <Text
              fw={700}
              truncate
              style={{
                fontFamily: '"Epilogue", sans-serif',
                fontSize: 18,
                color: '#ffffff',
                lineHeight: 1.2,
                letterSpacing: '-0.2px',
              }}
            >
              {item.name}
            </Text>
            {item.category && (
              <Text
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.65)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  lineHeight: 1.4,
                }}
              >
                {item.category}
              </Text>
            )}
          </Box>
          <Group gap={4} style={{ flexShrink: 0 }}>
            {expiry && (
              <Badge size="xs" color={expiry.color} variant="filled" radius="xl">
                {expiry.label}
              </Badge>
            )}
            {isLowStock && (
              <Badge size="xs" color="red" variant="light" radius="xl">
                Lågt lager
              </Badge>
            )}
          </Group>
        </Group>
      </Box>
    </Box>
  )
}
