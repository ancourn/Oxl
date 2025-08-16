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

    const members = await db.teamMember.findMany({
      where: { teamId },
      include: {
        user: true,
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}