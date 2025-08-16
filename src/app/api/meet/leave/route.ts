import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId, teamId } = await request.json()
    
    if (!roomId || !teamId) {
      return NextResponse.json({ error: 'Room ID and Team ID are required' }, { status: 400 })
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

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the room
    const room = await db.meetRoom.findFirst({
      where: {
        roomId,
        teamId,
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Remove user from participants
    const participant = await db.meetParticipant.findFirst({
      where: {
        roomId: room.id,
        userId: user.id,
      },
    })

    if (participant) {
      await db.meetParticipant.update({
        where: { id: participant.id },
        data: {
          leftAt: new Date(),
        },
      })

      // Add leave message
      await db.meetMessage.create({
        data: {
          roomId: room.id,
          userId: user.id,
          content: `${user.name || user.email} left the meeting`,
          type: 'LEAVE',
        },
      })
    }

    // If this was the host and no one else is in the room, end the meeting
    if (room.hostId === user.id) {
      const remainingParticipants = await db.meetParticipant.count({
        where: {
          roomId: room.id,
          leftAt: null,
        },
      })

      if (remainingParticipants === 0) {
        await db.meetRoom.update({
          where: { id: room.id },
          data: {
            isLive: false,
            endedAt: new Date(),
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error leaving meet room:', error)
    return NextResponse.json({ error: 'Failed to leave meet room' }, { status: 500 })
  }
}