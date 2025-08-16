'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  Bell, 
  Settings, 
  HelpCircle, 
  Plus,
  CloudUpload,
  FileText,
  Video,
  MessageSquare,
  User,
  LogOut,
  Crown,
  Users,
  Building2
} from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'

interface Team {
  id: string
  name: string
  role: string
  memberCount: number
}

interface HeaderProps {
  title?: string
  actions?: React.ReactNode
}

export function Header({ title, actions }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const teamsData = await response.json()
        setTeams(teamsData)
        
        // Set current team (first one or from localStorage)
        const savedTeamId = localStorage.getItem('currentTeamId')
        const teamToSet = savedTeamId 
          ? teamsData.find((t: Team) => t.id === savedTeamId) || teamsData[0]
          : teamsData[0]
        
        setCurrentTeam(teamToSet || null)
        if (teamToSet) {
          localStorage.setItem('currentTeamId', teamToSet.id)
        }
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
  }

  const handleTeamChange = (team: Team) => {
    setCurrentTeam(team)
    localStorage.setItem('currentTeamId', team.id)
    // Refresh the current page to load data for the new team
    router.refresh()
  }

  const handleSignOut = () => {
    localStorage.removeItem('currentTeamId')
    signOut({ callbackUrl: '/' })
  }

  useEffect(() => {
    if (session) {
      fetchTeams()
    }
  }, [session])

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex flex-1 items-center justify-between">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            {title && (
              <h1 className="text-xl font-semibold">{title}</h1>
            )}
            
            {/* Team switcher */}
            {session && teams.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-8">
                    <Building2 className="h-4 w-4 mr-2" />
                    {currentTeam?.name || 'Select Team'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Teams</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => handleTeamChange(team)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <span>{team.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {team.role}
                        </Badge>
                      </div>
                      {currentTeam?.id === team.id && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/teams')}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Manage Teams</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Search bar */}
            <div className="hidden md:flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {session ? (
              <>
                {/* Quick actions */}
                <div className="hidden md:flex items-center space-x-1">
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                  <Button variant="ghost" size="sm">
                    <CloudUpload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>

                {/* Notifications */}
                {session.user?.id && (
                  <NotificationBell userId={session.user.id} />
                )}

                {/* Help */}
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-4 w-4" />
                </Button>

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user.image || ''} />
                        <AvatarFallback>
                          {session.user.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session.user.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session.user.email}
                        </p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {session.user.plan?.toUpperCase() || 'FREE'}
                          </Badge>
                          {session.user.plan === 'PRO' && (
                            <Crown className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    {currentTeam && (
                      <DropdownMenuItem onClick={() => router.push(`/teams/${currentTeam.id}/settings`)}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Team Settings</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => router.push('/billing')}>
                      <Crown className="mr-2 h-4 w-4" />
                      <span>Billing</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Sign in/up buttons */}
                <Button variant="ghost" onClick={() => router.push('/auth/signin')}>
                  Sign In
                </Button>
                <Button onClick={() => router.push('/auth/signup')}>
                  Sign Up
                </Button>
              </>
            )}

            {/* Custom actions */}
            {actions}
          </div>
        </div>
      </div>
    </header>
  )
}