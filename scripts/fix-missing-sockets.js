const fs = require('fs')
const path = require('path')

class SocketFixer {
  constructor() {
    this.socketDir = path.join(__dirname, '..', 'src', 'lib', 'socket')
    this.apiDir = path.join(__dirname, '..', 'src', 'app', 'api')
    this.requiredSockets = [
      'document',
      'file',
      'meeting',
      'notification',
      'team'
    ]
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

  async ensureSocketDirectory() {
    this.log('Ensuring socket directory exists...')

    if (!fs.existsSync(this.socketDir)) {
      fs.mkdirSync(this.socketDir, { recursive: true })
      this.log('Socket directory created', 'success')
    } else {
      this.log('Socket directory already exists', 'info')
    }
  }

  async createSocketHandlers() {
    this.log('Creating socket handlers...')

    const socketHandlers = {
      document: this.createDocumentHandler(),
      file: this.createFileHandler(),
      meeting: this.createMeetingHandler(),
      notification: this.createNotificationHandler(),
      team: this.createTeamHandler()
    }

    for (const [name, handler] of Object.entries(socketHandlers)) {
      const filePath = path.join(this.socketDir, `${name}.ts`)
      
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, handler)
        this.log(`Created ${name} socket handler`, 'success')
      } else {
        this.log(`${name} socket handler already exists`, 'info')
      }
    }
  }

  createDocumentHandler() {
    return `import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function setupDocumentHandlers(io: Server) {
  const documentNamespace = io.of('/document')

  documentNamespace.on('connection', (socket) => {
    console.log('Client connected to document namespace:', socket.id)

    // Join document room
    socket.on('document:join', async (data) => {
      try {
        const { documentId, userId } = data
        
        // Verify user has access to document
        const document = await prisma.document.findUnique({
          where: { id: documentId },
          include: { team: true }
        })

        if (!document) {
          socket.emit('error', { message: 'Document not found' })
          return
        }

        // Check if user is team member
        const teamMember = await prisma.teamMember.findFirst({
          where: {
            teamId: document.teamId,
            userId: userId
          }
        })

        if (!teamMember) {
          socket.emit('error', { message: 'Access denied' })
          return
        }

        socket.join(\`document-\${documentId}\`)
        socket.emit('document:joined', { documentId, success: true })

        // Notify other users
        socket.to(\`document-\${documentId}\`).emit('user:joined', {
          userId,
          documentId,
          timestamp: new Date()
        })
      } catch (error) {
        console.error('Document join error:', error)
        socket.emit('error', { message: 'Failed to join document' })
      }
    })

    // Handle document editing
    socket.on('document:edit', async (data) => {
      try {
        const { documentId, userId, content, cursor } = data
        
        // Update document
        const updatedDocument = await prisma.document.update({
          where: { id: documentId },
          data: { content }
        })

        // Create version if significant change
        await prisma.documentVersion.create({
          data: {
            documentId,
            version: Math.floor(Date.now() / 1000), // Unix timestamp as version
            content
          }
        })

        // Broadcast to other users in document
        socket.to(\`document-\${documentId}\`).emit('document:update', {
          documentId,
          content,
          userId,
          cursor,
          timestamp: new Date()
        })

        socket.emit('document:updated', { documentId, success: true })
      } catch (error) {
        console.error('Document edit error:', error)
        socket.emit('error', { message: 'Failed to update document' })
      }
    })

    // Handle cursor position
    socket.on('cursor:move', (data) => {
      const { documentId, userId, position } = data
      socket.to(\`document-\${documentId}\`).emit('cursor:update', {
        userId,
        position,
        timestamp: new Date()
      })
    })

    // Handle comments
    socket.on('comment:add', async (data) => {
      try {
        const { documentId, userId, content, selection } = data
        
        const comment = await prisma.documentComment.create({
          data: {
            documentId,
            userId,
            content
          },
          include: { user: true }
        })

        // Broadcast to all users in document
        documentNamespace.to(\`document-\${documentId}\`).emit('comment:added', {
          comment,
          selection,
          timestamp: new Date()
        })
      } catch (error) {
        console.error('Comment add error:', error)
        socket.emit('error', { message: 'Failed to add comment' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected from document namespace:', socket.id)
    })
  })
}`
  }

  createFileHandler() {
    return `import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function setupFileHandlers(io: Server) {
  const fileNamespace = io.of('/file')

  fileNamespace.on('connection', (socket) => {
    console.log('Client connected to file namespace:', socket.id)

    // Join file room
    socket.on('file:join', async (data) => {
      try {
        const { fileId, userId } = data
        
        // Verify user has access to file
        const file = await prisma.file.findUnique({
          where: { id: fileId },
          include: { team: true }
        })

        if (!file) {
          socket.emit('error', { message: 'File not found' })
          return
        }

        // Check if user is team member
        const teamMember = await prisma.teamMember.findFirst({
          where: {
            teamId: file.teamId,
            userId: userId
          }
        })

        if (!teamMember) {
          socket.emit('error', { message: 'Access denied' })
          return
        }

        socket.join(\`file-\${fileId}\`)
        socket.emit('file:joined', { fileId, success: true })

        // Notify other users
        socket.to(\`file-\${fileId}\`).emit('user:joined', {
          userId,
          fileId,
          timestamp: new Date()
        })
      } catch (error) {
        console.error('File join error:', error)
        socket.emit('error', { message: 'Failed to join file' })
      }
    })

    // Handle file creation
    socket.on('file:create', async (data) => {
      try {
        const { folderId, userId, name, type } = data
        
        const newFile = await prisma.file.create({
          data: {
            name,
            path: type === 'folder' ? \`/folder/\${name}\` : \`/files/\${name}\`,
            size: 0,
            mimeType: type === 'folder' ? 'folder' : 'application/octet-stream',
            bucket: 'default',
            key: \`\${type}-\${Date.now()}\`,
            teamId: folderId ? (await prisma.file.findUnique({ where: { id: folderId } }))?.teamId : data.teamId,
            userId,
            parentId: folderId,
            isFolder: type === 'folder'
          },
          include: { user: true }
        })

        // Broadcast to team members
        const teamId = newFile.teamId
        fileNamespace.to(\`team-\${teamId}\`).emit('file:created', {
          file: newFile,
          userId,
          timestamp: new Date()
        })

        socket.emit('file:created', { file: newFile, success: true })
      } catch (error) {
        console.error('File creation error:', error)
        socket.emit('error', { message: 'Failed to create file' })
      }
    })

    // Handle file update
    socket.on('file:update', async (data) => {
      try {
        const { fileId, userId, updates } = data
        
        const updatedFile = await prisma.file.update({
          where: { id: fileId },
          data: updates,
          include: { user: true }
        })

        // Broadcast to users in file
        socket.to(\`file-\${fileId}\`).emit('file:updated', {
          file: updatedFile,
          userId,
          timestamp: new Date()
        })

        socket.emit('file:updated', { file: updatedFile, success: true })
      } catch (error) {
        console.error('File update error:', error)
        socket.emit('error', { message: 'Failed to update file' })
      }
    })

    // Handle file deletion
    socket.on('file:delete', async (data) => {
      try {
        const { fileId, userId } = data
        
        await prisma.file.update({
          where: { id: fileId },
          data: { isDeleted: true, deletedAt: new Date() }
        })

        // Broadcast to team members
        const file = await prisma.file.findUnique({ where: { id: fileId } })
        if (file) {
          fileNamespace.to(\`team-\${file.teamId}\`).emit('file:deleted', {
            fileId,
            userId,
            timestamp: new Date()
          })
        }

        socket.emit('file:deleted', { fileId, success: true })
      } catch (error) {
        console.error('File deletion error:', error)
        socket.emit('error', { message: 'Failed to delete file' })
      }
    })

    // Handle file sharing
    socket.on('file:share', async (data) => {
      try {
        const { fileId, userId, shareToken, expiry } = data
        
        const updatedFile = await prisma.file.update({
          where: { id: fileId },
          data: {
            isShared: true,
            shareToken,
            shareExpiry: expiry
          }
        })

        // Broadcast to team members
        const file = await prisma.file.findUnique({ where: { id: fileId } })
        if (file) {
          fileNamespace.to(\`team-\${file.teamId}\`).emit('file:shared', {
            file: updatedFile,
            userId,
            timestamp: new Date()
          })
        }

        socket.emit('file:shared', { file: updatedFile, success: true })
      } catch (error) {
        console.error('File sharing error:', error)
        socket.emit('error', { message: 'Failed to share file' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected from file namespace:', socket.id)
    })
  })
}`
  }

  createMeetingHandler() {
    return `import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function setupMeetingHandlers(io: Server) {
  const meetingNamespace = io.of('/meeting')

  meetingNamespace.on('connection', (socket) => {
    console.log('Client connected to meeting namespace:', socket.id)

    // Join meeting room
    socket.on('meeting:join', async (data) => {
      try {
        const { meetingId, userId, role } = data
        
        // Verify meeting exists
        const meeting = await prisma.meetRoom.findUnique({
          where: { id: meetingId },
          include: { team: true }
        })

        if (!meeting) {
          socket.emit('error', { message: 'Meeting not found' })
          return
        }

        // Check if user is team member
        const teamMember = await prisma.teamMember.findFirst({
          where: {
            teamId: meeting.teamId,
            userId: userId
          }
        })

        if (!teamMember) {
          socket.emit('error', { message: 'Access denied' })
          return
        }

        // Add participant
        const participant = await prisma.meetParticipant.upsert({
          where: {
            roomId_userId: {
              roomId: meetingId,
              userId: userId
            }
          },
          update: { leftAt: null },
          create: {
            roomId: meetingId,
            userId: userId,
            isAudioOn: true,
            isVideoOn: true,
            isScreenSharing: false
          }
        })

        socket.join(\`meeting-\${meetingId}\`)
        socket.emit('meeting:joined', { meetingId, success: true })

        // Notify other participants
        socket.to(\`meeting-\${meetingId}\`).emit('participant:joined', {
          participant,
          meetingId,
          timestamp: new Date()
        })

        // Send current participant list
        const participants = await prisma.meetParticipant.findMany({
          where: { roomId: meetingId, leftAt: null },
          include: { user: true }
        })

        socket.emit('participants:list', { participants })
      } catch (error) {
        console.error('Meeting join error:', error)
        socket.emit('error', { message: 'Failed to join meeting' })
      }
    })

    // Handle chat messages
    socket.on('chat:send', async (data) => {
      try {
        const { meetingId, userId, message } = data
        
        const chatMessage = await prisma.meetMessage.create({
          data: {
            roomId: meetingId,
            userId,
            message,
            type: 'TEXT'
          },
          include: { user: true }
        })

        // Broadcast to all participants
        meetingNamespace.to(\`meeting-\${meetingId}\`).emit('chat:message', {
          message: chatMessage,
          timestamp: new Date()
        })

        socket.emit('chat:sent', { messageId: chatMessage.id, success: true })
      } catch (error) {
        console.error('Chat send error:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Handle participant controls
    socket.on('participant:controls', async (data) => {
      try {
        const { meetingId, userId, audio, video, screen } = data
        
        const participant = await prisma.meetParticipant.update({
          where: {
            roomId_userId: {
              roomId: meetingId,
              userId: userId
            }
          },
          data: {
            isAudioOn: audio,
            isVideoOn: video,
            isScreenSharing: screen
          }
        })

        // Broadcast to all participants
        meetingNamespace.to(\`meeting-\${meetingId}\`).emit('participant:controls', {
          participant,
          timestamp: new Date()
        })

        socket.emit('controls:updated', { success: true })
      } catch (error) {
        console.error('Controls update error:', error)
        socket.emit('error', { message: 'Failed to update controls' })
      }
    })

    // Handle meeting lifecycle
    socket.on('meeting:start', async (data) => {
      try {
        const { meetingId } = data
        
        const meeting = await prisma.meetRoom.update({
          where: { id: meetingId },
          data: {
            isLive: true,
            startedAt: new Date()
          }
        })

        // Broadcast to all participants
        meetingNamespace.to(\`meeting-\${meetingId}\`).emit('meeting:started', {
          meeting,
          timestamp: new Date()
        })

        socket.emit('meeting:started', { success: true })
      } catch (error) {
        console.error('Meeting start error:', error)
        socket.emit('error', { message: 'Failed to start meeting' })
      }
    })

    socket.on('meeting:end', async (data) => {
      try {
        const { meetingId } = data
        
        const meeting = await prisma.meetRoom.update({
          where: { id: meetingId },
          data: {
            isLive: false,
            endedAt: new Date()
          }
        })

        // Update all participants
        await prisma.meetParticipant.updateMany({
          where: { roomId: meetingId, leftAt: null },
          data: { leftAt: new Date() }
        })

        // Broadcast to all participants
        meetingNamespace.to(\`meeting-\${meetingId}\`).emit('meeting:ended', {
          meeting,
          timestamp: new Date()
        })

        socket.emit('meeting:ended', { success: true })
      } catch (error) {
        console.error('Meeting end error:', error)
        socket.emit('error', { message: 'Failed to end meeting' })
      }
    })

    // Handle participant management (host only)
    socket.on('participant:kick', async (data) => {
      try {
        const { meetingId, targetUserId, reason } = data
        
        // Verify host permissions
        const meeting = await prisma.meetRoom.findUnique({
          where: { id: meetingId }
        })

        if (meeting?.hostId !== data.userId) {
          socket.emit('error', { message: 'Permission denied' })
          return
        }

        // Remove participant
        await prisma.meetParticipant.update({
          where: {
            roomId_userId: {
              roomId: meetingId,
              userId: targetUserId
            }
          },
          data: { leftAt: new Date() }
        })

        // Broadcast to all participants
        meetingNamespace.to(\`meeting-\${meetingId}\`).emit('participant:kicked', {
          targetUserId,
          reason,
          timestamp: new Date()
        })

        socket.emit('participant:kicked', { success: true })
      } catch (error) {
        console.error('Participant kick error:', error)
        socket.emit('error', { message: 'Failed to kick participant' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('Client disconnected from meeting namespace:', socket.id)
      
      // Update participant left time
      // This would need to be implemented based on your user tracking
    })
  })
}`
  }

  createNotificationHandler() {
    return `import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function setupNotificationHandlers(io: Server) {
  const notificationNamespace = io.of('/notification')

  notificationNamespace.on('connection', (socket) => {
    console.log('Client connected to notification namespace:', socket.id)

    // Join user notification room
    socket.on('user:join', (data) => {
      const { userId } = data
      socket.join(\`user-\${userId}\`)
      socket.emit('notifications:joined', { userId, success: true })
    })

    // Send notification
    socket.on('notification:send', async (data) => {
      try {
        const { userId, type, message, metadata } = data
        
        // Create notification in database
        const notification = await prisma.notification.create({
          data: {
            userId,
            type,
            message,
            metadata: metadata ? JSON.stringify(metadata) : null,
            isRead: false
          }
        })

        // Send to user
        notificationNamespace.to(\`user-\${userId}\`).emit('notification:receive', {
          notification,
          timestamp: new Date()
        })

        socket.emit('notification:sent', { notificationId: notification.id, success: true })
      } catch (error) {
        console.error('Notification send error:', error)
        socket.emit('error', { message: 'Failed to send notification' })
      }
    })

    // Mark notification as read
    socket.on('notification:read', async (data) => {
      try {
        const { notificationId, userId } = data
        
        await prisma.notification.update({
          where: { id: notificationId },
          data: { isRead: true }
        })

        socket.emit('notification:read', { notificationId, success: true })
      } catch (error) {
        console.error('Notification read error:', error)
        socket.emit('error', { message: 'Failed to mark notification as read' })
      }
    })

    // Get user notifications
    socket.on('notifications:get', async (data) => {
      try {
        const { userId, limit = 20, offset = 0 } = data
        
        const notifications = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        })

        socket.emit('notifications:list', { notifications })
      } catch (error) {
        console.error('Notifications get error:', error)
        socket.emit('error', { message: 'Failed to get notifications' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected from notification namespace:', socket.id)
    })
  })

  // Helper functions for sending notifications
  return {
    sendDocumentShared: async (documentId, userId, sharedBy) => {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { title: true }
      })

      notificationNamespace.to(\`user-\${userId}\`).emit('notification:receive', {
        notification: {
          id: Date.now(),
          type: 'document_shared',
          message: \`\${sharedBy} shared "\${document?.title}" with you\`,
          metadata: { documentId, sharedBy },
          isRead: false,
          createdAt: new Date()
        },
        timestamp: new Date()
      })
    },

    sendMeetingInvite: async (meetingId, userId, invitedBy) => {
      const meeting = await prisma.meetRoom.findUnique({
        where: { id: meetingId },
        select: { name: true }
      })

      notificationNamespace.to(\`user-\${userId}\`).emit('notification:receive', {
        notification: {
          id: Date.now(),
          type: 'meeting_invite',
          message: \`\${invitedBy} invited you to "\${meeting?.name}"\`,
          metadata: { meetingId, invitedBy },
          isRead: false,
          createdAt: new Date()
        },
        timestamp: new Date()
      })
    },

    sendTeamAdded: async (teamId, userId, addedBy) => {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { name: true }
      })

      notificationNamespace.to(\`user-\${userId}\`).emit('notification:receive', {
        notification: {
          id: Date.now(),
          type: 'team_added',
          message: \`\${addedBy} added you to "\${team?.name}"\`,
          metadata: { teamId, addedBy },
          isRead: false,
          createdAt: new Date()
        },
        timestamp: new Date()
      })
    }
  }
}`
  }

  createTeamHandler() {
    return `import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function setupTeamHandlers(io: Server) {
  const teamNamespace = io.of('/team')

  teamNamespace.on('connection', (socket) => {
    console.log('Client connected to team namespace:', socket.id)

    // Join team room
    socket.on('team:join', async (data) => {
      try {
        const { teamId, userId } = data
        
        // Verify team exists
        const team = await prisma.team.findUnique({
          where: { id: teamId }
        })

        if (!team) {
          socket.emit('error', { message: 'Team not found' })
          return
        }

        // Check if user is team member
        const teamMember = await prisma.teamMember.findFirst({
          where: {
            teamId: teamId,
            userId: userId
          }
        })

        if (!teamMember) {
          socket.emit('error', { message: 'Access denied' })
          return
        }

        socket.join(\`team-\${teamId}\`)
        socket.emit('team:joined', { teamId, success: true })

        // Send team member list
        const members = await prisma.teamMember.findMany({
          where: { teamId },
          include: { user: true }
        })

        socket.emit('team:members', { members })
      } catch (error) {
        console.error('Team join error:', error)
        socket.emit('error', { message: 'Failed to join team' })
      }
    })

    // Handle team member added
    socket.on('team:member:added', async (data) => {
      try {
        const { teamId, userId, addedBy, role } = data
        
        const member = await prisma.teamMember.create({
          data: {
            teamId,
            userId,
            role: role || 'MEMBER',
            invitedBy: addedBy
          },
          include: { user: true }
        })

        // Broadcast to team members
        teamNamespace.to(\`team-\${teamId}\`).emit('team:member:added', {
          member,
          timestamp: new Date()
        })

        socket.emit('team:member:added', { memberId: member.id, success: true })
      } catch (error) {
        console.error('Team member add error:', error)
        socket.emit('error', { message: 'Failed to add team member' })
      }
    })

    // Handle team member role update
    socket.on('team:member:role', async (data) => {
      try {
        const { teamId, userId, newRole, updatedBy } = data
        
        const member = await prisma.teamMember.update({
          where: {
            teamId_userId: {
              teamId: teamId,
              userId: userId
            }
          },
          data: { role: newRole },
          include: { user: true }
        })

        // Broadcast to team members
        teamNamespace.to(\`team-\${teamId}\`).emit('team:member:role', {
          member,
          updatedBy,
          timestamp: new Date()
        })

        socket.emit('team:member:role', { success: true })
      } catch (error) {
        console.error('Team member role update error:', error)
        socket.emit('error', { message: 'Failed to update member role' })
      }
    })

    // Handle team member removal
    socket.on('team:member:remove', async (data) => {
      try {
        const { teamId, userId, removedBy } = data
        
        await prisma.teamMember.delete({
          where: {
            teamId_userId: {
              teamId: teamId,
              userId: userId
            }
          }
        })

        // Broadcast to team members
        teamNamespace.to(\`team-\${teamId}\`).emit('team:member:removed', {
          userId,
          removedBy,
          timestamp: new Date()
        })

        socket.emit('team:member:removed', { success: true })
      } catch (error) {
        console.error('Team member remove error:', error)
        socket.emit('error', { message: 'Failed to remove team member' })
      }
    })

    // Handle team update
    socket.on('team:update', async (data) => {
      try {
        const { teamId, updates, updatedBy } = data
        
        const team = await prisma.team.update({
          where: { id: teamId },
          data: updates
        })

        // Broadcast to team members
        teamNamespace.to(\`team-\${teamId}\`).emit('team:updated', {
          team,
          updatedBy,
          timestamp: new Date()
        })

        socket.emit('team:updated', { success: true })
      } catch (error) {
        console.error('Team update error:', error)
        socket.emit('error', { message: 'Failed to update team' })
      }
    })

    // Handle team activity
    socket.on('team:activity', async (data) => {
      try {
        const { teamId, userId, activity, metadata } = data
        
        // Broadcast to team members
        teamNamespace.to(\`team-\${teamId}\`).emit('team:activity', {
          userId,
          activity,
          metadata,
          timestamp: new Date()
        })

        socket.emit('team:activity', { success: true })
      } catch (error) {
        console.error('Team activity error:', error)
        socket.emit('error', { message: 'Failed to broadcast activity' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected from team namespace:', socket.id)
    })
  })
}`
  }

  async createMainSocketIndex() {
    this.log('Creating main socket index...')

    const indexContent = `import { Server } from 'socket.io'
import { setupDocumentHandlers } from './document'
import { setupFileHandlers } from './file'
import { setupMeetingHandlers } from './meeting'
import { setupNotificationHandlers } from './notification'
import { setupTeamHandlers } from './team'

export function setupSocketHandlers(io: Server) {
  // Setup all namespace handlers
  setupDocumentHandlers(io)
  setupFileHandlers(io)
  setupMeetingHandlers(io)
  setupNotificationHandlers(io)
  setupTeamHandlers(io)

  // Main connection handler
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Handle authentication
    socket.on('authenticate', (data) => {
      const { userId, teamId } = data
      
      // Verify user and team (implement your auth logic)
      if (userId && teamId) {
        socket.userId = userId
        socket.teamId = teamId
        socket.emit('authenticated', { success: true })
      } else {
        socket.emit('authenticated', { success: false, message: 'Invalid credentials' })
      }
    })

    // Handle ping/pong for connection health
    socket.on('ping', (data) => {
      socket.emit('pong', { timestamp: data.timestamp, serverTime: Date.now() })
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  console.log('Socket handlers initialized')
}`

    const indexPath = path.join(this.socketDir, 'index.ts')
    
    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, indexContent)
      this.log('Created main socket index', 'success')
    } else {
      this.log('Main socket index already exists', 'info')
    }
  }

  async createNotificationModel() {
    this.log('Creating notification model...')

    // Check if notifications are already in the schema
    const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
    
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8')
      
      if (!schemaContent.includes('model Notification')) {
        const notificationModel = `

// Notification System
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  message   String
  metadata  String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}
`

        // Add to User model
        const updatedSchema = schemaContent.replace(
          /model User \{[^}]*\}/s,
          `$&\n  notifications Notification[]`
        )

        fs.writeFileSync(schemaPath, updatedSchema + notificationModel)
        this.log('Added notification model to schema', 'success')
      } else {
        this.log('Notification model already exists in schema', 'info')
      }
    }
  }

  async generateReport() {
    this.log('Generating socket fix report...')

    const report = {
      fixType: 'Missing Socket Endpoints',
      timestamp: new Date().toISOString(),
      fixesApplied: this.fixesApplied,
      errors: this.errors,
      summary: {
        totalFixes: this.fixesApplied.length,
        errors: this.errors.length,
        socketsCreated: this.requiredSockets.length
      },
      recommendations: []
    }

    if (this.errors.length > 0) {
      report.recommendations.push('Address socket creation errors')
    }

    if (this.fixesApplied.length > 0) {
      report.recommendations.push('Socket endpoints created successfully')
    }

    // Save report
    const reportPath = './socket-fix-report.json'
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    this.log(`Socket fix report saved to: ${reportPath}`, 'success')
    this.log(`Sockets created: ${report.summary.socketsCreated}/${report.summary.totalFixes}`, 'info')
  }

  async run() {
    try {
      await this.ensureSocketDirectory()
      await this.createNotificationModel()
      await this.createSocketHandlers()
      await this.createMainSocketIndex()
      await this.generateReport()

      this.log('Socket fix completed successfully!', 'success')
    } catch (error) {
      this.log(`Socket fix failed: ${error.message}`, 'error')
      await this.generateReport()
    }
  }
}

// Run the socket fixer
const fixer = new SocketFixer()
fixer.run()