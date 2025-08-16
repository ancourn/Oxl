"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
  Mail, 
  Send, 
  Inbox, 
  FileText, 
  Trash2, 
  MoreVertical,
  Search,
  Plus,
  Reply,
  CornerUpLeft,
  CornerUpRight
} from "lucide-react";

interface Mail {
  id: string;
  subject: string;
  body?: string;
  isRead: boolean;
  folder: string;
  from: string;
  to: string;
  createdAt: string;
}

interface MailComponentProps {
  teamId?: string;
}

export default function MailComponent({ teamId }: MailComponentProps) {
  const [mails, setMails] = useState<Mail[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("INBOX");
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    toEmail: "",
    subject: "",
    body: ""
  });
  const [composeMode, setComposeMode] = useState<"new" | "reply" | "forward">("new");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchMails();
  }, [selectedFolder, teamId]);

  const fetchMails = async () => {
    if (!teamId) {
      setMails([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/mail?folder=${selectedFolder}&teamId=${teamId}`);
      const data = await response.json();
      setMails(data);
    } catch (error) {
      console.error("Failed to fetch mails:", error);
      setMails([]);
    }
  };

  const sendMail = async () => {
    if (!composeData.toEmail || !composeData.subject || !teamId) return;

    try {
      await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: composeData.toEmail,
          subject: composeData.subject,
          body: composeData.body,
          teamId
        }),
      });
      
      setComposeData({ toEmail: "", subject: "", body: "" });
      setShowCompose(false);
      setComposeMode("new");
      fetchMails();
    } catch (error) {
      console.error("Failed to send mail:", error);
    }
  };

  const replyMail = () => {
    if (!selectedMail) return;
    
    setComposeMode("reply");
    setComposeData({
      toEmail: selectedMail.from,
      subject: `Re: ${selectedMail.subject}`,
      body: `\n\n---\nOn ${new Date(selectedMail.createdAt).toLocaleString()}, ${selectedMail.from} wrote:\n${selectedMail.body || ""}`
    });
    setShowCompose(true);
  };

  const forwardMail = () => {
    if (!selectedMail) return;
    
    setComposeMode("forward");
    setComposeData({
      toEmail: "",
      subject: `Fwd: ${selectedMail.subject}`,
      body: `\n\n---\nForwarded message from ${selectedMail.from}:\nSubject: ${selectedMail.subject}\nDate: ${new Date(selectedMail.createdAt).toLocaleString()}\n\n${selectedMail.body || ""}`
    });
    setShowCompose(true);
  };

  const openCompose = () => {
    setComposeMode("new");
    setComposeData({ toEmail: "", subject: "", body: "" });
    setShowCompose(true);
  };

  const markAsRead = async (mailId: string) => {
    try {
      await fetch(`/api/mail/${mailId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      fetchMails();
    } catch (error) {
      console.error("Failed to mark mail as read:", error);
    }
  };

  const deleteMail = async (mailId: string) => {
    try {
      await fetch(`/api/mail/${mailId}`, {
        method: "DELETE",
      });
      fetchMails();
      if (selectedMail?.id === mailId) {
        setSelectedMail(null);
      }
    } catch (error) {
      console.error("Failed to delete mail:", error);
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

  const filteredMails = mails.filter(mail =>
    mail.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mail.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (mail.body && mail.body.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const folderCounts = {
    INBOX: mails.filter(m => m.folder === "INBOX" && !m.isRead).length,
    SENT: mails.filter(m => m.folder === "SENT").length,
    DRAFTS: mails.filter(m => m.folder === "DRAFTS").length,
    TRASH: mails.filter(m => m.folder === "TRASH").length,
  };

  return (
    <div className="flex h-full">
      {!teamId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Team Selected</h3>
            <p className="text-muted-foreground">Please select a team to access Mail</p>
          </div>
        </div>
      ) : (
        <>
          {/* Sidebar */}
          <div className="w-64 border-r bg-card/50">
            <div className="p-4">
              <Button 
                onClick={openCompose}
                className="w-full mb-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Compose
              </Button>
              
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolder("INBOX")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-accent ${
                    selectedFolder === "INBOX" ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <Inbox className="w-4 h-4 mr-3" />
                    Inbox
                  </div>
                  {folderCounts.INBOX > 0 && (
                    <Badge variant="secondary">{folderCounts.INBOX}</Badge>
                  )}
                </button>
                
                <button
                  onClick={() => setSelectedFolder("SENT")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-accent ${
                    selectedFolder === "SENT" ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <Send className="w-4 h-4 mr-3" />
                    Sent
                  </div>
                  {folderCounts.SENT > 0 && (
                    <Badge variant="secondary">{folderCounts.SENT}</Badge>
                  )}
                </button>
                
                <button
                  onClick={() => setSelectedFolder("DRAFTS")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-accent ${
                    selectedFolder === "DRAFTS" ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-3" />
                    Drafts
                  </div>
                  {folderCounts.DRAFTS > 0 && (
                    <Badge variant="secondary">{folderCounts.DRAFTS}</Badge>
                  )}
                </button>
                
                <button
                  onClick={() => setSelectedFolder("TRASH")}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-accent ${
                    selectedFolder === "TRASH" ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <Trash2 className="w-4 h-4 mr-3" />
                    Trash
                  </div>
                  {folderCounts.TRASH > 0 && (
                    <Badge variant="secondary">{folderCounts.TRASH}</Badge>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mail List */}
          <div className="w-96 border-r">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto h-[calc(100vh-200px)]">
              {filteredMails.map((mail) => (
                <div
                  key={mail.id}
                  onClick={() => {
                    setSelectedMail(mail);
                    if (!mail.isRead) markAsRead(mail.id);
                  }}
                  className={`p-4 border-b cursor-pointer hover:bg-accent/50 ${
                    selectedMail?.id === mail.id ? "bg-accent" : ""
                  } ${!mail.isRead ? "bg-background" : ""}`}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {getInitials("", mail.from)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${!mail.isRead ? "font-semibold" : ""}`}>
                          {mail.from}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(mail.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className={`text-sm truncate ${!mail.isRead ? "font-semibold" : ""}`}>
                        {mail.subject}
                      </p>
                      {mail.body && (
                        <p className="text-xs text-muted-foreground truncate">
                          {mail.body.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mail Content */}
          <div className="flex-1">
            {selectedMail ? (
              <div className="h-full flex flex-col">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">{selectedMail.subject}</h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => deleteMail(selectedMail.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {getInitials("", selectedMail.from)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {selectedMail.from}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        to {selectedMail.to}
                      </p>
                    </div>
                    <div className="ml-auto text-sm text-muted-foreground">
                      {new Date(selectedMail.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="prose max-w-none">
                    {selectedMail.body ? (
                      <p className="whitespace-pre-wrap">{selectedMail.body}</p>
                    ) : (
                      <p className="text-muted-foreground">No content</p>
                    )}
                  </div>
                </div>
                
                <div className="p-4 border-t">
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={replyMail}>
                      <CornerUpLeft className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                    <Button variant="outline" onClick={forwardMail}>
                      <CornerUpRight className="w-4 h-4 mr-2" />
                      Forward
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select an email to read</p>
                </div>
              </div>
            )}
          </div>

          {/* Compose Dialog */}
          <Dialog open={showCompose} onOpenChange={setShowCompose}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {composeMode === "new" && "New Message"}
                  {composeMode === "reply" && "Reply"}
                  {composeMode === "forward" && "Forward"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {composeMode !== "reply" && (
                  <Input
                    placeholder="To"
                    value={composeData.toEmail}
                    onChange={(e) => setComposeData({ ...composeData, toEmail: e.target.value })}
                  />
                )}
                <Input
                  placeholder="Subject"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                />
                <Textarea
                  placeholder="Message"
                  rows={10}
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCompose(false)}>
                    Cancel
                  </Button>
                  <Button onClick={sendMail}>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}