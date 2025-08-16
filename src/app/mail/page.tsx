'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Mail, 
  Send, 
  Inbox, 
  Paperclip, 
  Star, 
  Trash2, 
  Archive, 
  Folder,
  Search,
  MoreVertical,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';

interface MailItem {
  id: string;
  from: string;
  to: string;
  subject: string;
  body?: string;
  isRead: boolean;
  isStarred: boolean;
  folder: string;
  receivedAt: string;
  sentAt?: string;
  user?: {
    id: string;
    name?: string;
    email: string;
  };
}

interface MailResponse {
  mails: MailItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  unreadCount?:;
}

export default function MailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [mails, setMails] = useState<MailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState('INBOX');
  const [selectedMail, setSelectedMail] = useState<MailItem | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [composing, setComposing] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [newMail, setNewMail] = useState({
    to: '',
    subject: '',
    body: '',
    cc: '',
    bcc: '',
  });

  const fetchMails = async () => {
    try {
      const currentTeamId = localStorage.getItem('currentTeamId');
      if (!currentTeamId) {
        console.error('No team selected');
        return;
      }

      const response = await fetch(`/api/mail?teamId=${currentTeamId}&folder=${currentFolder}&page=${currentPage}&limit=20`);
      if (response.ok) {
        const data: MailResponse = await response.json();
        setMails(data.mails);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching mails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposing(true);
    
    if (!newMail.to || !newMail.subject) {
      alert('To and subject are required');
      setComposing(false);
      return;
    }

    try {
      const currentTeamId = localStorage.getItem('currentTeamId');
      if (!currentTeamId) {
        console.error('No team selected');
        return;
      }

      const response = await fetch('/api/mail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newMail,
          attachments: JSON.stringify(attachments),
          teamId: currentTeamId,
        }),
      });

      if (response.ok) {
        setComposeOpen(false);
        setNewMail({ to: '', subject: '', body: '', cc: '', bcc: '' });
        setAttachments([]);
        
        // Switch to sent folder
        setCurrentFolder('SENT');
        fetchMails();
      } else {
        const error = await response.json();
        console.error('Error sending mail:', error);
      }
    } catch (error) {
      console.error('Error sending mail:', error);
    } finally {
      setComposing(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const currentTeamId = localStorage.getItem('currentTeamId');
      if (!currentTeamId) {
        console.error('No team selected');
        return;
      }

      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('teamId', currentTeamId);

        const response = await fetch('/api/mail/attachments', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          return result.attachment;
        } else {
          throw new Error('Upload failed');
        }
      });

      const uploadedAttachments = await Promise.all(uploadPromises);
      setAttachments([...attachments, ...uploadedAttachments]);
    } catch (error) {
      console.error('Error uploading attachments:', error);
      alert('Failed to upload attachments');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleMailAction = async (mailId: string, action: string) => {
    try {
      const currentTeamId = localStorage.getItem('currentTeamId');
      if (!currentTeamId) {
        console.error('No team selected');
        return;
      }

      const response = await fetch(`/api/mail/${mailId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          teamId: currentTeamId,
        }),
      });

      if (response.ok) {
        fetchMails();
      }
    } catch (error) {
      console.error('Error updating mail:', error);
    }
  };

  const handleDeleteMail = async (mailId: string) => {
    if (!confirm('Are you sure you want to delete this mail?')) {
      return;
    }

    try {
      const currentTeamId = localStorage.getItem('currentTeamId');
      if (!currentTeamId) {
        console.error('No team selected');
        return;
      }

      const response = await fetch(`/api/mail/${mailId}?teamId=${currentTeamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchMails();
        if (selectedMail?.id === mailId) {
          setSelectedMail(null);
        }
      }
    } catch (error) {
      console.error('Error deleting mail:', error);
    }
  };

  const folders = [
    { id: 'INBOX', name: 'Inbox', icon: Inbox, count: unreadCount },
    { id: 'SENT', name: 'Sent', icon: Send },
    { id: 'DRAFTS', name: 'Drafts', icon: Archive },
    { id: 'TRASH', name: 'Trash', icon: Trash2 },
  ];

  useEffect(() => {
    if (session) {
      fetchMails();
    }
  }, [session, currentFolder, currentPage]);

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Please sign in to access mail.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 h-screen flex">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4">
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
                <DialogDescription>Send a new email</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSendMail} className="space-y-4">
                <div>
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    type="email"
                    value={newMail.to}
                    onChange={(e) => setNewMail({ ...newMail, to: e.target.value })}
                    placeholder="recipient@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cc">Cc (Optional)</Label>
                  <Input
                    id="cc"
                    type="email"
                    value={newMail.cc}
                    onChange={(e) => setNewMail({ ...newMail, cc: e.target.value })}
                    placeholder="cc@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={newMail.subject}
                    onChange={(e) => setNewMail({ ...newMail, subject: e.target.value })}
                    placeholder="Subject"
                    required
                  />
                </div>
                
                {/* Attachments */}
                <div>
                  <Label htmlFor="attachments">Attachments</Label>
                  <div className="space-y-2">
                    <Input
                      id="attachments"
                      type="file"
                      multiple
                      onChange={handleAttachmentUpload}
                      disabled={uploading}
                    />
                    {uploading && (
                      <p className="text-sm text-muted-foreground">Uploading attachments...</p>
                    )}
                    {attachments.length > 0 && (
                      <div className="space-y-1">
                        {attachments.map((attachment, index) => (
                          <div key={attachment.id} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center space-x-2">
                              <Paperclip className="h-4 w-4" />
                              <span className="text-sm">{attachment.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(attachment.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="body">Message</Label>
                  <Textarea
                    id="body"
                    value={newMail.body}
                    onChange={(e) => setNewMail({ ...newMail, body: e.target.value })}
                    placeholder="Your message..."
                    rows={8}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setComposeOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={composing}>
                    {composing ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1">
          <nav className="space-y-1 p-2">
            {folders.map((folder) => {
              const Icon = folder.icon;
              return (
                <button
                  key={folder.id}
                  onClick={() => {
                    setCurrentFolder(folder.id);
                    setSelectedMail(null);
                    setCurrentPage(1);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                    currentFolder === folder.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{folder.name}</span>
                  </div>
                  {folder.count !== undefined && folder.count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {folder.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Mail list */}
        <div className="w-96 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : mails.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No emails found</p>
              </div>
            ) : (
              <div className="divide-y">
                {mails.map((mail) => (
                  <div
                    key={mail.id}
                    onClick={() => {
                      setSelectedMail(mail);
                      if (!mail.isRead) {
                        handleMailAction(mail.id, 'mark_read');
                      }
                    }}
                    className={`p-4 cursor-pointer hover:bg-muted transition-colors ${
                      selectedMail?.id === mail.id ? 'bg-muted' : ''
                    } ${!mail.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium truncate ${!mail.isRead ? 'font-semibold' : ''}`}>
                            {mail.user?.name || mail.from}
                          </span>
                          {mail.isStarred && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <p className={`text-sm truncate ${!mail.isRead ? 'font-medium' : 'text-muted-foreground'}`}>
                          {mail.subject}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {mail.body?.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1 ml-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(mail.receivedAt).toLocaleDateString()}
                        </span>
                        {!mail.isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mail detail */}
        <div className="flex-1 flex flex-col">
          {selectedMail ? (
            <>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{selectedMail.subject}</h2>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMailAction(selectedMail.id, selectedMail.isStarred ? 'unstar' : 'star')}
                    >
                      <Star className={`h-4 w-4 ${selectedMail.isStarred ? 'fill-current text-yellow-500' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMailAction(selectedMail.id, selectedMail.isRead ? 'mark_unread' : 'mark_read')}
                    >
                      {selectedMail.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMail(selectedMail.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedMail.user?.avatar} />
                      <AvatarFallback>
                        {selectedMail.user?.name?.charAt(0) || selectedMail.from.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      <strong>From:</strong> {selectedMail.user?.name || selectedMail.from}
                    </span>
                  </div>
                  <span>
                    <strong>To:</strong> {selectedMail.to}
                  </span>
                  <span>
                    {new Date(selectedMail.receivedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="prose max-w-none">
                  {selectedMail.body ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedMail.body }} />
                  ) : (
                    <p>No content available</p>
                  )}
                </div>
              </div>
              <div className="p-4 border-t">
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Reply
                </Button>
                <Button variant="outline" className="ml-2">
                  <Mail className="h-4 w-4 mr-2" />
                  Forward
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-4" />
                <p>Select an email to read</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}