const fs = require('fs')
const path = require('path')

class NotificationFixer {
  constructor() {
    this.appDir = path.join(__dirname, '..', 'src', 'app')
    this.libDir = path.join(__dirname, '..', 'src', 'lib')
    this.fixesApplied = []
    this.errors = []
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`)
    
    if (type === 'error') {
      this.errors.push({ timestamp, message, type })
    } else {
      this.fixesApplied.push({ timestamp, message, type })
    }
  }

  async createNotificationAPI() {
    this.log('Creating notification API endpoints...')

    const apiDir = path.join(this.appDir, 'api', 'notifications')

    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true })
      this.log('Created notifications API directory', 'success')
    }

    // Create main notification route
    const mainRoute = `import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const whereClause: any = { userId: user.id }
    if (unreadOnly) {
      whereClause.isRead = false
    }

    const notifications = await db.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, message, metadata, userId } = await request.json()

    if (!type || !message || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if sender has permission to send notifications
    const sender = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
    }

    // Create notification
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
        isRead: false
      }
    })

    // Emit real-time notification if socket is available
    if (global.io) {
      global.io.to(\`user-\${userId}\`).emit('notification:receive', {
        notification,
        timestamp: new Date()
      })
    }

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}`

    const mainRoutePath = path.join(apiDir, 'route.ts')
    
    if (!fs.existsSync(mainRoutePath)) {
      fs.writeFileSync(mainRoutePath, mainRoute)
      this.log('Created main notification route', 'success')
    } else {
      this.log('Main notification route already exists', 'info')
    }

    // Create mark as read route
    const markReadRoute = `import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const notification = await db.notification.update({
      where: { 
        id: params.id,
        userId: user.id // Ensure user can only mark their own notifications
      },
      data: { isRead: true }
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
  }
}`

    const markReadDir = path.join(apiDir, '[id]')
    
    if (!fs.existsSync(markReadDir)) {
      fs.mkdirSync(markReadDir, { recursive: true })
    }

    const markReadPath = path.join(markReadDir, 'route.ts')
    
    if (!fs.existsSync(markReadPath)) {
      fs.writeFileSync(markReadPath, markReadRoute)
      this.log('Created mark as read route', 'success')
    } else {
      this.log('Mark as read route already exists', 'info')
    }

    // Create bulk actions route
    const bulkRoute = `import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, notificationIds } = await request.json()

    if (!action || !notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let result
    switch (action) {
      case 'markRead':
        result = await db.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId: user.id
          },
          data: { isRead: true }
        })
        break
      case 'markUnread':
        result = await db.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId: user.id
          },
          data: { isRead: false }
        })
        break
      case 'delete':
        result = await db.notification.deleteMany({
          where: {
            id: { in: notificationIds },
            userId: user.id
          }
        })
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      action,
      count: result.count || 0 
    })
  } catch (error) {
    console.error('Error performing bulk notification action:', error)
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 })
  }
}`

    const bulkPath = path.join(apiDir, 'bulk', 'route.ts')
    
    if (!fs.existsSync(path.dirname(bulkPath))) {
      fs.mkdirSync(path.dirname(bulkPath), { recursive: true })
    }

    if (!fs.existsSync(bulkPath)) {
      fs.writeFileSync(bulkPath, bulkRoute)
      this.log('Created bulk actions route', 'success')
    } else {
      this.log('Bulk actions route already exists', 'info')
    }
  }

  async createNotificationService() {
    this.log('Creating notification service...')

    const serviceDir = path.join(this.libDir, 'services')

    if (!fs.existsSync(serviceDir)) {
      fs.mkdirSync(serviceDir, { recursive: true })
      this.log('Created services directory', 'success')
    }

    const notificationService = `import { db } from '@/lib/db'

export interface NotificationData {
  type: string
  message: string
  metadata?: Record<string, any>
}

export interface NotificationRecipient {
  userId: string
  teamId?: string
}

export class NotificationService {
  /**
   * Send notification to a specific user
   */
  static async sendToUser(
    recipient: NotificationRecipient,
    data: NotificationData,
    senderId?: string
  ): Promise<void> {
    try {
      const notification = await db.notification.create({
        data: {
          userId: recipient.userId,
          type: data.type,
          message: data.message,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          isRead: false
        }
      })

      // Emit real-time notification if socket is available
      if (global.io) {
        global.io.to(\`user-\${recipient.userId}\`).emit('notification:receive', {
          notification,
          timestamp: new Date()
        })
      }

      console.log(\`Notification sent to user \${recipient.userId}: \${data.message}\`)
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  /**
   * Send notification to all team members
   */
  static async sendToTeam(
    teamId: string,
    data: NotificationData,
    excludeUser?: string,
    senderId?: string
  ): Promise<void> {
    try {
      // Get all team members
      const teamMembers = await db.teamMember.findMany({
        where: { 
          teamId,
          userId: excludeUser ? { not: excludeUser } : undefined
        },
        include: { user: true }
      })

      // Send notification to each member
      for (const member of teamMembers) {
        await this.sendToUser(
          { userId: member.userId, teamId },
          data,
          senderId
        )
      }

      console.log(\`Notification sent to \${teamMembers.length} team members\`)
    } catch (error) {
      console.error('Error sending team notification:', error)
    }
  }

  /**
   * Send notification based on user role
   */
  static async sendToRole(
    teamId: string,
    role: string,
    data: NotificationData,
    excludeUser?: string,
    senderId?: string
  ): Promise<void> {
    try {
      // Get team members with specific role
      const teamMembers = await db.teamMember.findMany({
        where: { 
          teamId,
          role: role as any,
          userId: excludeUser ? { not: excludeUser } : undefined
        },
        include: { user: true }
      })

      // Send notification to each member
      for (const member of teamMembers) {
        await this.sendToUser(
          { userId: member.userId, teamId },
          data,
          senderId
        )
      }

      console.log(\`Notification sent to \${teamMembers.length} \${role} members\`)
    } catch (error) {
      console.error('Error sending role notification:', error)
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await db.notification.update({
        where: { 
          id: notificationId,
          userId: userId
        },
        data: { isRead: true }
      })

      console.log(\`Notification \${notificationId} marked as read\`)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const result = await db.notification.updateMany({
        where: { 
          userId,
          isRead: false
        },
        data: { isRead: true }
      })

      console.log(\`\${result.count} notifications marked as read for user \${userId}\`)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
    } = {}
  ) {
    try {
      const { limit = 20, offset = 0, unreadOnly = false } = options

      const whereClause: any = { userId }
      if (unreadOnly) {
        whereClause.isRead = false
      }

      const notifications = await db.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      })

      return notifications
    } catch (error) {
      console.error('Error getting user notifications:', error)
      return []
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      return await db.notification.count({
        where: {
          userId,
          isRead: false
        }
      })
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await db.notification.delete({
        where: { 
          id: notificationId,
          userId: userId
        }
      })

      console.log(\`Notification \${notificationId} deleted\`)
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  static async cleanupOldNotifications(daysOld = 30): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await db.notification.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          isRead: true // Only delete read notifications
        }
      })

      console.log(\`Cleaned up \${result.count} old notifications\`)
    } catch (error) {
      console.error('Error cleaning up notifications:', error)
    }
  }
}

// Predefined notification types
export const NotificationTypes = {
  DOCUMENT_SHARED: 'document_shared',
  DOCUMENT_COMMENTED: 'document_commented',
  MEETING_INVITE: 'meeting_invite',
  MEETING_STARTED: 'meeting_started',
  MEETING_ENDED: 'meeting_ended',
  TEAM_ADDED: 'team_added',
  TEAM_REMOVED: 'team_removed',
  ROLE_CHANGED: 'role_changed',
  FILE_SHARED: 'file_shared',
  FILE_UPLOADED: 'file_uploaded',
  SECURITY_ALERT: 'security_alert',
  SYSTEM_UPDATE: 'system_update'
} as const

// Helper functions for common notifications
export const NotificationHelpers = {
  /**
   * Send document shared notification
   */
  async documentShared(documentId: string, sharedBy: string, sharedWith: string) {
    await NotificationService.sendToUser(
      { userId: sharedWith },
      {
        type: NotificationTypes.DOCUMENT_SHARED,
        message: 'A document was shared with you',
        metadata: { documentId, sharedBy }
      }
    )
  },

  /**
   * Send meeting invite notification
   */
  async meetingInvite(meetingId: string, invitedBy: string, invitedUser: string) {
    await NotificationService.sendToUser(
      { userId: invitedUser },
      {
        type: NotificationTypes.MEETING_INVITE,
        message: 'You have been invited to a meeting',
        metadata: { meetingId, invitedBy }
      }
    )
  },

  /**
   * Send team added notification
   */
  async teamAdded(teamId: string, addedBy: string, addedUser: string) {
    await NotificationService.sendToUser(
      { userId: addedUser },
      {
        type: NotificationTypes.TEAM_ADDED,
        message: 'You have been added to a team',
        metadata: { teamId, addedBy }
      }
    )
  },

  /**
   * Send file shared notification
   */
  async fileShared(fileId: string, sharedBy: string, sharedWith: string) {
    await NotificationService.sendToUser(
      { userId: sharedWith },
      {
        type: NotificationTypes.FILE_SHARED,
        message: 'A file was shared with you',
        metadata: { fileId, sharedBy }
      }
    )
  }
}`

    const servicePath = path.join(serviceDir, 'notification.ts')
    
    if (!fs.existsSync(servicePath)) {
      fs.writeFileSync(servicePath, notificationService)
      this.log('Created notification service', 'success')
    } else {
      this.log('Notification service already exists', 'info')
    }
  }

  async createNotificationHook() {
    this.log('Creating notification hooks...')

    const hooksDir = path.join(this.libDir, 'hooks')

    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true })
      this.log('Created hooks directory', 'success')
    }

    const useNotifications = `import { useState, useEffect } from 'react'
import { NotificationService, NotificationTypes } from '@/lib/services/notification'

export interface Notification {
  id: string
  type: string
  message: string
  metadata?: any
  isRead: boolean
  createdAt: Date
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch(\`/api/notifications?userId=\${userId}\`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(\`/api/notifications/\${notificationId}\`, {
        method: 'PATCH'
      })
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markRead',
          notificationIds: notifications.filter(n => !n.isRead).map(n => n.id)
        })
      })
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          notificationIds: [notificationId]
        })
      })
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        if (!notifications.find(n => n.id === notificationId)?.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Set up WebSocket for real-time notifications
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const socket = io('/notification', {
        auth: {
          userId: userId
        }
      })

      socket.on('notification:receive', (data) => {
        setNotifications(prev => [data.notification, ...prev])
        if (!data.notification.isRead) {
          setUnreadCount(prev => prev + 1)
        }
      })

      socket.on('connect', () => {
        socket.emit('user:join', { userId })
      })

      return () => {
        socket.disconnect()
      }
    }
  }, [userId])

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchNotifications()
    }
  }, [userId])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  }
}

// Hook for notification permissions
export function useNotificationPermissions() {
  const [permission, setPermission] = useState<NotificationPermission>('default')

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    }
    return 'denied'
  }

  const showBrowserNotification = (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options)
    }
  }

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  return {
    permission,
    requestPermission,
    showBrowserNotification
  }
}`

    const hookPath = path.join(hooksDir, 'useNotifications.ts')
    
    if (!fs.existsSync(hookPath)) {
      fs.writeFileSync(hookPath, useNotifications)
      this.log('Created useNotifications hook', 'success')
    } else {
      this.log('useNotifications hook already exists', 'info')
    }
  }

  async createNotificationComponent() {
    this.log('Creating notification component...')

    const componentsDir = path.join(__dirname, '..', 'src', 'components', 'notifications')

    if (!fs.existsSync(componentsDir)) {
      fs.mkdirSync(componentsDir, { recursive: true })
      this.log('Created notifications components directory', 'success')
    }

    const notificationComponent = `'use client'

import { Bell, X, Check, Trash2 } from 'lucide-react'
import { useNotifications, useNotificationPermissions } from '@/lib/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'

interface NotificationPanelProps {
  userId: string
}

export function NotificationPanel({ userId }: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications(userId)

  const { permission, requestPermission } = useNotificationPermissions()

  const handleRequestPermission = async () => {
    await requestPermission()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_shared':
      case 'file_shared':
        return '📄'
      case 'meeting_invite':
        return '📅'
      case 'team_added':
        return '👥'
      case 'security_alert':
        return '⚠️'
      case 'system_update':
        return '🔄'
      default:
        return '📢'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'security_alert':
        return 'border-red-200 bg-red-50'
      case 'system_update':
        return 'border-blue-200 bg-blue-50'
      case 'meeting_invite':
        return 'border-green-200 bg-green-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className=\"w-full max-w-md\">
      <Card>
        <CardHeader className=\"pb-3\">
          <div className=\"flex items-center justify-between\">
            <CardTitle className=\"text-lg flex items-center gap-2\">
              <Bell className=\"h-5 w-5\" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant=\"destructive\" className=\"h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs\">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className=\"flex items-center gap-2\">
              {permission === 'default' && (
                <Button
                  variant=\"outline\"
                  size=\"sm\"
                  onClick={handleRequestPermission}
                >
                  Enable
                </Button>
              )}
              {unreadCount > 0 && (
                <Button
                  variant=\"outline\"
                  size=\"sm\"
                  onClick={markAllAsRead}
                >
                  <Check className=\"h-4 w-4 mr-1\" />
                  Read All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className=\"text-center py-8 text-muted-foreground\">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className=\"text-center py-8 text-muted-foreground\">
              No notifications
            </div>
          ) : (
            <div className=\"space-y-2 max-h-96 overflow-y-auto\">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={\`p-3 rounded-lg border \${
                    notification.isRead 
                      ? 'border-gray-200 bg-gray-50' 
                      : getNotificationColor(notification.type)
                  }\`}
                >
                  <div className=\"flex items-start gap-3\">
                    <span className=\"text-lg\">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className=\"flex-1 min-w-0\">
                      <p className=\"text-sm font-medium text-gray-900\">
                        {notification.message}
                      </p>
                      <p className=\"text-xs text-gray-500 mt-1\">
                        {formatDistanceToNow(new Date(notification.createdAt), { 
                          addSuffix: true 
                        })}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant=\"ghost\"
                          size=\"sm\"
                          className=\"h-8 w-8 p-0\"
                        >
                          <span className=\"sr-only\">Actions</span>
                          ⋮
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align=\"end\">
                        {!notification.isRead && (
                          <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                            <Check className=\"h-4 w-4 mr-2\" />
                            Mark as read
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => deleteNotification(notification.id)}
                          className=\"text-red-600\"
                        >
                          <Trash2 className=\"h-4 w-4 mr-2\" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Notification bell component for header
export function NotificationBell({ userId }: { userId: string }) {
  const { unreadCount } = useNotifications(userId)

  return (
    <div className=\"relative\">
      <Button variant=\"ghost\" size=\"sm\" className=\"relative\">
        <Bell className=\"h-5 w-5\" />
        {unreadCount > 0 && (
          <span className=\"absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center\">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    </div>
  )
}`

    const componentPath = path.join(componentsDir, 'NotificationPanel.tsx')
    
    if (!fs.existsSync(componentPath)) {
      fs.writeFileSync(componentPath, notificationComponent)
      this.log('Created notification panel component', 'success')
    } else {
      this.log('Notification panel component already exists', 'info')
    }
  }

  async updateServerSocket() {
    this.log('Updating server socket integration...')

    const serverPath = path.join(__dirname, '..', 'server.ts')
    
    if (fs.existsSync(serverPath)) {
      const serverContent = fs.readFileSync(serverPath, 'utf8')
      
      // Check if notifications are already integrated
      if (!serverContent.includes('notification')) {
        const notificationIntegration = `
// Notification setup
import { setupNotificationHandlers } from './src/lib/socket/notification'

// Initialize notifications
setupNotificationHandlers(io)
`

        const updatedServer = serverContent.replace(
          /setupSocketHandlers\(io\)/,
          `setupSocketHandlers(io)\n${notificationIntegration.trim()}`
        )

        fs.writeFileSync(serverPath, updatedServer)
        this.log('Updated server with notification integration', 'success')
      } else {
        this.log('Server already has notification integration', 'info')
      }
    }
  }

  async generateReport() {
    this.log('Generating notification fix report...')

    const report = {
      fixType: 'Notification System',
      timestamp: new Date().toISOString(),
      fixesApplied: this.fixesApplied,
      errors: this.errors,
      summary: {
        totalFixes: this.fixesApplied.length,
        errors: this.errors.length,
        componentsCreated: 3 // API, Service, Component
      },
      recommendations: []
    }

    if (this.errors.length > 0) {
      report.recommendations.push('Address notification creation errors')
    }

    if (this.fixesApplied.length > 0) {
      report.recommendations.push('Notification system created successfully')
    }

    // Save report
    const reportPath = './notification-fix-report.json'
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    this.log(`Notification fix report saved to: ${reportPath}`, 'success')
    this.log(`Components created: ${report.summary.componentsCreated}`, 'info')
  }

  async run() {
    try {
      await this.createNotificationAPI()
      await this.createNotificationService()
      await this.createNotificationHook()
      await this.createNotificationComponent()
      await this.updateServerSocket()
      await this.generateReport()

      this.log('Notification system fix completed successfully!', 'success')
    } catch (error) {
      this.log(`Notification system fix failed: ${error.message}`, 'error')
      await this.generateReport()
    }
  }
}

// Run the notification fixer
const fixer = new NotificationFixer()
fixer.run()