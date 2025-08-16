import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get the first user
    const user = await db.user.findFirst();
    const team = await db.team.findFirst();
    
    if (!user || !team) {
      return NextResponse.json({ error: "No user or team found" }, { status: 404 });
    }

    // Try to create a test mail
    const mail = await db.mail.create({
      data: {
        teamId: team.id,
        userId: user.id,
        from: user.email,
        to: "test@example.com",
        subject: "Test Email",
        body: "This is a test email",
        folder: "INBOX",
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
    });

    return NextResponse.json({ 
      mail,
      success: true 
    });
  } catch (error) {
    console.error("Mail test error:", error);
    return NextResponse.json({ 
      error: "Mail test failed",
      details: error.message 
    }, { status: 500 });
  }
}