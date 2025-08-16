'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Folder, 
  File, 
  MoreHorizontal, 
  Download, 
  Share2, 
  Star,
  Trash2,
  Edit3,
  Eye
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ShareDialog } from './share-dialog'

interface FileItem {
  id: string
  name: string
  size: number
  mimeType: string
  isFolder: boolean
  createdAt: string
  updatedAt: string
  children?: FileItem[]
}

interface FileListProps {
  files: FileItem[]
  onFileClick?: (file: FileItem) => void
  onFolderClick?: (folder: FileItem) => void
  onFileAction?: (file: FileItem, action: string) => void
}

export function FileList({ files, onFileClick, onFolderClick, onFileAction }: FileListProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string, isFolder: boolean) => {
    if (isFolder) return <Folder className="h-8 w-8 text-blue-500" />
    
    if (mimeType.startsWith('image/')) return <File className="h-8 w-8 text-green-500" />
    if (mimeType.startsWith('video/')) return <File className="h-8 w-8 text-purple-500" />
    if (mimeType.startsWith('audio/')) return <File className="h-8 w-8 text-yellow-500" />
    if (mimeType.includes('pdf')) return <File className="h-8 w-8 text-red-500" />
    if (mimeType.includes('word')) return <File className="h-8 w-8 text-blue-500" />
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <File className="h-8 w-8 text-green-500" />
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return <File className="h-8 w-8 text-orange-500" />
    
    return <File className="h-8 w-8 text-gray-500" />
  }

  const handleItemClick = (item: FileItem) => {
    if (item.isFolder) {
      onFolderClick?.(item)
    } else {
      onFileClick?.(item)
    }
  }

  const handleItemAction = (item: FileItem, action: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onFileAction?.(item, action)
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to move this item to trash?')) {
      return
    }

    try {
      const response = await fetch('/api/drive/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      })

      if (response.ok) {
        // Refresh the file list
        window.location.reload()
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const toggleSelection = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelection = new Set(selectedItems)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedItems(newSelection)
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No files or folders</p>
          <p className="text-sm text-muted-foreground">
            Upload files or create folders to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="space-y-1">
          {files.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-4 hover:bg-muted cursor-pointer transition-colors ${
                selectedItems.has(item.id) ? 'bg-muted' : ''
              }`}
              onClick={() => handleItemClick(item)}
            >
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={(e) => toggleSelection(item.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-gray-300"
                />
                
                <div className="flex items-center space-x-3">
                  {getFileIcon(item.mimeType, item.isFolder)}
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.isFolder 
                        ? `${item.children?.length || 0} items`
                        : `${formatFileSize(item.size)} • Modified ${formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}`
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {item.isShared && (
                  <Badge variant="secondary" className="text-xs">
                    Shared
                  </Badge>
                )}
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleItemAction(item, 'download', e)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <ShareDialog file={item}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleItemAction(item, 'share', e)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </ShareDialog>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleItemAction(item, 'star', e)}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(item.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleItemAction(item, 'more', e)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}