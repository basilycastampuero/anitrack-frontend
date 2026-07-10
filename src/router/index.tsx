import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { paths } from '@/router/paths'
import { env } from '@/lib/env'

// Lazy loading por ruta (doc 06/07): cada página es su propio chunk.
const HomePage = lazy(() => import('@/pages/HomePage'))
const CatalogPage = lazy(() => import('@/pages/CatalogPage'))
const FranchiseDetailPage = lazy(() => import('@/pages/FranchiseDetailPage'))
const ContentDetailPage = lazy(() => import('@/pages/ContentDetailPage'))
const SearchPage = lazy(() => import('@/pages/SearchPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'))
const MyListsPage = lazy(() => import('@/pages/MyListsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const PublicListPage = lazy(() => import('@/pages/PublicListPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const DevUiPage = lazy(() => import('@/pages/DevUiPage'))

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: paths.home, element: <HomePage /> },
      { path: paths.catalog, element: <CatalogPage /> },
      { path: paths.franchise, element: <FranchiseDetailPage /> },
      { path: paths.content, element: <ContentDetailPage /> },
      { path: paths.search, element: <SearchPage /> },
      { path: paths.login, element: <LoginPage /> },
      { path: paths.register, element: <RegisterPage /> },
      { path: paths.authCallback, element: <AuthCallbackPage /> },
      { path: paths.profile, element: <ProfilePage /> },
      { path: paths.publicList, element: <PublicListPage /> },
      // Rutas privadas detrás del guard de sesión.
      {
        element: <RequireAuth />,
        children: [
          { path: paths.myLists, element: <MyListsPage /> },
          { path: paths.myList, element: <MyListsPage /> },
          { path: paths.settings, element: <SettingsPage /> },
        ],
      },
      // Galería del design system, solo en desarrollo.
      ...(env.isDev ? [{ path: paths.devUi, element: <DevUiPage /> }] : []),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
