import { useEffect, useState } from 'react'
import { Notification } from '@mantine/core'
import { IconWifiOff } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

export function OfflineBanner() {
  const { t } = useTranslation()
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <Notification
      icon={<IconWifiOff size={18} />}
      color="orange"
      title={t('offline.title')}
      withCloseButton={false}
      style={{
        position: 'fixed',
        bottom: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'max-content',
        maxWidth: '90vw',
      }}
    >
      {t('offline.description')}
    </Notification>
  )
}
