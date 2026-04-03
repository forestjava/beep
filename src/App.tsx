import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import DesktopPage from './DesktopPage'
import MobileBeep from './MobileBeep'

const router = createBrowserRouter([
  { path: '/', element: <MobileBeep /> },
  { path: '/desktop', element: <DesktopPage /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
