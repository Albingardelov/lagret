import { useEffect } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import i18n from '../i18n'

const STORAGE_KEY = 'lagret:expiry-notified'

export function useExpiryNotifications() {
  const getExpiringSoon = useInventoryStore((s) => s.getExpiringSoon)
  const items = useInventoryStore((s) => s.items)

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'denied') return
    if (items.length === 0) return

    const today = new Date().toDateString()
    if (localStorage.getItem(STORAGE_KEY) === today) return

    const expiring = getExpiringSoon(3)
    if (expiring.length === 0) return

    const notify = () => {
      localStorage.setItem(STORAGE_KEY, today)
      const body =
        expiring.length === 1
          ? i18n.t('expiryNotification.singleItem', { name: expiring[0].name })
          : i18n.t('expiryNotification.multipleItems', { count: expiring.length })
      new Notification(i18n.t('expiryNotification.appName'), { body, icon: '/favicon.svg' })
    }

    if (Notification.permission === 'granted') {
      notify()
    } else {
      Notification.requestPermission()
        .then((permission) => {
          if (permission === 'granted') notify()
        })
        .catch(() => {})
    }
  }, [items, getExpiringSoon])
}
