import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const meeting = await db.meetRoom.findUnique({
      where: { roomId },
      include: {
        host: true,
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
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();

    // For demo purposes, use hardcoded user ID
    const userId = "cmee12dlb0000vd9fqqg4nhea";

    // Check if meeting exists
    const meeting = await db.meetRoom.findUnique({
      where: { roomId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Add participant to meeting
    const participant = await db.meetParticipant.create({
      data: {
        roomId: meeting.id,
        userId,
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