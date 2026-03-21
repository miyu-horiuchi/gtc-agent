import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/agent";

// Health check
export async function GET() {
  return NextResponse.json({ status: "GTC Agent is running" });
}

// Handle incoming messages (from OpenClaw webhook or direct API calls)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, from, phone } = body;

    const text = message || body.Body; // Support both JSON and form-data style
    const sender = from || phone || "anonymous";

    if (!text) {
      return NextResponse.json(
        { error: "Missing message" },
        { status: 400 }
      );
    }

    console.log(`[GTC Agent] Message from ${sender}: ${text}`);

    const response = await chat(sender, text);

    return NextResponse.json({ response, from: sender });
  } catch (error) {
    console.error("[GTC Agent] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
