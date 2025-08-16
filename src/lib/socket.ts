import { Server } from 'socket.io';

interface MeetUser {
  id: string;
  name: string;
  email: string;
  socketId: string;
}

interface MeetRoom {
  [roomId: string]: {
    users: MeetUser[];
  };
}

const meetRooms: MeetRoom = {};

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Handle joining a meet room
    socket.on('join-meet', async (data: { roomId: string; user: MeetUser }) => {
      const { roomId, user } = data;
      
      // Join the socket room
      socket.join(roomId);
      
      // Initialize room if it doesn't exist
      if (!meetRooms[roomId]) {
        meetRooms[roomId] = { users: [] };
      }
      
      // Add user to room
      meetRooms[roomId].users.push(user);
      
      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        user,
        users: meetRooms[roomId].users,
      });
      
      // Send current users to the joining user
      socket.emit('room-users', {
        users: meetRooms[roomId].users,
      });
      
      console.log(`User ${user.name} joined room ${roomId}`);
    });
    
    // Handle WebRTC signaling
    socket.on('signal', (data: { roomId: string; signal: any; to: string }) => {
      const { roomId, signal, to } = data;
      io.to(to).emit('signal', {
        signal,
        from: socket.id,
      });
    });
    
    // Handle chat messages in meet room
    socket.on('meet-message', async (data: { roomId: string; message: string; user: MeetUser }) => {
      const { roomId, message, user } = data;
      
      // Broadcast message to all users in the room
      io.to(roomId).emit('meet-message', {
        id: Date.now().toString(),
        user,
        content: message,
        type: 'TEXT',
        timestamp: new Date().toISOString(),
      });
    });
    
    // Handle screen share start/stop
    socket.on('screen-share', (data: { roomId: string; sharing: boolean; user: MeetUser }) => {
      const { roomId, sharing, user } = data;
      
      // Broadcast screen share status to room
      socket.to(roomId).emit('screen-share', {
        sharing,
        user,
      });
    });
    
    // Handle audio/video toggle
    socket.on('media-toggle', (data: { roomId: string; type: 'audio' | 'video'; enabled: boolean; user: MeetUser }) => {
      const { roomId, type, enabled, user } = data;
      
      // Broadcast media status to room
      socket.to(roomId).emit('media-toggle', {
        type,
        enabled,
        user,
      });
    });
    
    // Handle leaving a meet room
    socket.on('leave-meet', (data: { roomId: string; user: MeetUser }) => {
      const { roomId, user } = data;
      
      // Remove user from room
      if (meetRooms[roomId]) {
        meetRooms[roomId].users = meetRooms[roomId].users.filter(u => u.socketId !== socket.id);
        
        // Notify others in the room
        socket.to(roomId).emit('user-left', {
          user,
          users: meetRooms[roomId].users,
        });
        
        // Clean up empty rooms
        if (meetRooms[roomId].users.length === 0) {
          delete meetRooms[roomId];
        }
      }
      
      // Leave the socket room
      socket.leave(roomId);
      
      console.log(`User ${user.name} left room ${roomId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Clean up user from all rooms
      Object.keys(meetRooms).forEach(roomId => {
        const userIndex = meetRooms[roomId].users.findIndex(u => u.socketId === socket.id);
        if (userIndex !== -1) {
          const user = meetRooms[roomId].users[userIndex];
          meetRooms[roomId].users.splice(userIndex, 1);
          
          // Notify others in the room
          socket.to(roomId).emit('user-left', {
            user,
            users: meetRooms[roomId].users,
          });
          
          // Clean up empty rooms
          if (meetRooms[roomId].users.length === 0) {
            delete meetRooms[roomId];
          }
        }
      });
    });
  });
};