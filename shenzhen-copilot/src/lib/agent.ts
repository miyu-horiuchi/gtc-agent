import { GoogleGenerativeAI, type FunctionDeclarationsTool, type Content } from "@google/generative-ai";
import {
  FACTORIES,
  PRE_TRIP_CHECKLIST,
  MANUFACTURING_TIPS,
  SOURCING_PLATFORMS,
  KEY_LOCATIONS,
} from "@/data/knowledge-base";
import { TOOL_DECLARATIONS, executeTools } from "./tools";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are the Shenzhen Co-Pilot — an action-first AI agent for hardware founders navigating prototype-to-production in Shenzhen, China.

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
- Key locations: Chaihuo, Huaqiangbei, Yihua Electron Plaza, TroubleMakers, Seeed Studio
- Platforms: LCSC, Alibaba, 1688, JLC PCB, Made-in-China
`;

// Gemini tool config
const tools: FunctionDeclarationsTool[] = [{
  functionDeclarations: TOOL_DECLARATIONS.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters as FunctionDeclarationsTool["functionDeclarations"] extends Array<infer T> ? T extends { parameters: infer P } ? P : never : never,
  })),
}];

interface ConversationEntry {
  role: "user" | "model" | "function";
  parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: unknown } }>;
}

const conversations = new Map<string, ConversationEntry[]>();

export async function chat(userPhone: string, userMessage: string): Promise<string> {
  const history = conversations.get(userPhone) || [];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools,
  });

  const chatSession = model.startChat({
    history: history as Content[],
  });

  // Send user message
  let response = await chatSession.sendMessage(userMessage);
  let candidate = response.response.candidates?.[0];

  // Handle tool calls in a loop (agent can call multiple tools)
  let iterations = 0;
  const maxIterations = 5;

  while (candidate && iterations < maxIterations) {
    const functionCalls = candidate.content?.parts?.filter(p => p.functionCall);

    if (!functionCalls || functionCalls.length === 0) break;

    // Execute all tool calls
    const toolCalls = functionCalls.map(p => ({
      name: p.functionCall!.name,
      args: p.functionCall!.args as Record<string, unknown>,
    }));

    console.log(`[Agent] Executing ${toolCalls.length} tools: ${toolCalls.map(t => t.name).join(", ")}`);

    const results = await executeTools(toolCalls);

    // Send tool results back to the model
    const functionResponses = results.map(r => ({
      functionResponse: {
        name: r.name,
        response: r.result as object,
      },
    }));

    response = await chatSession.sendMessage(functionResponses as unknown as Array<import("@google/generative-ai").Part>);
    candidate = response.response.candidates?.[0];
    iterations++;
  }

  const textParts = candidate?.content?.parts?.filter(p => p.text);
  const assistantMessage = textParts?.map(p => p.text).join("\n") || "Sorry, I couldn't process that. Try again.";

  // Save conversation history
  const updatedHistory = await chatSession.getHistory();
  conversations.set(userPhone, updatedHistory as ConversationEntry[]);

  return assistantMessage;
}

export function clearConversation(userPhone: string): void {
  conversations.delete(userPhone);
}
