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
          },
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