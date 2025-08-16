import { Server } from 'socket.io';
import { db } from './db';
import { UserRole, Plan } from '@prisma/client';

interface UserSocket {
  userId: string;
  teamId: string;
  socketId: string;
}

interface DocumentCursor {
  userId: string;
  documentId: string;
  position: number;
  color: string;
}

interface MeetingParticipant {
  userId: string;
  roomId: string;
  socketId: string;
  isAudioActive: boolean;
  isVideoActive: boolean;
}

// Global stores for active connections
const activeUsers = new Map<string, UserSocket>();
const documentCursors = new Map<string, DocumentCursor[]>();
const meetingParticipants = new Map<string, MeetingParticipant[]>();
const teamRooms = new Map<string, Set<string>>();

export const setupEnhancedSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Authentication middleware
    socket.use((packet, next) => {
      const { userId, teamId, token } = packet[1] || {};
      
      if (!userId || !teamId) {
        return next(new Error('Authentication required'));
      }
      
      // Verify user exists and has access to team
      // In production, you'd validate the JWT token here
      next();
    });

    // === DOCUMENT COLLABORATION ===
    
    socket.on('join-document', async ({ documentId, userId, teamId }) => {
      try {
        // Verify user has access to document
        const document = await db.document.findFirst({
          where: { 
            id: documentId,
            teamId: teamId,
            OR: [
              { createdById: userId },
              { collaborators: { some: { userId: userId } } }
            ]
          }
        });

        if (!document) {
          socket.emit('error', { message: 'Document not found or access denied' });
          return;
        }

        // Join document room
        socket.join(`document-${documentId}`);
        
        // Track active user
        activeUsers.set(socket.id, { userId, teamId, socketId: socket.id });
        
        // Notify other users
        socket.to(`document-${documentId}`).emit('user-joined', {
          userId,
          documentId,
          timestamp: new Date().toISOString()
        });

        // Send current document state
        socket.emit('document-state', {
          id: document.id,
          title: document.title,
          content: document.content,
          lastModified: document.updatedAt,
          collaborators: await getDocumentCollaborators(documentId)
        });

        console.log(`User ${userId} joined document ${documentId}`);
      } catch (error) {
        console.error('Error joining document:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // Document content updates with conflict resolution
    socket.on('document-update', async ({ documentId, content, version, userId }) => {
      try {
        // Get current document version
        const currentDoc = await db.document.findUnique({
          where: { id: documentId },
          select: { version: true, content: true }
        });

        if (!currentDoc) {
          socket.emit('error', { message: 'Document not found' });
          return;
        }

        // Conflict resolution: if versions don't match, reject update
        if (currentDoc.version !== version) {
          socket.emit('conflict-detected', {
            documentId,
            serverVersion: currentDoc.version,
            clientVersion: version,
            serverContent: currentDoc.content
          });
          return;
        }

        // Update document
        const updatedDoc = await db.document.update({
          where: { id: documentId },
          data: {
            content,
            version: version + 1,
            updatedAt: new Date()
          }
        });

        // Broadcast update to all collaborators
        io.to(`document-${documentId}`).emit('document-updated', {
          documentId,
          content: updatedDoc.content,
          version: updatedDoc.version,
          updatedBy: userId,
          timestamp: updatedDoc.updatedAt
        });

        console.log(`Document ${documentId} updated by user ${userId}`);
      } catch (error) {
        console.error('Error updating document:', error);
        socket.emit('error', { message: 'Failed to update document' });
      }
    });

    // Cursor position tracking
    socket.on('cursor-move', ({ documentId, position, userId }) => {
      const cursorData: DocumentCursor = {
        userId,
        documentId,
        position,
        color: generateUserColor(userId)
      };

      // Store cursor position
      if (!documentCursors.has(documentId)) {
        documentCursors.set(documentId, []);
      }
      const cursors = documentCursors.get(documentId)!;
      const existingIndex = cursors.findIndex(c => c.userId === userId);
      
      if (existingIndex >= 0) {
        cursors[existingIndex] = cursorData;
      } else {
        cursors.push(cursorData);
      }

      // Broadcast to other users
      socket.to(`document-${documentId}`).emit('cursor-updated', cursorData);
    });

    // === DRIVE COLLABORATION ===

    socket.on('join-drive', ({ teamId, userId }) => {
      socket.join(`drive-${teamId}`);
      console.log(`User ${userId} joined team drive ${teamId}`);
    });

    socket.on('file-updated', ({ teamId, fileId, action, userId }) => {
      // Broadcast file updates to team members
      socket.to(`drive-${teamId}`).emit('drive-activity', {
        fileId,
        action, // 'created', 'updated', 'deleted', 'moved'
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // === MEETING ENHANCEMENTS ===

    socket.on('join-meeting', async ({ roomId, userId, teamId }) => {
      try {
        // Verify meeting exists and user has access
        const meeting = await db.meeting.findFirst({
          where: { 
            id: roomId,
            teamId: teamId
          }
        });

        if (!meeting) {
          socket.emit('error', { message: 'Meeting not found' });
          return;
        }

        // Check participant limit
        const participants = meetingParticipants.get(roomId) || [];
        if (participants.length >= 50) { // Pro tier limit
          socket.emit('error', { message: 'Meeting is full' });
          return;
        }

        // Join meeting room
        socket.join(`meeting-${roomId}`);
        
        // Track participant
        const participant: MeetingParticipant = {
          userId,
          roomId,
          socketId: socket.id,
          isAudioActive: false,
          isVideoActive: false
        };

        if (!meetingParticipants.has(roomId)) {
          meetingParticipants.set(roomId, []);
        }
        meetingParticipants.get(roomId)!.push(participant);

        // Notify other participants
        socket.to(`meeting-${roomId}`).emit('participant-joined', {
          userId,
          roomId,
          timestamp: new Date().toISOString()
        });

        // Send current participant list
        socket.emit('meeting-participants', {
          roomId,
          participants: meetingParticipants.get(roomId)!
        });

        console.log(`User ${userId} joined meeting ${roomId}`);
      } catch (error) {
        console.error('Error joining meeting:', error);
        socket.emit('error', { message: 'Failed to join meeting' });
      }
    });

    // Meeting stream controls
    socket.on('toggle-audio', ({ roomId, userId, isActive }) => {
      const participants = meetingParticipants.get(roomId) || [];
      const participant = participants.find(p => p.userId === userId);
      
      if (participant) {
        participant.isAudioActive = isActive;
        socket.to(`meeting-${roomId}`).emit('audio-toggled', {
          userId,
          isActive,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('toggle-video', ({ roomId, userId, isActive }) => {
      const participants = meetingParticipants.get(roomId) || [];
      const participant = participants.find(p => p.userId === userId);
      
      if (participant) {
        participant.isVideoActive = isActive;
        socket.to(`meeting-${roomId}`).emit('video-toggled', {
          userId,
          isActive,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Meeting chat
    socket.on('meeting-chat', ({ roomId, userId, message }) => {
      const chatData = {
        userId,
        message,
        timestamp: new Date().toISOString(),
        id: generateMessageId()
      };

      io.to(`meeting-${roomId}`).emit('meeting-chat-message', chatData);
    });

    // === MAIL REAL-TIME UPDATES ===

    socket.on('join-mail', ({ userId, teamId }) => {
      socket.join(`mail-${userId}`);
      socket.join(`team-mail-${teamId}`);
      console.log(`User ${userId} joined mail updates for team ${teamId}`);
    });

    socket.on('new-mail', ({ teamId, fromUserId, toUserIds, subject }) => {
      // Notify recipients of new mail
      toUserIds.forEach(toUserId => {
        io.to(`mail-${toUserId}`).emit('mail-received', {
          fromUserId,
          subject,
          teamId,
          timestamp: new Date().toISOString()
        });
      });
    });

    socket.on('mail-read', ({ teamId, mailId, userId }) => {
      // Update read status and notify
      socket.to(`team-mail-${teamId}`).emit('mail-read-status', {
        mailId,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // === TEAM EVENTS ===

    socket.on('join-team', ({ teamId, userId }) => {
      socket.join(`team-${teamId}`);
      
      if (!teamRooms.has(teamId)) {
        teamRooms.set(teamId, new Set());
      }
      teamRooms.get(teamId)!.add(socket.id);

      console.log(`User ${userId} joined team room ${teamId}`);
    });

    socket.on('team-invite', ({ teamId, inviterUserId, invitedEmail, role }) => {
      // Notify team members about new invite
      socket.to(`team-${teamId}`).emit('team-invite-sent', {
        inviterUserId,
        invitedEmail,
        role,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('team-member-updated', ({ teamId, userId, newRole, updatedBy }) => {
      // Notify team members about role change
      socket.to(`team-${teamId}`).emit('team-member-role-changed', {
        userId,
        newRole,
        updatedBy,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('team-settings-changed', ({ teamId, setting, value, changedBy }) => {
      // Notify team members about settings change
      socket.to(`team-${teamId}`).emit('team-settings-updated', {
        setting,
        value,
        changedBy,
        timestamp: new Date().toISOString()
      });
    });

    // === CONNECTION MANAGEMENT ===

    // Handle reconnection
    socket.on('reconnect', () => {
      console.log('Client reconnected:', socket.id);
      // Restore previous sessions if any
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Clean up from all rooms
      const userSocket = activeUsers.get(socket.id);
      if (userSocket) {
        // Notify document collaborators
        socket.to(`document-${userSocket.userId}`).emit('user-left', {
          userId: userSocket.userId,
          timestamp: new Date().toISOString()
        });
        
        activeUsers.delete(socket.id);
      }

      // Clean up meeting participants
      for (const [roomId, participants] of meetingParticipants) {
        const index = participants.findIndex(p => p.socketId === socket.id);
        if (index >= 0) {
          const participant = participants[index];
          participants.splice(index, 1);
          
          socket.to(`meeting-${roomId}`).emit('participant-left', {
            userId: participant.userId,
            roomId,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Clean up team rooms
      for (const [teamId, sockets] of teamRooms) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          teamRooms.delete(teamId);
        }
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'An error occurred' });
    });
  });
};

// Helper functions
function generateUserColor(userId: string): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function generateMessageId(): string {
  return Math.random().toString(36).substr(2, 9);
}

async function getDocumentCollaborators(documentId: string) {
  // This would query the database for active collaborators
  // For now, return a placeholder
  return [];
}