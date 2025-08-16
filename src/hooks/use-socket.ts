'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  autoConnect?: boolean;
  auth?: Record<string, any>;
}

interface SocketEvents {
  'document-updated': (data: any) => void;
  'cursor-updated': (data: any) => void;
  'user-joined': (data: any) => void;
  'user-left': (data: any) => void;
  'conflict-detected': (data: any) => void;
  'drive-activity': (data: any) => void;
  'participant-joined': (data: any) => void;
  'participant-left': (data: any) => void;
  'audio-toggled': (data: any) => void;
  'video-toggled': (data: any) => void;
  'meeting-chat-message': (data: any) => void;
  'mail-received': (data: any) => void;
  'mail-read-status': (data: any) => void;
  'team-invite-sent': (data: any) => void;
  'team-member-role-changed': (data: any) => void;
  'team-settings-updated': (data: any) => void;
  'error': (data: any) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true, auth = {} } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      autoConnect,
      auth: {
        userId: auth.userId,
        teamId: auth.teamId,
        token: auth.token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      retries: 3,
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setLastError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setLastError(error.message);
      setIsConnected(false);
    });

    // Reconnection handling
    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setLastError(null);
    });

    socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      setLastError(error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      setLastError('Reconnection failed');
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [autoConnect, auth]);

  // Generic event listener
  const on = <K extends keyof SocketEvents>(
    event: K,
    callback: SocketEvents[K]
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  // Generic event emitter
  const emit = (event: string, data: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  };

  // Document collaboration methods
  const joinDocument = (documentId: string, userId: string, teamId: string) => {
    emit('join-document', { documentId, userId, teamId });
  };

  const updateDocument = (documentId: string, content: string, version: number, userId: string) => {
    emit('document-update', { documentId, content, version, userId });
  };

  const moveCursor = (documentId: string, position: number, userId: string) => {
    emit('cursor-move', { documentId, position, userId });
  };

  // Drive collaboration methods
  const joinDrive = (teamId: string, userId: string) => {
    emit('join-drive', { teamId, userId });
  };

  const notifyFileUpdate = (teamId: string, fileId: string, action: string, userId: string) => {
    emit('file-updated', { teamId, fileId, action, userId });
  };

  // Meeting methods
  const joinMeeting = (roomId: string, userId: string, teamId: string) => {
    emit('join-meeting', { roomId, userId, teamId });
  };

  const toggleAudio = (roomId: string, userId: string, isActive: boolean) => {
    emit('toggle-audio', { roomId, userId, isActive });
  };

  const toggleVideo = (roomId: string, userId: string, isActive: boolean) => {
    emit('toggle-video', { roomId, userId, isActive });
  };

  const sendMeetingChat = (roomId: string, userId: string, message: string) => {
    emit('meeting-chat', { roomId, userId, message });
  };

  // Mail methods
  const joinMail = (userId: string, teamId: string) => {
    emit('join-mail', { userId, teamId });
  };

  const notifyNewMail = (teamId: string, fromUserId: string, toUserIds: string[], subject: string) => {
    emit('new-mail', { teamId, fromUserId, toUserIds, subject });
  };

  const markMailRead = (teamId: string, mailId: string, userId: string) => {
    emit('mail-read', { teamId, mailId, userId });
  };

  // Team methods
  const joinTeam = (teamId: string, userId: string) => {
    emit('join-team', { teamId, userId });
  };

  const sendTeamInvite = (teamId: string, inviterUserId: string, invitedEmail: string, role: string) => {
    emit('team-invite', { teamId, inviterUserId, invitedEmail, role });
  };

  const updateTeamMember = (teamId: string, userId: string, newRole: string, updatedBy: string) => {
    emit('team-member-updated', { teamId, userId, newRole, updatedBy });
  };

  const changeTeamSettings = (teamId: string, setting: string, value: any, changedBy: string) => {
    emit('team-settings-changed', { teamId, setting, value, changedBy });
  };

  return {
    socket: socketRef.current,
    isConnected,
    lastError,
    on,
    emit,
    // Document collaboration
    joinDocument,
    updateDocument,
    moveCursor,
    // Drive collaboration
    joinDrive,
    notifyFileUpdate,
    // Meeting
    joinMeeting,
    toggleAudio,
    toggleVideo,
    sendMeetingChat,
    // Mail
    joinMail,
    notifyNewMail,
    markMailRead,
    // Team
    joinTeam,
    sendTeamInvite,
    updateTeamMember,
    changeTeamSettings,
  };
}