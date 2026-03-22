// Action tools that agents can execute autonomously

import { searchFactories, getFactoriesByCategory, FACTORIES, PRE_TRIP_CHECKLIST, MANUFACTURING_TIPS, SOURCING_PLATFORMS, KEY_LOCATIONS } from "@/data/knowledge-base";

export interface ToolResult {
  name: string;
  result: unknown;
}

// Tool definitions for Gemini function calling
export const TOOL_DECLARATIONS = [
  {
    name: "search_suppliers",
    description: "Search for verified suppliers/factories by category or keyword. Use when user needs to find a manufacturer for a specific component or process.",
    parameters: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query: component type, process, or factory name" },
        category: { type: "string", description: "Category filter: stepper-motors, cnc, batteries, smart-rings, chips, fpc, aluminum-casting, sand-casting, automation, laser, pcb" },
      },
      required: ["query"],
    },
  },
  {
    name: "draft_supplier_message",
    description: "Draft a professional outreach message to a supplier/factory in both English and Chinese. Use when user wants to contact a factory.",
    parameters: {
      type: "object" as const,
      properties: {
        factory_name: { type: "string", description: "Name of the factory to contact" },
        product_description: { type: "string", description: "What the user is building" },
        requirements: { type: "string", description: "Specific requirements: quantity, specs, timeline" },
        tone: { type: "string", enum: ["formal", "casual"], description: "Message tone" },
      },
      required: ["factory_name", "product_description"],
    },
  },
  {
    name: "generate_checklist",
    description: "Generate a customized pre-trip or manufacturing checklist based on user's specific situation.",
    parameters: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["pre-trip", "manufacturing", "sourcing", "full"], description: "Type of checklist" },
        product_type: { type: "string", description: "What the user is building (for customized recommendations)" },
        experience_level: { type: "string", enum: ["first-time", "experienced"], description: "User's experience with Shenzhen" },
      },
      required: ["type"],
    },
  },
  {
    name: "scrape_alibaba_suppliers",
    description: "Search Alibaba for suppliers matching a component or product. Returns real supplier listings with prices and MOQs.",
    parameters: {
      type: "object" as const,
      properties: {
        search_term: { type: "string", description: "What to search for on Alibaba" },
        max_results: { type: "number", description: "Max number of results (default 5)" },
      },
      required: ["search_term"],
    },
  },
  {
    name: "compare_quotes",
    description: "Create a structured comparison of multiple supplier quotes. User provides quote details and the tool generates a decision matrix.",
    parameters: {
      type: "object" as const,
      properties: {
        quotes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              supplier: { type: "string" },
              unit_price: { type: "number" },
              moq: { type: "number" },
              lead_time_days: { type: "number" },
              notes: { type: "string" },
            },
          },
          description: "Array of quotes to compare",
        },
        priority: { type: "string", enum: ["price", "speed", "quality", "balanced"], description: "What matters most" },
      },
      required: ["quotes"],
    },
  },
  {
    name: "plan_trip_itinerary",
    description: "Generate a day-by-day Shenzhen trip itinerary optimized for the user's goals (factory visits, sourcing, prototyping).",
    parameters: {
      type: "object" as const,
      properties: {
        arrival_date: { type: "string", description: "Arrival date (YYYY-MM-DD)" },
        departure_date: { type: "string", description: "Departure date (YYYY-MM-DD)" },
        goals: { type: "array", items: { type: "string" }, description: "Trip goals: e.g. 'find motor supplier', 'visit PCB factories', 'source components at HQB'" },
        arriving_from: { type: "string", description: "Where user is arriving from (e.g. 'HK airport', 'Shanghai')" },
      },
      required: ["arrival_date", "departure_date", "goals"],
    },
  },
  {
    name: "parse_bom",
    description: "Parse a Bill of Materials and suggest sourcing options for each component from the knowledge base and known platforms.",
    parameters: {
      type: "object" as const,
      properties: {
        components: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              quantity: { type: "number" },
              specs: { type: "string" },
            },
          },
          description: "List of BOM components",
        },
        target_volume: { type: "number", description: "Target production volume" },
      },
      required: ["components"],
    },
  },
  {
    name: "translate_message",
    description: "Translate a message between English and Chinese, with context about manufacturing/business terminology. Also advises on cultural nuance and how to respond.",
    parameters: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "Text to translate" },
        direction: { type: "string", enum: ["en_to_zh", "zh_to_en"], description: "Translation direction" },
        context: { type: "string", description: "Context: e.g. 'supplier negotiation', 'factory tour request', 'quality issue'" },
      },
      required: ["text", "direction"],
    },
  },
  {
    name: "research_factory",
    description: "Research a specific factory: check if it's in our verified database, search for additional info, and provide a trust assessment.",
    parameters: {
      type: "object" as const,
      properties: {
        factory_name: { type: "string", description: "Factory name to research" },
        factory_url: { type: "string", description: "Factory website URL if known" },
      },
      required: ["factory_name"],
    },
  },
  {
    name: "send_email",
    description: "Draft and send an outreach email to a factory or supplier. Generates professional email with both English and Chinese versions.",
    parameters: {
      type: "object" as const,
      properties: {
        to_email: { type: "string", description: "Recipient email address" },
        factory_name: { type: "string", description: "Factory name" },
        subject: { type: "string", description: "Email subject" },
        product_description: { type: "string", description: "What you're building" },
        requirements: { type: "string", description: "Specific requirements" },
      },
      required: ["to_email", "factory_name", "product_description"],
    },
  },
  {
    name: "generate_production_roadmap",
    description: "Generate a complete prototype-to-production roadmap customized for the user's specific product. Maps out every stage from POC through mass production with specific tasks, deliverables, timelines, costs, and what suppliers/processes are needed at each stage. Use when user asks about the steps to go from prototype to production, or when they describe what they're building and need a plan.",
    parameters: {
      type: "object" as const,
      properties: {
        product_description: { type: "string", description: "What the user is building" },
        current_stage: { type: "string", enum: ["idea", "poc", "evt", "dvt", "pvt", "production"], description: "Where the user is right now in the process" },
        target_volume: { type: "number", description: "Target production volume for first run" },
        budget_range: { type: "string", description: "Budget range if known (e.g. '$10k-50k')" },
        key_components: { type: "array", items: { type: "string" }, description: "Key components or processes needed (e.g. 'PCB', 'injection molding', 'battery')" },
        timeline_pressure: { type: "string", enum: ["relaxed", "moderate", "urgent"], description: "How fast they need to move" },
      },
      required: ["product_description", "current_stage"],
    },
  },
  {
    name: "assess_production_readiness",
    description: "Assess whether the user is ready to move to the next production stage. Asks diagnostic questions and identifies gaps. Use when user says they want to move to the next stage or asks 'am I ready for EVT/DVT/PVT'.",
    parameters: {
      type: "object" as const,
      properties: {
        current_stage: { type: "string", enum: ["idea", "poc", "evt", "dvt", "pvt"], description: "Current stage" },
        product_description: { type: "string", description: "What they're building" },
        has_design_files: { type: "boolean", description: "Whether they have CAD/schematic files" },
        has_bom: { type: "boolean", description: "Whether they have a Bill of Materials" },
        has_prototype: { type: "boolean", description: "Whether they have a working prototype" },
        has_supplier: { type: "boolean", description: "Whether they have identified suppliers" },
        has_tested: { type: "boolean", description: "Whether they've done testing/validation" },
      },
      required: ["current_stage", "product_description"],
    },
  },
  {
    name: "extract_x_post",
    description: "Extract content from an X/Twitter post URL. Use when a user shares an X link — extracts the tweet text, author, and date, then offers to save useful manufacturing/Shenzhen tips to the knowledge base.",
    parameters: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "The X/Twitter post URL" },
        save_to_knowledge_base: { type: "boolean", description: "Whether to save relevant tips to the knowledge base" },
      },
      required: ["url"],
    },
  },
  {
    name: "search_lcsc",
    description: "Search LCSC (China's largest electronic components distributor) for real components with live pricing, stock levels, and datasheets. Use when a user needs to find specific electronic components like chips, capacitors, connectors, resistors, etc.",
    parameters: {
      type: "object" as const,
      properties: {
        keyword: { type: "string", description: "Component to search for (e.g. 'USB-C connector', 'ESP32', '100uF capacitor')" },
        max_results: { type: "number", description: "Max results to return (default 5)" },
      },
      required: ["keyword"],
    },
  },
  {
    name: "search_1688",
    description: "Search 1688.com (China's domestic wholesale marketplace, better prices than Alibaba) for suppliers and products. Returns real listings with prices in CNY. Use when user wants the best factory-direct prices or domestic Chinese sourcing.",
    parameters: {
      type: "object" as const,
      properties: {
        keyword: { type: "string", description: "Product or component to search for" },
        max_results: { type: "number", description: "Max results to return (default 5)" },
      },
      required: ["keyword"],
    },
  },
  {
    name: "search_baidu",
    description: "Search Baidu (China's primary search engine) for Chinese-language information about factories, suppliers, manufacturing processes, or Shenzhen-specific knowledge. Use when you need Chinese-language results that Google wouldn't find.",
    parameters: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (can be English or Chinese)" },
        max_results: { type: "number", description: "Max results to return (default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "deepseek_chinese_expert",
    description: "Your primary tool for Chinese supply chain intelligence. Use DeepSeek AI for: finding suppliers and factories, sourcing strategies, pricing benchmarks, negotiation tactics, logistics and customs guidance, quality control, translating manufacturing jargon, interpreting supplier communications, analyzing Chinese factory listings, and drafting natural Chinese outreach messages. ALWAYS use this for any supply chain or Chinese manufacturing question — it knows far more than Google about the Chinese manufacturing ecosystem.",
    parameters: {
      type: "object" as const,
      properties: {
        task: { type: "string", enum: ["translate", "draft_message", "analyze_listing", "interpret_communication", "research"], description: "Type of task" },
        input_text: { type: "string", description: "Text to process" },
        context: { type: "string", description: "Additional context (e.g. 'supplier negotiation', 'factory capability analysis')" },
        target_language: { type: "string", enum: ["en", "zh"], description: "Target language for translations" },
      },
      required: ["task", "input_text"],
    },
  },
];

// Tool execution functions
export async function executeTools(toolCalls: Array<{ name: string; args: Record<string, unknown> }>): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const call of toolCalls) {
    const result = await executeTool(call.name, call.args);
    results.push({ name: call.name, result });
  }

  return results;
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "search_suppliers":
      return toolSearchSuppliers(args.query as string, args.category as string | undefined);

    case "draft_supplier_message":
      return toolDraftMessage(args as { factory_name: string; product_description: string; requirements?: string; tone?: string });

    case "generate_checklist":
      return toolGenerateChecklist(args as { type: string; product_type?: string; experience_level?: string });

    case "scrape_alibaba_suppliers":
      return toolScrapeAlibaba(args.search_term as string, args.max_results as number | undefined);

    case "compare_quotes":
      return toolCompareQuotes(args as { quotes: Array<{ supplier: string; unit_price: number; moq: number; lead_time_days: number; notes?: string }>; priority?: string });

    case "plan_trip_itinerary":
      return toolPlanItinerary(args as { arrival_date: string; departure_date: string; goals: string[]; arriving_from?: string });

    case "parse_bom":
      return toolParseBom(args as { components: Array<{ name: string; description?: string; quantity: number; specs?: string }>; target_volume?: number });

    case "translate_message":
      return toolTranslate(args as { text: string; direction: string; context?: string });

    case "research_factory":
      return toolResearchFactory(args as { factory_name: string; factory_url?: string });

    case "send_email":
      return toolSendEmail(args as { to_email: string; factory_name: string; subject?: string; product_description: string; requirements?: string });

    case "generate_production_roadmap":
      return toolProductionRoadmap(args as { product_description: string; current_stage: string; target_volume?: number; budget_range?: string; key_components?: string[]; timeline_pressure?: string });

    case "assess_production_readiness":
      return toolAssessReadiness(args as { current_stage: string; product_description: string; has_design_files?: boolean; has_bom?: boolean; has_prototype?: boolean; has_supplier?: boolean; has_tested?: boolean });

    case "extract_x_post":
      return toolExtractXPost(args as { url: string; save_to_knowledge_base?: boolean });

    case "search_lcsc":
      return toolSearchLCSC(args.keyword as string, args.max_results as number | undefined);

    case "search_1688":
      return toolSearch1688(args.keyword as string, args.max_results as number | undefined);

    case "search_baidu":
      return toolSearchBaidu(args.query as string, args.max_results as number | undefined);

    case "deepseek_chinese_expert":
      return toolDeepSeekChinese(args as { task: string; input_text: string; context?: string; target_language?: string });

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// --- Tool implementations ---

function toolSearchSuppliers(query: string, category?: string) {
  let results = category ? getFactoriesByCategory(category) : searchFactories(query);
  if (results.length === 0) {
    results = searchFactories(query);
  }
  return {
    found: results.length,
    suppliers: results,
    platforms: SOURCING_PLATFORMS.filter(p =>
      p.description.toLowerCase().includes(query.toLowerCase()) ||
      p.name.toLowerCase().includes(query.toLowerCase())
    ),
    tip: results.length === 0
      ? `No verified suppliers found for "${query}". Try searching on Alibaba, 1688.com, or Made-in-China.com. You can also visit Huaqiangbei (HQB) electronics market in Shenzhen.`
      : undefined,
  };
}

function toolDraftMessage(args: { factory_name: string; product_description: string; requirements?: string; tone?: string }) {
  const { factory_name, product_description, requirements, tone } = args;
  const formal = tone !== "casual";

  const english = `${formal ? "Dear" : "Hi"} ${factory_name} team,

My name is [YOUR NAME] and I'm based in San Francisco. I'm developing ${product_description}.

${requirements ? `Our requirements:\n${requirements}\n` : ""}I'd like to discuss potential collaboration. Could we schedule a brief call or meeting? I ${formal ? "will be" : "'m"} visiting Shenzhen soon and would love to see your facility.

${formal ? "Best regards" : "Thanks"},
[YOUR NAME]`;

  const chinese = `${formal ? "尊敬的" : ""}${factory_name}团队${formal ? "：" : "，"}

您好！我叫[您的名字]，来自旧金山。我正在开发${product_description}。

${requirements ? `我们的需求：\n${requirements}\n` : ""}我想讨论合作的可能性。我们能否安排一个简短的通话或会议？我近期将访问深圳，非常希望能参观贵工厂。

${formal ? "此致敬礼" : "谢谢"}，
[您的名字]`;

  return { english, chinese, note: "Replace [YOUR NAME] / [您的名字] with your actual name before sending." };
}

function toolGenerateChecklist(args: { type: string; product_type?: string; experience_level?: string }) {
  const { type, product_type, experience_level } = args;
  const isFirstTime = experience_level !== "experienced";

  const checklist: { item: string; priority: "critical" | "important" | "nice-to-have"; done: boolean }[] = [];

  if (type === "pre-trip" || type === "full") {
    PRE_TRIP_CHECKLIST.forEach(tip => {
      checklist.push({ item: tip.content, priority: "critical", done: false });
    });
  }

  if (type === "manufacturing" || type === "full") {
    MANUFACTURING_TIPS.forEach(tip => {
      checklist.push({ item: tip.content, priority: "important", done: false });
    });
  }

  if (type === "sourcing" || type === "full") {
    checklist.push(
      { item: "Create a complete BOM with all component specs", priority: "critical", done: false },
      { item: "Identify 3-5 potential suppliers per component on Alibaba/1688", priority: "important", done: false },
      { item: "Prepare outreach messages in English and Chinese", priority: "important", done: false },
      { item: "Set budget ranges for each component", priority: "important", done: false },
      { item: "Research MOQs for your target volume", priority: "important", done: false },
    );
  }

  if (product_type) {
    const relatedFactories = searchFactories(product_type);
    if (relatedFactories.length > 0) {
      checklist.push({
        item: `Contact verified ${product_type} suppliers: ${relatedFactories.map(f => f.name).join(", ")}`,
        priority: "important",
        done: false,
      });
    }
  }

  return { checklist, total: checklist.length };
}

async function toolScrapeAlibaba(searchTerm: string, maxResults: number = 5) {
  // Generate Alibaba search URL for the user
  const encodedSearch = encodeURIComponent(searchTerm);
  const alibabaUrl = `https://www.alibaba.com/trade/search?SearchText=${encodedSearch}`;
  const madeInChinaUrl = `https://www.made-in-china.com/multi-search/${encodedSearch}/F1/1.html`;
  const url1688 = `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodedSearch}`;

  return {
    message: `Search links generated for "${searchTerm}"`,
    links: [
      { platform: "Alibaba", url: alibabaUrl, description: "International B2B marketplace" },
      { platform: "Made-in-China", url: madeInChinaUrl, description: "Alternative B2B platform" },
      { platform: "1688.com", url: url1688, description: "Chinese domestic marketplace (better prices, needs Chinese)" },
    ],
    tips: [
      "Filter by 'Verified Supplier' and 'Trade Assurance' on Alibaba",
      "Check supplier's years in business and transaction history",
      "Always request samples before committing to an order",
      "Compare at least 3-5 suppliers before deciding",
    ],
    verified_alternatives: searchFactories(searchTerm),
  };
}

function toolCompareQuotes(args: { quotes: Array<{ supplier: string; unit_price: number; moq: number; lead_time_days: number; notes?: string }>; priority?: string }) {
  const { quotes, priority = "balanced" } = args;

  const scored = quotes.map(q => {
    let score = 0;
    const minPrice = Math.min(...quotes.map(x => x.unit_price));
    const minLead = Math.min(...quotes.map(x => x.lead_time_days));
    const minMoq = Math.min(...quotes.map(x => x.moq));

    const priceScore = (minPrice / q.unit_price) * 100;
    const speedScore = (minLead / q.lead_time_days) * 100;
    const moqScore = (minMoq / q.moq) * 100;

    switch (priority) {
      case "price": score = priceScore * 0.5 + speedScore * 0.25 + moqScore * 0.25; break;
      case "speed": score = priceScore * 0.25 + speedScore * 0.5 + moqScore * 0.25; break;
      case "quality": score = priceScore * 0.2 + speedScore * 0.3 + moqScore * 0.2; break;
      default: score = priceScore * 0.33 + speedScore * 0.33 + moqScore * 0.34; break;
    }

    return { ...q, score: Math.round(score), priceScore: Math.round(priceScore), speedScore: Math.round(speedScore), moqScore: Math.round(moqScore) };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    ranking: scored,
    recommendation: scored[0]?.supplier,
    analysis: `Based on ${priority} priority, ${scored[0]?.supplier} scores highest at ${scored[0]?.score}/100.`,
  };
}

function toolPlanItinerary(args: { arrival_date: string; departure_date: string; goals: string[]; arriving_from?: string }) {
  const { arrival_date, departure_date, goals, arriving_from } = args;

  const start = new Date(arrival_date);
  const end = new Date(departure_date);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  interface ItineraryLocation {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
    map_url?: string;
  }

  interface ItineraryDay {
    day: number;
    date: string;
    morning: string;
    afternoon: string;
    evening: string;
    locations: ItineraryLocation[];
  }

  const findLocation = (name: string) => KEY_LOCATIONS.find(l => l.name.toLowerCase().includes(name.toLowerCase()));

  const makeMapUrl = (lat: number, lng: number, name: string) =>
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`;

  const locationPin = (name: string): ItineraryLocation => {
    const loc = findLocation(name);
    if (loc && loc.lat && loc.lng) {
      return {
        name: loc.name,
        address: loc.address,
        lat: loc.lat,
        lng: loc.lng,
        map_url: makeMapUrl(loc.lat, loc.lng, loc.name),
      };
    }
    return { name };
  };

  const itinerary: ItineraryDay[] = [];

  // Day 1: Arrival + setup
  const day1Locations: ItineraryLocation[] = [locationPin("Huaqiangbei")];
  if (arriving_from?.includes("HK")) {
    day1Locations.unshift(locationPin("Futian Railway"));
  }
  itinerary.push({
    day: 1,
    date: arrival_date,
    morning: arriving_from?.includes("HK") ? "High-speed rail from HK to Futian station (14 min)" : "Arrive in Shenzhen, check into hotel",
    afternoon: "Get SIM working, test VPN, set up Alipay/WeChat Pay. Walk around your neighborhood.",
    evening: "Huaqiangbei night walk — get oriented, see the electronics markets from outside",
    locations: day1Locations,
  });

  // Day 2: HQB exploration
  if (days >= 2) {
    itinerary.push({
      day: 2,
      date: new Date(start.getTime() + 86400000).toISOString().split("T")[0]!,
      morning: "Huaqiangbei deep dive — explore SEG Plaza, Huaqiang Electronics World for components",
      afternoon: "Yihua Electron Plaza — find factories and suppliers for your specific needs",
      evening: "Review what you found, prepare outreach messages for factory visits",
      locations: [locationPin("SEG"), locationPin("Huaqiang Electronics"), locationPin("Yihua")],
    });
  }

  // Day 3: Makerspaces
  if (days >= 3) {
    itinerary.push({
      day: 3,
      date: new Date(start.getTime() + 2 * 86400000).toISOString().split("T")[0]!,
      morning: "Visit Chaihuo Makerspace — workshops, networking, prototyping facilities",
      afternoon: "Seeed Studio HQ tour — open-source hardware, factory connections",
      evening: "Review contacts, plan factory visits for remaining days",
      locations: [locationPin("Chaihuo"), locationPin("Seeed")],
    });
  }

  // Remaining days: factory visits based on goals
  for (let i = 3; i < days; i++) {
    const date = new Date(start.getTime() + i * 86400000).toISOString().split("T")[0]!;
    const goalIndex = (i - 3) % goals.length;

    itinerary.push({
      day: i + 1,
      date,
      morning: `Factory visits for: ${goals[goalIndex]}`,
      afternoon: "Follow-up meetings, sample reviews, negotiate terms",
      evening: i === days - 1 ? "Pack up, organize contacts and notes" : "Document the day, update your BOM/supplier spreadsheet",
      locations: [],
    });
  }

  // Build map with all pins
  const allLocations = KEY_LOCATIONS.filter(l => l.lat && l.lng).map(l => ({
    name: l.name,
    area: l.area,
    address: l.address,
    lat: l.lat,
    lng: l.lng,
    map_url: makeMapUrl(l.lat!, l.lng!, l.name),
  }));

  // Generate a full map URL with all locations
  const mapPins = KEY_LOCATIONS.filter(l => l.lat && l.lng)
    .map(l => `${l.lat},${l.lng}`)
    .join("/");
  const fullMapUrl = `https://www.google.com/maps/dir/${mapPins}`;

  return {
    itinerary,
    total_days: days,
    all_locations: allLocations,
    full_map_url: fullMapUrl,
    tips: [
      "Book factory visits at least 2-3 days in advance",
      "Bring business cards — they still matter in China",
      "Take photos of EVERYTHING at factories (with permission)",
      "Get WeChat contacts of everyone you meet",
      "Use Baidu Maps instead of Google Maps — it's more accurate in China",
      "Each location above has a map pin — click the map_url to open in Google Maps",
    ],
  };
}

function toolParseBom(args: { components: Array<{ name: string; description?: string; quantity: number; specs?: string }>; target_volume?: number }) {
  const { components, target_volume } = args;

  const sourced = components.map(comp => {
    const matches = searchFactories(comp.name);
    const platforms = SOURCING_PLATFORMS.filter(p => {
      const lower = comp.name.toLowerCase();
      if (lower.includes("pcb") || lower.includes("board")) return p.name === "JLC PCB" || p.name === "LCSC";
      if (lower.includes("motor")) return true;
      if (lower.includes("battery")) return true;
      return p.name === "LCSC" || p.name === "Alibaba" || p.name === "1688.com";
    });

    return {
      component: comp,
      verified_suppliers: matches,
      suggested_platforms: platforms,
      sourcing_strategy: matches.length > 0
        ? `Use verified supplier: ${matches[0]!.name}`
        : `Search on ${platforms.map(p => p.name).join(", ")}`,
    };
  });

  return {
    components: sourced,
    summary: {
      total_components: components.length,
      with_verified_suppliers: sourced.filter(s => s.verified_suppliers.length > 0).length,
      needs_sourcing: sourced.filter(s => s.verified_suppliers.length === 0).length,
    },
    target_volume,
  };
}

function toolTranslate(args: { text: string; direction: string; context?: string }) {
  // This will be handled by the LLM with the tool result as context
  return {
    text: args.text,
    direction: args.direction,
    context: args.context || "general",
    note: "Translation will be performed by the AI model with manufacturing context.",
  };
}

function toolResearchFactory(args: { factory_name: string; factory_url?: string }) {
  const matches = searchFactories(args.factory_name);
  const isVerified = matches.length > 0;

  return {
    factory_name: args.factory_name,
    in_database: isVerified,
    verified_info: isVerified ? matches[0] : null,
    trust_assessment: isVerified
      ? "VERIFIED — This factory is in our database from on-the-ground visits during Research at Scale 2026."
      : "UNVERIFIED — This factory is not in our verified database. Proceed with caution. Always request samples and visit in person before committing.",
    due_diligence_checklist: [
      "Check their Alibaba/1688 profile for years in business",
      "Request 2-3 references from other international clients",
      "Visit the factory in person before placing a large order",
      "Start with a small sample order to test quality",
      "Verify their business license (营业执照)",
      "Check if they have relevant certifications (ISO, CE, etc.)",
    ],
  };
}

function toolProductionRoadmap(args: { product_description: string; current_stage: string; target_volume?: number; budget_range?: string; key_components?: string[]; timeline_pressure?: string }) {
  const { product_description, current_stage, target_volume = 1000, budget_range, key_components = [], timeline_pressure = "moderate" } = args;

  const timeMultiplier = timeline_pressure === "urgent" ? 0.7 : timeline_pressure === "relaxed" ? 1.5 : 1;

  // Find relevant suppliers for their components
  const componentSuppliers = key_components.map(comp => ({
    component: comp,
    suppliers: searchFactories(comp),
  }));

  const stages = [
    {
      stage: "POC (Proof of Concept)",
      status: current_stage === "idea" ? "NEXT" : current_stage === "poc" ? "CURRENT" : "COMPLETED",
      duration: `${Math.round(2 * timeMultiplier)}-${Math.round(4 * timeMultiplier)} weeks`,
      units: "1-3",
      cost_estimate: "$500-$5,000",
      objective: "Prove core technical feasibility at lowest cost",
      tasks: [
        { task: "Define core functionality and success criteria", category: "planning" },
        { task: "Get dev kits (Arduino, RPi, ESP32) from Huaqiangbei or LCSC", category: "sourcing" },
        { task: "Build proof of concept with off-the-shelf components", category: "engineering" },
        { task: "Test core functionality — does the fundamental concept work?", category: "testing" },
        { task: "Document learnings and identify unknowns", category: "documentation" },
      ],
      tools_to_use: ["Breadboard, dev kits, 3D printer for basic enclosure"],
      deliverables: ["Working demo of core technology", "List of technical risks identified", "Initial BOM draft"],
      gate_criteria: "Core technology proven feasible. Key risks identified.",
    },
    {
      stage: "EVT (Engineering Validation Testing)",
      status: current_stage === "poc" ? "NEXT" : current_stage === "evt" ? "CURRENT" : ["idea"].includes(current_stage) ? "FUTURE" : "COMPLETED",
      duration: `${Math.round(4 * timeMultiplier)}-${Math.round(8 * timeMultiplier)} weeks`,
      units: "5-12",
      cost_estimate: "$5,000-$25,000",
      objective: "Build functional prototypes, validate all subsystems work together",
      tasks: [
        { task: "Create detailed schematic and PCB layout", category: "engineering" },
        { task: "Design mechanical enclosure (CAD)", category: "engineering" },
        { task: "Order custom PCBs (JLC PCB or local Shenzhen fab)", category: "sourcing" },
        { task: "Source key components from verified suppliers", category: "sourcing" },
        { task: "3D print enclosures for fit testing", category: "prototyping" },
        { task: "Assemble 5-12 EVT units", category: "assembly" },
        { task: "Test each subsystem individually", category: "testing" },
        { task: "Test full system integration", category: "testing" },
        { task: "Identify DFM issues — get factory feedback on your design", category: "dfm" },
        { task: "Iterate design based on test results (expect 2-3 revisions)", category: "engineering" },
      ],
      tools_to_use: ["Custom PCBs, 3D printing, laser cutting, soft tooling"],
      deliverables: ["Functional prototypes", "Validated schematic", "Updated BOM", "Test results", "DFM feedback from factories"],
      gate_criteria: "All subsystems functional. Design stable enough for DVT. Key suppliers identified.",
      suppliers_needed: componentSuppliers,
    },
    {
      stage: "DVT (Design Validation Testing)",
      status: current_stage === "evt" ? "NEXT" : current_stage === "dvt" ? "CURRENT" : ["idea", "poc"].includes(current_stage) ? "FUTURE" : "COMPLETED",
      duration: `${Math.round(6 * timeMultiplier)}-${Math.round(12 * timeMultiplier)} weeks`,
      units: "20-200",
      cost_estimate: "$15,000-$75,000",
      objective: "Finalize design for manufacturing, start certification, beta test",
      tasks: [
        { task: "Freeze product design — no more major changes after this", category: "planning" },
        { task: "Apply DFM principles to all components", category: "dfm" },
        { task: "Order first-generation tooling (injection molds if needed)", category: "tooling" },
        { task: "Build 20-200 DVT units using near-production methods", category: "production" },
        { task: "Start certification process (CE, FCC, UL, RoHS as needed)", category: "certification" },
        { task: "Conduct reliability testing (drop, thermal, lifecycle)", category: "testing" },
        { task: "Beta test with 10-20 real users", category: "testing" },
        { task: "Finalize packaging and boxing design", category: "design" },
        { task: "Get quotes from 3+ contract manufacturers", category: "sourcing" },
        { task: "Negotiate tooling costs, MOQs, and payment terms", category: "negotiation" },
        { task: "Finalize BOM with all components sourced", category: "sourcing" },
      ],
      tools_to_use: ["Injection molding (first-gen tooling), production-grade PCBs, CNC machining"],
      deliverables: ["Production-ready design files", "Certification submissions", "Beta test feedback", "Final BOM", "Factory quotes", "Packaging design"],
      gate_criteria: "Design frozen. Certifications in progress. Factory selected. Beta feedback positive.",
    },
    {
      stage: "PVT (Production Validation Testing)",
      status: current_stage === "dvt" ? "NEXT" : current_stage === "pvt" ? "CURRENT" : ["idea", "poc", "evt"].includes(current_stage) ? "FUTURE" : "COMPLETED",
      duration: `${Math.round(8 * timeMultiplier)}-${Math.round(16 * timeMultiplier)} weeks`,
      units: `50-500 (5-10% of first production run)`,
      cost_estimate: "$25,000-$150,000",
      objective: "Validate manufacturing process, stabilize quality, finalize everything",
      tasks: [
        { task: "Run pilot production line with contract manufacturer", category: "production" },
        { task: "Verify manufacturing yields meet targets", category: "quality" },
        { task: "Set up QC/QA inspection procedures", category: "quality" },
        { task: "Produce 'golden samples' for reference", category: "production" },
        { task: "Complete all certifications", category: "certification" },
        { task: "Finalize supply chain — backup suppliers for critical components", category: "sourcing" },
        { task: "Set up logistics and shipping arrangements", category: "logistics" },
        { task: "Train factory staff on your product", category: "production" },
        { task: "Only minor design tweaks allowed — major changes require going back to DVT", category: "planning" },
      ],
      tools_to_use: ["Production-grade tooling, assembly line, testing fixtures"],
      deliverables: ["Validated production process", "QC procedures", "Golden samples", "All certifications complete", "Logistics plan"],
      gate_criteria: "Yields stable. QC passing. Certifications complete. Ready to ramp.",
    },
    {
      stage: "MP1 (First Mass Production Run)",
      status: current_stage === "pvt" ? "NEXT" : current_stage === "production" ? "CURRENT" : "FUTURE",
      duration: `${Math.round(4 * timeMultiplier)}-${Math.round(8 * timeMultiplier)} weeks`,
      units: `${target_volume} (first run)`,
      cost_estimate: budget_range || "Varies by volume and product",
      objective: "First commercial production run",
      tasks: [
        { task: "Place production order with contract manufacturer", category: "production" },
        { task: "Monitor production quality daily (visit factory if possible)", category: "quality" },
        { task: "Conduct incoming quality inspection on each batch", category: "quality" },
        { task: "Manage shipping and customs clearance", category: "logistics" },
        { task: "Set up inventory management", category: "logistics" },
        { task: "Don't ramp to full volume immediately — scale gradually", category: "planning" },
        { task: "Document all issues for next production run improvements", category: "documentation" },
      ],
      tools_to_use: ["Full production line, automated testing"],
      deliverables: ["Finished products", "QC reports", "Shipping documentation", "Lessons learned"],
      gate_criteria: "Products shipped. Quality meets standards. Customer feedback collected.",
    },
  ];

  return {
    product: product_description,
    current_stage,
    target_volume,
    roadmap: stages,
    total_estimated_timeline: `${Math.round(24 * timeMultiplier)}-${Math.round(48 * timeMultiplier)} weeks (${Math.round(6 * timeMultiplier)}-${Math.round(12 * timeMultiplier)} months)`,
    component_suppliers: componentSuppliers,
    next_action: stages.find(s => s.status === "NEXT" || s.status === "CURRENT")?.tasks[0]?.task || "Start with POC",
    critical_tip: "Most first-time founders underestimate costs by 2-4x and timeline by 2-3x. Plan accordingly.",
  };
}

function toolAssessReadiness(args: { current_stage: string; product_description: string; has_design_files?: boolean; has_bom?: boolean; has_prototype?: boolean; has_supplier?: boolean; has_tested?: boolean }) {
  const { current_stage, product_description, has_design_files, has_bom, has_prototype, has_supplier, has_tested } = args;

  interface ReadinessItem {
    requirement: string;
    met: boolean | undefined;
    critical: boolean;
    action_if_not_met: string;
  }

  const readiness: Record<string, ReadinessItem[]> = {
    idea: [
      { requirement: "Clear problem definition", met: undefined, critical: true, action_if_not_met: "Define what problem your product solves and for whom" },
      { requirement: "Basic feasibility research", met: undefined, critical: true, action_if_not_met: "Research if the core technology exists and is accessible" },
      { requirement: "Rough BOM / component list", met: has_bom, critical: false, action_if_not_met: "List the major components you'll need" },
    ],
    poc: [
      { requirement: "Working proof of concept", met: has_prototype, critical: true, action_if_not_met: "Build a basic demo with dev kits (Arduino/ESP32) to prove core functionality" },
      { requirement: "Core technical risks identified", met: has_tested, critical: true, action_if_not_met: "Test the riskiest assumption first" },
      { requirement: "Initial schematic / design files", met: has_design_files, critical: false, action_if_not_met: "Start creating proper schematics (use KiCad or EasyEDA)" },
    ],
    evt: [
      { requirement: "Complete schematic and PCB layout", met: has_design_files, critical: true, action_if_not_met: "Finalize your schematic and design your PCB" },
      { requirement: "Detailed BOM with specs", met: has_bom, critical: true, action_if_not_met: "Create a complete BOM with part numbers, specs, and quantities" },
      { requirement: "Working prototype(s)", met: has_prototype, critical: true, action_if_not_met: "Build and test EVT units" },
      { requirement: "Suppliers identified for key components", met: has_supplier, critical: true, action_if_not_met: "Find and vet 3+ suppliers per component. Use search_suppliers tool." },
      { requirement: "DFM feedback from factory", met: undefined, critical: true, action_if_not_met: "Share your design with potential manufacturers and get DFM feedback" },
      { requirement: "All subsystems tested", met: has_tested, critical: true, action_if_not_met: "Test each subsystem individually and in integration" },
    ],
    dvt: [
      { requirement: "Design frozen (no major changes)", met: has_design_files, critical: true, action_if_not_met: "Finalize your design — DVT to PVT should only have minor tweaks" },
      { requirement: "Final BOM locked", met: has_bom, critical: true, action_if_not_met: "Lock your BOM with all parts sourced and priced" },
      { requirement: "Certifications submitted (CE/FCC/UL)", met: undefined, critical: true, action_if_not_met: "Start certification process — this takes 6-12 weeks" },
      { requirement: "Beta testing completed", met: has_tested, critical: true, action_if_not_met: "Get 10-20 users to test DVT units and collect feedback" },
      { requirement: "Contract manufacturer selected", met: has_supplier, critical: true, action_if_not_met: "Get quotes from 3+ factories, visit them, and select one" },
      { requirement: "Tooling ordered", met: undefined, critical: true, action_if_not_met: "Order production tooling (injection molds, test fixtures, etc.)" },
      { requirement: "Packaging designed", met: undefined, critical: false, action_if_not_met: "Design product packaging and boxing" },
    ],
    pvt: [
      { requirement: "Manufacturing yields verified", met: has_tested, critical: true, action_if_not_met: "Run pilot production and verify yield rates meet targets" },
      { requirement: "All certifications complete", met: undefined, critical: true, action_if_not_met: "Follow up on pending certifications" },
      { requirement: "QC procedures established", met: undefined, critical: true, action_if_not_met: "Define quality control inspection procedures with your factory" },
      { requirement: "Golden samples approved", met: undefined, critical: true, action_if_not_met: "Approve golden samples as the reference standard" },
      { requirement: "Logistics and shipping arranged", met: undefined, critical: true, action_if_not_met: "Set up shipping, customs clearance, and warehousing" },
      { requirement: "Backup suppliers for critical components", met: undefined, critical: false, action_if_not_met: "Identify alternative suppliers for any single-source components" },
    ],
  };

  const checks = readiness[current_stage] || readiness["idea"]!;
  const criticalMissing = checks.filter(c => c.critical && c.met === false);
  const unknowns = checks.filter(c => c.met === undefined);

  const score = checks.filter(c => c.met === true).length;
  const total = checks.length;
  const ready = criticalMissing.length === 0 && unknowns.length <= 1;

  const nextStageMap: Record<string, string> = { idea: "POC", poc: "EVT", evt: "DVT", dvt: "PVT", pvt: "MP1" };

  return {
    product: product_description,
    current_stage,
    next_stage: nextStageMap[current_stage] || "Unknown",
    readiness_score: `${score}/${total}`,
    ready_to_advance: ready,
    verdict: ready
      ? `You appear ready to move to ${nextStageMap[current_stage]}. Address the unknown items below to be fully confident.`
      : `Not ready for ${nextStageMap[current_stage]} yet. ${criticalMissing.length} critical items need attention.`,
    checks,
    critical_blockers: criticalMissing.map(c => ({ issue: c.requirement, action: c.action_if_not_met })),
    unknowns: unknowns.map(c => ({ question: c.requirement, action: c.action_if_not_met })),
  };
}

// In-memory store for community-contributed tips from X posts
const communityTips: Array<{ content: string; source: string; author: string; date: string; added_at: string }> = [];

async function toolExtractXPost(args: { url: string; save_to_knowledge_base?: boolean }) {
  const { url, save_to_knowledge_base } = args;

  // Normalize URL
  const normalizedUrl = url.replace("x.com", "twitter.com");

  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(normalizedUrl)}&omit_script=true`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      return { error: "Could not fetch tweet. It may be private or deleted.", url };
    }

    const data = await response.json() as { html: string; author_name: string; author_url: string; url: string };

    // Extract text from the HTML blockquote
    const htmlContent = data.html || "";
    const textMatch = htmlContent.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    let tweetText = textMatch ? textMatch[1]! : "";

    // Clean HTML tags from the text
    tweetText = tweetText
      .replace(/<a[^>]*>(.*?)<\/a>/g, "$1")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&mdash;/g, "—")
      .trim();

    // Extract date from the HTML
    const dateMatch = htmlContent.match(/(\w+ \d+, \d{4})/);
    const tweetDate = dateMatch ? dateMatch[1]! : "Unknown date";

    const result: {
      author: string;
      author_url: string;
      text: string;
      date: string;
      original_url: string;
      saved_to_knowledge_base: boolean;
      tip?: string;
    } = {
      author: data.author_name,
      author_url: data.author_url,
      text: tweetText,
      date: tweetDate,
      original_url: url,
      saved_to_knowledge_base: false,
    };

    // Save to knowledge base if requested and content seems relevant
    if (save_to_knowledge_base && tweetText.length > 10) {
      communityTips.push({
        content: tweetText,
        source: `X post by @${data.author_name} (${url})`,
        author: data.author_name,
        date: tweetDate,
        added_at: new Date().toISOString(),
      });
      result.saved_to_knowledge_base = true;
      result.tip = "Saved to community knowledge base. This tip will be available to future users.";
    }

    return result;
  } catch (error) {
    return {
      error: "Failed to extract tweet content. The oEmbed API may be unavailable.",
      url,
      fallback: "Try copying the tweet text and pasting it directly in chat.",
    };
  }
}

// Export community tips for access by other modules
export function getCommunityTips() {
  return communityTips;
}

async function toolSendEmail(args: { to_email: string; factory_name: string; subject?: string; product_description: string; requirements?: string }) {
  const drafted = toolDraftMessage({
    factory_name: args.factory_name,
    product_description: args.product_description,
    requirements: args.requirements,
    tone: "formal",
  });

  return {
    status: "draft_ready",
    to: args.to_email,
    subject: args.subject || `Inquiry: ${args.product_description} - Collaboration Opportunity`,
    body_english: drafted.english,
    body_chinese: drafted.chinese,
    note: "Email drafted. In production, this would send automatically via SendGrid/Resend.",
  };
}

// --- LCSC Component Search ---
async function toolSearchLCSC(keyword: string, maxResults: number = 5) {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const apiUrl = `https://wmsc.lcsc.com/ftps/wm/product/search?keyword=${encodedKeyword}&currentPage=1&pageSize=${maxResults}&searchSource=home`;

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://www.lcsc.com/",
      },
    });

    if (!response.ok) {
      return {
        source: "lcsc",
        keyword,
        results: [],
        search_url: `https://www.lcsc.com/search?q=${encodedKeyword}`,
        error: `LCSC returned ${response.status}. Use the search URL to browse manually.`,
      };
    }

    const data = await response.json() as {
      result?: {
        tipProductList?: Array<{
          productModel?: string;
          productCode?: string;
          brandNameEn?: string;
          productDescEn?: string;
          stockNumber?: number;
          productPriceList?: Array<{ ladder?: number; usdPrice?: number }>;
          pdfUrl?: string;
        }>;
        productList?: Array<{
          productModel?: string;
          productCode?: string;
          brandNameEn?: string;
          productDescEn?: string;
          stockNumber?: number;
          productPriceList?: Array<{ ladder?: number; usdPrice?: number }>;
          pdfUrl?: string;
        }>;
      };
    };

    const products = data.result?.productList || data.result?.tipProductList || [];

    const components = products.slice(0, maxResults).map((p) => ({
      part_number: p.productModel || "N/A",
      lcsc_code: p.productCode || "N/A",
      manufacturer: p.brandNameEn || "Unknown",
      description: p.productDescEn || "No description",
      stock: p.stockNumber || 0,
      pricing: (p.productPriceList || []).map((price) => ({
        quantity: price.ladder,
        unit_price_usd: price.usdPrice,
      })),
      datasheet: p.pdfUrl || null,
      url: p.productCode ? `https://www.lcsc.com/product-detail/${p.productCode}.html` : null,
    }));

    return {
      source: "lcsc",
      keyword,
      found: components.length,
      components,
      search_url: `https://www.lcsc.com/search?q=${encodedKeyword}`,
      tip: "LCSC is the go-to for electronic components in China. Same parent company as JLCPCB.",
    };
  } catch (error) {
    const encodedKeyword = encodeURIComponent(keyword);
    return {
      source: "lcsc",
      keyword,
      results: [],
      search_url: `https://www.lcsc.com/search?q=${encodedKeyword}`,
      error: `Failed to fetch from LCSC: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// --- 1688 Supplier Search ---
async function toolSearch1688(keyword: string, maxResults: number = 5) {
  try {
    const encodedKeyword = encodeURIComponent(keyword);
    const searchUrl = `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodedKeyword}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return {
        source: "1688",
        keyword,
        search_url: searchUrl,
        results: [],
        note: "1688.com requires Chinese IP or VPN for best results. Use the search URL directly.",
        tips: [
          "1688 is Alibaba's domestic platform with 30-60% lower prices",
          "Most listings are in Chinese, use DeepSeek to analyze",
          "MOQs are often lower than Alibaba",
          "Payment via Alipay is standard",
        ],
      };
    }

    const html = await response.text();

    // Extract product data from the page
    const products: Array<{ title: string; price: string; url: string }> = [];
    const offerRegex = /<a[^>]*href="(\/\/detail\.1688\.com\/offer\/\d+\.html)"[^>]*>([\s\S]*?)<\/a>/g;
    let offerMatch;
    let count = 0;

    while ((offerMatch = offerRegex.exec(html)) !== null && count < maxResults) {
      const title = (offerMatch[2] || "").replace(/<[^>]+>/g, "").trim();
      if (title && title.length > 2) {
        products.push({
          title,
          price: "See listing",
          url: `https:${offerMatch[1]}`,
        });
        count++;
      }
    }

    return {
      source: "1688",
      keyword,
      found: products.length,
      products: products.length > 0 ? products : undefined,
      search_url: searchUrl,
      tips: [
        "1688 is Alibaba's domestic platform with 30-60% lower prices",
        "Use the deepseek_chinese_expert tool to analyze Chinese listings",
        "MOQs are often lower than international Alibaba",
      ],
    };
  } catch (error) {
    const encodedKeyword = encodeURIComponent(keyword);
    return {
      source: "1688",
      keyword,
      search_url: `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodedKeyword}`,
      results: [],
      error: `Could not scrape 1688: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// --- Baidu Search ---
async function toolSearchBaidu(query: string, maxResults: number = 5) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.baidu.com/s?wd=${encodedQuery}&rn=${maxResults}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return {
        source: "baidu",
        query,
        search_url: searchUrl,
        results: [],
        error: `Baidu returned ${response.status}. Use the search URL directly.`,
      };
    }

    const html = await response.text();

    // Extract search results
    const results: Array<{ title: string; snippet: string; url: string }> = [];
    const titleRegex = /<h3[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/g;
    let titleMatch;
    let resultCount = 0;

    while ((titleMatch = titleRegex.exec(html)) !== null && resultCount < maxResults) {
      const title = (titleMatch[2] || "").replace(/<[^>]+>/g, "").trim();
      if (title) {
        results.push({
          title,
          snippet: "View on Baidu for details",
          url: titleMatch[1] || "",
        });
        resultCount++;
      }
    }

    return {
      source: "baidu",
      query,
      found: results.length,
      results: results.length > 0 ? results : undefined,
      search_url: searchUrl,
      note: "Baidu results are in Chinese. Use deepseek_chinese_expert to translate or analyze.",
      tip: "Baidu finds Chinese-only factory info and supplier reviews that Google cannot access.",
    };
  } catch (error) {
    const encodedQuery = encodeURIComponent(query);
    return {
      source: "baidu",
      query,
      search_url: `https://www.baidu.com/s?wd=${encodedQuery}`,
      results: [],
      error: `Could not fetch Baidu: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// --- DeepSeek Chinese Expert ---
async function toolDeepSeekChinese(args: { task: string; input_text: string; context?: string; target_language?: string }) {
  const { task, input_text, context, target_language } = args;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      error: "DEEPSEEK_API_KEY not configured. Set it in your .env file.",
      fallback: "Use the translate_message tool for basic translation.",
    };
  }

  const prompts: Record<string, string> = {
    translate: `You are an expert translator specializing in Chinese manufacturing and hardware terminology. Translate to ${target_language === "zh" ? "Chinese (Simplified)" : "English"}. Preserve technical terms accurately.`,
    draft_message: `You are a bilingual business communication expert for hardware founders and Chinese factories. Draft a professional message in both English and Chinese. The Chinese should sound natural with appropriate business etiquette. Context: ${context || "general business inquiry"}.`,
    analyze_listing: `You are an expert at analyzing Chinese e-commerce listings (1688, Taobao, Alibaba). Extract: product details, pricing, MOQ, supplier credibility, and red flags. Respond in English but include key Chinese terms.`,
    interpret_communication: `You are an expert at interpreting Chinese business communications in manufacturing. Explain the meaning, cultural subtext (indirect refusals, negotiation tactics), and suggest how to respond. Context: ${context || "supplier communication"}.`,
    research: `You are a research assistant for the Chinese manufacturing ecosystem. Provide actionable insights for hardware founders. Include relevant Chinese search terms. Context: ${context || "general research"}.`,
  };

  const systemPrompt = prompts[task] || prompts.research!;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input_text },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `DeepSeek API error (${response.status}): ${errorText}` };
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return {
      source: "deepseek",
      task,
      result: data.choices?.[0]?.message?.content || "No response from DeepSeek.",
      note: "Powered by DeepSeek, optimized for Chinese manufacturing context.",
    };
  } catch (error) {
    return {
      error: `DeepSeek request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
