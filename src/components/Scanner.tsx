import { useEffect, useRef } from 'react'
import { Button, Stack, Text, Alert } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useScanner } from '../hooks/useScanner'

interface ScannerProps {
  onBarcode: (barcode: string) => void
  onClose: () => void
}

export function Scanner({ onBarcode, onClose }: ScannerProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const { scanning, error, startScanning, stopScanning } = useScanner(onBarcode)

  useEffect(() => {
    if (videoRef.current) {
      startScanning(videoRef.current)
    }
    return () => stopScanning()
  }, [startScanning, stopScanning])

  return (
    <Stack>
      {error && (
        <Alert color="red" title={t('scanner.cameraError')}>
          {error}
        </Alert>
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- kamera-preview för streckkodsskanning, ej mediaspelare */}
      <video ref={videoRef} style={{ width: '100%', borderRadius: 8, background: '#000' }} />
      <Text size="sm" c="dimmed" ta="center">
        {scanning ? t('scanner.aim') : t('scanner.starting')}
      </Text>
      <Button
        leftSection={<IconX size={16} />}
        variant="subtle"
        color="red"
        onClick={() => {
          stopScanning()
          onClose()
        }}
      >
        {t('scanner.cancel')}
      </Button>
    </Stack>
  )
}
