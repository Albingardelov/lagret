import { useEffect } from 'react'
import { AppShell, UnstyledButton, Text, ActionIcon, Group } from '@mantine/core'
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
    <AppShell footer={{ height: 72 }} header={{ height: 56 }} padding={0}>
      <AppShell.Header
        px="lg"
        style={{
          background: '#f8fbee',
          boxShadow: '0 1px 16px rgba(25, 29, 22, 0.05)',
        }}
      >
        <Group h="100%" justify="space-between">
          <Text
            style={{
              fontFamily: '"Epilogue", sans-serif',
              fontWeight: 900,
              fontSize: 22,
              color: '#53642e',
              letterSpacing: '-0.5px',
              lineHeight: 1,
            }}
          >
            Lagret
          </Text>
          <ActionIcon
            variant="subtle"
            color="sage"
            onClick={handleSignOut}
            aria-label="Logga ut"
            size="lg"
          >
            <IconLogout size={18} />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
        <OfflineBanner />
      </AppShell.Main>

      <AppShell.Footer
        style={{
          background: 'rgba(248, 251, 238, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 -4px 32px rgba(25, 29, 22, 0.08)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${NAV_ITEMS.length}, 1fr)`,
            height: '100%',
            padding: '8px 8px 4px',
            gap: 4,
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
                  gap: 3,
                  borderRadius: 18,
                  background: active ? '#53642e' : 'transparent',
                  color: active ? '#ffffff' : '#7a8a6a',
                  transition: 'background 0.18s ease, color 0.18s ease',
                  padding: '6px 0',
                }}
              >
                <Icon size={20} stroke={active ? 2 : 1.5} />
                <Text
                  style={{
                    fontFamily: '"Manrope", sans-serif',
                    fontSize: 9,
                    fontWeight: active ? 600 : 400,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  {label}
                </Text>
              </UnstyledButton>
            )
          })}
        </div>
      </AppShell.Footer>
    </AppShell>
  )
}
