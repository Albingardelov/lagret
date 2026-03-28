import { TextInput, NumberInput, Select, Button, Stack, Group, Alert } from '@mantine/core'
import { BottomSheet } from './BottomSheet'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useState, useEffect } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { ITEM_CATEGORIES } from '../lib/categories'
import { UNITS_FLAT } from '../lib/units'
import type { InventoryItem } from '../types'

interface Props {
  item: InventoryItem | null
  onClose: () => void
}

export function EditItemModal({ item, onClose }: Props) {
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
      setSubmitError(e instanceof Error ? e.message : 'Något gick fel')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onClose()
  })

  return (
    <BottomSheet opened={!!item} onClose={onClose} title="Redigera vara">
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput label="Namn" required {...form.getInputProps('name')} />
          <Group grow>
            <NumberInput label="Antal" min={0} step={0.5} {...form.getInputProps('quantity')} />
            <Select
              label="Enhet"
              data={UNITS_FLAT}
              searchable
              allowDeselect={false}
              {...form.getInputProps('unit')}
            />
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
          <NumberInput
            label="Minimumnivå"
            description="Läggs automatiskt i inköpslistan när antalet understiger detta"
            placeholder="Inget minimum"
            min={0}
            step={1}
            {...form.getInputProps('minQuantity')}
          />

          {submitError && (
            <Alert color="red" title="Fel">
              {submitError}
            </Alert>
          )}

          <Button type="submit" fullWidth loading={submitting}>
            Spara
          </Button>
        </Stack>
      </form>
    </BottomSheet>
  )
}
