import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { fileId, permanent = false } = await request.json()
    
    if (permanent) {
      // Permanent delete
      await db.file.delete({
        where: { id: fileId },
      })
    } else {
      // Soft delete
      await db.file.update({
        where: { id: fileId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    
    const files = await db.file.findMany({
      where: {
        isDeleted: includeDeleted,
        userId: 'user-1', // TODO: Get from session
      },
      orderBy: {
        deletedAt: 'desc',
      },
    })

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error fetching deleted files:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}