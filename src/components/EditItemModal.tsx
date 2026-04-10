import {
  TextInput,
  NumberInput,
  Select,
  Button,
  Stack,
  Alert,
  Checkbox,
  Collapse,
  UnstyledButton,
  Box,
  Text,
  Group,
} from '@mantine/core'
import { BottomSheet } from './BottomSheet'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { IconMinus, IconPlus, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { ITEM_CATEGORIES, categoryKey } from '../lib/categories'
import { UNITS_FLAT, unitGroupKey } from '../lib/units'
import { VACUUM_PACK_MULTIPLIER } from '../lib/storageDurations'
import type { InventoryItem } from '../types'

interface Props {
  item: InventoryItem | null
  onClose: () => void
}

function qtyStep(unit: string): number {
  if (['kg', 'l', 'hg', 'dl'].includes(unit)) return 0.1
  return 1
}

export function EditItemModal({ item, onClose }: Props) {
  const { t } = useTranslation()
  const updateItem = useInventoryStore((s) => s.updateItem)
  const locations = useLocationsStore((s) => s.locations)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const form = useForm({
    initialValues: {
      name: '',
      quantity: 1,
      unit: 'st',
      location: '',
      expiryDate: null as Date | null,
      category: '',
      minQuantity: null as number | null,
      vacuumPacked: false,
    },
  })

  useEffect(() => {
    if (item) {
      setShowAdvanced(false)
      form.setValues({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        category: item.category ?? '',
        minQuantity: item.minQuantity ?? null,
        vacuumPacked: item.vacuumPacked ?? false,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item])

  const handleSubmit = form.onSubmit(async (values) => {
    if (!item) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      let finalDate = values.expiryDate
      const vacuumChanged = values.vacuumPacked !== (item.vacuumPacked ?? false)
      if (vacuumChanged && finalDate instanceof Date) {
        const today = dayjs().startOf('day')
        const remaining = dayjs(finalDate).startOf('day').diff(today, 'day')
        if (remaining > 0) {
          const scaled = values.vacuumPacked
            ? remaining * VACUUM_PACK_MULTIPLIER
            : Math.round(remaining / VACUUM_PACK_MULTIPLIER)
          finalDate = today.add(scaled, 'day').toDate()
        }
      }
      const expiryDate =
        finalDate instanceof Date ? finalDate.toISOString().split('T')[0] : (finalDate ?? undefined)
      await updateItem(item.id, {
        name: values.name,
        quantity: values.quantity,
        unit: values.unit,
        location: values.location,
        expiryDate,
        category: values.category || undefined,
        minQuantity: values.minQuantity ?? undefined,
        vacuumPacked: values.vacuumPacked,
      })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('common.errors.unknownError'))
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onClose()
  })

  const step = qtyStep(form.values.unit)

  return (
    <BottomSheet opened={!!item} onClose={onClose} title={t('editItem.title')}>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Capture initial focus so the keyboard doesn't open on mobile */}
          <Box
            tabIndex={0}
            data-autofocus
            style={{ outline: 'none', height: 0, overflow: 'hidden' }}
          />

          {/* Name */}
          <TextInput label={t('common.fields.name')} required {...form.getInputProps('name')} />

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
                  onClick={() =>
                    form.setFieldValue(
                      'quantity',
                      Math.max(0, Math.round((form.values.quantity - step) * 100) / 100)
                    )
                  }
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
                />
                <UnstyledButton
                  onClick={() =>
                    form.setFieldValue(
                      'quantity',
                      Math.round((form.values.quantity + step) * 100) / 100
                    )
                  }
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
            <Select
              label={t('common.fields.unit')}
              data={UNITS_FLAT.map((g) => ({ ...g, group: t(unitGroupKey(g.group)) }))}
              searchable
              allowDeselect={false}
              style={{ flex: 1 }}
              {...form.getInputProps('unit')}
            />
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

          {/* Expiry date */}
          <DateInput
            label={t('common.fields.expiryDate')}
            placeholder={t('common.fields.chooseDate')}
            clearable
            {...form.getInputProps('expiryDate')}
          />

          {/* Vacuum packed */}
          <Checkbox
            label={t('addItem.vacuumPacked')}
            description={t('addItem.vacuumPackedHint')}
            {...form.getInputProps('vacuumPacked', { type: 'checkbox' })}
          />

          {/* Category */}
          <Select
            label={t('common.fields.category')}
            placeholder={t('common.fields.chooseCategory')}
            data={ITEM_CATEGORIES.map((cat) => ({ value: cat, label: t(categoryKey(cat)) }))}
            clearable
            searchable
            {...form.getInputProps('category')}
          />

          {/* Advanced: min quantity */}
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
            <NumberInput
              label={t('editItem.minLevel')}
              description={t('editItem.minLevelHint')}
              placeholder={t('editItem.minLevelPlaceholder')}
              min={0}
              step={1}
              {...form.getInputProps('minQuantity')}
            />
          </Collapse>

          {submitError && (
            <Alert color="red" title={t('editItem.error')}>
              {t(submitError, { defaultValue: submitError })}
            </Alert>
          )}

          <Button type="submit" fullWidth loading={submitting}>
            {t('common.buttons.save')}
          </Button>
        </Stack>
      </form>
    </BottomSheet>
  )
}
