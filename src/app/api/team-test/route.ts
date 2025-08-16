import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get the first user
    const user = await db.user.findFirst();
    
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    // Try to create a team
    const team = await db.team.create({
      data: {
        name: "Test Team",
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
        subscriptions: {
          create: {
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        subscriptions: true,
        owner: true,
      },
    });

    return NextResponse.json({ 
      user: { id: user.id, email: user.email },
      team: { 
        id: team.id, 
        name: team.name,
        memberCount: team.members.length 
      },
      success: true 
    });
  } catch (error) {
    console.error("Team test error:", error);
    return NextResponse.json({ 
      error: "Team test failed",
      details: error.message 
    }, { status: 500 });
  }
}