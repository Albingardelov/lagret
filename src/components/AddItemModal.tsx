import {
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
import { BottomSheet } from './BottomSheet'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { IconBarcode, IconScissors, IconCheck, IconAlertTriangle } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useInventoryStore } from '../store/inventoryStore'
import { Scanner } from './Scanner'
import { lookupBarcodeRegistry, saveBarcodeRegistry } from '../lib/barcodeRegistry'
import { useLocationsStore } from '../store/locationsStore'
import {
  ITEM_CATEGORIES,
  CATEGORY_DEFAULT_UNIT,
  CATEGORY_DEFAULT_QTY,
  categoryKey,
} from '../lib/categories'
import { parseShoppingInput } from '../lib/parseShoppingInput'
import { suggestExpiryDate } from '../lib/storageDurations'
import { UNITS_FLAT, unitGroupKey } from '../lib/units'

interface Props {
  opened: boolean
  onClose: () => void
  defaultBarcode?: string
  defaultLocation?: string // now a UUID string
  defaultName?: string
  onAdded?: () => void
}

export function AddItemModal({
  opened,
  onClose,
  defaultBarcode,
  defaultLocation,
  defaultName,
  onAdded,
}: Props) {
  const { t } = useTranslation()
  const addItem = useInventoryStore((s) => s.addItem)
  const addItems = useInventoryStore((s) => s.addItems)
  const locations = useLocationsStore((s) => s.locations)
  const fetchLocations = useLocationsStore((s) => s.fetchLocations)

  useEffect(() => {
    if (locations.length === 0) fetchLocations()
  }, [fetchLocations, locations.length])

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
      if (defaultName) {
        const parsed = parseShoppingInput(defaultName)
        form.setFieldValue('name', parsed.name || defaultName)
        if (parsed.quantity !== 1 || parsed.unit !== 'st') {
          form.setFieldValue('quantity', parsed.quantity)
          form.setFieldValue('unit', parsed.unit)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  // Auto-suggest unit + quantity when category changes
  useEffect(() => {
    const cat = form.values.category
    if (!cat) return
    const suggestedUnit = CATEGORY_DEFAULT_UNIT[cat]
    const suggestedQty = CATEGORY_DEFAULT_QTY[cat]
    if (suggestedUnit) form.setFieldValue('unit', suggestedUnit)
    if (suggestedQty) form.setFieldValue('quantity', suggestedQty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.category])

  // Auto-suggest expiry date when location or category changes.
  // Uses the already-entered packaging date as base if available, otherwise today.
  useEffect(() => {
    const locationType = locations.find((l) => l.id === form.values.location)?.icon
    const base = form.values.expiryDate instanceof Date ? form.values.expiryDate : undefined
    const suggested = suggestExpiryDate(form.values.category || undefined, locationType, base)
    if (suggested) form.setFieldValue('expiryDate', suggested)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.location, form.values.category])

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
      setSubmitError(e instanceof Error ? e.message : t('common.errors.unknownError'))
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
    onAdded?.()
    onClose()
  })

  return (
    <BottomSheet opened={opened} onClose={onClose} title={t('addItem.title')}>
      {showScanner ? (
        <Scanner onBarcode={handleBarcode} onClose={() => setShowScanner(false)} />
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack>
            <Group align="flex-end">
              <TextInput
                label={t('addItem.barcode')}
                placeholder={t('addItem.barcodeHint')}
                style={{ flex: 1 }}
                {...form.getInputProps('barcode')}
              />
              <Button
                variant="light"
                leftSection={<IconBarcode size={16} />}
                onClick={() => setShowScanner(true)}
              >
                {t('addItem.scan')}
              </Button>
            </Group>

            {lookupLoading && (
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  {t('addItem.searching')}
                </Text>
              </Group>
            )}

            {lookupSuccess && (
              <Alert color="green" icon={<IconCheck size={16} />}>
                {t('addItem.productFound')}
              </Alert>
            )}

            {lookupFailed && (
              <Alert
                color="orange"
                icon={<IconAlertTriangle size={16} />}
                title={t('addItem.unknownBarcode')}
              >
                {t('addItem.unknownBarcodeHint')}
              </Alert>
            )}

            <TextInput
              label={t('common.fields.name')}
              placeholder={t('addItem.namePlaceholder')}
              required
              {...form.getInputProps('name')}
            />
            <Group grow>
              <NumberInput
                label={t('common.fields.quantity')}
                min={0}
                step={0.5}
                {...form.getInputProps('quantity')}
              />
              <Select
                label={t('common.fields.unit')}
                data={UNITS_FLAT.map((g) => ({ ...g, group: t(unitGroupKey(g.group)) }))}
                searchable
                allowDeselect={false}
                comboboxProps={{ withinPortal: false }}
                {...form.getInputProps('unit')}
              />
            </Group>
            <Select
              label={t('common.fields.location')}
              data={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
              searchable
              allowDeselect={false}
              comboboxProps={{ withinPortal: false }}
              {...form.getInputProps('location')}
            />
            <DateInput
              label={t('common.fields.expiryDate')}
              placeholder={t('common.fields.chooseDate')}
              clearable
              popoverProps={{ withinPortal: false }}
              {...form.getInputProps('expiryDate')}
            />
            <Select
              label={t('common.fields.category')}
              placeholder={t('common.fields.chooseCategory')}
              data={ITEM_CATEGORIES.map((cat) => ({ value: cat, label: t(categoryKey(cat)) }))}
              clearable
              searchable
              comboboxProps={{ withinPortal: false }}
              {...form.getInputProps('category')}
            />
            <Divider />

            {splitCount === null ? (
              <Button
                variant="light"
                leftSection={<IconScissors size={16} />}
                onClick={() => setSplitCount(2)}
              >
                {t('addItem.splitPortions')}
              </Button>
            ) : (
              <Stack gap="xs">
                <Group align="flex-end">
                  <NumberInput
                    label={t('addItem.portionCount')}
                    min={2}
                    max={20}
                    value={splitCount}
                    onChange={(v) => setSplitCount(typeof v === 'number' ? v : 2)}
                    style={{ flex: 1 }}
                  />
                  <Button variant="subtle" color="gray" onClick={() => setSplitCount(null)}>
                    {t('common.buttons.cancel')}
                  </Button>
                </Group>
                {quantityPerPart !== null && (
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      {t('addItem.eachPortion')}:
                    </Text>
                    <Badge variant="light">
                      {quantityPerPart} {form.values.unit}
                    </Badge>
                  </Group>
                )}
              </Stack>
            )}

            {submitError && (
              <Alert color="red" title={t('addItem.error')}>
                {t(submitError, { defaultValue: submitError })}
              </Alert>
            )}

            <Button type="submit" fullWidth loading={submitting}>
              {splitCount && splitCount > 1
                ? t('addItem.addPortions', { count: splitCount })
                : t('common.buttons.add')}
            </Button>
          </Stack>
        </form>
      )}
    </BottomSheet>
  )
}
