import { useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'

export function useScanner(onResult: (barcode: string) => void) {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopScanning = useCallback(() => {
    readerRef.current?.reset()
    readerRef.current = null
    setScanning(false)
  }, [])

  const startScanning = useCallback(
    async (videoElement: HTMLVideoElement) => {
      setError(null)
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader
      setScanning(true)
      try {
        await reader.decodeFromVideoDevice(null, videoElement, (result, err) => {
          if (result) {
            onResult(result.getText())
            stopScanning()
          }
          if (err && err.name !== 'NotFoundException') {
            setError(err.message)
          }
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kunde inte starta kameran')
        setScanning(false)
      }
    },
    [onResult, stopScanning]
  )

  return { scanning, error, startScanning, stopScanning }
}
