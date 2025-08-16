import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mailId = params.id
    const { action, teamId } = await request.json()

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

    const mail = await db.mail.findFirst({
      where: {
        id: mailId,
        teamId,
      },
    })

    if (!mail) {
      return NextResponse.json({ error: 'Mail not found' }, { status: 404 })
    }

    let updatedMail

    switch (action) {
      case 'mark_read':
        updatedMail = await db.mail.update({
          where: { id: mailId },
          data: { isRead: true },
        })
        break

      case 'mark_unread':
        updatedMail = await db.mail.update({
          where: { id: mailId },
          data: { isRead: false },
        })
        break

      case 'star':
        updatedMail = await db.mail.update({
          where: { id: mailId },
          data: { isStarred: true },
        })
        break

      case 'unstar':
        updatedMail = await db.mail.update({
          where: { id: mailId },
          data: { isStarred: false },
        })
        break

      case 'move_to_trash':
        updatedMail = await db.mail.update({
          where: { id: mailId },
          data: { 
            folder: 'TRASH',
            isDeleted: true,
          },
        })
        break

      case 'restore':
        updatedMail = await db.mail.update({
          where: { id: mailId },
          data: { 
            folder: 'INBOX',
            isDeleted: false,
          },
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, mail: updatedMail })
  } catch (error) {
    console.error('Error updating mail:', error)
    return NextResponse.json({ error: 'Failed to update mail' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mailId = params.id
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

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

    const mail = await db.mail.findFirst({
      where: {
        id: mailId,
        teamId,
      },
    })

    if (!mail) {
      return NextResponse.json({ error: 'Mail not found' }, { status: 404 })
    }

    await db.mail.delete({
      where: { id: mailId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting mail:', error)
    return NextResponse.json({ error: 'Failed to delete mail' }, { status: 500 })
  }
}