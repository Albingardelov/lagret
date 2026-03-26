import { createBrowserRouter } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AppLayout } from './components/AppLayout'
import { PageLoader } from './components/PageLoader'
import { NotFoundPage } from './pages/NotFoundPage'

const InventoryPage = lazy(() =>
  import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage }))
)
const RecipesPage = lazy(() =>
  import('./pages/RecipesPage').then((m) => ({ default: m.RecipesPage }))
)
const ShoppingListPage = lazy(() =>
  import('./pages/ShoppingListPage').then((m) => ({ default: m.ShoppingListPage }))
)
const HouseholdPage = lazy(() =>
  import('./pages/HouseholdPage').then((m) => ({ default: m.HouseholdPage }))
)

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <InventoryPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'recipes',
        element: (
          <SuspenseWrapper>
            <RecipesPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'shopping',
        element: (
          <SuspenseWrapper>
            <ShoppingListPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'household',
        element: (
          <SuspenseWrapper>
            <HouseholdPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
