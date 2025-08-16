import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json()
    
    const restoredFile = await db.file.update({
      where: { id: fileId },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    })

    return NextResponse.json({ success: true, file: restoredFile })
  } catch (error) {
    console.error('Error restoring file:', error)
    return NextResponse.json({ error: 'Failed to restore file' }, { status: 500 })
  }
}