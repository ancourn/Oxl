'use client'

import { useState, useEffect } from 'react'
import { LayoutWrapper } from '@/components/layout/layout-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  FileText, 
  Plus, 
  Search, 
  MoreHorizontal,
  Users,
  Clock,
  Star,
  Edit3,
  Eye,
  Trash2
} from 'lucide-react'
import { DocumentEditor } from '@/components/docs/document-editor'
import { UsageBanner } from '@/components/layout/usage-banner'
import { useUserPermissions } from '@/hooks/use-user-permissions'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Document {
  id: string
  title: string
  content: string
  isShared?: boolean
  createdAt: string
  updatedAt: string
  versions: Array<{
    id: string
    version: number
    content: string
    createdAt: string
  }>
  comments: Array<{
    id: string
    content: string
    createdAt: string
    user: {
      name: string
    }
  }>
}

export default function Docs() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')
  const permissions = useUserPermissions()

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/docs')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleCreateDocument = async () => {
    try {
      const response = await fetch('/api/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newDocTitle || 'Untitled Document',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewDocTitle('')
        setShowCreateDialog(false)
        fetchDocuments()
        setSelectedDocument(data.document)
        setIsEditing(true)
      }
    } catch (error) {
      console.error('Error creating document:', error)
    }
  }

  const handleSaveDocument = async (documentId: string, content: string) => {
    try {
      const response = await fetch(`/api/docs/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
      })

      if (response.ok) {
        fetchDocuments()
      }
    } catch (error) {
      console.error('Error saving document:', error)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      const response = await fetch(`/api/docs/${documentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDocuments()
        if (selectedDocument?.id === documentId) {
          setSelectedDocument(null)
          setIsEditing(false)
        }
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  if (loading) {
    return (
      <LayoutWrapper title="Docs">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading documents...</p>
          </CardContent>
        </Card>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper title="Docs">
      <div className="space-y-6">
        {/* Usage Banner */}
        <UsageBanner type="docs" />
        
        {/* Document Limit Warning */}
        {!permissions.canCreateDocuments && (
          <Alert variant="destructive">
            <AlertDescription>
              You've reached your document limit. Upgrade to Pro to create unlimited documents.
              <Button variant="link" className="ml-2 p-0 h-auto" onClick={() => window.location.href = '/billing'}>
                Upgrade Now
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document List */}
          <div className="lg:col-span-1 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Documents</h2>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button disabled={!permissions.canCreateDocuments}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Document</DialogTitle>
                    <DialogDescription>
                      Enter a title for your new document.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Input
                      placeholder="Document title"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateDocument}>
                      Create Document
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search documents..." 
                className="pl-10"
              />
            </div>

            {/* Document List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {documents.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="font-medium mb-2">No documents yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first document to get started
                    </p>
                    <Button onClick={() => setShowCreateDialog(true)} disabled={!permissions.canCreateDocuments}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Document
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                documents.map((doc) => (
                  <Card 
                    key={doc.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedDocument?.id === doc.id ? 'ring-2 ring-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setSelectedDocument(doc)
                      setIsEditing(false)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{doc.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Edited {new Date(doc.updatedAt).toLocaleDateString()}
                          </p>
                          {doc.isShared && (
                            <Badge variant="secondary" className="mt-1">
                              Shared
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedDocument(doc)
                              setIsEditing(true)
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteDocument(doc.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Document Editor/Viewer */}
          <div className="lg:col-span-2">
            {selectedDocument ? (
              <div className="space-y-4">
                {/* Document Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{selectedDocument.title}</h1>
                    <p className="text-sm text-muted-foreground">
                      Last edited {new Date(selectedDocument.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={isEditing ? 'default' : 'outline'}
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? <Eye className="mr-2 h-4 w-4" /> : <Edit3 className="mr-2 h-4 w-4" />}
                      {isEditing ? 'View' : 'Edit'}
                    </Button>
                  </div>
                </div>

                {/* Document Content */}
                {isEditing ? (
                  <DocumentEditor
                    content={selectedDocument.content}
                    onChange={(content) => handleSaveDocument(selectedDocument.id, content)}
                    placeholder="Start writing your document..."
                  />
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedDocument.content }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Document Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Document Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Created</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedDocument.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Last Modified</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedDocument.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Versions</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedDocument.versions.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Comments</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedDocument.comments.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Select a document</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a document from the list to view or edit it
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  )
}