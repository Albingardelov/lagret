import { useEffect, useState } from 'react'
import {
  Stack,
  Text,
  TextInput,
  Button,
  Paper,
  Group,
  CopyButton,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Divider,
} from '@mantine/core'
import { IconCopy, IconCheck, IconPlus, IconDoor } from '@tabler/icons-react'
import { useHouseholdStore } from '../store/householdStore'
import { useErrorNotification } from '../hooks/useErrorNotification'

export function HouseholdPage() {
  const { household, loading, error, fetchHousehold, createHousehold, joinHousehold } =
    useHouseholdStore()
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  useErrorNotification(error, 'Hushållsfel')

  useEffect(() => {
    fetchHousehold()
  }, [fetchHousehold])

  if (loading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    )
  }

  if (household) {
    return (
      <Stack gap="md">
        <Text size="xl" fw={700}>
          Hushåll
        </Text>
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text fw={600}>{household.name}</Text>
            <Text size="sm" c="dimmed">
              Inbjudningskod
            </Text>
            <Group>
              <Text fw={700} size="lg" ff="monospace">
                {household.inviteCode}
              </Text>
              <CopyButton value={household.inviteCode} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Kopierat!' : 'Kopiera kod'}>
                    <ActionIcon
                      color={copied ? 'teal' : 'gray'}
                      variant="subtle"
                      onClick={copy}
                      aria-label="Kopiera inbjudningskod"
                    >
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
            <Text size="xs" c="dimmed">
              Dela koden med din sambo så kan de gå med i hushållet.
            </Text>
          </Stack>
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack gap="md">
      <Text size="xl" fw={700}>
        Hushåll
      </Text>

      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Text fw={600}>Skapa nytt hushåll</Text>
          <TextInput
            placeholder="Hushållets namn"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => createHousehold(newName.trim())}
            disabled={!newName.trim()}
            loading={loading}
          >
            Skapa hushåll
          </Button>
        </Stack>
      </Paper>

      <Divider label="eller" labelPosition="center" />

      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Text fw={600}>Gå med i ett hushåll</Text>
          <TextInput
            placeholder="Inbjudningskod (8 tecken)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.currentTarget.value)}
          />
          <Button
            leftSection={<IconDoor size={16} />}
            variant="default"
            onClick={() => joinHousehold(joinCode)}
            disabled={joinCode.trim().length !== 8}
            loading={loading}
          >
            Gå med
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
