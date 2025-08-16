"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Users, 
  Mail, 
  Video, 
  FileText, 
  HardDrive, 
  Plus, 
  Settings,
  LogOut,
  ChevronDown
} from "lucide-react";
import MailComponent from "@/components/mail/MailComponent";
import MeetComponent from "@/components/meet/MeetComponent";
import DocsComponent from "@/components/docs/DocsComponent";
import DriveComponent from "@/components/drive/DriveComponent";

interface Team {
  id: string;
  name: string;
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      email: string;
      name?: string;
    };
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
  }>;
}

interface MailData {
  id: string;
  subject: string;
  body?: string;
  isRead: boolean;
  folder: string;
  from: string;
  to: string;
  createdAt: string;
}

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [mails, setMails] = useState<MailData[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchMails();
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams");
      const data = await response.json();
      setTeams(data);
      if (data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  };

  const fetchMails = async () => {
    try {
      const response = await fetch(`/api/mail?folder=INBOX&teamId=${selectedTeam?.id}`);
      const data = await response.json();
      setMails(data);
    } catch (error) {
      console.error("Failed to fetch mails:", error);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName }),
      });
      const newTeam = await response.json();
      setTeams([...teams, newTeam]);
      setSelectedTeam(newTeam);
      setNewTeamName("");
      setShowCreateTeam(false);
    } catch (error) {
      console.error("Failed to create team:", error);
    }
  };

  const getInitials = (name: string, email: string) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase();
    if (email) {
      const emailName = email.split("@")[0];
      return emailName.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">O</span>
            </div>
            <h1 className="text-xl font-semibold">Oxl Workspace</h1>
          </div>

          {/* Team Selector */}
          <div className="flex-1 flex items-center justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>{selectedTeam?.name || "Select Team"}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {teams.map((team) => (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                  >
                    {team.name}
                    <Badge variant="secondary" className="ml-2">
                      {team.subscriptions[0]?.status || "FREE"}
                    </Badge>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => setShowCreateTeam(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 border-r bg-card/50">
          <nav className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
              <TabsList className="grid grid-cols-1 h-auto bg-transparent p-0 space-y-1">
                <TabsTrigger
                  value="dashboard"
                  className="w-full justify-start data-[state=active]:bg-accent"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  </div>
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="mail"
                  className="w-full justify-start data-[state=active]:bg-accent"
                >
                  <Mail className="w-5 h-5 mr-3" />
                  Mail
                </TabsTrigger>
                <TabsTrigger
                  value="meet"
                  className="w-full justify-start data-[state=active]:bg-accent"
                >
                  <Video className="w-5 h-5 mr-3" />
                  Meet
                </TabsTrigger>
                <TabsTrigger
                  value="docs"
                  className="w-full justify-start data-[state=active]:bg-accent"
                >
                  <FileText className="w-5 h-5 mr-3" />
                  Docs
                </TabsTrigger>
                <TabsTrigger
                  value="drive"
                  className="w-full justify-start data-[state=active]:bg-accent"
                >
                  <HardDrive className="w-5 h-5 mr-3" />
                  Drive
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedTeam?.members.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unread Mails</CardTitle>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {mails.filter(m => !m.isRead).length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">2.4 GB</div>
                    <p className="text-xs text-muted-foreground">of 15 GB</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Plan</CardTitle>
                    <Badge variant={selectedTeam?.subscriptions[0]?.status === "ACTIVE" ? "default" : "secondary"}>
                      {selectedTeam?.subscriptions[0]?.status || "FREE"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {selectedTeam?.subscriptions[0]?.status === "ACTIVE" ? "Active" : "Inactive"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mails.slice(0, 5).map((mail) => (
                      <div key={mail.id} className="flex items-center space-x-4">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {getInitials("", mail.from)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{mail.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            From {mail.from}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(mail.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mail">
              <div className="h-[calc(100vh-120px)]">
                <MailComponent teamId={selectedTeam?.id} />
              </div>
            </TabsContent>

            <TabsContent value="meet">
              <div className="h-[calc(100vh-120px)]">
                <MeetComponent teamId={selectedTeam?.id} />
              </div>
            </TabsContent>

            <TabsContent value="docs">
              <div className="h-[calc(100vh-120px)]">
                <DocsComponent teamId={selectedTeam?.id} />
              </div>
            </TabsContent>

            <TabsContent value="drive">
              <div className="h-[calc(100vh-120px)]">
                <DriveComponent teamId={selectedTeam?.id} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
                Cancel
              </Button>
              <Button onClick={createTeam}>Create Team</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}