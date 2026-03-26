import { Modal, TextInput, NumberInput, Select, Button, Stack, Group } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { IconBarcode } from '@tabler/icons-react'
import { useState } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import { Scanner } from './Scanner'
import type { StorageLocation } from '../types'

interface Props {
  opened: boolean
  onClose: () => void
  defaultBarcode?: string
}

export function AddItemModal({ opened, onClose, defaultBarcode }: Props) {
  const addItem = useInventoryStore((s) => s.addItem)
  const [showScanner, setShowScanner] = useState(false)

  const form = useForm({
    initialValues: {
      name: '',
      barcode: defaultBarcode ?? '',
      quantity: 1,
      unit: 'st',
      location: 'pantry' as StorageLocation,
      expiryDate: null as Date | null,
      category: '',
    },
  })

  const handleSubmit = form.onSubmit(async (values) => {
    await addItem({
      ...values,
      expiryDate: values.expiryDate?.toISOString().split('T')[0],
    })
    form.reset()
    onClose()
  })

  return (
    <Modal opened={opened} onClose={onClose} title="Lägg till vara">
      {showScanner ? (
        <Scanner
          onBarcode={(code) => {
            form.setFieldValue('barcode', code)
            setShowScanner(false)
          }}
          onClose={() => setShowScanner(false)}
        />
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Namn"
              placeholder="T.ex. Mjölk"
              required
              {...form.getInputProps('name')}
            />
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
            <Button type="submit" fullWidth>
              Lägg till
            </Button>
          </Stack>
        </form>
      )}
    </Modal>
  )
}
