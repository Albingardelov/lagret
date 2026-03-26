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
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { IconBarcode, IconScissors } from '@tabler/icons-react'
import { useState } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import { Scanner } from './Scanner'
import { lookupBarcode } from '../lib/openFoodFacts'
import type { StorageLocation } from '../types'

interface Props {
  opened: boolean
  onClose: () => void
  defaultBarcode?: string
}

export function AddItemModal({ opened, onClose, defaultBarcode }: Props) {
  const addItem = useInventoryStore((s) => s.addItem)
  const addItems = useInventoryStore((s) => s.addItems)
  const [showScanner, setShowScanner] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupFailed, setLookupFailed] = useState(false)
  const [splitCount, setSplitCount] = useState<number | null>(null)

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

  const handleBarcode = async (code: string) => {
    form.setFieldValue('barcode', code)
    setShowScanner(false)
    setLookupFailed(false)
    setLookupLoading(true)
    const product = await lookupBarcode(code)
    setLookupLoading(false)
    if (product) {
      form.setFieldValue('name', product.name)
      if (product.category) form.setFieldValue('category', product.category)
    } else {
      setLookupFailed(true)
    }
  }

  const quantityPerPart =
    splitCount && splitCount > 1
      ? Math.round((form.values.quantity / splitCount) * 100) / 100
      : null

  const handleSubmit = form.onSubmit(async (values) => {
    const base = { ...values, expiryDate: values.expiryDate?.toISOString().split('T')[0] }
    if (splitCount && splitCount > 1 && quantityPerPart !== null) {
      await addItems(
        Array.from({ length: splitCount }, () => ({ ...base, quantity: quantityPerPart }))
      )
    } else {
      await addItem(base)
    }
    form.reset()
    setSplitCount(null)
    setLookupFailed(false)
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

            {lookupFailed && (
              <Text size="sm" c="orange">
                Produkten hittades inte. Fyll i uppgifterna manuellt.
              </Text>
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

            <Button type="submit" fullWidth>
              {splitCount && splitCount > 1 ? `Lägg till ${splitCount} delar` : 'Lägg till'}
            </Button>
          </Stack>
        </form>
      )}
    </Modal>
  )
}
