import { useState } from 'react'
import { Notification as MantineNotification, Button, Group, Text } from '@mantine/core'
import { IconBell, IconBellOff } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

export const NOTIF_DEFAULT_DAYS = 3

interface Props {
  daysThreshold?: number
}

export function NotificationBanner({ daysThreshold = NOTIF_DEFAULT_DAYS }: Props) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('lagret:notif-dismissed') === 'true'
  )
  const [permission, setPermission] = useState<NotificationPermission>(
    () => window.Notification?.permission ?? 'denied'
  )

  if (dismissed || permission === 'granted' || permission === 'denied') return null

  const requestPermission = async () => {
    if (!window.Notification) return
    const result = await window.Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      const sw = navigator.serviceWorker?.controller
      if (sw) {
        sw.postMessage({ type: 'SCHEDULE_EXPIRY_CHECK', daysThreshold })
      }
    }
  }

  const dismiss = () => {
    localStorage.setItem('lagret:notif-dismissed', 'true')
    setDismissed(true)
  }

  return (
    <MantineNotification
      icon={<IconBell size={18} />}
      color="blue"
      title={t('notifications.title')}
      onClose={dismiss}
      style={{ marginBottom: 'var(--mantine-spacing-md)' }}
    >
      <Text size="sm" mb="xs">
        {t('notifications.description')}
      </Text>
      <Group gap="xs">
        <Button size="xs" onClick={requestPermission}>
          {t('notifications.enable')}
        </Button>
        <Button
          size="xs"
          variant="subtle"
          color="gray"
          leftSection={<IconBellOff size={14} />}
          onClick={dismiss}
        >
          {t('notifications.noThanks')}
        </Button>
      </Group>
    </MantineNotification>
  )
}

/** Shows a system notification when inventory items are expiring soon */
export function notifyExpiringSoon(itemNames: string[], daysThreshold = NOTIF_DEFAULT_DAYS) {
  const NotificationAPI = window.Notification
  if (!NotificationAPI || NotificationAPI.permission !== 'granted') return
  if (itemNames.length === 0) return
  const title = `${itemNames.length} vara${itemNames.length > 1 ? 'r' : ''} går snart ut`
  const body = itemNames.slice(0, 3).join(', ') + (itemNames.length > 3 ? ' ...' : '')
  new NotificationAPI(title, {
    body,
    icon: '/pwa-192x192.png',
    tag: `expiry-${daysThreshold}d`,
  })
}
