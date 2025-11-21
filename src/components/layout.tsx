import { Link, useLocation } from 'react-router-dom'
import { Calendar, Plus, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import logo from '@/assets/vlzm-logo.png'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { signOut, profile, isManager } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  const navItems = [
    { path: '/events', label: 'Events', icon: Calendar },
    ...(isManager ? [{ path: '/events/create', label: 'Create', icon: Plus }] : []),
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top navigation bar */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/events" className="flex items-center gap-2">
              <img src={logo} alt="Volei Misto" className="h-10 w-auto" />
            </Link>
            
            <div className="flex items-center gap-4">
              {profile && (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-sm text-muted-foreground">
                    {profile.surname}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isManager ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    {profile.role}
                  </span>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                location.pathname === item.path
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground"
          >
            <LogOut className="h-6 w-6" />
            <span className="text-xs mt-1">Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
