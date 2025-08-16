import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { fileId, shareType, permission, email, expiry } = await request.json()
    
    // Generate share token
    const shareToken = uuidv4()
    
    // Calculate expiry date
    let shareExpiry = null
    if (expiry && expiry !== 'never') {
      const days = parseInt(expiry.replace('days', ''))
      shareExpiry = new Date()
      shareExpiry.setDate(shareExpiry.getDate() + days)
    }

    // Update file with share information
    const updatedFile = await db.file.update({
      where: { id: fileId },
      data: {
        isShared: true,
        shareToken: shareToken,
        shareExpiry: shareExpiry,
      },
    })

    // TODO: Send email if shareType is 'email'
    if (shareType === 'email' && email) {
      // Here you would integrate with an email service
      console.log(`Sending share email to ${email} for file ${fileId}`)
    }

    return NextResponse.json({
      success: true,
      shareToken,
      file: updatedFile,
    })
  } catch (error) {
    console.error('Error sharing file:', error)
    return NextResponse.json({ error: 'Failed to share file' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const file = await db.file.findFirst({
      where: {
        shareToken: token,
        isShared: true,
        isDeleted: false,
        OR: [
          { shareExpiry: null },
          { shareExpiry: { gt: new Date() } },
        ],
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found or link expired' }, { status: 404 })
    }

    return NextResponse.json({ file })
  } catch (error) {
    console.error('Error accessing shared file:', error)
    return NextResponse.json({ error: 'Failed to access file' }, { status: 500 })
  }
}