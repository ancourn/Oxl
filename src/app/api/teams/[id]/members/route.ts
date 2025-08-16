<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional().default("MEMBER"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { email, role } = inviteMemberSchema.parse(body);
    const teamId = params.id;

    // Check if team exists and user has permission
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // For now, skip the actual user lookup and invitation logic
    // In a real app, you would:
    // 1. Find the user by email or create an invitation
    // 2. Send an email invitation
    // 3. Handle the invitation acceptance

    // For demo purposes, we'll create a mock user
    const mockUser = await db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: email.split("@")[0],
      },
    });

    // Add member to team
    const teamMember = await db.teamMember.create({
      data: {
        userId: mockUser.id,
        teamId,
        role,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(teamMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = params.id;
=======
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;

    // Check if user is a member of the team
    const userMembership = await db.teamMember.findFirst({
      where: {
        teamId,
        user: {
          email: session.user.email,
        },
      },
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
>>>>>>> 1ba90cb23470ded79655cd9f02efd2c171078c07

    const members = await db.teamMember.findMany({
      where: { teamId },
      include: {
<<<<<<< HEAD
        user: true,
=======
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
>>>>>>> 1ba90cb23470ded79655cd9f02efd2c171078c07
      },
    });

    return NextResponse.json(members);
  } catch (error) {
<<<<<<< HEAD
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
=======
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const body = await request.json();
    const validatedData = inviteMemberSchema.parse(body);

    // Check if user has permission to invite members (OWNER or ADMIN)
    const userMembership = await db.teamMember.findFirst({
      where: {
        teamId,
        user: {
          email: session.user.email,
        },
        role: {
          in: ['OWNER', 'ADMIN'],
        },
      },
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user exists
    const invitedUser = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!invitedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a member
    const existingMembership = await db.teamMember.findFirst({
      where: {
        teamId,
        userId: invitedUser.id,
      },
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
    }

    // Create invitation
    const inviteToken = nanoid(32);
    const inviteExpiry = new Date();
    inviteExpiry.setHours(inviteExpiry.getHours() + 24); // 24 hours expiry

    const membership = await db.teamMember.create({
      data: {
        teamId,
        userId: invitedUser.id,
        role: validatedData.role,
        invitedBy: session.user.email,
        inviteToken,
        inviteExpiry,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // TODO: Send invitation email
    // This would integrate with your email service

    return NextResponse.json(membership);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error inviting team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const body = await request.json();
    const validatedData = updateMemberRoleSchema.parse(body);

    // Check if user has permission to update roles (OWNER only)
    const userMembership = await db.teamMember.findFirst({
      where: {
        teamId,
        user: {
          email: session.user.email,
        },
        role: 'OWNER',
      },
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { memberId, role } = body;

    const updatedMembership = await db.teamMember.update({
      where: { id: memberId },
      data: { role: validatedData.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(updatedMembership);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
>>>>>>> 1ba90cb23470ded79655cd9f02efd2c171078c07
  }
}