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
  Checkbox,
} from '@mantine/core'
import { BottomSheet } from './BottomSheet'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { IconBarcode, IconScissors, IconCheck, IconAlertTriangle } from '@tabler/icons-react'
import { useState, useEffect, useRef } from 'react'
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
  const { t, i18n } = useTranslation()
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

  // Tracks fields the user has manually edited so auto-suggestions
  // (from category/location/vacuum-packed) don't overwrite them.
  const userTouchedRef = useRef({ quantity: false, unit: false, expiryDate: false })
  const resetTouched = () => {
    userTouchedRef.current = { quantity: false, unit: false, expiryDate: false }
  }

  const form = useForm({
    initialValues: {
      name: '',
      barcode: defaultBarcode ?? '',
      quantity: 1,
      unit: 'st',
      location: defaultLocation ?? locations[0]?.id ?? '',
      expiryDate: null as Date | null,
      category: '',
      vacuumPacked: false,
    },
  })

  useEffect(() => {
    if (opened) {
      resetTouched()
      form.setFieldValue('location', defaultLocation ?? locations[0]?.id ?? '')
      if (defaultName) {
        const parsed = parseShoppingInput(defaultName)
        form.setFieldValue('name', parsed.name || defaultName)
        if (parsed.quantity !== 1 || parsed.unit !== 'st') {
          // The user already specified qty/unit when creating the shopping
          // entry — treat that as a manual choice so it sticks.
          userTouchedRef.current.quantity = true
          userTouchedRef.current.unit = true
          form.setFieldValue('quantity', parsed.quantity)
          form.setFieldValue('unit', parsed.unit)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  // Auto-suggest unit + quantity when category changes — but never overwrite
  // a value the user has already typed in manually.
  useEffect(() => {
    const cat = form.values.category
    if (!cat) return
    const suggestedUnit = CATEGORY_DEFAULT_UNIT[cat]
    const suggestedQty = CATEGORY_DEFAULT_QTY[cat]
    if (suggestedUnit && !userTouchedRef.current.unit) {
      form.setFieldValue('unit', suggestedUnit)
    }
    if (suggestedQty && !userTouchedRef.current.quantity) {
      form.setFieldValue('quantity', suggestedQty)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.category])

  // Auto-suggest expiry date when location, category or vacuum-packed changes.
  // Skip entirely once the user has touched the date so we don't trample input.
  useEffect(() => {
    if (userTouchedRef.current.expiryDate) return
    const locationType = locations.find((l) => l.id === form.values.location)?.icon
    const suggested = suggestExpiryDate(
      form.values.category || undefined,
      locationType,
      undefined,
      form.values.vacuumPacked
    )
    if (suggested) form.setFieldValue('expiryDate', suggested)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.location, form.values.category, form.values.vacuumPacked])

  const handleBarcode = async (code: string) => {
    form.setFieldValue('barcode', code)
    setShowScanner(false)
    setLookupFailed(false)
    setLookupSuccess(false)
    setLookupLoading(true)
    const entry = await lookupBarcodeRegistry(code)
    setLookupLoading(false)
    if (entry) {
      const productName = i18n.language.startsWith('en') && entry.nameEn ? entry.nameEn : entry.name
      form.setFieldValue('name', productName)
      // Treat the registry value as deliberate so the category auto-suggest
      // doesn't overwrite it with a generic default.
      userTouchedRef.current.unit = true
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
      // If the user manually entered a date, treat it as the printed
      // best-before from the packaging and silently extend it with the
      // storage days for the chosen location/category (and vacuum-pack
      // multiplier if applicable). The form input is left untouched so the
      // UI doesn't shift under the user — the math happens in the background.
      let finalDate = values.expiryDate
      if (finalDate instanceof Date && userTouchedRef.current.expiryDate) {
        const locationType = locations.find((l) => l.id === values.location)?.icon
        const adjusted = suggestExpiryDate(
          values.category || undefined,
          locationType,
          finalDate,
          values.vacuumPacked
        )
        if (adjusted) finalDate = adjusted
      }
      const expiryDate =
        finalDate instanceof Date ? finalDate.toISOString().split('T')[0] : (finalDate ?? undefined)
      const base = {
        name: values.name,
        barcode: values.barcode,
        quantity: values.quantity,
        unit: values.unit,
        location: values.location,
        category: values.category,
        expiryDate,
        vacuumPacked: values.vacuumPacked,
      }
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
    resetTouched()
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
              {(() => {
                const qtyProps = form.getInputProps('quantity')
                return (
                  <NumberInput
                    label={t('common.fields.quantity')}
                    min={0}
                    step={0.5}
                    {...qtyProps}
                    onChange={(v) => {
                      userTouchedRef.current.quantity = true
                      qtyProps.onChange(v)
                    }}
                  />
                )
              })()}
              {(() => {
                const unitProps = form.getInputProps('unit')
                return (
                  <Select
                    label={t('common.fields.unit')}
                    data={UNITS_FLAT.map((g) => ({ ...g, group: t(unitGroupKey(g.group)) }))}
                    searchable
                    allowDeselect={false}
                    comboboxProps={{ withinPortal: false }}
                    {...unitProps}
                    onChange={(v) => {
                      userTouchedRef.current.unit = true
                      unitProps.onChange(v)
                    }}
                  />
                )
              })()}
            </Group>
            <Select
              label={t('common.fields.location')}
              data={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
              searchable
              allowDeselect={false}
              comboboxProps={{ withinPortal: false }}
              {...form.getInputProps('location')}
            />
            {(() => {
              const dateProps = form.getInputProps('expiryDate')
              return (
                <DateInput
                  label={t('common.fields.expiryDate')}
                  placeholder={t('common.fields.chooseDate')}
                  clearable
                  popoverProps={{ withinPortal: false }}
                  {...dateProps}
                  onChange={(v) => {
                    userTouchedRef.current.expiryDate = true
                    dateProps.onChange(v)
                  }}
                />
              )
            })()}
            <Checkbox
              label={t('addItem.vacuumPacked')}
              description={t('addItem.vacuumPackedHint')}
              {...form.getInputProps('vacuumPacked', { type: 'checkbox' })}
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
