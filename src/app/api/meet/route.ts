<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { randomUUID } from "crypto";

const createMeetingSchema = z.object({
  title: z.string().optional(),
  teamId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, teamId } = createMeetingSchema.parse(body);

    // For now, use hardcoded user ID
    const createdBy = "user_1";

    // Generate unique room ID
    const roomId = randomUUID();

    const meeting = await db.meeting.create({
      data: {
        title,
        roomId,
        teamId,
        createdBy,
      },
      include: {
        creator: true,
        team: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(meeting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    // For now, use hardcoded user ID
    const userId = "user_1";

    const whereClause: any = {
      isActive: true,
    };

    if (teamId) {
      whereClause.teamId = teamId;
    } else {
      // Show meetings where user is creator or participant
      whereClause.OR = [
        {
          createdBy: userId,
        },
        {
          participants: {
            some: {
              userId,
            },
          },
        },
      ];
    }

    const meetings = await db.meeting.findMany({
      where: whereClause,
      include: {
        creator: true,
        team: true,
        participants: {
          include: {
            user: true,
=======
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const rooms = await db.meetRoom.findMany({
      where: {
        teamId,
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        _count: {
          select: {
            participants: true,
>>>>>>> 1ba90cb23470ded79655cd9f02efd2c171078c07
          },
        },
      },
      orderBy: {
<<<<<<< HEAD
        createdAt: "desc",
      },
    });

    return NextResponse.json(meetings);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
=======
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('Error fetching meet rooms:', error)
    return NextResponse.json({ error: 'Failed to fetch meet rooms' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, teamId, maxParticipants } = await request.json()
    
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

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const room = await db.meetRoom.create({
      data: {
        name: name || `Meeting ${new Date().toLocaleString()}`,
        description,
        teamId,
        hostId: user.id,
        roomId: nanoid(10),
        maxParticipants: maxParticipants || 50,
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Error creating meet room:', error)
    return NextResponse.json({ error: 'Failed to create meet room' }, { status: 500 })
>>>>>>> 1ba90cb23470ded79655cd9f02efd2c171078c07
  }
}