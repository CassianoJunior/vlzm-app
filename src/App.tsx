import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/auth-context'
import { ProtectedRoute, ManagerRoute, PublicRoute } from '@/components/protected-route'

// Pages
import SignIn from '@/pages/sign-in'
import SignUp from '@/pages/sign-up'
import Events from '@/pages/events'
import CreateEvent from '@/pages/create-event'
import UpdateEvent from '@/pages/update-event'
import EventCheckIn from '@/pages/event-check-in'
import EventMatches from '@/pages/event-matches'
import Players from '@/pages/players'
import Profile from '@/pages/profile'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicRoute />}>
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/events" element={<Events />} />
              <Route path="/events/:eventId/check-in" element={<EventCheckIn />} />
              <Route path="/events/:eventId/matches" element={<EventMatches />} />
              <Route path="/profile" element={<Profile />} />
              
              {/* Manager-only routes */}
              <Route element={<ManagerRoute />}>
                <Route path="/events/create" element={<CreateEvent />} />
                <Route path="/events/:eventId/edit" element={<UpdateEvent />} />
                <Route path="/players" element={<Players />} />
              </Route>
            </Route>

            {/* Redirect root to events */}
            <Route path="/" element={<Navigate to="/events" replace />} />
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/events" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
