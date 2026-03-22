import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/agent";

// Direct chat API for testing without WhatsApp
export async function POST(request: NextRequest) {
  try {
    const { message, phone } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const userPhone = phone || "test-user";
    const result = await chat(userPhone, message);

    return NextResponse.json({ response: result.response, toolResults: result.toolResults });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
