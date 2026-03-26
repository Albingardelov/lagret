import { useEffect, useRef } from 'react'
import { Button, Stack, Text, Alert } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { useScanner } from '../hooks/useScanner'

interface ScannerProps {
  onBarcode: (barcode: string) => void
  onClose: () => void
}

export function Scanner({ onBarcode, onClose }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { scanning, error, startScanning, stopScanning } = useScanner(onBarcode)

  useEffect(() => {
    if (videoRef.current) {
      startScanning(videoRef.current)
    }
    return () => stopScanning()
  }, [])

  return (
    <Stack>
      {error && (
        <Alert color="red" title="Kamerafel">
          {error}
        </Alert>
      )}
      <video
        ref={videoRef}
        style={{ width: '100%', borderRadius: 8, background: '#000' }}
      />
      <Text size="sm" c="dimmed" ta="center">
        {scanning ? 'Rikta kameran mot streckkoden...' : 'Startar kameran...'}
      </Text>
      <Button
        leftSection={<IconX size={16} />}
        variant="subtle"
        color="red"
        onClick={() => { stopScanning(); onClose() }}
      >
        Avbryt
      </Button>
    </Stack>
  )
}
