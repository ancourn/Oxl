import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find the invitation
    const invitation = await db.teamMember.findFirst({
      where: {
        inviteToken: token,
        inviteExpiry: {
          gt: new Date(),
        },
      },
      include: {
        team: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
    }

    // Check if the invitation is for the current user
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || invitation.userId !== user.id) {
      return NextResponse.json({ error: 'Invitation not for this user' }, { status: 403 });
    }

    // Accept the invitation
    const updatedMembership = await db.teamMember.update({
      where: { id: invitation.id },
      data: {
        inviteToken: null,
        inviteExpiry: null,
        joinedAt: new Date(),
      },
      include: {
        team: {
          include: {
            owner: true,
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Successfully joined team',
      team: updatedMembership.team,
    });
  } catch (error) {
    console.error('Error accepting team invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}