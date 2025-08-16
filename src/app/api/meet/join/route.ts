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
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 })
    }

    // Check if user is already in the room
    const existingParticipant = room.participants.find(p => p.userId === user.id)
    if (existingParticipant) {
      return NextResponse.json({ 
        success: true, 
        room,
        message: 'Already in room'
      })
    }

    // Add user as participant
    const participant = await db.meetParticipant.create({
      data: {
        roomId: room.id,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Add join message
    await db.meetMessage.create({
      data: {
        roomId: room.id,
        userId: user.id,
        content: `${user.name || user.email} joined the meeting`,
        type: 'JOIN',
      },
    })

    // If this is the first participant, start the meeting
    if (room.participants.length === 0) {
      await db.meetRoom.update({
        where: { id: room.id },
        data: {
          isLive: true,
          startedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ 
      success: true, 
      room,
      participant
    })
  } catch (error) {
    console.error('Error joining meet room:', error)
    return NextResponse.json({ error: 'Failed to join meet room' }, { status: 500 })
  }
}