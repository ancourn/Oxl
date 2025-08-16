import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  type: z.enum(["TEXT", "SYSTEM"]).optional().default("TEXT"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const body = await request.json();
    const { message, type } = messageSchema.parse(body);
    const roomId = params.roomId;

    // For now, use hardcoded user ID
    const userId = "user_1";

    // Find the meeting
    const meeting = await db.meeting.findUnique({
      where: { roomId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const meetingMessage = await db.meetingMessage.create({
      data: {
        meetingId: meeting.id,
        userId,
        message,
        type,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(meetingMessage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId;

    // Find the meeting
    const meeting = await db.meeting.findUnique({
      where: { roomId },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const messages = await db.meetingMessage.findMany({
      where: { meetingId: meeting.id },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}