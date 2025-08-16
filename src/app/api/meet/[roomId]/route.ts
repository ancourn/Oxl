import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId;

    const meeting = await db.meeting.findUnique({
      where: { roomId },
      include: {
        creator: true,
        team: true,
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId;
    const body = await request.json();
    const { userId } = body;

    // For demo purposes, use hardcoded user ID if not provided
    const participantUserId = userId || "user_1";

    // Check if meeting exists
    const meeting = await db.meeting.findUnique({
      where: { roomId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Add participant to meeting
    const participant = await db.meetingParticipant.upsert({
      where: {
        userId_meetingId: {
          userId: participantUserId,
          meetingId: meeting.id,
        },
      },
      update: {
        leftAt: null, // Rejoin if they left
      },
      create: {
        userId: participantUserId,
        meetingId: meeting.id,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(participant);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}