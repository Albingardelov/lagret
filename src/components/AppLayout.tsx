import { useEffect } from 'react'
import { AppShell, UnstyledButton, Text, Box, Group } from '@mantine/core'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  IconBox,
  IconBook2,
  IconShoppingCart,
  IconHome,
  IconMenu2,
  IconScan,
} from '@tabler/icons-react'
import { useHouseholdStore } from '../store/householdStore'
import { useLocationsStore } from '../store/locationsStore'
import { OfflineBanner } from './OfflineBanner'
import { useExpiryNotifications } from '../hooks/useExpiryNotifications'

const NAV_ITEMS = [
  { path: '/', label: 'Lagret', icon: IconBox },
  { path: '/recipes', label: 'Recept', icon: IconBook2 },
  { path: '/shopping', label: 'Inköp', icon: IconShoppingCart },
  { path: '/household', label: 'Hushåll', icon: IconHome },
]

const BG = '#F7F2EB'
const TERRA = '#B5432A'

export function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const fetchHousehold = useHouseholdStore((s) => s.fetchHousehold)
  const household = useHouseholdStore((s) => s.household)
  const fetchLocations = useLocationsStore((s) => s.fetchLocations)
  useExpiryNotifications()

  useEffect(() => {
    fetchHousehold()
  }, [fetchHousehold])

  useEffect(() => {
    if (household) fetchLocations()
  }, [household, fetchLocations])

  return (
    <AppShell
      footer={{ height: 68 }}
      header={{ height: 52 }}
      padding={0}
      styles={{ main: { background: BG } }}
    >
      <AppShell.Header
        style={{
          background: BG,
          borderBottom: '1px solid rgba(180,160,140,0.18)',
          boxShadow: 'none',
        }}
      >
        <Group h="100%" px="md" justify="space-between" align="center">
          <UnstyledButton aria-label="Meny" style={{ color: '#4A3728', display: 'flex' }}>
            <IconMenu2 size={22} stroke={1.8} />
          </UnstyledButton>

          <Text
            style={{
              fontFamily: '"Epilogue", sans-serif',
              fontWeight: 900,
              fontSize: 22,
              color: TERRA,
              letterSpacing: '-0.4px',
              lineHeight: 1,
            }}
          >
            Lagret
          </Text>

          <UnstyledButton aria-label="Skanna" style={{ color: '#4A3728', display: 'flex' }}>
            <IconScan size={22} stroke={1.8} />
          </UnstyledButton>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
        <OfflineBanner />
      </AppShell.Main>

      <AppShell.Footer
        style={{
          background: 'rgba(247,242,235,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(180,160,140,0.2)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${NAV_ITEMS.length}, 1fr)`,
            height: '100%',
            padding: '6px 4px 4px',
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
                  padding: '4px 0',
                  position: 'relative',
                }}
              >
                <Box
                  style={{
                    width: 40,
                    height: 32,
                    borderRadius: 10,
                    background: active ? 'rgba(181,67,42,0.1)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <Icon size={20} stroke={active ? 2 : 1.6} color={active ? TERRA : '#6B5D52'} />
                </Box>
                <Text
                  style={{
                    fontFamily: '"Manrope", sans-serif',
                    fontSize: 10,
                    fontWeight: active ? 700 : 500,
                    letterSpacing: '0.03em',
                    color: active ? TERRA : '#6B5D52',
                    lineHeight: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </Text>
                {active && (
                  <Box
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: TERRA,
                    }}
                  />
                )}
              </UnstyledButton>
            )
          })}
        </div>
      </AppShell.Footer>
    </AppShell>
  )
}
