import { Modal, TextInput, NumberInput, Select, Button, Stack, Group, Alert } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useState, useEffect } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import type { InventoryItem, StorageLocation } from '../types'

interface Props {
  item: InventoryItem | null
  onClose: () => void
}

export function EditItemModal({ item, onClose }: Props) {
  const updateItem = useInventoryStore((s) => s.updateItem)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    initialValues: {
      name: '',
      quantity: 1,
      unit: 'st',
      location: 'pantry' as StorageLocation,
      expiryDate: null as Date | null,
      category: '',
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
    <Modal opened={!!item} onClose={onClose} title="Redigera vara">
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput label="Namn" required {...form.getInputProps('name')} />
          <Group grow>
            <NumberInput label="Antal" min={0} step={0.5} {...form.getInputProps('quantity')} />
            <TextInput label="Enhet" placeholder="st, kg, l..." {...form.getInputProps('unit')} />
          </Group>
          <Select
            label="Förvaringsplats"
            data={[
              { value: 'pantry', label: 'Skafferi' },
              { value: 'fridge', label: 'Kylskåp' },
              { value: 'freezer', label: 'Frys' },
            ]}
            {...form.getInputProps('location')}
          />
          <DateInput
            label="Bäst-före datum"
            placeholder="Välj datum"
            clearable
            {...form.getInputProps('expiryDate')}
          />
          <TextInput
            label="Kategori"
            placeholder="Mejeri, Kött, Grönsaker..."
            {...form.getInputProps('category')}
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
    </Modal>
  )
}
