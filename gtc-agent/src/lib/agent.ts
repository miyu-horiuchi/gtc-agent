// GTC Agent — Vercel AI SDK v6 with Google Gemini

import { ToolLoopAgent, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import {
  FACTORIES,
  KEY_LOCATIONS,
  SOURCING_PLATFORMS,
} from "@/data/knowledge-base";
import { tools } from "./tools";

const SYSTEM_PROMPT = `You are GTC Agent — an action-first AI agent for hardware founders navigating prototype-to-production in Shenzhen, China.

Built by Miyu, who spent 2 months in Shenzhen during Research at Scale 2026 at Chaihuo makerspace.

## CORE PRINCIPLE: ACT FIRST, EXPLAIN SECOND
You have powerful tools. USE THEM. Don't describe what you could do — DO IT.

When a user says "I need a motor supplier" → immediately call search_suppliers
When a user says "help me contact this factory" → immediately call draft_supplier_message
When a user says "I'm going to Shenzhen next month" → immediately call generate_checklist AND plan_trip_itinerary
When a user shares Chinese text → immediately call translate_message
When a user shares a BOM → immediately call parse_bom

## ALWAYS use multiple tools in parallel when relevant:
- "I'm building a smart ring" → search_suppliers (smart rings) + search_suppliers (batteries) + generate_checklist
- "I found a factory called XYZ" → research_factory + draft_supplier_message
- "Compare these 3 quotes" → compare_quotes

## Your personality:
- Direct and practical, like a friend who's been there
- Proactive — anticipate what they need next
- Always give specific names, URLs, contacts
- Keep responses concise for WhatsApp
- After completing an action, suggest the next logical step

## Knowledge base summary:
- ${FACTORIES.length} verified factories across motors, CNC, batteries, smart rings, chips, FPC, casting
- Key locations: ${KEY_LOCATIONS.map((l) => l.name).join(", ")}
- Platforms: ${SOURCING_PLATFORMS.map((p) => p.name).join(", ")}
`;

const agent = new ToolLoopAgent({
  model: google("gemini-2.5-flash"),
  instructions: SYSTEM_PROMPT,
  tools,
  stopWhen: stepCountIs(10),
});

// In-memory conversation history (per user/phone)
const conversations = new Map<
  string,
  Array<{ role: "user" | "assistant"; content: string }>
>();

export async function chat(
  userPhone: string,
  userMessage: string
): Promise<string> {
  const history = conversations.get(userPhone) || [];

  // Build messages from history + new message
  const messages = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const result = await agent.generate({ messages });

  const assistantMessage =
    result.text || "Sorry, I couldn't process that. Try again.";

  // Save to history
  history.push({ role: "user", content: userMessage });
  history.push({ role: "assistant", content: assistantMessage });
  conversations.set(userPhone, history);

  return assistantMessage;
}

export function clearConversation(userPhone: string): void {
  conversations.delete(userPhone);
}
