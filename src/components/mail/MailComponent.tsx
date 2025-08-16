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
  PaperAirplane, 
  FileText, 
  Trash2, 
  MoreVertical,
  Search,
  Plus
} from "lucide-react";

interface Mail {
  id: string;
  subject: string;
  body?: string;
  isRead: boolean;
  folder: string;
  fromUser: {
    email: string;
    name?: string;
  };
  toUser: {
    email: string;
    name?: string;
  };
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
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchMails();
  }, [selectedFolder, teamId]);

  const fetchMails = async () => {
    try {
      const response = await fetch(`/api/mail?folder=${selectedFolder}&teamId=${teamId}`);
      const data = await response.json();
      setMails(data);
    } catch (error) {
      console.error("Failed to fetch mails:", error);
    }
  };

  const sendMail = async () => {
    if (!composeData.toEmail || !composeData.subject) return;

    try {
      await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...composeData,
          teamId
        }),
      });
      
      setComposeData({ toEmail: "", subject: "", body: "" });
      setShowCompose(false);
      fetchMails();
    } catch (error) {
      console.error("Failed to send mail:", error);
    }
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
    return email[0].toUpperCase();
  };

  const filteredMails = mails.filter(mail =>
    mail.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mail.fromUser.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      {/* Sidebar */}
      <div className="w-64 border-r bg-card/50">
        <div className="p-4">
          <Button 
            onClick={() => setShowCompose(true)}
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
                <PaperAirplane className="w-4 h-4 mr-3" />
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
                    {getInitials(mail.fromUser.name || "", mail.fromUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium truncate ${!mail.isRead ? "font-semibold" : ""}`}>
                      {mail.fromUser.name || mail.fromUser.email}
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
                    {getInitials(selectedMail.fromUser.name || "", selectedMail.fromUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedMail.fromUser.name || selectedMail.fromUser.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    to {selectedMail.toUser.email}
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
              <Button variant="outline">
                <Send className="w-4 h-4 mr-2" />
                Reply
              </Button>
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
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="To"
              value={composeData.toEmail}
              onChange={(e) => setComposeData({ ...composeData, toEmail: e.target.value })}
            />
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
    </div>
  );
}