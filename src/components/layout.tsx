import { Link, useLocation } from 'react-router-dom'
import { Calendar, Plus, LogOut, Users } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import logo from '@/assets/vlzm-logo.png'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from './ui/badge'

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
    ...(isManager ? [
      { path: '/events/create', label: 'Create', icon: Plus },
      { path: '/players', label: 'Players', icon: Users },
    ] : []),
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
                  <Badge className={`px-2 py-0.5 rounded-full text-xs font-medium ${isManager ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>
                    {profile.role}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-offset-2">
                        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">{profile.surname?.[0]?.toUpperCase() || 'U'}</div>
                        <div className="hidden sm:flex flex-col leading-none">
                          <span className="text-sm text-foreground">{profile.surname}</span>
                        </div>
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent sideOffset={8} align="end">
                      <DropdownMenuItem>
                        <Link to="/profile" className="w-full">My Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
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
