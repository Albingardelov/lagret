import { useState, useEffect } from 'react'
import {
  Stack,
  Text,
  TextInput,
  Button,
  Group,
  Loader,
  Center,
  Divider,
  CopyButton,
  ActionIcon,
  Tooltip,
  Alert,
  Select,
  Box,
  UnstyledButton,
} from '@mantine/core'
import { BottomSheet } from '../components/BottomSheet'
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
  IconChevronRight,
  IconLogout,
  IconUsers,
} from '@tabler/icons-react'
import { useHouseholdStore } from '../store/householdStore'
import { useLocationsStore } from '../store/locationsStore'
import { useErrorNotification } from '../hooks/useErrorNotification'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import type { LocationIcon, HouseholdMember } from '../types'

const BG = '#F7F2EB'
const TERRA = '#B5432A'
const CARD_BG = '#FFFFFF'

const ICON_MAP: Record<LocationIcon, React.ReactNode> = {
  pantry: <IconBox size={16} />,
  fridge: <IconFridge size={16} />,
  freezer: <IconSnowflake size={16} />,
}

const ICON_COLORS: Record<LocationIcon, { bg: string; color: string }> = {
  fridge: { bg: '#EBF3FB', color: '#2A80C4' },
  freezer: { bg: '#EBF3FB', color: '#1A60A4' },
  pantry: { bg: '#FBF0E8', color: '#A05025' },
}

const ICON_OPTIONS = [
  { value: 'pantry', label: 'Skafferi' },
  { value: 'fridge', label: 'Kylskåp' },
  { value: 'freezer', label: 'Frys' },
]

export function HouseholdPage() {
  const {
    households,
    household,
    members,
    loading,
    error,
    setActiveHousehold,
    createHousehold,
    joinHousehold,
  } = useHouseholdStore()
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
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()

  useErrorNotification(error, 'Hushållsfel')

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

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <Center h="100%">
        <Loader color="terra" />
      </Center>
    )
  }

  if (!household) {
    return (
      <Stack p="md" gap="md" style={{ background: BG, minHeight: '100%' }}>
        <Box pt="sm">
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: TERRA,
              marginBottom: 6,
            }}
          >
            Kom igång
          </Text>
          <Text
            style={{
              fontFamily: '"Epilogue", sans-serif',
              fontWeight: 900,
              fontSize: 28,
              color: '#1C1410',
            }}
          >
            Mitt Hushåll
          </Text>
        </Box>

        <Box
          style={{
            background: CARD_BG,
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
          }}
        >
          <Stack>
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 15,
                fontWeight: 700,
                color: '#1C1410',
              }}
            >
              Skapa ett hushåll
            </Text>
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
              style={{ background: TERRA }}
            >
              Skapa
            </Button>
          </Stack>
        </Box>

        <Divider label="eller" labelPosition="center" color="#D0C4B8" />

        <Box
          style={{
            background: CARD_BG,
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
          }}
        >
          <Stack>
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 15,
                fontWeight: 700,
                color: '#1C1410',
              }}
            >
              Gå med i ett hushåll
            </Text>
            <TextInput
              placeholder="Inbjudningskod (8 tecken)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.currentTarget.value)}
            />
            <Button
              leftSection={<IconDoor size={16} />}
              variant="outline"
              disabled={inviteCode.length !== 8}
              loading={loading}
              onClick={() => joinHousehold(inviteCode)}
              color="terra"
            >
              Gå med
            </Button>
          </Stack>
        </Box>
      </Stack>
    )
  }

  return (
    <Stack gap={0} style={{ background: BG, minHeight: '100%', paddingBottom: 80 }}>
      {/* Hero header */}
      <Box px="md" pt="lg" pb="md">
        <Text
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: TERRA,
            marginBottom: 6,
          }}
        >
          Hantera ditt hem
        </Text>
        <Text
          style={{
            fontFamily: '"Epilogue", sans-serif',
            fontWeight: 900,
            fontSize: 28,
            color: '#1C1410',
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
          }}
        >
          Mitt Hushåll
        </Text>
        <Text
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 13,
            color: '#7A6A5A',
            marginTop: 6,
          }}
        >
          Organisera dina lagringsutrymmen och bjud in familjemedlemmar.
        </Text>
      </Box>

      {/* Mina hushåll */}
      {households.length > 1 && (
        <Box px="md" mb="md">
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#7A6A5A',
              marginBottom: 10,
            }}
          >
            Mina hushåll
          </Text>
          <Stack gap={8}>
            {households.map((hh) => {
              const isActive = hh.id === household?.id
              return (
                <UnstyledButton
                  key={hh.id}
                  onClick={() => !isActive && setActiveHousehold(hh.id)}
                  style={{
                    background: CARD_BG,
                    borderRadius: 14,
                    padding: '14px 16px',
                    boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
                    border: isActive ? `2px solid ${TERRA}` : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: isActive ? 'default' : 'pointer',
                  }}
                >
                  <Box>
                    <Text
                      style={{
                        fontFamily: '"Manrope", sans-serif',
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#1C1410',
                      }}
                    >
                      {hh.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: '#9A8A7A',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {hh.inviteCode}
                    </Text>
                  </Box>
                  {isActive && (
                    <Box
                      style={{
                        background: TERRA,
                        borderRadius: 20,
                        padding: '3px 10px',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: '"Manrope", sans-serif',
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#fff',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Aktivt
                      </Text>
                    </Box>
                  )}
                </UnstyledButton>
              )
            })}
          </Stack>
        </Box>
      )}

      {/* Aktivt hushåll — terraröd hero-kort */}
      <Box
        mx="md"
        mb="md"
        style={{
          background: TERRA,
          borderRadius: 18,
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <Text
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.7)',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Aktivt hushåll
        </Text>
        <Text
          style={{
            fontFamily: '"Epilogue", sans-serif',
            fontWeight: 800,
            fontSize: 22,
            color: '#FFFFFF',
            marginBottom: 12,
          }}
        >
          {household?.name}
        </Text>
        <Group gap="xs" align="center">
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 12,
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            Inbjudningskod:
          </Text>
          <Text
            style={{
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '0.1em',
            }}
          >
            {household?.inviteCode}
          </Text>
          <CopyButton value={household?.inviteCode ?? ''} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Kopierat!' : 'Kopiera'} withArrow>
                <ActionIcon
                  variant="filled"
                  onClick={copy}
                  size="sm"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', borderRadius: 6 }}
                >
                  {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      </Box>

      {/* Medlemmar */}
      <Box px="md" mb="md">
        <Group gap={6} mb={10} align="center">
          <IconUsers size={14} color="#7A6A5A" />
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#7A6A5A',
            }}
          >
            Medlemmar
          </Text>
        </Group>
        <Stack gap={6}>
          {members.map((m: HouseholdMember) => (
            <Box
              key={m.userId}
              style={{
                background: CARD_BG,
                borderRadius: 12,
                padding: '10px 14px',
                boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
              }}
            >
              <Text
                style={{
                  fontFamily: '"Manrope", sans-serif',
                  fontSize: 13,
                  color: '#1C1410',
                }}
              >
                {m.email}
              </Text>
            </Box>
          ))}
          {members.length === 0 && (
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 13,
                color: '#9A8A7A',
                textAlign: 'center',
                padding: '8px 0',
              }}
            >
              Inga medlemmar hittades
            </Text>
          )}
        </Stack>
      </Box>

      {/* Storage locations */}
      <Box px="md" mb="md">
        <Group justify="space-between" mb={10}>
          <Text
            style={{
              fontFamily: '"Manrope", sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#7A6A5A',
            }}
          >
            Dina behållare
          </Text>
          <UnstyledButton
            onClick={() => {
              setAddingLocation(true)
              setLocError(null)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <IconPlus size={14} color={TERRA} />
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 13,
                fontWeight: 600,
                color: TERRA,
              }}
            >
              Lägg till behållare
            </Text>
          </UnstyledButton>
        </Group>

        {locError && (
          <Alert color="red" mb="sm">
            {locError}
          </Alert>
        )}

        <Stack gap={6}>
          {locations.map((loc) => {
            const iconColors = ICON_COLORS[loc.icon] ?? { bg: '#F0EEE8', color: '#7A6A5A' }
            return (
              <Box
                key={loc.id}
                style={{
                  background: CARD_BG,
                  borderRadius: 14,
                  padding: '14px 16px',
                  boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={12} wrap="nowrap">
                    <Box
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: iconColors.bg,
                        color: iconColors.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {ICON_MAP[loc.icon]}
                    </Box>
                    <Box>
                      <Text
                        style={{
                          fontFamily: '"Manrope", sans-serif',
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#1C1410',
                          lineHeight: 1.3,
                        }}
                      >
                        {loc.name}
                      </Text>
                    </Box>
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      size={32}
                      style={{ color: '#7A6A5A' }}
                      onClick={() => {
                        setEditingId(loc.id)
                        setEditName(loc.name)
                        setEditIcon(loc.icon)
                        setLocError(null)
                      }}
                    >
                      <IconEdit size={15} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      size={32}
                      style={{ color: '#C42A2A' }}
                      onClick={() => handleDeleteLocation(loc.id)}
                    >
                      <IconTrash size={15} />
                    </ActionIcon>
                    <IconChevronRight size={16} color="#C8B8A8" />
                  </Group>
                </Group>
              </Box>
            )
          })}

          {locations.length === 0 && (
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 13,
                color: '#9A8A7A',
                textAlign: 'center',
                padding: '16px 0',
              }}
            >
              Inga förvaringsplatser än
            </Text>
          )}
        </Stack>
      </Box>

      {/* Settings section */}
      <Box px="md">
        <Text
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#7A6A5A',
            marginBottom: 10,
          }}
        >
          Inställningar
        </Text>
        <Box
          style={{
            background: CARD_BG,
            borderRadius: 14,
            boxShadow: '0 1px 4px rgba(74,55,40,0.07)',
            overflow: 'hidden',
          }}
        >
          <UnstyledButton
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Box
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: '#FEE2E2',
                color: '#C42A2A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconLogout size={16} />
            </Box>
            <Text
              style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 14,
                fontWeight: 600,
                color: '#C42A2A',
              }}
            >
              Logga ut
            </Text>
          </UnstyledButton>
        </Box>
      </Box>

      {/* Add location bottom sheet */}
      <BottomSheet
        opened={addingLocation}
        onClose={() => {
          setAddingLocation(false)
          setNewLocName('')
          setLocError(null)
        }}
        title="Ny förvaringsplats"
      >
        <Stack>
          <TextInput
            label="Namn"
            placeholder="T.ex. Hallkylskåp"
            value={newLocName}
            onChange={(e) => setNewLocName(e.currentTarget.value)}
          />
          <Select
            label="Typ"
            data={ICON_OPTIONS}
            value={newLocIcon}
            onChange={(v) => setNewLocIcon((v as LocationIcon) ?? 'fridge')}
          />
          {locError && (
            <Alert color="red" title="Fel">
              {locError}
            </Alert>
          )}
          <Button onClick={handleAddLocation} disabled={!newLocName.trim()} fullWidth>
            Lägg till
          </Button>
        </Stack>
      </BottomSheet>

      {/* Edit location bottom sheet */}
      <BottomSheet
        opened={editingId !== null}
        onClose={() => {
          setEditingId(null)
          setLocError(null)
        }}
        title="Redigera förvaringsplats"
      >
        <Stack>
          <TextInput
            label="Namn"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
          />
          <Select
            label="Typ"
            data={ICON_OPTIONS}
            value={editIcon}
            onChange={(v) => setEditIcon((v as LocationIcon) ?? 'fridge')}
          />
          {locError && (
            <Alert color="red" title="Fel">
              {locError}
            </Alert>
          )}
          <Button onClick={() => editingId && handleUpdateLocation(editingId)} fullWidth>
            Spara
          </Button>
        </Stack>
      </BottomSheet>
    </Stack>
  )
}
