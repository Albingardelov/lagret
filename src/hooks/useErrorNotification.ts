import { useTranslation } from 'react-i18next'
import { notifications } from '@mantine/notifications'

export function useErrorNotification() {
  const { t } = useTranslation()
  return (message: string, label?: string) => {
    notifications.show({
      title: label ?? t('errors.label'),
      message: t(message, { defaultValue: message }),
      color: 'red',
      autoClose: 5000,
    })
  }
}
