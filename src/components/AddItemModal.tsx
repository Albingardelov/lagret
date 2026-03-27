import {
  Modal,
  TextInput,
  NumberInput,
  Select,
  Button,
  Stack,
  Group,
  Text,
  Loader,
  Divider,
  Badge,
  Alert,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { IconBarcode, IconScissors, IconCheck, IconAlertTriangle } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import { Scanner } from './Scanner'
import { lookupBarcodeRegistry, saveBarcodeRegistry } from '../lib/barcodeRegistry'
import { useLocationsStore } from '../store/locationsStore'
import { ITEM_CATEGORIES } from '../lib/categories'

interface Props {
  opened: boolean
  onClose: () => void
  defaultBarcode?: string
  defaultLocation?: string // now a UUID string
  defaultName?: string
}

export function AddItemModal({
  opened,
  onClose,
  defaultBarcode,
  defaultLocation,
  defaultName,
}: Props) {
  const addItem = useInventoryStore((s) => s.addItem)
  const addItems = useInventoryStore((s) => s.addItems)
  const locations = useLocationsStore((s) => s.locations)
  const [showScanner, setShowScanner] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupFailed, setLookupFailed] = useState(false)
  const [lookupSuccess, setLookupSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [splitCount, setSplitCount] = useState<number | null>(null)

  const form = useForm({
    initialValues: {
      name: '',
      barcode: defaultBarcode ?? '',
      quantity: 1,
      unit: 'st',
      location: defaultLocation ?? locations[0]?.id ?? '',
      expiryDate: null as Date | null,
      category: '',
    },
  })

  useEffect(() => {
    if (opened) {
      form.setFieldValue('location', defaultLocation ?? locations[0]?.id ?? '')
      if (defaultName) form.setFieldValue('name', defaultName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  const handleBarcode = async (code: string) => {
    form.setFieldValue('barcode', code)
    setShowScanner(false)
    setLookupFailed(false)
    setLookupSuccess(false)
    setLookupLoading(true)
    const entry = await lookupBarcodeRegistry(code)
    setLookupLoading(false)
    if (entry) {
      form.setFieldValue('name', entry.name)
      form.setFieldValue('unit', entry.unit)
      if (entry.category) form.setFieldValue('category', entry.category)
      setLookupSuccess(true)
    } else {
      setLookupFailed(true)
    }
  }

  const quantityPerPart =
    splitCount && splitCount > 1
      ? Math.round((form.values.quantity / splitCount) * 100) / 100
      : null

  const handleSubmit = form.onSubmit(async (values) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const d = values.expiryDate
      const expiryDate = d instanceof Date ? d.toISOString().split('T')[0] : (d ?? undefined)
      const base = { ...values, expiryDate }
      if (splitCount && splitCount > 1 && quantityPerPart !== null) {
        await addItems(
          Array.from({ length: splitCount }, () => ({ ...base, quantity: quantityPerPart }))
        )
      } else {
        await addItem(base)
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Något gick fel')
      setSubmitting(false)
      return
    }
    // Spara i det delade registret om streckkod finns (fire-and-forget)
    if (values.barcode && values.name) {
      saveBarcodeRegistry(values.barcode, {
        name: values.name,
        unit: values.unit,
        category: values.category || undefined,
      }).catch(() => {})
    }
    setSubmitting(false)
    form.reset()
    setSplitCount(null)
    setLookupFailed(false)
    setLookupSuccess(false)
    setSubmitError(null)
    onClose()
  })

  return (
    <Modal opened={opened} onClose={onClose} title="Lägg till vara">
      {showScanner ? (
        <Scanner onBarcode={handleBarcode} onClose={() => setShowScanner(false)} />
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack>
            <Group align="flex-end">
              <TextInput
                label="Streckkod"
                placeholder="Skanna eller ange manuellt"
                style={{ flex: 1 }}
                {...form.getInputProps('barcode')}
              />
              <Button
                variant="light"
                leftSection={<IconBarcode size={16} />}
                onClick={() => setShowScanner(true)}
              >
                Skanna
              </Button>
            </Group>

            {lookupLoading && (
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  Söker produktinformation...
                </Text>
              </Group>
            )}

            {lookupSuccess && (
              <Alert color="green" icon={<IconCheck size={16} />}>
                Produkt hittad och ifylld automatiskt.
              </Alert>
            )}

            {lookupFailed && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />} title="Okänd streckkod">
                Fyll i namn och enhet så sparas den för nästa gång.
              </Alert>
            )}

            <TextInput
              label="Namn"
              placeholder="T.ex. Mjölk"
              required
              {...form.getInputProps('name')}
            />
            <Group grow>
              <NumberInput label="Antal" min={0} step={0.5} {...form.getInputProps('quantity')} />
              <TextInput label="Enhet" placeholder="st, kg, l..." {...form.getInputProps('unit')} />
            </Group>
            <Select
              label="Förvaringsplats"
              data={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
              {...form.getInputProps('location')}
            />
            <DateInput
              label="Bäst-före datum"
              placeholder="Välj datum"
              clearable
              {...form.getInputProps('expiryDate')}
            />
            <Select
              label="Kategori"
              placeholder="Välj kategori"
              data={ITEM_CATEGORIES}
              clearable
              searchable
              {...form.getInputProps('category')}
            />
            <Divider />

            {splitCount === null ? (
              <Button
                variant="light"
                leftSection={<IconScissors size={16} />}
                onClick={() => setSplitCount(2)}
              >
                Dela upp i portioner
              </Button>
            ) : (
              <Stack gap="xs">
                <Group align="flex-end">
                  <NumberInput
                    label="Antal delar"
                    min={2}
                    max={20}
                    value={splitCount}
                    onChange={(v) => setSplitCount(typeof v === 'number' ? v : 2)}
                    style={{ flex: 1 }}
                  />
                  <Button variant="subtle" color="gray" onClick={() => setSplitCount(null)}>
                    Avbryt
                  </Button>
                </Group>
                {quantityPerPart !== null && (
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      Varje del:
                    </Text>
                    <Badge variant="light">
                      {quantityPerPart} {form.values.unit}
                    </Badge>
                  </Group>
                )}
              </Stack>
            )}

            {submitError && (
              <Alert color="red" title="Fel">
                {submitError}
              </Alert>
            )}

            <Button type="submit" fullWidth loading={submitting}>
              {splitCount && splitCount > 1 ? `Lägg till ${splitCount} delar` : 'Lägg till'}
            </Button>
          </Stack>
        </form>
      )}
    </Modal>
  )
}
