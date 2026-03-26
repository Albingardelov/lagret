import { useEffect } from 'react'
import { notifications } from '@mantine/notifications'

export function useErrorNotification(error: string | null, title = 'Fel') {
  useEffect(() => {
    if (!error) return
    notifications.show({
      title,
      message: error,
      color: 'red',
      autoClose: 5000,
    })
  }, [error, title])
}
