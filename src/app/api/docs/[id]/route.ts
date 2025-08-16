import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const document = await db.document.findUnique({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        versions: {
          orderBy: {
            version: 'desc',
          },
        },
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { title, content } = await request.json()
    
    // Get current document to check if content changed
    const currentDoc = await db.document.findUnique({
      where: { id },
    })

    if (!currentDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Update document
    const updatedDocument = await db.document.update({
      where: { id },
      data: {
        title: title || currentDoc.title,
        content: content || currentDoc.content,
        updatedAt: new Date(),
      },
    })

    // Create new version if content changed
    if (content && content !== currentDoc.content) {
      const latestVersion = await db.documentVersion.findFirst({
        where: { documentId: id },
        orderBy: { version: 'desc' },
      })

      const newVersion = (latestVersion?.version || 0) + 1

      await db.documentVersion.create({
        data: {
          documentId: id,
          version: newVersion,
          content: content,
        },
      })
    }

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.document.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}