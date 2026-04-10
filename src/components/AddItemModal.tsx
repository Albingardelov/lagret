import {
  TextInput,
  NumberInput,
  Select,
  Button,
  Stack,
  Group,
  Text,
  Loader,
  Badge,
  Alert,
  Checkbox,
  Collapse,
  UnstyledButton,
  Box,
  Divider,
} from '@mantine/core'
import { BottomSheet } from './BottomSheet'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import {
  IconBarcode,
  IconScissors,
  IconCheck,
  IconAlertTriangle,
  IconMinus,
  IconPlus,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react'
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
  defaultLocation?: string
  defaultName?: string
  onAdded?: () => void
}

function qtyStep(unit: string): number {
  if (['kg', 'l', 'hg', 'dl'].includes(unit)) return 0.1
  return 1
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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupFailed, setLookupFailed] = useState(false)
  const [lookupSuccess, setLookupSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [splitCount, setSplitCount] = useState<number | null>(null)

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
      setShowAdvanced(!!defaultBarcode)
      form.setFieldValue('location', defaultLocation ?? locations[0]?.id ?? '')
      if (defaultName) {
        const parsed = parseShoppingInput(defaultName)
        form.setFieldValue('name', parsed.name || defaultName)
        if (parsed.quantity !== 1 || parsed.unit !== 'st') {
          userTouchedRef.current.quantity = true
          userTouchedRef.current.unit = true
          form.setFieldValue('quantity', parsed.quantity)
          form.setFieldValue('unit', parsed.unit)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

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
      userTouchedRef.current.unit = true
      form.setFieldValue('unit', entry.unit)
      if (entry.category) form.setFieldValue('category', entry.category)
      setLookupSuccess(true)
    } else {
      setLookupFailed(true)
    }
  }

  const step = qtyStep(form.values.unit)

  const quantityPerPart =
    splitCount && splitCount > 1
      ? Math.round((form.values.quantity / splitCount) * 100) / 100
      : null

  const handleSubmit = form.onSubmit(async (values) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
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
          <Stack gap="md">
            {/* Name */}
            <TextInput
              label={t('common.fields.name')}
              placeholder={t('addItem.namePlaceholder')}
              required
              {...form.getInputProps('name')}
            />

            {/* Quantity stepper + Unit */}
            <Group align="flex-end" gap={8}>
              <Box style={{ flex: 2 }}>
                <Text
                  component="label"
                  style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: '#212529',
                  }}
                >
                  {t('common.fields.quantity')}
                </Text>
                <Group
                  gap={0}
                  wrap="nowrap"
                  style={{
                    border: '1px solid #dee2e6',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <UnstyledButton
                    onClick={() => {
                      userTouchedRef.current.quantity = true
                      form.setFieldValue(
                        'quantity',
                        Math.max(0, Math.round((form.values.quantity - step) * 100) / 100)
                      )
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#495057',
                      borderRight: '1px solid #dee2e6',
                    }}
                  >
                    <IconMinus size={14} />
                  </UnstyledButton>
                  <NumberInput
                    hideControls
                    min={0}
                    step={step}
                    styles={{
                      root: { flex: 1 },
                      input: {
                        border: 'none',
                        textAlign: 'center',
                        borderRadius: 0,
                        height: 40,
                        fontWeight: 600,
                      },
                    }}
                    {...form.getInputProps('quantity')}
                    onChange={(v) => {
                      userTouchedRef.current.quantity = true
                      form.getInputProps('quantity').onChange(v)
                    }}
                  />
                  <UnstyledButton
                    onClick={() => {
                      userTouchedRef.current.quantity = true
                      form.setFieldValue(
                        'quantity',
                        Math.round((form.values.quantity + step) * 100) / 100
                      )
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#495057',
                      borderLeft: '1px solid #dee2e6',
                    }}
                  >
                    <IconPlus size={14} />
                  </UnstyledButton>
                </Group>
              </Box>
              {(() => {
                const unitProps = form.getInputProps('unit')
                return (
                  <Select
                    label={t('common.fields.unit')}
                    data={UNITS_FLAT.map((g) => ({ ...g, group: t(unitGroupKey(g.group)) }))}
                    searchable
                    allowDeselect={false}
                    comboboxProps={{ withinPortal: false }}
                    style={{ flex: 1 }}
                    {...unitProps}
                    onChange={(v) => {
                      userTouchedRef.current.unit = true
                      unitProps.onChange(v)
                    }}
                  />
                )
              })()}
            </Group>

            {/* Location chips */}
            {locations.length > 0 && (
              <Box>
                <Text
                  style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 8,
                    color: '#212529',
                  }}
                >
                  {t('common.fields.location')}
                </Text>
                <Group gap={8} style={{ flexWrap: 'wrap' }}>
                  {locations.map((loc) => {
                    const active = form.values.location === loc.id
                    return (
                      <UnstyledButton
                        key={loc.id}
                        onClick={() => form.setFieldValue('location', loc.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: active ? 600 : 500,
                          fontFamily: '"Manrope", sans-serif',
                          background: active ? '#5C3D2E' : '#F5F2EE',
                          color: active ? '#fff' : '#5C3D2E',
                          border: `1.5px solid ${active ? '#5C3D2E' : '#D9D0C7'}`,
                          transition: 'background 0.1s, color 0.1s',
                        }}
                      >
                        {loc.name}
                      </UnstyledButton>
                    )
                  })}
                </Group>
              </Box>
            )}

            {/* Category */}
            <Select
              label={t('common.fields.category')}
              placeholder={t('common.fields.chooseCategory')}
              data={ITEM_CATEGORIES.map((cat) => ({ value: cat, label: t(categoryKey(cat)) }))}
              clearable
              searchable
              comboboxProps={{ withinPortal: false }}
              {...form.getInputProps('category')}
            />

            {/* Expiry date */}
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

            {/* Advanced toggle */}
            <UnstyledButton
              onClick={() => setShowAdvanced((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: '#7A6A5A',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: '"Manrope", sans-serif',
                alignSelf: 'flex-start',
              }}
            >
              {showAdvanced ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              {t('addItem.advanced')}
            </UnstyledButton>

            <Collapse in={showAdvanced}>
              <Stack gap="md">
                {/* Barcode */}
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

                {/* Vacuum packed */}
                <Checkbox
                  label={t('addItem.vacuumPacked')}
                  description={t('addItem.vacuumPackedHint')}
                  {...form.getInputProps('vacuumPacked', { type: 'checkbox' })}
                />

                {/* Split portions */}
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
              </Stack>
            </Collapse>

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
