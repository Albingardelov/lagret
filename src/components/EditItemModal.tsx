import { TextInput, NumberInput, Select, Button, Stack, Group, Alert } from '@mantine/core'
import { BottomSheet } from './BottomSheet'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { ITEM_CATEGORIES, categoryKey } from '../lib/categories'
import { UNITS_FLAT, unitGroupKey } from '../lib/units'
import type { InventoryItem } from '../types'

interface Props {
  item: InventoryItem | null
  onClose: () => void
}

export function EditItemModal({ item, onClose }: Props) {
  const { t } = useTranslation()
  const updateItem = useInventoryStore((s) => s.updateItem)
  const locations = useLocationsStore((s) => s.locations)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    initialValues: {
      name: '',
      quantity: 1,
      unit: 'st',
      location: '',
      expiryDate: null as Date | null,
      category: '',
      minQuantity: null as number | null,
    },
  })

  useEffect(() => {
    if (item) {
      form.setValues({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        category: item.category ?? '',
        minQuantity: item.minQuantity ?? null,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item])

  const handleSubmit = form.onSubmit(async (values) => {
    if (!item) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const d = values.expiryDate
      const expiryDate = d instanceof Date ? d.toISOString().split('T')[0] : (d ?? undefined)
      await updateItem(item.id, {
        name: values.name,
        quantity: values.quantity,
        unit: values.unit,
        location: values.location,
        expiryDate,
        category: values.category || undefined,
        minQuantity: values.minQuantity ?? undefined,
      })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('common.errors.unknownError'))
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onClose()
  })

  return (
    <BottomSheet opened={!!item} onClose={onClose} title={t('editItem.title')}>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput label={t('common.fields.name')} required {...form.getInputProps('name')} />
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
              {...form.getInputProps('unit')}
            />
          </Group>
          <Select
            label={t('common.fields.location')}
            data={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
            {...form.getInputProps('location')}
          />
          <DateInput
            label={t('common.fields.expiryDate')}
            placeholder={t('common.fields.chooseDate')}
            clearable
            {...form.getInputProps('expiryDate')}
          />
          <Select
            label={t('common.fields.category')}
            placeholder={t('common.fields.chooseCategory')}
            data={ITEM_CATEGORIES.map((cat) => ({ value: cat, label: t(categoryKey(cat)) }))}
            clearable
            searchable
            {...form.getInputProps('category')}
          />
          <NumberInput
            label={t('editItem.minLevel')}
            description={t('editItem.minLevelHint')}
            placeholder={t('editItem.minLevelPlaceholder')}
            min={0}
            step={1}
            {...form.getInputProps('minQuantity')}
          />

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
