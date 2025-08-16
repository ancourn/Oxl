'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Share2, Copy, Mail, Link, Eye, Edit3 } from 'lucide-react'

interface ShareDialogProps {
  file: any
  onShare?: (shareData: any) => void
  children?: React.ReactNode
}

export function ShareDialog({ file, onShare, children }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [shareType, setShareType] = useState<'link' | 'email'>('link')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [email, setEmail] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [expiry, setExpiry] = useState<string>('never')

  const generateShareLink = () => {
    // In a real app, this would generate a unique token and save it to the database
    const token = Math.random().toString(36).substring(2, 15)
    const link = `${window.location.origin}/shared/${token}`
    setShareLink(link)
  }

  const handleShare = async () => {
    try {
      const shareData = {
        fileId: file.id,
        shareType,
        permission,
        email: shareType === 'email' ? email : null,
        expiry: expiry === 'never' ? null : expiry,
      }

      if (shareType === 'link') {
        generateShareLink()
      }

      // Here you would make an API call to save the share data
      const response = await fetch('/api/drive/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      })

      if (response.ok) {
        onShare?.(shareData)
      }
    } catch (error) {
      console.error('Error sharing file:', error)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share "{file.name}"</DialogTitle>
          <DialogDescription>
            Choose how you want to share this file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Share Type Selection */}
          <div className="space-y-2">
            <Label>Share via</Label>
            <div className="flex space-x-2">
              <Button
                variant={shareType === 'link' ? 'default' : 'outline'}
                onClick={() => setShareType('link')}
                className="flex-1"
              >
                <Link className="mr-2 h-4 w-4" />
                Share Link
              </Button>
              <Button
                variant={shareType === 'email' ? 'default' : 'outline'}
                onClick={() => setShareType('email')}
                className="flex-1"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
            </div>
          </div>

          {/* Permission Selection */}
          <div className="space-y-2">
            <Label>Permission</Label>
            <Select value={permission} onValueChange={(value: 'view' | 'edit') => setPermission(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span>Can view</span>
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center space-x-2">
                    <Edit3 className="h-4 w-4" />
                    <span>Can edit</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Input (only for email sharing) */}
          {shareType === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {/* Expiry Options */}
          <div className="space-y-2">
            <Label>Link expiry</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="1day">1 day</SelectItem>
                <SelectItem value="7days">7 days</SelectItem>
                <SelectItem value="30days">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Share Link Result */}
          {shareLink && (
            <div className="space-y-2">
              <Label>Share link</Label>
              <div className="flex space-x-2">
                <Input value={shareLink} readOnly />
                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone with this link can {permission === 'view' ? 'view' : 'edit'} this file.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare}>
            {shareType === 'link' ? 'Create Link' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}