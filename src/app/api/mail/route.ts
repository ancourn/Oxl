import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const sendMailSchema = z.object({
  toEmail: z.string().email("Invalid recipient email"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string(),
  attachments: z.array(z.string()).optional(),
  teamId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { toEmail, subject, body, attachments, teamId } = sendMailSchema.parse(requestBody);

    // For now, use hardcoded sender user ID
    const fromUserId = "cmee12dlb0000vd9fqqg4nhea"; // Use the actual test user ID
    
    // Get the sender user
    const fromUser = await db.user.findUnique({
      where: { id: fromUserId },
    });

    if (!fromUser) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    // Find or create recipient user
    const toUser = await db.user.upsert({
      where: { email: toEmail },
      update: {},
      create: {
        email: toEmail,
        name: toEmail.split("@")[0],
      },
    });

    const mail = await db.mail.create({
      data: {
        teamId,
        userId: fromUserId,
        from: fromUser.email,
        to: toUser.email,
        subject,
        body,
        attachments: attachments ? JSON.stringify(attachments) : null,
        folder: "SENT",
        sentAt: new Date(),
        receivedAt: new Date(),
      },
      include: {
        user: true,
        team: true,
      },
    });

    return NextResponse.json(mail);
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
    const folder = searchParams.get("folder") || "INBOX";
    const teamId = searchParams.get("teamId");

    // For now, use hardcoded user ID
    const userId = "cmee12dlb0000vd9fqqg4nhea"; // Use the actual test user ID
    
    // Get the user to get their email
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const whereClause: any = {
      folder: folder as any,
      teamId: teamId || undefined,
    };

    if (folder === "INBOX") {
      whereClause.to = user.email;
    } else if (folder === "SENT") {
      whereClause.from = user.email;
    }

    const mails = await db.mail.findMany({
      where: whereClause,
      include: {
        user: true,
        team: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(mails);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}