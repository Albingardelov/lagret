import { createBrowserRouter } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AppLayout } from './components/AppLayout'
import { AuthGuard } from './components/AuthGuard'
import { PageLoader } from './components/PageLoader'
import { NotFoundPage } from './pages/NotFoundPage'
import { LoginPage } from './pages/LoginPage'

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
const MealPlanPage = lazy(() =>
  import('./pages/MealPlanPage').then((m) => ({ default: m.MealPlanPage }))
)

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
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
        path: 'meal-plan',
        element: (
          <SuspenseWrapper>
            <MealPlanPage />
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
