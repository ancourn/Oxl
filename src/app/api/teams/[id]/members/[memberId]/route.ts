import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(request: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = params.id;
    const memberId = params.memberId;

    // Check if user has permission to remove members
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

    // Check if the member to remove exists
    const memberToRemove = await db.teamMember.findUnique({
      where: { id: memberId },
      include: {
        user: true,
      },
    });

    if (!memberToRemove || memberToRemove.teamId !== teamId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove the owner
    if (memberToRemove.role === 'OWNER') {
      return NextResponse.json({ error: 'Cannot remove team owner' }, { status: 400 });
    }

    // Admins can only remove members, not other admins
    if (userMembership.role === 'ADMIN' && memberToRemove.role === 'ADMIN') {
      return NextResponse.json({ error: 'Admins cannot remove other admins' }, { status: 403 });
    }

    // Remove the member
    await db.teamMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}