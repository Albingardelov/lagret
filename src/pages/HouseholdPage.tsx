import { useState, useEffect } from 'react'
import {
  Stack,
  Text,
  TextInput,
  Button,
  Paper,
  Group,
  Loader,
  Center,
  Divider,
  CopyButton,
  ActionIcon,
  Tooltip,
  Alert,
  Select,
} from '@mantine/core'
import {
  IconCopy,
  IconCheck,
  IconPlus,
  IconDoor,
  IconEdit,
  IconTrash,
  IconFridge,
  IconBox,
  IconSnowflake,
} from '@tabler/icons-react'
import { useHouseholdStore } from '../store/householdStore'
import { useLocationsStore } from '../store/locationsStore'
import { useErrorNotification } from '../hooks/useErrorNotification'
import type { LocationIcon } from '../types'

const ICON_MAP: Record<LocationIcon, React.ReactNode> = {
  pantry: <IconBox size={16} />,
  fridge: <IconFridge size={16} />,
  freezer: <IconSnowflake size={16} />,
}

const ICON_OPTIONS = [
  { value: 'pantry', label: 'Skafferi' },
  { value: 'fridge', label: 'Kylskåp' },
  { value: 'freezer', label: 'Frys' },
]

export function HouseholdPage() {
  const { household, loading, error, fetchHousehold, createHousehold, joinHousehold } =
    useHouseholdStore()
  const { locations, fetchLocations, addLocation, updateLocation, deleteLocation } =
    useLocationsStore()
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)
  const [newLocName, setNewLocName] = useState('')
  const [newLocIcon, setNewLocIcon] = useState<LocationIcon>('fridge')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState<LocationIcon>('fridge')
  const [locError, setLocError] = useState<string | null>(null)

  useErrorNotification(error, 'Hushållsfel')

  useEffect(() => {
    fetchHousehold()
  }, [fetchHousehold])

  useEffect(() => {
    if (household) fetchLocations()
  }, [household, fetchLocations])

  const handleAddLocation = async () => {
    if (!newLocName.trim()) return
    setLocError(null)
    try {
      await addLocation(newLocName.trim(), newLocIcon)
      setNewLocName('')
      setNewLocIcon('fridge')
      setAddingLocation(false)
    } catch (e) {
      setLocError(e instanceof Error ? e.message : 'Något gick fel')
    }
  }

  const handleUpdateLocation = async (id: string) => {
    if (!editName.trim()) return
    setLocError(null)
    try {
      await updateLocation(id, editName.trim(), editIcon)
      setEditingId(null)
    } catch (e) {
      setLocError(e instanceof Error ? e.message : 'Något gick fel')
    }
  }

  const handleDeleteLocation = async (id: string) => {
    setLocError(null)
    try {
      await deleteLocation(id)
    } catch (e) {
      setLocError(e instanceof Error ? e.message : 'Något gick fel')
    }
  }

  if (loading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    )
  }

  if (!household) {
    return (
      <Stack p="md">
        <Text fw={700} size="xl">
          Hushåll
        </Text>
        <Paper withBorder p="md" radius="md">
          <Stack>
            <Text fw={600}>Skapa ett hushåll</Text>
            <TextInput
              placeholder="Hushållets namn"
              value={householdName}
              onChange={(e) => setHouseholdName(e.currentTarget.value)}
            />
            <Button
              leftSection={<IconPlus size={16} />}
              disabled={!householdName.trim()}
              loading={loading}
              onClick={() => createHousehold(householdName.trim())}
            >
              Skapa
            </Button>
          </Stack>
        </Paper>

        <Divider label="eller" labelPosition="center" />

        <Paper withBorder p="md" radius="md">
          <Stack>
            <Text fw={600}>Gå med i ett hushåll</Text>
            <TextInput
              placeholder="Inbjudningskod (8 tecken)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.currentTarget.value)}
            />
            <Button
              leftSection={<IconDoor size={16} />}
              variant="default"
              disabled={inviteCode.length !== 8}
              loading={loading}
              onClick={() => joinHousehold(inviteCode)}
            >
              Gå med
            </Button>
          </Stack>
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack p="md">
      <Text fw={700} size="xl">
        Hushåll
      </Text>

      <Paper withBorder p="md" radius="md">
        <Stack>
          <Text fw={600}>{household.name}</Text>
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Inbjudningskod:
            </Text>
            <Text size="sm" ff="monospace">
              {household.inviteCode}
            </Text>
            <CopyButton value={household.inviteCode} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Kopierat!' : 'Kopiera'} withArrow>
                  <ActionIcon variant="subtle" onClick={copy} size="sm">
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>Förvaringsplatser</Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                setAddingLocation(true)
                setLocError(null)
              }}
            >
              Lägg till
            </Button>
          </Group>

          {locError && (
            <Alert color="red" title="Fel">
              {locError}
            </Alert>
          )}

          {locations.map((loc) => (
            <div key={loc.id}>
              {editingId === loc.id ? (
                <Group>
                  <TextInput
                    value={editName}
                    onChange={(e) => setEditName(e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  <Select
                    data={ICON_OPTIONS}
                    value={editIcon}
                    onChange={(v) => setEditIcon((v as LocationIcon) ?? 'fridge')}
                    w={120}
                  />
                  <Button size="xs" onClick={() => handleUpdateLocation(loc.id)}>
                    Spara
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => setEditingId(null)}
                  >
                    Avbryt
                  </Button>
                </Group>
              ) : (
                <Group justify="space-between">
                  <Group gap="xs">
                    {ICON_MAP[loc.icon]}
                    <Text>{loc.name}</Text>
                  </Group>
                  <Group gap={4}>
                    <ActionIcon
                      variant="subtle"
                      onClick={() => {
                        setEditingId(loc.id)
                        setEditName(loc.name)
                        setEditIcon(loc.icon)
                        setLocError(null)
                      }}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleDeleteLocation(loc.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              )}
            </div>
          ))}

          {addingLocation && (
            <Group>
              <TextInput
                placeholder="Namn, t.ex. Hallkylskåp"
                value={newLocName}
                onChange={(e) => setNewLocName(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Select
                data={ICON_OPTIONS}
                value={newLocIcon}
                onChange={(v) => setNewLocIcon((v as LocationIcon) ?? 'fridge')}
                w={120}
              />
              <Button size="xs" onClick={handleAddLocation} disabled={!newLocName.trim()}>
                Lägg till
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => {
                  setAddingLocation(false)
                  setNewLocName('')
                }}
              >
                Avbryt
              </Button>
            </Group>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
