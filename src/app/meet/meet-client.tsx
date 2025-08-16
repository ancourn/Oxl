'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  MonitorOff,
  MessageSquare,
  Users,
  Plus,
  Copy,
  Share,
  Settings
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface MeetRoom {
  id: string;
  name: string;
  description?: string;
  roomId: string;
  isLive: boolean;
  maxParticipants: number;
  host: {
    id: string;
    name?: string;
    email: string;
  };
  participants: Array<{
    id: string;
    user: {
      id: string;
      name?: string;
      email: string;
    };
  }>;
}

interface MeetUser {
  id: string;
  name: string;
  email: string;
  socketId: string;
}

interface MeetMessage {
  id: string;
  user: MeetUser;
  content: string;
  type: string;
  timestamp: string;
}

export default function MeetClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  
  const [rooms, setRooms] = useState<MeetRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<MeetRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inMeeting, setInMeeting] = useState(false);
  
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    maxParticipants: 50,
  });
  
  // Meeting state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [messages, setMessages] = useState<MeetMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  const fetchRooms = async () => {
    try {
      const currentTeamId = localStorage.getItem('currentTeamId');
      if (!currentTeamId) {
        console.error('No team selected');
        return;
      }

      const response = await fetch(`/api/meet?teamId=${currentTeamId}`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const currentTeamId = localStorage.getItem('currentTeamId');
      if (!currentTeamId) {
        console.error('No team selected');
        return;
      }

      const response = await fetch('/api/meet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newRoom,
          teamId: currentTeamId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreateDialogOpen(false);
        setNewRoom({ name: '', description: '', maxParticipants: 50 });
        fetchRooms();
        
        // Auto-join the created room
        handleJoinRoom(data.room);
      } else {
        const error = await response.json();
        console.error('Error creating room:', error);
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleJoinRoom = async (room: MeetRoom) => {
    setJoining(true);
    
    try {
      const currentTeamId = localStorage.getItem('currentTeamId');
      if (!currentTeamId) {
        console.error('No team selected');
        return;
      }

      const response = await fetch('/api/meet/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: room.roomId,
          teamId: currentTeamId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentRoom(data.room);
        await initializeMeeting(data.room);
      } else {
        const error = await response.json();
        console.error('Error joining room:', error);
        alert(error.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
    } finally {
      setJoining(false);
    }
  };

  const initializeMeeting = async (room: MeetRoom) => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize socket connection
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
      socketRef.current = socket;

      const user: MeetUser = {
        id: session?.user?.email || '',
        name: session?.user?.name || session?.user?.email || '',
        email: session?.user?.email || '',
        socketId: socket.id,
      };

      // Join the meet room
      socket.emit('join-meet', {
        roomId: room.roomId,
        user,
      });

      // Set up socket event handlers
      socket.on('user-joined', (data: { user: MeetUser; users: MeetUser[] }) => {
        console.log('User joined:', data.user);
        // Handle new user joining (create peer connection)
        createPeerConnection(data.user.socketId, true);
      });

      socket.on('user-left', (data: { user: MeetUser; users: MeetUser[] }) => {
        console.log('User left:', data.user);
        // Clean up peer connection
        const pc = peerConnections.current.get(data.user.socketId);
        if (pc) {
          pc.close();
          peerConnections.current.delete(data.user.socketId);
        }
        // Remove remote stream
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(data.user.socketId);
          return newStreams;
        });
      });

      socket.on('signal', async (data: { signal: any; from: string }) => {
        const pc = peerConnections.current.get(data.from);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data.signal));
        }
      });

      socket.on('meet-message', (message: MeetMessage) => {
        setMessages(prev => [...prev, message]);
      });

      socket.on('room-users', (data: { users: MeetUser[] }) => {
        console.log('Room users:', data.users);
        // Create peer connections for existing users
        data.users.forEach((user) => {
          if (user.socketId !== socket.id) {
            createPeerConnection(user.socketId, false);
          }
        });
      });

      setInMeeting(true);
    } catch (error) {
      console.error('Error initializing meeting:', error);
      alert('Failed to initialize meeting. Please check camera and microphone permissions.');
    }
  };

  const createPeerConnection = async (socketId: string, isInitiator: boolean) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      // Add local stream to peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream!);
        });
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.set(socketId, event.streams[0]);
          return newStreams;
        });
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('signal', {
            roomId: currentRoom?.roomId,
            signal: event.candidate,
            to: socketId,
          });
        }
      };

      // Create and send offer if initiator
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socketRef.current?.emit('signal', {
          roomId: currentRoom?.roomId,
          signal: offer,
          to: socketId,
        });
      }

      peerConnections.current.set(socketId, pc);
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
      
      // Notify others
      const user: MeetUser = {
        id: session?.user?.email || '',
        name: session?.user?.name || session?.user?.email || '',
        email: session?.user?.email || '',
        socketId: socketRef.current?.id || '',
      };
      
      socketRef.current?.emit('media-toggle', {
        roomId: currentRoom?.roomId,
        type: 'audio',
        enabled: audioTrack.enabled,
        user,
      });
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      
      // Notify others
      const user: MeetUser = {
        id: session?.user?.email || '',
        name: session?.user?.name || session?.user?.email || '',
        email: session?.user?.email || '',
        socketId: socketRef.current?.id || '',
      };
      
      socketRef.current?.emit('media-toggle', {
        roomId: currentRoom?.roomId,
        type: 'video',
        enabled: videoTrack.enabled,
        user,
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen share
        if (localStream) {
          const screenTrack = localStream.getVideoTracks().find(track => 
            track.label.includes('screen') || track.label.includes('display')
          );
          if (screenTrack) {
            screenTrack.stop();
            localStream.removeTrack(screenTrack);
            
            // Get camera stream again
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];
            localStream.addTrack(cameraTrack);
            
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStream;
            }
          }
        }
        setIsScreenSharing(false);
      } else {
        // Start screen share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        
        if (localStream) {
          // Remove camera track
          const cameraTrack = localStream.getVideoTracks().find(track => 
            !track.label.includes('screen') && !track.label.includes('display')
          );
          if (cameraTrack) {
            localStream.removeTrack(cameraTrack);
          }
          
          // Add screen track
          const screenTrack = screenStream.getVideoTracks()[0];
          localStream.addTrack(screenTrack);
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        }
        
        setIsScreenSharing(true);
      }
      
      // Notify others
      const user: MeetUser = {
        id: session?.user?.email || '',
        name: session?.user?.name || session?.user?.email || '',
        email: session?.user?.email || '',
        socketId: socketRef.current?.id || '',
      };
      
      socketRef.current?.emit('screen-share', {
        roomId: currentRoom?.roomId,
        sharing: !isScreenSharing,
        user,
      });
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const leaveMeeting = async () => {
    try {
      if (currentRoom) {
        const currentTeamId = localStorage.getItem('currentTeamId');
        if (currentTeamId) {
          await fetch('/api/meet/leave', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              roomId: currentRoom.roomId,
              teamId: currentTeamId,
            }),
          });
        }
      }

      // Clean up
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      if (socketRef.current) {
        const user: MeetUser = {
          id: session?.user?.email || '',
          name: session?.user?.name || session?.user?.email || '',
          email: session?.user?.email || '',
          socketId: socketRef.current.id,
        };
        
        socketRef.current.emit('leave-meet', {
          roomId: currentRoom?.roomId,
          user,
        });
        
        socketRef.current.disconnect();
      }

      // Clean up peer connections
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();

      setLocalStream(null);
      setRemoteStreams(new Map());
      setCurrentRoom(null);
      setInMeeting(false);
      setMessages([]);
      setShowChat(false);
      
      fetchRooms();
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && socketRef.current) {
      const user: MeetUser = {
        id: session?.user?.email || '',
        name: session?.user?.name || session?.user?.email || '',
        email: session?.user?.email || '',
        socketId: socketRef.current.id,
      };
      
      socketRef.current.emit('meet-message', {
        roomId: currentRoom?.roomId,
        message: newMessage,
        user,
      });
      
      setNewMessage('');
    }
  };

  const copyRoomLink = () => {
    if (currentRoom) {
      const link = `${window.location.origin}/meet?roomId=${currentRoom.roomId}`;
      navigator.clipboard.writeText(link);
      alert('Room link copied to clipboard!');
    }
  };

  useEffect(() => {
    if (session) {
      fetchRooms();
      
      // Auto-join if roomId is provided in URL
      if (roomId) {
        const room = rooms.find(r => r.roomId === roomId);
        if (room) {
          handleJoinRoom(room);
        }
      }
    }
  }, [session, roomId]);

  useEffect(() => {
    return () => {
      // Clean up on unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Please sign in to access meetings</p>
        </div>
      </div>
    );
  }

  if (inMeeting && currentRoom) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Meeting Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">{currentRoom.name}</h1>
            <Badge variant="secondary">
              {remoteStreams.size + 1} participants
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={copyRoomLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat ({messages.length})
            </Button>
            <Button variant="destructive" size="sm" onClick={leaveMeeting}>
              <PhoneOff className="h-4 w-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>

        {/* Meeting Content */}
        <div className="flex h-[calc(100vh-80px)]">
          {/* Video Area */}
          <div className="flex-1 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* Local Video */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded">
                  You {isAudioEnabled ? '🎤' : '🔇'} {isVideoEnabled ? '📹' : '📵'}
                </div>
              </div>

              {/* Remote Videos */}
              {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
                <div key={socketId} className="relative bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={(video) => {
                      if (video) video.srcObject = stream;
                    }}
                  />
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 px-3 py-1 rounded">
                    Remote User
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Sidebar */}
          {showChat && (
            <div className="w-80 bg-gray-900 p-4 flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Chat</h3>
              
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {messages.map((message) => (
                  <div key={message.id} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">{message.user.name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Meeting Controls */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 p-4">
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleAudio}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleVideo}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            
            <Button
              variant={isScreenSharing ? "default" : "secondary"}
              size="lg"
              onClick={toggleScreenShare}
            >
              {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="destructive"
              size="lg"
              onClick={leaveMeeting}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Meet</h1>
          <p className="text-muted-foreground">Video conferencing for your team</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Meeting Room</DialogTitle>
              <DialogDescription>
                Create a new video meeting room for your team
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <Label htmlFor="name">Room Name</Label>
                <Input
                  id="name"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder="Team Standup"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  placeholder="Daily team standup meeting"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="2"
                  max="100"
                  value={newRoom.maxParticipants}
                  onChange={(e) => setNewRoom({ ...newRoom, maxParticipants: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Room
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading meeting rooms...</p>
        </div>
      ) : rooms.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No meeting rooms</h3>
            <p className="text-muted-foreground mb-4">
              Create your first meeting room to get started
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Room
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {room.name}
                  {room.isLive && <Badge variant="default">Live</Badge>}
                </CardTitle>
                <CardDescription>{room.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Host:</span>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {room.host.name?.[0] || room.host.email[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>{room.host.name || room.host.email}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Participants:</span>
                    <span>{room.participants.length} / {room.maxParticipants}</span>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleJoinRoom(room)}
                    disabled={joining}
                  >
                    {joining ? 'Joining...' : 'Join Room'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}