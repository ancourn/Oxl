'use client'

import { useState, useEffect } from 'react'
import { LayoutWrapper } from '@/components/layout/layout-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { 
  HardDrive, 
  Upload, 
  Folder, 
  File, 
  MoreHorizontal,
  Search,
  Grid,
  List,
  Plus,
  Star,
  Trash2,
  Download,
  Share2,
  ArrowLeft,
  Home
} from 'lucide-react'
import { FileUpload } from '@/components/drive/file-upload'
import { FileList } from '@/components/drive/file-list'
import { NewFolderDialog } from '@/components/drive/new-folder-dialog'
import { UsageBanner } from '@/components/layout/usage-banner'
import { useTeamPermissions } from '@/hooks/use-team-permissions'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FileItem {
  id: string
  name: string
  size: number
  mimeType: string
  isFolder: boolean
  isShared?: boolean
  createdAt: string
  updatedAt: string
  children?: FileItem[]
}

interface BreadcrumbItem {
  id: string
  name: string
}

export default function Drive() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'Drive' }])
  const [showUpload, setShowUpload] = useState(false)
  const currentTeamId = typeof window !== 'undefined' ? localStorage.getItem('currentTeamId') : null
  const { permissions, loading: permissionsLoading } = useTeamPermissions(currentTeamId || undefined)

  const fetchFiles = async (parentId: string | null = null) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (parentId) {
        params.append('parentId', parentId)
      }
      if (currentTeamId) {
        params.append('teamId', currentTeamId)
      }
      
      const response = await fetch(`/api/drive/files?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles(currentFolder)
  }, [currentFolder])

  const handleFileUploadComplete = (uploadedFiles: any[]) => {
    fetchFiles(currentFolder)
    setShowUpload(false)
  }

  const handleCreateFolder = async (name: string, parentId?: string) => {
    try {
      const response = await fetch('/api/drive/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          isFolder: true,
          parentId: parentId || currentFolder,
          teamId: currentTeamId,
        }),
      })

      if (response.ok) {
        fetchFiles(currentFolder)
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    }
  }

  const handleFolderClick = (folder: FileItem) => {
    setCurrentFolder(folder.id)
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }])
  }

  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      setCurrentFolder(null)
      setBreadcrumbs([{ id: 'root', name: 'Drive' }])
    } else {
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1)
      setBreadcrumbs(newBreadcrumbs)
      setCurrentFolder(newBreadcrumbs[newBreadcrumbs.length - 1].id)
    }
  }

  const handleBack = () => {
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1)
      setBreadcrumbs(newBreadcrumbs)
      setCurrentFolder(newBreadcrumbs.length > 1 ? newBreadcrumbs[newBreadcrumbs.length - 1].id : null)
    }
  }

  return (
    <LayoutWrapper title="Drive">
      <div className="space-y-6">
        {/* Usage Banner */}
        <UsageBanner type="drive" />
        
        {/* Storage Limit Warning */}
        {!permissions.canWrite && (
          <Alert variant="destructive">
            <AlertDescription>
              You don't have permission to upload files. Contact your team administrator.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {breadcrumbs.length > 1 && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.id} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault()
                            handleBreadcrumbClick(index)
                          }}
                        >
                          {crumb.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
          <div className="flex items-center space-x-2">
            <Input 
              placeholder="Search files and folders..." 
              className="w-64"
            />
            <Button variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Grid className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <List className="h-4 w-4" />
            </Button>
            <NewFolderDialog onCreateFolder={handleCreateFolder} parentId={currentFolder}>
              <Button variant="outline">
                <Folder className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            </NewFolderDialog>
            <Button 
              onClick={() => setShowUpload(!showUpload)}
              disabled={!permissions.canWrite}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>

        {/* Storage Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Storage</h3>
                <p className="text-sm text-muted-foreground">2.4 GB of 5 GB used</p>
              </div>
              <Badge variant="secondary">Free Plan</Badge>
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary w-1/2"></div>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>48% used</span>
              <Button variant="link" className="p-0 h-auto">Upgrade to Pro</Button>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        {showUpload && (
          <FileUpload 
            onUploadComplete={handleFileUploadComplete}
            parentId={currentFolder}
            teamId={currentTeamId || undefined}
          />
        )}

        {/* Files */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {currentFolder ? 'Folder Contents' : 'All Files'}
          </h2>
          
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading files...</p>
              </CardContent>
            </Card>
          ) : (
            <FileList
              files={files}
              onFolderClick={handleFolderClick}
              onFileAction={(file, action) => {
                console.log(`Action ${action} on file ${file.name}`)
              }}
            />
          )}
        </div>
      </div>
    </LayoutWrapper>
  )
}