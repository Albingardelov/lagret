import { useEffect } from 'react'
import { AppShell, UnstyledButton, Stack, Text, ActionIcon, Group } from '@mantine/core'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { IconBox, IconBook2, IconShoppingCart, IconHome, IconLogout } from '@tabler/icons-react'
import { useAuthStore } from '../store/authStore'
import { useHouseholdStore } from '../store/householdStore'
import { OfflineBanner } from './OfflineBanner'
import { useExpiryNotifications } from '../hooks/useExpiryNotifications'

const NAV_ITEMS = [
  { path: '/', label: 'Lager', icon: IconBox },
  { path: '/recipes', label: 'Recept', icon: IconBook2 },
  { path: '/shopping', label: 'Inköp', icon: IconShoppingCart },
  { path: '/household', label: 'Hushåll', icon: IconHome },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const signOut = useAuthStore((s) => s.signOut)
  const fetchHousehold = useHouseholdStore((s) => s.fetchHousehold)
  useExpiryNotifications()

  useEffect(() => {
    fetchHousehold()
  }, [fetchHousehold])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell footer={{ height: 64 }} header={{ height: 48 }} padding="md">
      <AppShell.Header px="md">
        <Group h="100%" justify="flex-end">
          <ActionIcon variant="subtle" onClick={handleSignOut} aria-label="Logga ut">
            <IconLogout size={18} />
          </ActionIcon>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
        <OfflineBanner />
      </AppShell.Main>
      <AppShell.Footer>
        <Stack
          gap={0}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${NAV_ITEMS.length}, 1fr)`,
            height: '100%',
          }}
        >
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = path === '/' ? pathname === '/' : pathname.startsWith(path)
            return (
              <UnstyledButton
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  color: active ? 'var(--mantine-color-coral-6)' : 'var(--mantine-color-dimmed)',
                  position: 'relative',
                }}
              >
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'var(--mantine-color-coral-0)',
                    }}
                  />
                )}
                <Icon size={22} stroke={active ? 2 : 1.5} style={{ position: 'relative' }} />
                <Text size="xs" fw={active ? 700 : 400} style={{ position: 'relative' }}>
                  {label}
                </Text>
              </UnstyledButton>
            )
          })}
        </Stack>
      </AppShell.Footer>
    </AppShell>
  )
}
