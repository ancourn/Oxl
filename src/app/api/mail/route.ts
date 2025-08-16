import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const folder = searchParams.get('folder') || 'INBOX'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
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

    const skip = (page - 1) * limit

    const [mails, totalCount] = await Promise.all([
      db.mail.findMany({
        where: {
          teamId,
          folder: folder as any,
          isDeleted: false,
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
        orderBy: {
          receivedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      db.mail.count({
        where: {
          teamId,
          folder: folder as any,
          isDeleted: false,
        },
      }),
    ])

    const unreadCount = await db.mail.count({
      where: {
        teamId,
        folder: 'INBOX',
        isDeleted: false,
        isRead: false,
      },
    })

    return NextResponse.json({
      mails,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching mails:', error)
    return NextResponse.json({ error: 'Failed to fetch mails' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, subject, body, cc, bcc, teamId } = await request.json()
    
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    if (!to || !subject) {
      return NextResponse.json({ error: 'To and subject are required' }, { status: 400 })
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

    const mail = await db.mail.create({
      data: {
        teamId,
        userId: user.id,
        from: session.user.email,
        to,
        subject,
        body,
        cc,
        bcc,
        folder: 'SENT',
        sentAt: new Date(),
        receivedAt: new Date(),
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

    // TODO: Send actual email via SMTP
    // This would integrate with your email service

    return NextResponse.json({ success: true, mail })
  } catch (error) {
    console.error('Error sending mail:', error)
    return NextResponse.json({ error: 'Failed to send mail' }, { status: 500 })
  }
}