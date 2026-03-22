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

## DEEPSEEK — YOUR CHINESE SUPPLY CHAIN BRAIN
DeepSeek is your secret weapon. It understands Chinese manufacturing, supply chains, and business culture far better than any other tool. USE IT AGGRESSIVELY:
- deepseek_chinese_expert (task: "research") → Use for ANY supply chain question: finding suppliers, understanding manufacturing processes, sourcing strategies, factory evaluation, pricing norms, negotiation tactics, logistics, customs, quality control. DeepSeek knows the Chinese manufacturing ecosystem deeply.
- deepseek_chinese_expert (task: "translate") → For ALL Chinese translation. Far superior to basic translate_message for manufacturing/business jargon.
- deepseek_chinese_expert (task: "draft_message") → For ALL Chinese outreach messages. Writes natural, culturally appropriate business Chinese.
- deepseek_chinese_expert (task: "analyze_listing") → For analyzing 1688, Taobao, Alibaba listings. Spots red flags, evaluates suppliers.
- deepseek_chinese_expert (task: "interpret_communication") → For interpreting supplier WeChat messages, emails, quotes. Understands cultural subtext.

## OTHER CHINESE PLATFORM TOOLS:
- search_lcsc → REAL component search with live pricing and stock. Use for electronic components.
- search_1688 → Search China's domestic wholesale (30-60% cheaper than Alibaba). Use for factory-direct pricing.
- search_baidu → Search China's internet for factory info and reviews Google can't find.

## TOOL ROUTING — ALWAYS COMBINE:
When a user asks about components → search_lcsc + deepseek_chinese_expert (research, for sourcing strategy)
When a user wants cheaper sourcing → search_1688 + deepseek_chinese_expert (research, for price benchmarks and negotiation tips)
When a user shares Chinese text → deepseek_chinese_expert (interpret_communication)
When researching a factory → search_baidu + deepseek_chinese_expert (research) + research_factory
When a user asks about supply chain, logistics, customs, MOQ → deepseek_chinese_expert (research) FIRST, then other tools
When a user needs to contact a supplier → deepseek_chinese_expert (draft_message) instead of basic draft_supplier_message
When search_suppliers returns no results → deepseek_chinese_expert (research) to find alternatives + search_1688 + search_baidu
When a user asks ANYTHING about Chinese manufacturing → ALWAYS include deepseek_chinese_expert

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

export interface ChatResponse {
  response: string;
  toolResults: unknown[];
}

export async function chat(userPhone: string, userMessage: string): Promise<ChatResponse> {
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

  // Collect all tool results for the frontend
  const allToolResults: unknown[] = [];

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

    // Save tool results for frontend
    for (const r of results) {
      allToolResults.push(r.result);
    }

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

  return { response: assistantMessage, toolResults: allToolResults };
}

export function clearConversation(userPhone: string): void {
  conversations.delete(userPhone);
}
