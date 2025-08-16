<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = createTeamSchema.parse(body);

    // For now, we'll use a hardcoded user ID
    // In a real app, this would come from the authenticated user
    const userId = "user_1";

    const team = await db.team.create({
      data: {
        name,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
        subscription: {
          create: {
            plan: "free",
            status: "active",
            currentEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
=======
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: {
        teamMemberships: {
          include: {
            team: {
              include: {
                owner: true,
                members: {
                  include: {
                    user: true,
                  },
                },
                subscription: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teams = user.teamMemberships.map(membership => ({
      ...membership.team,
      role: membership.role,
      memberCount: membership.team.members.length,
    }));

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTeamSchema.parse(body);

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can create a team (limit based on subscription)
    const currentTeamsCount = await db.teamMember.count({
      where: {
        userId: user.id,
        role: 'OWNER',
      },
    });

    if (currentTeamsCount >= 3) {
      return NextResponse.json({ error: 'Team limit reached' }, { status: 403 });
    }

    const team = await db.team.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
>>>>>>> 1ba90cb23470ded79655cd9f02efd2c171078c07
          },
        },
      },
      include: {
<<<<<<< HEAD
=======
        owner: true,
>>>>>>> 1ba90cb23470ded79655cd9f02efd2c171078c07
        members: {
          include: {
            user: true,
          },
        },
<<<<<<< HEAD
        subscription: true,
=======
>>>>>>> 1ba90cb23470ded79655cd9f02efd2c171078c07
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
<<<<<<< HEAD
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // For now, we'll use a hardcoded user ID
    const userId = "user_1";

    const teams = await db.team.findMany({
      where: {
        OR: [
          {
            ownerId: userId,
          },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        subscription: true,
        owner: true,
      },
    });

    return NextResponse.json(teams);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
=======
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
>>>>>>> 1ba90cb23470ded79655cd9f02efd2c171078c07
  }
}