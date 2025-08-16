import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const updateMailSchema = z.object({
  isRead: z.boolean().optional(),
  folder: z.enum(["INBOX", "SENT", "DRAFTS", "TRASH"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mailId = params.id;

    const mail = await db.mail.findUnique({
      where: { id: mailId },
      include: {
        fromUser: true,
        toUser: true,
        team: true,
      },
    });

    if (!mail) {
      return NextResponse.json({ error: "Mail not found" }, { status: 404 });
    }

    return NextResponse.json(mail);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { isRead, folder } = updateMailSchema.parse(body);
    const mailId = params.id;

    const updateData: any = {};
    if (isRead !== undefined) updateData.isRead = isRead;
    if (folder !== undefined) updateData.folder = folder;

    const mail = await db.mail.update({
      where: { id: mailId },
      data: updateData,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mailId = params.id;

    await db.mail.delete({
      where: { id: mailId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}