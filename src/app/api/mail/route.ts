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
    const body = await request.json();
    const { toEmail, subject, body, attachments, teamId } = sendMailSchema.parse(body);

    // For now, use hardcoded sender user ID
    const fromUserId = "user_1";

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
        fromUserId,
        toUserId: toUser.id,
        subject,
        body,
        attachments: attachments ? JSON.stringify(attachments) : null,
        folder: "SENT",
        teamId,
      },
      include: {
        fromUser: true,
        toUser: true,
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
    const userId = "user_1";

    const whereClause: any = {
      folder: folder as any,
    };

    if (folder === "INBOX") {
      whereClause.toUserId = userId;
    } else if (folder === "SENT") {
      whereClause.fromUserId = userId;
    }

    if (teamId) {
      whereClause.teamId = teamId;
    }

    const mails = await db.mail.findMany({
      where: whereClause,
      include: {
        fromUser: true,
        toUser: true,
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