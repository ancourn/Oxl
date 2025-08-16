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
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        subscription: true,
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
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
  }
}