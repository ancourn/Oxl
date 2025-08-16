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
    const createdBy = "cmee12dlb0000vd9fqqg4nhea"; // Use the actual test user ID

    // Generate unique room ID
    const roomId = randomUUID();

    const meeting = await db.meetRoom.create({
      data: {
        name: title,
        roomId,
        teamId,
        hostId: createdBy,
      },
      include: {
        host: true,
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
    const userId = "cmee12dlb0000vd9fqqg4nhea"; // Use the actual test user ID

    const whereClause: any = {};

    if (teamId) {
      whereClause.teamId = teamId;
    } else {
      // Show meetings where user is host or participant
      whereClause.OR = [
        {
          hostId: userId,
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

    const meetings = await db.meetRoom.findMany({
      where: whereClause,
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
            createdAt: "desc",
          },
          take: 10, // Limit to latest 10 messages
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(meetings);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}