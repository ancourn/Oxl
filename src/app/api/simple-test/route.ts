import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Try to count users
    const userCount = await db.user.count();
    
    // Try to create a simple user
    const user = await db.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: "Test User",
      },
    });

    return NextResponse.json({ 
      userCount, 
      user: { id: user.id, email: user.email },
      success: true 
    });
  } catch (error) {
    console.error("Simple test error:", error);
    return NextResponse.json({ 
      error: "Simple test failed",
      details: error.message 
    }, { status: 500 });
  }
}