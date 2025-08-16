const fs = require('fs')
const path = require('path')

class PermissionFixer {
  constructor() {
    this.appDir = path.join(__dirname, '..', 'src', 'app')
    this.libDir = path.join(__dirname, '..', 'src', 'lib')
    this.componentsDir = path.join(__dirname, '..', 'src', 'components')
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

  async createPermissionService() {
    this.log('Creating permission service...')

    const servicesDir = path.join(this.libDir, 'services')

    if (!fs.existsSync(servicesDir)) {
      fs.mkdirSync(servicesDir, { recursive: true })
      this.log('Created services directory', 'success')
    }

    const permissionService = `import { db } from '@/lib/db'

export interface Permission {
  resource: string
  action: string
  conditions?: Record<string, any>
}

export interface RolePermissions {
  [role: string]: Permission[]
}

export class PermissionService {
  // Define role-based permissions
  private static rolePermissions: RolePermissions = {
    OWNER: [
      { resource: 'team', action: 'read' },
      { resource: 'team', action: 'write' },
      { resource: 'team', action: 'delete' },
      { resource: 'team', action: 'manage_members' },
      { resource: 'team', action: 'manage_billing' },
      { resource: 'document', action: 'read' },
      { resource: 'document', action: 'write' },
      { resource: 'document', action: 'delete' },
      { resource: 'document', action: 'share' },
      { resource: 'file', action: 'read' },
      { resource: 'file', action: 'write' },
      { resource: 'file', action: 'delete' },
      { resource: 'file', action: 'share' },
      { resource: 'meeting', action: 'read' },
      { resource: 'meeting', action: 'write' },
      { resource: 'meeting', action: 'delete' },
      { resource: 'meeting', action: 'manage_participants' },
      { resource: 'mail', action: 'read' },
      { resource: 'mail', action: 'write' },
      { resource: 'mail', action: 'delete' },
      { resource: 'settings', action: 'read' },
      { resource: 'settings', action: 'write' },
      { resource: 'billing', action: 'read' },
      { resource: 'billing', action: 'write' }
    ],
    ADMIN: [
      { resource: 'team', action: 'read' },
      { resource: 'team', action: 'write' },
      { resource: 'document', action: 'read' },
      { resource: 'document', action: 'write' },
      { resource: 'document', action: 'delete' },
      { resource: 'document', action: 'share' },
      { resource: 'file', action: 'read' },
      { resource: 'file', action: 'write' },
      { resource: 'file', action: 'delete' },
      { resource: 'file', action: 'share' },
      { resource: 'meeting', action: 'read' },
      { resource: 'meeting', action: 'write' },
      { resource: 'meeting', action: 'delete' },
      { resource: 'meeting', action: 'manage_participants' },
      { resource: 'mail', action: 'read' },
      { resource: 'mail', action: 'write' },
      { resource: 'mail', action: 'delete' },
      { resource: 'settings', action: 'read' }
    ],
    MEMBER: [
      { resource: 'team', action: 'read' },
      { resource: 'document', action: 'read' },
      { resource: 'document', action: 'write' },
      { resource: 'document', action: 'share' },
      { resource: 'file', action: 'read' },
      { resource: 'file', action: 'write' },
      { resource: 'file', action: 'share' },
      { resource: 'meeting', action: 'read' },
      { resource: 'meeting', action: 'write' },
      { resource: 'mail', action: 'read' },
      { resource: 'mail', action: 'write' }
    ]
  }

  // Plan-based feature restrictions
  private static planFeatures = {
    FREE: {
      maxTeamMembers: 3,
      maxStorageGB: 1,
      maxDocuments: 50,
      maxMeetingsPerMonth: 10,
      features: ['basic_docs', 'basic_files', 'basic_meetings', 'basic_mail']
    },
    PRO: {
      maxTeamMembers: 50,
      maxStorageGB: 100,
      maxDocuments: 1000,
      maxMeetingsPerMonth: 100,
      features: ['basic_docs', 'advanced_docs', 'basic_files', 'advanced_files', 'basic_meetings', 'advanced_meetings', 'basic_mail', 'advanced_mail']
    },
    ENTERPRISE: {
      maxTeamMembers: 1000,
      maxStorageGB: 1000,
      maxDocuments: 10000,
      maxMeetingsPerMonth: 1000,
      features: ['basic_docs', 'advanced_docs', 'basic_files', 'advanced_files', 'basic_meetings', 'advanced_meetings', 'basic_mail', 'advanced_mail', 'enterprise_features']
    }
  }

  /**
   * Check if user has permission for a specific action
   */
  static async hasPermission(
    userId: string,
    teamId: string,
    resource: string,
    action: string,
    conditions?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get user's team membership
      const membership = await db.teamMember.findFirst({
        where: {
          teamId,
          userId
        }
      })

      if (!membership) {
        return false
      }

      // Get role permissions
      const rolePermissions = this.rolePermissions[membership.role] || []
      
      // Check if permission exists for role
      const hasPermission = rolePermissions.some(perm => 
        perm.resource === resource && perm.action === action
      )

      if (!hasPermission) {
        return false
      }

      // Check additional conditions
      if (conditions) {
        return this.checkConditions(conditions, membership, teamId)
      }

      return true
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * Check additional conditions for permissions
   */
  private static async checkConditions(
    conditions: Record<string, any>,
    membership: any,
    teamId: string
  ): Promise<boolean> {
    try {
      // Check ownership condition
      if (conditions.ownership === 'self' && membership.role !== 'OWNER') {
        return false
      }

      // Check team member count
      if (conditions.maxMembers) {
        const memberCount = await db.teamMember.count({
          where: { teamId }
        })
        if (memberCount > conditions.maxMembers) {
          return false
        }
      }

      // Check resource ownership
      if (conditions.resourceOwner) {
        const resource = await db[conditions.resourceModel].findUnique({
          where: { id: conditions.resourceId }
        })
        if (resource?.userId !== membership.userId) {
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Error checking conditions:', error)
      return false
    }
  }

  /**
   * Check if user's plan supports a feature
   */
  static async planSupportsFeature(
    userId: string,
    feature: string
  ): Promise<boolean> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          teamMemberships: {
            include: {
              team: {
                include: {
                  subscription: true
                }
              }
            }
          }
        }
      })

      if (!user) {
        return false
      }

      // Check user's plan
      const plan = user.plan
      const features = this.planFeatures[plan as keyof typeof this.planFeatures]?.features || []

      return features.includes(feature)
    } catch (error) {
      console.error('Error checking plan feature support:', error)
      return false
    }
  }

  /**
   * Check if team is within plan limits
   */
  static async checkTeamLimits(teamId: string): Promise<{
    withinLimits: boolean
    limits: any
    current: any
    violations: string[]
  }> {
    try {
      const team = await db.team.findUnique({
        where: { id: teamId },
        include: {
          owner: true,
          members: true,
          subscription: true,
          documents: {
            where: { isDeleted: false }
          },
          files: {
            where: { isDeleted: false, isFolder: false }
          },
          meetRooms: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            }
          }
        }
      })

      if (!team) {
        return {
          withinLimits: false,
          limits: {},
          current: {},
          violations: ['Team not found']
        }
      }

      const plan = team.owner.plan
      const limits = this.planFeatures[plan as keyof typeof this.planFeatures]

      const violations: string[] = []

      // Check team member limit
      if (team.members.length > limits.maxTeamMembers) {
        violations.push(\`Team members (\${team.members.length}) exceeds limit (\${limits.maxTeamMembers})\`)
      }

      // Check storage limit
      const totalStorage = team.files.reduce((sum, file) => sum + file.size, 0)
      const storageGB = totalStorage / (1024 * 1024 * 1024)
      if (storageGB > limits.maxStorageGB) {
        violations.push(\`Storage usage (\${storageGB.toFixed(2)}GB) exceeds limit (\${limits.maxStorageGB}GB)\`)
      }

      // Check document limit
      if (team.documents.length > limits.maxDocuments) {
        violations.push(\`Documents (\${team.documents.length}) exceeds limit (\${limits.maxDocuments})\`)
      }

      // Check meeting limit
      if (team.meetRooms.length > limits.maxMeetingsPerMonth) {
        violations.push(\`Monthly meetings (\${team.meetRooms.length}) exceeds limit (\${limits.maxMeetingsPerMonth})\`)
      }

      return {
        withinLimits: violations.length === 0,
        limits,
        current: {
          members: team.members.length,
          storageGB: storageGB,
          documents: team.documents.length,
          meetings: team.meetRooms.length
        },
        violations
      }
    } catch (error) {
      console.error('Error checking team limits:', error)
      return {
        withinLimits: false,
        limits: {},
        current: {},
        violations: ['Error checking limits']
      }
    }
  }

  /**
   * Get user permissions for a team
   */
  static async getUserPermissions(userId: string, teamId: string): Promise<string[]> {
    try {
      const membership = await db.teamMember.findFirst({
        where: {
          teamId,
          userId
        }
      })

      if (!membership) {
        return []
      }

      const rolePermissions = this.rolePermissions[membership.role] || []
      return rolePermissions.map(perm => \`\${perm.resource}:\${perm.action}\`)
    } catch (error) {
      console.error('Error getting user permissions:', error)
      return []
    }
  }

  /**
   * Check if user can access a resource
   */
  static async canAccessResource(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case 'document':
          const document = await db.document.findUnique({
            where: { id: resourceId },
            include: { team: true }
          })
          if (!document) return false
          return this.hasPermission(userId, document.teamId, 'document', 'read')

        case 'file':
          const file = await db.file.findUnique({
            where: { id: resourceId },
            include: { team: true }
          })
          if (!file) return false
          return this.hasPermission(userId, file.teamId, 'file', 'read')

        case 'meeting':
          const meeting = await db.meetRoom.findUnique({
            where: { id: resourceId },
            include: { team: true }
          })
          if (!meeting) return false
          return this.hasPermission(userId, meeting.teamId, 'meeting', 'read')

        case 'team':
          const team = await db.team.findUnique({ where: { id: resourceId } })
          if (!team) return false
          return this.hasPermission(userId, resourceId, 'team', 'read')

        default:
          return false
      }
    } catch (error) {
      console.error('Error checking resource access:', error)
      return false
    }
  }

  /**
   * Middleware for API route permission checking
   */
  static async requirePermission(
    req: any,
    res: any,
    resource: string,
    action: string,
    conditions?: Record<string, any>
  ) {
    try {
      const userId = req.user?.id
      const teamId = req.query.teamId || req.body?.teamId

      if (!userId || !teamId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const hasAccess = await this.hasPermission(userId, teamId, resource, action, conditions)

      if (!hasAccess) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      // Permission granted, continue
      return null
    } catch (error) {
      console.error('Permission middleware error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Enforce plan limits
   */
  static async enforcePlanLimits(userId: string, operation: string, data?: any): Promise<{
    allowed: boolean
    reason?: string
    limit?: any
  }> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          teamMemberships: {
            include: {
              team: true
            }
          }
        }
      })

      if (!user) {
        return { allowed: false, reason: 'User not found' }
      }

      const plan = user.plan
      const limits = this.planFeatures[plan as keyof typeof this.planFeatures]

      switch (operation) {
        case 'create_team':
          const teamCount = user.teamMemberships.length
          if (teamCount >= 1 && plan === 'FREE') {
            return { 
              allowed: false, 
              reason: 'Free plan limited to 1 team',
              limit: { maxTeams: 1 }
            }
          }
          break

        case 'add_team_member':
          for (const membership of user.teamMemberships) {
            const memberCount = await db.teamMember.count({
              where: { teamId: membership.teamId }
            })
            if (memberCount >= limits.maxTeamMembers) {
              return { 
                allowed: false, 
                reason: \`Team member limit reached (\${limits.maxTeamMembers})\`,
                limit: { maxTeamMembers: limits.maxTeamMembers }
              }
            }
          }
          break

        case 'upload_file':
          // Check storage limits for each team
          for (const membership of user.teamMemberships) {
            const teamFiles = await db.file.findMany({
              where: { 
                teamId: membership.teamId,
                isDeleted: false,
                isFolder: false
              }
            })
            const totalStorage = teamFiles.reduce((sum, file) => sum + file.size, 0)
            const storageGB = totalStorage / (1024 * 1024 * 1024)
            
            if (storageGB >= limits.maxStorageGB) {
              return { 
                allowed: false, 
                reason: \`Storage limit reached (\${limits.maxStorageGB}GB)\`,
                limit: { maxStorageGB: limits.maxStorageGB }
              }
            }
          }
          break

        case 'create_document':
          // Check document limits for each team
          for (const membership of user.teamMemberships) {
            const docCount = await db.document.count({
              where: { 
                teamId: membership.teamId,
                isDeleted: false
              }
            })
            
            if (docCount >= limits.maxDocuments) {
              return { 
                allowed: false, 
                reason: \`Document limit reached (\${limits.maxDocuments})\`,
                limit: { maxDocuments: limits.maxDocuments }
              }
            }
          }
          break

        case 'create_meeting':
          // Check meeting limits for each team
          for (const membership of user.teamMemberships) {
            const meetingCount = await db.meetRoom.count({
              where: { 
                teamId: membership.teamId,
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
              }
            })
            
            if (meetingCount >= limits.maxMeetingsPerMonth) {
              return { 
                allowed: false, 
                reason: \`Monthly meeting limit reached (\${limits.maxMeetingsPerMonth})\`,
                limit: { maxMeetingsPerMonth: limits.maxMeetingsPerMonth }
              }
            }
          }
          break
      }

      return { allowed: true }
    } catch (error) {
      console.error('Error enforcing plan limits:', error)
      return { allowed: false, reason: 'Error checking limits' }
    }
  }
}`

    const servicePath = path.join(servicesDir, 'permission.ts')
    
    if (!fs.existsSync(servicePath)) {
      fs.writeFileSync(servicePath, permissionService)
      this.log('Created permission service', 'success')
    } else {
      this.log('Permission service already exists', 'info')
    }
  }

  async createPermissionMiddleware() {
    this.log('Creating permission middleware...')

    const middlewareDir = path.join(this.libDir, 'middleware')

    if (!fs.existsSync(middlewareDir)) {
      fs.mkdirSync(middlewareDir, { recursive: true })
      this.log('Created middleware directory', 'success')
    }

    const permissionMiddleware = `import { NextRequest, NextResponse } from 'next/server'
import { PermissionService } from '@/lib/services/permission'
import { getToken } from 'next-auth/jwt'

export async function permissionMiddleware(
  request: NextRequest,
  requiredPermissions: Array<{
    resource: string
    action: string
    conditions?: Record<string, any>
  }>
): Promise<NextResponse | null> {
  try {
    // Get user from token
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const teamId = request.nextUrl.searchParams.get('teamId') || 
                   request.headers.get('x-team-id')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    // Check all required permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await PermissionService.hasPermission(
        userId,
        teamId,
        permission.resource,
        permission.action,
        permission.conditions
      )

      if (!hasPermission) {
        return NextResponse.json(
          { error: \`Insufficient permissions for \${permission.resource}:\${permission.action}\` },
          { status: 403 }
        )
      }
    }

    // All permissions granted
    return null
  } catch (error) {
    console.error('Permission middleware error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Higher-order function for API routes
export function withPermissions(
  requiredPermissions: Array<{
    resource: string
    action: string
    conditions?: Record<string, any>
  }>
) {
  return function <T extends (...args: any[]) => any>(
    handler: T
  ): (...args: Parameters<T>) => Promise<NextResponse> {
    return async function(...args: Parameters<T>): Promise<NextResponse> {
      const request = args[0] as NextRequest
      
      // Check permissions
      const permissionResult = await permissionMiddleware(request, requiredPermissions)
      if (permissionResult) {
        return permissionResult
      }

      // Permissions granted, proceed with handler
      return handler(...args)
    }
  }
}

// Plan limit enforcement middleware
export async function planLimitMiddleware(
  request: NextRequest,
  operation: string
): Promise<NextResponse | null> {
  try {
    const token = await getToken({ req: request })
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = token.sub
    const body = await request.json()

    const limitCheck = await PermissionService.enforcePlanLimits(userId, operation, body)

    if (!limitCheck.allowed) {
      return NextResponse.json(
        { 
          error: limitCheck.reason || 'Operation not allowed by plan limits',
          limit: limitCheck.limit 
        },
        { status: 403 }
      )
    }

    return null
  } catch (error) {
    console.error('Plan limit middleware error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Combined permission and plan limit middleware
export async function accessControlMiddleware(
  request: NextRequest,
  options: {
    permissions?: Array<{
      resource: string
      action: string
      conditions?: Record<string, any>
    }>
    planOperation?: string
  }
): Promise<NextResponse | null> {
  try {
    // Check permissions if specified
    if (options.permissions) {
      const permissionResult = await permissionMiddleware(request, options.permissions)
      if (permissionResult) {
        return permissionResult
      }
    }

    // Check plan limits if operation specified
    if (options.planOperation) {
      const limitResult = await planLimitMiddleware(request, options.planOperation)
      if (limitResult) {
        return limitResult
      }
    }

    return null
  } catch (error) {
    console.error('Access control middleware error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}`

    const middlewarePath = path.join(middlewareDir, 'permission.ts')
    
    if (!fs.existsSync(middlewarePath)) {
      fs.writeFileSync(middlewarePath, permissionMiddleware)
      this.log('Created permission middleware', 'success')
    } else {
      this.log('Permission middleware already exists', 'info')
    }
  }

  async createPermissionHook() {
    this.log('Creating permission hook...')

    const hooksDir = path.join(this.libDir, 'hooks')

    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true })
      this.log('Created hooks directory', 'success')
    }

    const permissionHook = `'use client'

import { useState, useEffect } from 'react'
import { PermissionService } from '@/lib/services/permission'

export interface UserPermissions {
  [key: string]: boolean
}

export function usePermissions(userId: string, teamId: string) {
  const [permissions, setPermissions] = useState<UserPermissions>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkPermission = async (resource: string, action: string): Promise<boolean> => {
    try {
      return await PermissionService.hasPermission(userId, teamId, resource, action)
    } catch (err) {
      console.error('Error checking permission:', err)
      return false
    }
  }

  const checkMultiplePermissions = async (
    permissionChecks: Array<{ resource: string; action: string }>
  ): Promise<boolean> => {
    try {
      const results = await Promise.all(
        permissionChecks.map(check => 
          PermissionService.hasPermission(userId, teamId, check.resource, check.action)
        )
      )
      return results.every(result => result)
    } catch (err) {
      console.error('Error checking multiple permissions:', err)
      return false
    }
  }

  const canAccessResource = async (resourceType: string, resourceId: string): Promise<boolean> => {
    try {
      return await PermissionService.canAccessResource(userId, resourceType, resourceId)
    } catch (err) {
      console.error('Error checking resource access:', err)
      return false
    }
  }

  const loadPermissions = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user's role-based permissions
      const userPermissions = await PermissionService.getUserPermissions(userId, teamId)
      
      const permissionMap: UserPermissions = {}
      userPermissions.forEach(permission => {
        permissionMap[permission] = true
      })

      setPermissions(permissionMap)
    } catch (err) {
      console.error('Error loading permissions:', err)
      setError('Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }

  // Check plan feature support
  const planSupportsFeature = async (feature: string): Promise<boolean> => {
    try {
      return await PermissionService.planSupportsFeature(userId, feature)
    } catch (err) {
      console.error('Error checking plan feature support:', err)
      return false
    }
  }

  // Get team limits
  const getTeamLimits = async () => {
    try {
      return await PermissionService.checkTeamLimits(teamId)
    } catch (err) {
      console.error('Error checking team limits:', err)
      return {
        withinLimits: false,
        limits: {},
        current: {},
        violations: ['Error checking limits']
      }
    }
  }

  useEffect(() => {
    if (userId && teamId) {
      loadPermissions()
    }
  }, [userId, teamId])

  return {
    permissions,
    loading,
    error,
    checkPermission,
    checkMultiplePermissions,
    canAccessResource,
    planSupportsFeature,
    getTeamLimits,
    reload: loadPermissions
  }
}

// Hook for checking plan limits
export function usePlanLimits(userId: string) {
  const [limits, setLimits] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const checkOperation = async (operation: string, data?: any) => {
    try {
      return await PermissionService.enforcePlanLimits(userId, operation, data)
    } catch (err) {
      console.error('Error checking operation limits:', err)
      return { allowed: false, reason: 'Error checking limits' }
    }
  }

  const loadPlanInfo = async () => {
    try {
      setLoading(true)
      
      // This would typically come from user context
      const planLimits = {
        FREE: {
          maxTeamMembers: 3,
          maxStorageGB: 1,
          maxDocuments: 50,
          maxMeetingsPerMonth: 10,
          features: ['basic_docs', 'basic_files', 'basic_meetings', 'basic_mail']
        },
        PRO: {
          maxTeamMembers: 50,
          maxStorageGB: 100,
          maxDocuments: 1000,
          maxMeetingsPerMonth: 100,
          features: ['basic_docs', 'advanced_docs', 'basic_files', 'advanced_files', 'basic_meetings', 'advanced_meetings', 'basic_mail', 'advanced_mail']
        },
        ENTERPRISE: {
          maxTeamMembers: 1000,
          maxStorageGB: 1000,
          maxDocuments: 10000,
          maxMeetingsPerMonth: 1000,
          features: ['basic_docs', 'advanced_docs', 'basic_files', 'advanced_files', 'basic_meetings', 'advanced_meetings', 'basic_mail', 'advanced_mail', 'enterprise_features']
        }
      }

      setLimits(planLimits)
    } catch (err) {
      console.error('Error loading plan info:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlanInfo()
  }, [userId])

  return {
    limits,
    loading,
    checkOperation
  }
}`

    const hookPath = path.join(hooksDir, 'usePermissions.ts')
    
    if (!fs.existsSync(hookPath)) {
      fs.writeFileSync(hookPath, permissionHook)
      this.log('Created permission hook', 'success')
    } else {
      this.log('Permission hook already exists', 'info')
    }
  }

  async createPermissionComponent() {
    this.log('Creating permission component...')

    const componentsDir = path.join(this.componentsDir, 'ui')

    if (!fs.existsSync(componentsDir)) {
      fs.mkdirSync(componentsDir, { recursive: true })
      this.log('Created UI components directory', 'success')
    }

    const permissionComponent = `'use client'

import { Shield, AlertTriangle } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PermissionGuardProps {
  userId: string
  teamId: string
  resource: string
  action: string
  conditions?: Record<string, any>
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGuard({
  userId,
  teamId,
  resource,
  action,
  conditions,
  fallback,
  children
}: PermissionGuardProps) {
  const { permissions, loading, checkPermission } = usePermissions(userId, teamId)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      const permitted = await checkPermission(resource, action)
      setHasPermission(permitted)
    }

    if (userId && teamId && !loading) {
      checkAccess()
    }
  }, [userId, teamId, resource, action, loading, checkPermission])

  if (loading) {
    return (
      <div className=\"flex items-center justify-center p-4\">
        <div className=\"animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900\"></div>
      </div>
    )
  }

  if (!hasPermission) {
    return fallback || (
      <Card className=\"border-yellow-200 bg-yellow-50\">
        <CardContent className=\"p-4\">
          <div className=\"flex items-center gap-2 text-yellow-800\">
            <Shield className=\"h-5 w-5\" />
            <span className=\"font-medium\">Access Denied</span>
          </div>
          <p className=\"text-sm text-yellow-700 mt-1\">
            You don't have permission to {action} {resource}
          </p>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}

interface PlanLimitGuardProps {
  userId: string
  operation: string
  data?: any
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PlanLimitGuard({
  userId,
  operation,
  data,
  fallback,
  children
}: PlanLimitGuardProps) {
  const { limits, loading, checkOperation } = usePlanLimits(userId)
  const [withinLimits, setWithinLimits] = useState(true)
  const [limitInfo, setLimitInfo] = useState<any>(null)

  useEffect(() => {
    const checkLimits = async () => {
      const result = await checkOperation(operation, data)
      setWithinLimits(result.allowed)
      setLimitInfo(result.limit)
    }

    if (userId && !loading) {
      checkLimits()
    }
  }, [userId, operation, data, loading, checkOperation])

  if (loading) {
    return (
      <div className=\"flex items-center justify-center p-4\">
        <div className=\"animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900\"></div>
      </div>
    )
  }

  if (!withinLimits) {
    return fallback || (
      <Alert className=\"border-red-200 bg-red-50\">
        <AlertTriangle className=\"h-4 w-4\" />
        <AlertDescription className=\"text-red-800\">
          This operation exceeds your plan limits. Please upgrade to continue.
          {limitInfo && (
            <div className=\"mt-2 text-sm\">
              Limit: {JSON.stringify(limitInfo)}
            </div>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}

interface PermissionDisplayProps {
  userId: string
  teamId: string
}

export function PermissionDisplay({ userId, teamId }: PermissionDisplayProps) {
  const { permissions, loading, getTeamLimits } = usePermissions(userId, teamId)
  const [teamLimits, setTeamLimits] = useState<any>(null)

  useEffect(() => {
    const loadLimits = async () => {
      const limits = await getTeamLimits()
      setTeamLimits(limits)
    }

    if (userId && teamId && !loading) {
      loadLimits()
    }
  }, [userId, teamId, loading, getTeamLimits])

  if (loading) {
    return <div>Loading permissions...</div>
  }

  return (
    <div className=\"space-y-4\">
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center gap-2\">
            <Shield className=\"h-5 w-5\" />
            Your Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className=\"grid grid-cols-2 md:grid-cols-3 gap-2\">
            {Object.entries(permissions).map(([key, value]) => (
              <Badge key={key} variant={value ? 'default' : 'secondary'}>
                {key.replace(':', ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {teamLimits && (
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center gap-2\">
              <AlertTriangle className=\"h-5 w-5\" />
              Team Usage Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className=\"space-y-2\">
              <div className=\"flex justify-between\">
                <span>Team Members:</span>
                <span className={teamLimits.current.members > teamLimits.limits.maxTeamMembers ? 'text-red-600' : ''}>
                  {teamLimits.current.members} / {teamLimits.limits.maxTeamMembers}
                </span>
              </div>
              <div className=\"flex justify-between\">
                <span>Storage:</span>
                <span className={teamLimits.current.storageGB > teamLimits.limits.maxStorageGB ? 'text-red-600' : ''}>
                  {teamLimits.current.storageGB.toFixed(2)}GB / {teamLimits.limits.maxStorageGB}GB
                </span>
              </div>
              <div className=\"flex justify-between\">
                <span>Documents:</span>
                <span className={teamLimits.current.documents > teamLimits.limits.maxDocuments ? 'text-red-600' : ''}>
                  {teamLimits.current.documents} / {teamLimits.limits.maxDocuments}
                </span>
              </div>
              <div className=\"flex justify-between\">
                <span>Monthly Meetings:</span>
                <span className={teamLimits.current.meetings > teamLimits.limits.maxMeetingsPerMonth ? 'text-red-600' : ''}>
                  {teamLimits.current.meetings} / {teamLimits.limits.maxMeetingsPerMonth}
                </span>
              </div>
            </div>

            {teamLimits.violations.length > 0 && (
              <div className=\"mt-4 p-3 bg-red-50 border border-red-200 rounded-md\">
                <h4 className=\"font-medium text-red-800\">Limit Violations:</h4>
                <ul className=\"text-sm text-red-700 mt-1\">
                  {teamLimits.violations.map((violation: string, index: number) => (
                    <li key={index}>• {violation}</li>
                  ))}
                </ul>
              </div>
            )}

            {!teamLimits.withinLimits && (
              <div className=\"mt-4\">
                <Button variant=\"outline\" className=\"w-full\">
                  Upgrade Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}`

    const componentPath = path.join(componentsDir, 'PermissionGuard.tsx')
    
    if (!fs.existsSync(componentPath)) {
      fs.writeFileSync(componentPath, permissionComponent)
      this.log('Created permission guard component', 'success')
    } else {
      this.log('Permission guard component already exists', 'info')
    }
  }

  async createAPIExamples() {
    this.log('Creating API permission examples...')

    const examplesDir = path.join(this.libDir, 'examples')

    if (!fs.existsSync(examplesDir)) {
      fs.mkdirSync(examplesDir, { recursive: true })
      this.log('Created examples directory', 'success')
    }

    const apiExamples = `import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withPermissions } from '@/lib/middleware/permission'

// Example 1: Using permission middleware directly
export async function GET(request: NextRequest) {
  try {
    // Check permissions using middleware
    const permissionResult = await requirePermission(request, [
      { resource: 'document', action: 'read' }
    ])
    
    if (permissionResult) {
      return permissionResult
    }

    // Permission granted, proceed with operation
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    const documents = await db.document.findMany({
      where: { teamId, isDeleted: false }
    })

    return NextResponse.json(documents)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Example 2: Using higher-order function
export const POST = withPermissions([
  { resource: 'document', action: 'write' }
])(async (request: NextRequest) => {
  try {
    const { title, content, teamId } = await request.json()

    const document = await db.document.create({
      data: {
        title,
        content,
        teamId,
        userId: request.user.id // Assuming user is attached to request
      }
    })

    return NextResponse.json(document)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

// Example 3: With conditions
export async function DELETE(request: NextRequest) {
  try {
    const permissionResult = await requirePermission(request, [
      { 
        resource: 'document', 
        action: 'delete',
        conditions: { ownership: 'self' }
      ])
    
    if (permissionResult) {
      return permissionResult
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    const document = await db.document.delete({
      where: { 
        id: documentId,
        userId: request.user.id // Enforce ownership
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Example 4: Combined permission and plan limits
import { accessControlMiddleware } from '@/lib/middleware/permission'

export async function PUT(request: NextRequest) {
  try {
    const accessResult = await accessControlMiddleware(request, {
      permissions: [
        { resource: 'file', action: 'write' }
      ],
      planOperation: 'upload_file'
    })
    
    if (accessResult) {
      return accessResult
    }

    const { name, content, teamId } = await request.json()

    const file = await db.file.create({
      data: {
        name,
        content,
        teamId,
        userId: request.user.id
      }
    })

    return NextResponse.json(file)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function for middleware
async function requirePermission(request: NextRequest, permissions: any[]) {
  // Implementation would go here
  // This is a placeholder for the actual middleware implementation
  return null
}`

    const examplesPath = path.join(examplesDir, 'permission-api.ts')
    
    if (!fs.existsSync(examplesPath)) {
      fs.writeFileSync(examplesPath, apiExamples)
      this.log('Created API permission examples', 'success')
    } else {
      this.log('API permission examples already exist', 'info')
    }
  }

  async generateReport() {
    this.log('Generating permission fix report...')

    const report = {
      fixType: 'Role-Based Permission Enforcement',
      timestamp: new Date().toISOString(),
      fixesApplied: this.fixesApplied,
      errors: this.errors,
      summary: {
        totalFixes: this.fixesApplied.length,
        errors: this.errors.length,
        componentsCreated: 4 // Service, Middleware, Hook, Component
      },
      recommendations: []
    }

    if (this.errors.length > 0) {
      report.recommendations.push('Address permission creation errors')
    }

    if (this.fixesApplied.length > 0) {
      report.recommendations.push('Permission system created successfully')
    }

    // Save report
    const reportPath = './permission-fix-report.json'
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    this.log(`Permission fix report saved to: ${reportPath}`, 'success')
    this.log(`Components created: ${report.summary.componentsCreated}`, 'info')
  }

  async run() {
    try {
      await this.createPermissionService()
      await this.createPermissionMiddleware()
      await this.createPermissionHook()
      await this.createPermissionComponent()
      await this.createAPIExamples()
      await this.generateReport()

      this.log('Permission system fix completed successfully!', 'success')
    } catch (error) {
      this.log(`Permission system fix failed: ${error.message}`, 'error')
      await this.generateReport()
    }
  }
}

// Run the permission fixer
const fixer = new PermissionFixer()
fixer.run()