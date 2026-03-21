import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { chat } from "@/lib/agent";

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

// Webhook verification for Twilio
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "Shenzhen Co-Pilot is running" });
}

// Handle incoming WhatsApp messages
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = formData.get("Body") as string;
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;

    if (!body || !from) {
      return NextResponse.json({ error: "Missing message body or sender" }, { status: 400 });
    }

    console.log(`Message from ${from}: ${body}`);

    // Get response from agent
    const response = await chat(from, body);

    // Send reply via Twilio
    await getTwilioClient().messages.create({
      body: response,
      from: to, // The Twilio WhatsApp number
      to: from,
    });

    // Return TwiML response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("Error processing WhatsApp message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
