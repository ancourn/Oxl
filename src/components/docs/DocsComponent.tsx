"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  FileText, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Share2, 
  Download,
  MoreVertical,
  Users,
  Clock,
  MessageSquare
} from "lucide-react";

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    email: string;
    name?: string;
  };
  comments: Array<{
    id: string;
    content: string;
    author: {
      email: string;
      name?: string;
    };
    createdAt: string;
  }>;
}

interface DocsComponentProps {
  teamId?: string;
}

export default function DocsComponent({ teamId }: DocsComponentProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showCreateDocument, setShowCreateDocument] = useState(false);
  const [newDocumentTitle, setNewDocumentTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [teamId]);

  useEffect(() => {
    if (selectedDocument) {
      setEditContent(selectedDocument.content);
    }
  }, [selectedDocument]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/docs?teamId=${teamId}`);
      const data = await response.json();
      
      // Check if the response is an array (success) or an error object
      if (Array.isArray(data)) {
        setDocuments(data);
      } else {
        console.error("Failed to fetch documents:", data.error || "Unknown error");
        setDocuments([]);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createDocument = async () => {
    if (!newDocumentTitle.trim()) return;

    try {
      const response = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDocumentTitle,
          content: "",
          teamId
        }),
      });
      const newDocument = await response.json();
      setDocuments([newDocument, ...(Array.isArray(documents) ? documents : [])]);
      setNewDocumentTitle("");
      setShowCreateDocument(false);
      setSelectedDocument(newDocument);
    } catch (error) {
      console.error("Failed to create document:", error);
    }
  };

  const saveDocument = async () => {
    if (!selectedDocument) return;

    try {
      const response = await fetch(`/api/docs/${selectedDocument.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent
        }),
      });
      const updatedDocument = await response.json();
      setSelectedDocument(updatedDocument);
      setIsEditing(false);
      setDocuments(Array.isArray(documents) ? documents.map(doc => 
        doc.id === updatedDocument.id ? updatedDocument : doc
      ) : []);
    } catch (error) {
      console.error("Failed to save document:", error);
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      await fetch(`/api/docs/${documentId}`, {
        method: "DELETE",
      });
      setDocuments(Array.isArray(documents) ? documents.filter(doc => doc.id !== documentId) : []);
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedDocument) return;

    try {
      const response = await fetch(`/api/docs/${selectedDocument.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment
        }),
      });
      const updatedDocument = await response.json();
      setSelectedDocument(updatedDocument);
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
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

  const filteredDocuments = Array.isArray(documents) ? documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="h-full flex">
      {/* Document List */}
      <div className="w-80 border-r bg-card/50">
        <div className="p-4">
          <Button 
            onClick={() => setShowCreateDocument(true)}
            className="w-full mb-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Recent Documents</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {filteredDocuments.map((document) => (
                  <Card
                    key={document.id}
                    className={`cursor-pointer hover:bg-accent/50 ${
                      selectedDocument?.id === document.id ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedDocument(document)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {document.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(document.updatedAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {document.author.name || document.author.email}
                          </p>
                          {document.comments.length > 0 && (
                            <Badge variant="secondary" className="mt-1">
                              {document.comments.length} comments
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
            
            {!isLoading && filteredDocuments.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No documents found</p>
                <p className="text-xs text-muted-foreground">Create your first document</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 flex flex-col">
        {selectedDocument ? (
          <>
            {/* Document Header */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold">
                    {isEditing ? (
                      <Input
                        value={selectedDocument.title}
                        onChange={(e) => setSelectedDocument({
                          ...selectedDocument,
                          title: e.target.value
                        })}
                        className="text-xl font-semibold border-none p-0 h-auto"
                      />
                    ) : (
                      selectedDocument.title
                    )}
                  </h2>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(selectedDocument.author.name || "", selectedDocument.author.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{selectedDocument.author.name || selectedDocument.author.email}</span>
                    <span>•</span>
                    <span>Updated {new Date(selectedDocument.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveDocument}>
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => deleteDocument(selectedDocument.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Document Editor */}
            <div className="flex-1 flex">
              <div className="flex-1 p-6">
                {isEditing ? (
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full min-h-[400px] resize-none border-none p-0 focus:ring-0"
                    placeholder="Start writing your document..."
                  />
                ) : (
                  <div className="prose max-w-none">
                    {selectedDocument.content ? (
                      <div className="whitespace-pre-wrap">{selectedDocument.content}</div>
                    ) : (
                      <p className="text-muted-foreground">This document is empty. Click Edit to start writing.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Comments Sidebar */}
              <div className="w-80 border-l bg-card/50 flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="font-semibold flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Comments ({selectedDocument.comments.length})
                  </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedDocument.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.author.name || "", comment.author.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium">
                            {comment.author.name || comment.author.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm bg-muted p-3 rounded-lg">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {selectedDocument.comments.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                      <p className="text-xs text-muted-foreground">Be the first to comment</p>
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t">
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={addComment} disabled={!newComment.trim()}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Documents</h2>
              <p className="text-muted-foreground mb-6">
                Create and collaborate on documents with your team
              </p>
              <Button onClick={() => setShowCreateDocument(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Document
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Document Dialog */}
      <Dialog open={showCreateDocument} onOpenChange={setShowCreateDocument}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Document title"
              value={newDocumentTitle}
              onChange={(e) => setNewDocumentTitle(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDocument(false)}>
                Cancel
              </Button>
              <Button onClick={createDocument}>
                <FileText className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}