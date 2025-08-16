'use client'

import { useState, useEffect } from 'react'
import { LayoutWrapper } from '@/components/layout/layout-wrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileList } from '@/components/drive/file-list'
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  Restore,
  Delete
} from 'lucide-react'

interface FileItem {
  id: string
  name: string
  size: number
  mimeType: string
  isFolder: boolean
  isShared?: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string
  children?: FileItem[]
}

export default function Trash() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const fetchDeletedFiles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/drive/delete?includeDeleted=true')
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files)
      }
    } catch (error) {
      console.error('Error fetching deleted files:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeletedFiles()
  }, [])

  const handleRestore = async (fileId: string) => {
    try {
      const response = await fetch('/api/drive/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      })

      if (response.ok) {
        fetchDeletedFiles()
      }
    } catch (error) {
      console.error('Error restoring file:', error)
    }
  }

  const handlePermanentDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/drive/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, permanent: true }),
      })

      if (response.ok) {
        fetchDeletedFiles()
      }
    } catch (error) {
      console.error('Error permanently deleting file:', error)
    }
  }

  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to empty the trash? This action cannot be undone.')) {
      return
    }

    try {
      const promises = files.map(file => 
        fetch('/api/drive/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId: file.id, permanent: true }),
        })
      )

      await Promise.all(promises)
      fetchDeletedFiles()
    } catch (error) {
      console.error('Error emptying trash:', error)
    }
  }

  if (loading) {
    return (
      <LayoutWrapper title="Trash">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading trash...</p>
          </CardContent>
        </Card>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper title="Trash">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Trash2 className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Trash</h1>
            </div>
            <Badge variant="secondary">
              {files.length} items
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchDeletedFiles}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {files.length > 0 && (
              <Button variant="destructive" onClick={handleEmptyTrash}>
                <Delete className="mr-2 h-4 w-4" />
                Empty Trash
              </Button>
            )}
          </div>
        </div>

        {/* Warning */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Items in trash will be permanently deleted after 30 days</p>
                <p className="text-sm text-yellow-600">You can restore items before they are permanently deleted.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Files */}
        {files.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Trash2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Trash is empty</p>
              <p className="text-sm text-muted-foreground">
                Items you delete will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="space-y-1">
                {files.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => {
                          const newSelection = new Set(selectedItems)
                          if (newSelection.has(item.id)) {
                            newSelection.delete(item.id)
                          } else {
                            newSelection.add(item.id)
                          }
                          setSelectedItems(newSelection)
                        }}
                        className="rounded border-gray-300"
                      />
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          {item.isFolder ? (
                            <Trash2 className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Deleted {new Date(item.deletedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(item.id)}
                      >
                        <Restore className="mr-2 h-4 w-4" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handlePermanentDelete(item.id)}
                      >
                        <Delete className="mr-2 h-4 w-4" />
                        Delete Forever
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutWrapper>
  )
}