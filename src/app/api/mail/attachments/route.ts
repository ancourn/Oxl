import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { writeFile, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    const teamId = data.get('teamId') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Check if user is a member of the team
    const userMembership = await db.teamMember.findFirst({
      where: {
        teamId,
        user: {
          email: session.user.email,
        },
      },
    })

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExtension}`
    const path = join(process.cwd(), 'uploads', 'attachments', fileName)

    // Create directory if it doesn't exist
    const dir = join(process.cwd(), 'uploads', 'attachments')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // Save file to disk
    await writeFile(path, buffer)

    const attachmentInfo = {
      id: uuidv4(),
      name: file.name,
      size: file.size,
      type: file.type,
      path: `/uploads/attachments/${fileName}`,
      url: `/api/mail/attachments/download/${fileName}`,
    }

    return NextResponse.json({
      success: true,
      attachment: attachmentInfo,
    })
  } catch (error) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}