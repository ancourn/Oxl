"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
  Settings,
  MoreVertical
} from "lucide-react";

interface Meeting {
  id: string;
  name?: string;
  roomId: string;
  hostId: string;
  host: {
    email: string;
    name?: string;
  };
  participants: Array<{
    id: string;
    user: {
      email: string;
      name?: string;
    };
  }>;
  messages: Array<{
    id: string;
    message: string;
    user: {
      email: string;
      name?: string;
    };
    createdAt: string;
  }>;
}

interface MeetComponentProps {
  teamId?: string;
}

export default function MeetComponent({ teamId }: MeetComponentProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMeetings();
  }, [teamId]);

  useEffect(() => {
    if (selectedMeeting && isInMeeting) {
      const interval = setInterval(() => {
        fetchMeetingMessages();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedMeeting, isInMeeting]);

  const fetchMeetings = async () => {
    try {
      const response = await fetch(`/api/meet?teamId=${teamId}`);
      const data = await response.json();
      setMeetings(data);
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    }
  };

  const fetchMeetingMessages = async () => {
    if (!selectedMeeting) return;
    
    try {
      const response = await fetch(`/api/meet/${selectedMeeting.roomId}/messages`);
      const data = await response.json();
      // Update meeting with new messages
      setSelectedMeeting(prev => prev ? { ...prev, messages: data } : null);
    } catch (error) {
      console.error("Failed to fetch meeting messages:", error);
    }
  };

  const createMeeting = async () => {
    try {
      const response = await fetch("/api/meet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newMeetingTitle,
          teamId
        }),
      });
      const newMeeting = await response.json();
      setMeetings([newMeeting, ...meetings]);
      setNewMeetingTitle("");
      setShowCreateMeeting(false);
    } catch (error) {
      console.error("Failed to create meeting:", error);
    }
  };

  const joinMeeting = async (meeting: Meeting) => {
    try {
      await fetch(`/api/meet/${meeting.roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      const response = await fetch(`/api/meet/${meeting.roomId}`);
      const meetingData = await response.json();
      setSelectedMeeting(meetingData);
      setIsInMeeting(true);
    } catch (error) {
      console.error("Failed to join meeting:", error);
    }
  };

  const leaveMeeting = () => {
    setIsInMeeting(false);
    setSelectedMeeting(null);
    setShowChat(false);
  };

  const sendMessage = async () => {
    if (!chatMessage.trim() || !selectedMeeting) return;

    try {
      await fetch(`/api/meet/${selectedMeeting.roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatMessage }),
      });
      setChatMessage("");
      fetchMeetingMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const copyMeetingLink = () => {
    if (selectedMeeting) {
      navigator.clipboard.writeText(`${window.location.origin}/meet/${selectedMeeting.roomId}`);
    }
  };

  const getInitials = (name: string, email: string) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase();
    return email[0].toUpperCase();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedMeeting?.messages]);

  if (isInMeeting && selectedMeeting) {
    return (
      <div className="h-full flex">
        {/* Main Meeting Area */}
        <div className={`flex-1 ${showChat ? 'pr-80' : ''}`}>
          <div className="h-full bg-black relative">
            {/* Video Grid */}
            <div className="h-full flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4 p-4">
                {/* Local Video */}
                <div className="relative bg-gray-800 rounded-lg aspect-video flex items-center justify-center">
                  {isVideoOn ? (
                    <div className="w-full h-full bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">You</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Avatar className="w-20 h-20 mx-auto mb-2">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <p className="text-white">Camera Off</p>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    You
                  </div>
                </div>
                
                {/* Remote Videos */}
                {selectedMeeting.participants.slice(0, 3).map((participant, index) => (
                  <div key={participant.id} className="relative bg-gray-800 rounded-lg aspect-video flex items-center justify-center">
                    <div className="w-full h-full bg-green-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">
                        {getInitials(participant.user.name || "", participant.user.email)}
                      </span>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {participant.user.name || participant.user.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Meeting Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant={isMicOn ? "default" : "destructive"}
                  size="lg"
                  onClick={() => setIsMicOn(!isMicOn)}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
                
                <Button
                  variant={isVideoOn ? "default" : "destructive"}
                  size="lg"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                >
                  {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
                
                <Button
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="lg"
                  onClick={() => setIsScreenSharing(!isScreenSharing)}
                >
                  {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </Button>
                
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => setShowChat(!showChat)}
                >
                  <MessageSquare className="w-5 h-5" />
                </Button>
                
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={leaveMeeting}
                >
                  <PhoneOff className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Meeting Info */}
            <div className="absolute top-4 left-4 bg-black/50 text-white p-3 rounded-lg">
              <h3 className="font-semibold">{selectedMeeting.name || "Meeting"}</h3>
              <p className="text-sm opacity-75">Room: {selectedMeeting.roomId}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyMeetingLink}
                className="mt-2 text-white hover:text-white"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-card border-l flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Chat</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedMeeting.messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(message.user.name || "", message.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">
                        {message.user.name || message.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <p className="text-sm">{message.message}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Meeting List */}
      <div className="w-80 border-r bg-card/50">
        <div className="p-4">
          <Button 
            onClick={() => setShowCreateMeeting(true)}
            className="w-full mb-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Meeting
          </Button>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Recent Meetings</h3>
            {meetings.map((meeting) => (
              <Card
                key={meeting.id}
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => joinMeeting(meeting)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Video className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {meeting.name || "Untitled Meeting"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(meeting.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {meeting.participants.length} participants
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {meetings.length === 0 && (
              <div className="text-center py-8">
                <Video className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No meetings yet</p>
                <p className="text-xs text-muted-foreground">Create your first meeting</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Video Meetings</h2>
          <p className="text-muted-foreground mb-6">
            Start or join a video meeting with your team
          </p>
          <Button onClick={() => setShowCreateMeeting(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Meeting
          </Button>
        </div>
      </div>

      {/* Create Meeting Dialog */}
      <Dialog open={showCreateMeeting} onOpenChange={setShowCreateMeeting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Meeting title (optional)"
              value={newMeetingTitle}
              onChange={(e) => setNewMeetingTitle(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateMeeting(false)}>
                Cancel
              </Button>
              <Button onClick={createMeeting}>
                <Video className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}