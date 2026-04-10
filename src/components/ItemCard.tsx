import { Text, Group, ActionIcon, Box } from '@mantine/core'
import {
  IconTrash,
  IconEdit,
  IconMilk,
  IconMeat,
  IconFish,
  IconLeaf,
  IconApple,
  IconGrain,
  IconBread,
  IconEgg,
  IconBottle,
  IconPackage,
  IconFlame,
  IconSalt,
  IconPlant,
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { InventoryItem } from '../types'
import { categoryKey } from '../lib/categories'

interface ItemCardProps {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  onDelete: (id: string) => void
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Mejeri: <IconMilk size={18} />,
  Kött: <IconMeat size={18} />,
  'Fisk & skaldjur': <IconFish size={18} />,
  Grönsaker: <IconPlant size={18} />,
  Frukt: <IconApple size={18} />,
  'Pasta & ris': <IconGrain size={18} />,
  Bakning: <IconFlame size={18} />,
  Frukost: <IconEgg size={18} />,
  Konserver: <IconPackage size={18} />,
  Snacks: <IconPackage size={18} />,
  Dryck: <IconBottle size={18} />,
  Skafferi: <IconPackage size={18} />,
  'Såser & kryddor': <IconSalt size={18} />,
  'Örter & kryddor': <IconLeaf size={18} />,
  Bröd: <IconBread size={18} />,
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

function expiryStatus(dateStr: string | undefined, t: TFunction) {
  if (!dateStr) return null
  const diff = dayjs(dateStr).diff(dayjs(), 'day')
  if (diff < 0)
    return {
      label: t('itemCard.expired'),
      borderColor: '#DC2626',
      badgeBg: '#FEE2E2',
      badgeText: '#991B1B',
    }
  if (diff === 0)
    return {
      label: t('itemCard.today'),
      borderColor: '#EA580C',
      badgeBg: '#FFEDD5',
      badgeText: '#9A3412',
    }
  if (diff <= 3)
    return {
      label: t('itemCard.daysLeft', { count: diff }),
      borderColor: '#EA580C',
      badgeBg: '#FFEDD5',
      badgeText: '#9A3412',
    }
  if (diff <= 7)
    return {
      label: t('itemCard.daysLeft', { count: diff }),
      borderColor: '#16A34A',
      badgeBg: '#DCFCE7',
      badgeText: '#166534',
    }
  return {
    label: dayjs(dateStr).format('YYYY-MM-DD'),
    borderColor: '#16A34A',
    badgeBg: '#DCFCE7',
    badgeText: '#166534',
  }
}

export function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const { t } = useTranslation()
  const expiry = expiryStatus(item.expiryDate, t)
  const isUrgent = item.expiryDate !== undefined && dayjs(item.expiryDate).diff(dayjs(), 'day') <= 0
  const isLowStock =
    item.minQuantity !== undefined && item.minQuantity > 0 && item.quantity < item.minQuantity
  const iconStyle = item.category
    ? (CATEGORY_COLORS[item.category] ?? DEFAULT_ICON_STYLE)
    : DEFAULT_ICON_STYLE
  const icon = item.category ? (
    (CATEGORY_ICONS[item.category] ?? <IconPackage size={18} />)
  ) : (
    <IconPackage size={18} />
  )
  const borderColor = expiry?.borderColor ?? 'transparent'

  return (
    <>
      {isUrgent && (
        <style>{`
        @keyframes expiry-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.45); }
          50%       { box-shadow: 0 0 0 5px rgba(220,38,38,0); }
        }
        .expiry-urgent { animation: expiry-pulse 1.8s ease-in-out infinite; }
      `}</style>
      )}
      <Box
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 12px 12px 0',
          boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
          borderLeft: `4px solid ${borderColor}`,
          paddingLeft: 12,
        }}
      >
        {/* Category icon circle */}
        <Box
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
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

        {/* Main content */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#1C1410',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.name}
          </Text>
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 12,
              color: '#7A6A5A',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.quantity} {item.unit}
            {item.category ? ` · ${t(categoryKey(item.category))}` : ''}
          </Text>
        </Box>

        {/* Right side: expiry badge + actions */}
        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
            flexShrink: 0,
          }}
        >
          {expiry && (
            <Box
              data-testid="expiry-badge"
              className={isUrgent ? 'expiry-urgent' : undefined}
              style={{
                background: expiry.badgeBg,
                borderRadius: 6,
                padding: '2px 7px',
              }}
            >
              <Text
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: 10,
                  fontWeight: 700,
                  color: expiry.badgeText,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {expiry.label}
              </Text>
            </Box>
          )}
          {isLowStock && (
            <Box
              style={{
                background: '#FEE2E2',
                borderRadius: 6,
                padding: '2px 7px',
              }}
            >
              <Text
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#991B1B',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {t('itemCard.lowStock')}
              </Text>
            </Box>
          )}
          <Group gap={4} mt={2}>
            <ActionIcon
              size={28}
              variant="subtle"
              onClick={() => onEdit(item)}
              aria-label={t('itemCard.editItem', { name: item.name })}
              style={{ color: '#7A6A5A' }}
            >
              <IconEdit size={14} />
            </ActionIcon>
            <ActionIcon
              size={28}
              variant="subtle"
              onClick={() => onDelete(item.id)}
              aria-label={t('itemCard.deleteItem', { name: item.name })}
              style={{ color: '#C42A2A' }}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Box>
      </Box>
    </>
  )
}
