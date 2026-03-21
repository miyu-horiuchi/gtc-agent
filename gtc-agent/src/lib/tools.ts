// GTC Agent tools — Vercel AI SDK v6 with Zod schemas

import { tool } from "ai";
import { z } from "zod";
import {
  searchFactories,
  getFactoriesByCategory,
  FACTORIES,
  PRE_TRIP_CHECKLIST,
  MANUFACTURING_TIPS,
  SOURCING_PLATFORMS,
  KEY_LOCATIONS,
} from "@/data/knowledge-base";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const USER_TIPS_PATH = join(process.cwd(), "src/data/user-tips.json");

function readUserTips(): Array<{ tip: string; category: string; timestamp: string }> {
  try {
    const raw = readFileSync(USER_TIPS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeUserTips(tips: Array<{ tip: string; category: string; timestamp: string }>) {
  writeFileSync(USER_TIPS_PATH, JSON.stringify(tips, null, 2) + "\n", "utf-8");
}

export const tools = {
  search_suppliers: tool({
    description:
      "Search for verified suppliers/factories by category or keyword. Use when user needs to find a manufacturer for a specific component or process.",
    inputSchema: z.object({
      query: z.string().describe("Search query: component type, process, or factory name"),
      category: z
        .string()
        .optional()
        .describe("Category filter: stepper-motors, cnc, batteries, smart-rings, chips, fpc, aluminum-casting, sand-casting, automation, laser, pcb"),
    }),
    execute: async ({ query, category }) => {
      let results = category ? getFactoriesByCategory(category) : searchFactories(query);
      if (results.length === 0) results = searchFactories(query);
      if (results.length === 0) {
        return {
          found: false,
          message: `No verified suppliers found for "${query}". Try searching on Alibaba or 1688.com.`,
          platforms: SOURCING_PLATFORMS.slice(0, 3),
        };
      }
      return {
        found: true,
        count: results.length,
        suppliers: results.map((f) => ({
          name: f.name,
          category: f.category,
          url: f.url,
          contact: f.contact,
          notes: f.notes,
          moq: f.moq,
          source: f.source,
        })),
        tip: "Always contact 3-5 suppliers for comparison. Ask for samples before committing.",
      };
    },
  }),

  search_alibaba: tool({
    description:
      "Search Alibaba for suppliers by keyword. Use when the local verified database doesn't have results or when the user specifically wants Alibaba suppliers.",
    inputSchema: z.object({
      query: z.string().describe("Search query for Alibaba, e.g. 'stepper motor', 'smart ring manufacturer'"),
    }),
    execute: async ({ query }) => {
      const searchUrl = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(query)}`;
      try {
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          return {
            success: false,
            search_url: searchUrl,
            message: `Alibaba returned status ${res.status}. Open the link manually.`,
            tip: "You can also try 1688.com for better domestic prices.",
          };
        }

        const html = await res.text();

        // Extract supplier names and product titles from the page
        const titleMatches = html.match(/<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/gi) || [];
        const supplierMatches = html.match(/company[Nn]ame['":\s]+['"]?([^'"<,]+)/g) || [];

        const titles = titleMatches
          .map((m) => m.replace(/<[^>]+>/g, "").trim())
          .filter(Boolean)
          .slice(0, 8);

        const suppliers = supplierMatches
          .map((m) => m.replace(/company[Nn]ame['":\s]+['"]?/, "").trim())
          .filter(Boolean)
          .slice(0, 8);

        if (titles.length === 0 && suppliers.length === 0) {
          return {
            success: true,
            search_url: searchUrl,
            message: `Search page loaded but couldn't parse results automatically. Visit the link to browse.`,
            query,
            tip: "Alibaba often requires interaction to show results. Open the search URL directly.",
          };
        }

        return {
          success: true,
          search_url: searchUrl,
          query,
          results_preview: titles.map((title, i) => ({
            title,
            supplier: suppliers[i] || "See listing",
          })),
          total_previewed: titles.length,
          tip: "Contact at least 3 suppliers. Ask for samples and MOQ before committing. Verify with a video call.",
        };
      } catch (error) {
        return {
          success: false,
          search_url: searchUrl,
          message: `Could not fetch Alibaba (${error instanceof Error ? error.message : "unknown error"}). Open the link manually.`,
          tip: "You can also try 1688.com or Made-in-China.com as alternatives.",
        };
      }
    },
  }),

  web_search: tool({
    description:
      "Search the web for supplier info, manufacturing guides, or Shenzhen-related topics. Use when the user needs information beyond the local knowledge base.",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
    }),
    execute: async ({ query }) => {
      // Use DuckDuckGo HTML endpoint for a quick web search
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      try {
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          return {
            success: false,
            query,
            message: `Search failed with status ${res.status}.`,
          };
        }

        const html = await res.text();

        // Extract result snippets from DuckDuckGo HTML results
        const resultBlocks = html.match(/<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>/gi) || [];
        const snippetBlocks = html.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi) || [];
        const urlBlocks = html.match(/<a[^>]*class="result__url"[^>]*>([^<]+)<\/a>/gi) || [];

        const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();

        const results = resultBlocks.slice(0, 6).map((title, i) => ({
          title: strip(title),
          snippet: snippetBlocks[i] ? strip(snippetBlocks[i]) : "",
          url: urlBlocks[i] ? strip(urlBlocks[i]) : "",
        }));

        if (results.length === 0) {
          return {
            success: true,
            query,
            message: "Search returned no parseable results. Try a more specific query.",
            fallback_url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          };
        }

        return {
          success: true,
          query,
          results,
          total_results: results.length,
        };
      } catch (error) {
        return {
          success: false,
          query,
          message: `Search failed: ${error instanceof Error ? error.message : "unknown error"}`,
          fallback_url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        };
      }
    },
  }),

  extract_x_post: tool({
    description: "Extract and analyze content from an X/Twitter post URL for manufacturing insights.",
    inputSchema: z.object({
      url: z.string().describe("X/Twitter post URL"),
    }),
    execute: async ({ url }) => {
      // Normalize URL to use fixupx.com which returns parseable open-graph content
      const fetchUrl = url
        .replace("twitter.com", "fxtwitter.com")
        .replace("x.com", "fxtwitter.com");

      try {
        const res = await fetch(fetchUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            Accept: "text/html",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          return {
            url,
            status: "fetch_failed",
            http_status: res.status,
            note: "Could not fetch the post. The AI model will analyze based on the URL pattern.",
            tip: "Share X posts about factory visits, product teardowns, or manufacturing tips for best results.",
          };
        }

        const html = await res.text();

        // Extract open graph metadata
        const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) || [];
        const ogDesc =
          html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/) || [];
        const ogImage =
          html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/) || [];

        const title = ogTitle[1] || "";
        const description = ogDesc[1] || "";
        const image = ogImage[1] || "";

        if (!title && !description) {
          return {
            url,
            status: "no_content_extracted",
            note: "Page loaded but no content could be extracted. The AI model will analyze based on context.",
            tip: "Share X posts about factory visits, product teardowns, or manufacturing tips for best results.",
          };
        }

        return {
          url,
          status: "extracted",
          title,
          description,
          image: image || undefined,
          tip: "Share X posts about factory visits, product teardowns, or manufacturing tips for best results.",
        };
      } catch (error) {
        return {
          url,
          status: "error",
          message: `Fetch error: ${error instanceof Error ? error.message : "unknown"}`,
          note: "The AI model will analyze based on the URL pattern and context.",
          tip: "Share X posts about factory visits, product teardowns, or manufacturing tips for best results.",
        };
      }
    },
  }),

  save_tip: tool({
    description:
      "Save a user-contributed tip about Shenzhen manufacturing, sourcing, or travel to the community tips database.",
    inputSchema: z.object({
      tip: z.string().describe("The tip content to save"),
      category: z
        .enum(["pre-trip", "logistics", "manufacturing", "sourcing", "culture", "tools"])
        .describe("Category for the tip"),
    }),
    execute: async ({ tip, category }) => {
      const tips = readUserTips();
      const entry = {
        tip,
        category,
        timestamp: new Date().toISOString(),
      };
      tips.push(entry);
      writeUserTips(tips);
      return {
        saved: true,
        total_community_tips: tips.length,
        message: `Tip saved to community database. Thank you for contributing!`,
        entry,
      };
    },
  }),

  draft_supplier_message: tool({
    description:
      "Draft a professional outreach message to a supplier/factory in both English and Chinese. Use when user wants to contact a factory.",
    inputSchema: z.object({
      factory_name: z.string().describe("Name of the factory to contact"),
      product_description: z.string().describe("What the user is building"),
      requirements: z.string().optional().describe("Specific requirements: quantity, specs, timeline"),
      tone: z.enum(["formal", "casual"]).optional().describe("Message tone"),
    }),
    execute: async ({ factory_name, product_description, requirements, tone }) => {
      const t = tone || "formal";
      const reqLine = requirements ? `\nSpecific requirements: ${requirements}` : "";
      const english =
        t === "formal"
          ? `Dear ${factory_name} Team,\n\nI am reaching out regarding a potential collaboration. We are developing ${product_description} and are looking for a manufacturing partner.${reqLine}\n\nCould you please provide:\n1. Your MOQ and unit pricing\n2. Lead time for samples and production\n3. Any DFM feedback on our design\n\nWe look forward to hearing from you.\n\nBest regards`
          : `Hi ${factory_name}!\n\nWe're building ${product_description} and looking for a manufacturing partner.${reqLine}\n\nCould you share pricing, MOQ, and lead times? Happy to send over our designs for DFM feedback.\n\nThanks!`;
      const chinese =
        t === "formal"
          ? `尊敬的${factory_name}团队，\n\n我们正在开发${product_description}，正在寻找制造合作伙伴。${reqLine}\n\n请问能否提供以下信息：\n1. 最小起订量和单价\n2. 样品和生产的交货时间\n3. 对我们设计的DFM反馈\n\n期待您的回复。\n\n此致敬礼`
          : `你好 ${factory_name}！\n\n我们在做${product_description}，想找制造商合作。${reqLine}\n\n能分享一下价格、起订量和交期吗？我们可以发设计图给你们看看。\n\n谢谢！`;
      return {
        english,
        chinese,
        tip: "Send via WeChat for faster response. Include CAD files or photos if you have them.",
      };
    },
  }),

  generate_checklist: tool({
    description: "Generate a customized pre-trip or manufacturing checklist based on user's specific situation.",
    inputSchema: z.object({
      type: z.enum(["pre-trip", "manufacturing", "sourcing", "full"]).describe("Type of checklist"),
      product_type: z.string().optional().describe("What the user is building (for customized recommendations)"),
      experience_level: z.enum(["first-time", "experienced"]).optional().describe("User's experience with Shenzhen"),
    }),
    execute: async ({ type, product_type }) => {
      const items: string[] = [];
      if (type === "pre-trip" || type === "full") {
        items.push(...PRE_TRIP_CHECKLIST.map((t) => `\u2610 ${t.content}`));
      }
      if (type === "manufacturing" || type === "full") {
        items.push(...MANUFACTURING_TIPS.map((t) => `\u2610 ${t.content}`));
      }
      if (type === "sourcing" || type === "full") {
        items.push(
          ...SOURCING_PLATFORMS.map((p) => `\u2610 Check ${p.name} (${p.url}) — ${p.description}`)
        );
      }
      if (product_type) {
        items.push(`\u2610 Search for ${product_type} suppliers on Alibaba and 1688`);
        items.push(`\u2610 Get DFM feedback from at least 3 factories for ${product_type}`);
      }
      return {
        checklist: items,
        total_items: items.length,
        key_locations: KEY_LOCATIONS.map((l) => `${l.name} (${l.area}) — ${l.description}`),
      };
    },
  }),

  compare_quotes: tool({
    description: "Create a structured comparison of multiple supplier quotes with a decision matrix.",
    inputSchema: z.object({
      quotes: z.array(
        z.object({
          supplier: z.string(),
          unit_price: z.number(),
          moq: z.number(),
          lead_time_days: z.number(),
          notes: z.string().optional(),
        })
      ).describe("Array of supplier quotes to compare"),
    }),
    execute: async ({ quotes }) => {
      const sorted = [...quotes].sort((a, b) => a.unit_price - b.unit_price);
      const cheapest = sorted[0];
      const fastest = [...quotes].sort((a, b) => a.lead_time_days - b.lead_time_days)[0];
      const lowestMOQ = [...quotes].sort((a, b) => a.moq - b.moq)[0];
      return {
        comparison_table: quotes.map((q) => ({
          ...q,
          total_minimum_cost: q.unit_price * q.moq,
        })),
        recommendations: {
          cheapest_per_unit: cheapest.supplier,
          fastest_delivery: fastest.supplier,
          lowest_moq: lowestMOQ.supplier,
        },
        tip: "For prototyping, prioritize lowest MOQ and fastest lead time. For production, focus on unit price and quality.",
      };
    },
  }),

  translate_message: tool({
    description: "Provide context for translating between English and Chinese, especially for manufacturing/business contexts.",
    inputSchema: z.object({
      text: z.string().describe("Text to translate"),
      direction: z.enum(["en-to-zh", "zh-to-en"]).describe("Translation direction"),
    }),
    execute: async ({ text, direction }) => {
      return {
        original: text,
        direction,
        note: "Translation will be provided by the AI model directly. This tool captures the request context.",
        tip: direction === "en-to-zh"
          ? "For factory communication, use formal Chinese (书面语). WeChat messages can be more casual."
          : "Chinese factory quotes often use abbreviations. Ask for clarification if unsure.",
      };
    },
  }),

  plan_trip_itinerary: tool({
    description: "Generate a day-by-day Shenzhen trip itinerary optimized for hardware founders.",
    inputSchema: z.object({
      days: z.number().describe("Number of days for the trip"),
      focus: z.string().describe("Main focus: sourcing, factory-visits, prototyping, general"),
      product_type: z.string().optional().describe("What the user is building"),
    }),
    execute: async ({ days, focus, product_type }) => {
      const baseDays = [];
      baseDays.push({
        day: 1,
        title: "Arrival + Orientation",
        activities: [
          "Arrive via HK -> Shenzhen high-speed rail (Futian station)",
          "Set up Alipay/WeChat Pay at hotel",
          "Visit Huaqiangbei for orientation (SEG Plaza, Huaqiang Electronics World)",
          "Evening: explore Huaqiangbei night market",
        ],
      });
      if (days >= 2) {
        baseDays.push({
          day: 2,
          title: focus === "factory-visits" ? "Factory Visits" : "Deep Sourcing",
          activities: [
            focus === "factory-visits"
              ? "Visit 2-3 pre-arranged factories"
              : "Systematic sourcing at Huaqiangbei + Yihua Electron Plaza",
            "Lunch meeting with potential suppliers",
            "Visit Chaihuo Makerspace (if in Nanshan)",
            product_type ? `Focus: find ${product_type} suppliers` : "Compare prices across vendors",
          ],
        });
      }
      for (let i = 3; i <= Math.min(days, 7); i++) {
        baseDays.push({
          day: i,
          title: i <= days - 1 ? "Factory Visits & Negotiations" : "Final Day",
          activities: [
            i <= days - 1 ? "Factory visits and sample reviews" : "Final negotiations and sample collection",
            "DFM review sessions",
            i === days ? "Pack samples, organize contacts, depart" : "Evening: organize notes and contacts",
          ],
        });
      }
      return {
        itinerary: baseDays,
        essential_contacts: KEY_LOCATIONS,
        packing_reminder: "Bring business cards (bilingual), laptop with CAD files, portable charger, VPN pre-configured",
      };
    },
  }),

  research_factory: tool({
    description: "Look up details about a specific factory from the verified database.",
    inputSchema: z.object({
      factory_name: z.string().describe("Name or partial name of the factory"),
    }),
    execute: async ({ factory_name }) => {
      const results = searchFactories(factory_name);
      if (results.length === 0) {
        return {
          found: false,
          message: `"${factory_name}" not in verified database. Search Alibaba or Made-in-China for more options.`,
          tip: "Ask for their business license (营业执照) and recent client references before committing.",
        };
      }
      return {
        found: true,
        factories: results,
        verification_checklist: [
          "\u2610 Request business license (营业执照)",
          "\u2610 Ask for recent client references",
          "\u2610 Request factory tour / video call",
          "\u2610 Get sample before bulk order",
          "\u2610 Verify export license if needed",
        ],
      };
    },
  }),

  parse_bom: tool({
    description: "Parse a Bill of Materials and suggest sourcing strategies for each component.",
    inputSchema: z.object({
      components: z
        .array(
          z.object({
            name: z.string(),
            quantity: z.number(),
            specs: z.string().optional(),
          })
        )
        .describe("List of components in the BOM"),
    }),
    execute: async ({ components }) => {
      return {
        bom_analysis: components.map((c) => {
          const suppliers = searchFactories(c.name);
          return {
            component: c.name,
            quantity: c.quantity,
            specs: c.specs,
            verified_suppliers: suppliers.length,
            sourcing_suggestion:
              suppliers.length > 0
                ? `${suppliers.length} verified supplier(s) found`
                : "Search LCSC, Alibaba, or 1688 for this component",
            platforms: suppliers.length === 0 ? ["LCSC", "Alibaba", "1688"] : undefined,
          };
        }),
        total_components: components.length,
        tip: "For electronics, LCSC has the best prices. For mechanical parts, go directly to factories.",
      };
    },
  }),

  generate_production_roadmap: tool({
    description: "Generate a production roadmap from prototype to mass production with timeline estimates.",
    inputSchema: z.object({
      product_type: z.string().describe("Type of product being manufactured"),
      current_stage: z
        .enum(["idea", "prototype", "evt", "dvt", "pvt", "production"])
        .describe("Current development stage"),
      target_quantity: z.number().describe("Target production quantity"),
    }),
    execute: async ({ product_type, current_stage, target_quantity }) => {
      const stages = [
        { stage: "POC", units: "1-3", duration: "2-4 weeks", cost: "Low", description: "Proof of concept — validate core functionality" },
        { stage: "EVT", units: "5-12", duration: "4-8 weeks", cost: "Medium", description: "Engineering Validation Test — refine design, test components" },
        { stage: "DVT", units: "20-200", duration: "6-12 weeks", cost: "Medium-High", description: "Design Validation Test — tooling, DFM optimization" },
        { stage: "PVT", units: "50-500", duration: "4-8 weeks", cost: "High", description: "Production Validation Test — production line trial run" },
        { stage: "MP", units: `${target_quantity}+`, duration: "Ongoing", cost: "Per-unit optimized", description: "Mass Production — full-scale manufacturing" },
      ];
      const stageIndex: Record<string, number> = { idea: 0, prototype: 0, evt: 1, dvt: 2, pvt: 3, production: 4 };
      const remaining = stages.slice(stageIndex[current_stage]);
      return {
        product: product_type,
        current_stage,
        target_quantity,
        remaining_stages: remaining,
        estimated_total_time: `${remaining.length * 6}-${remaining.length * 10} weeks`,
        key_advice: [
          "Get DFM feedback from factories ASAP — earlier is cheaper",
          "Budget 2-3x your initial timeline estimate",
          "Keep 30% contingency budget for unexpected tooling changes",
        ],
      };
    },
  }),

  assess_readiness: tool({
    description: "Assess how ready the user is for their Shenzhen manufacturing journey.",
    inputSchema: z.object({
      has_cad: z.boolean().describe("Has CAD/3D files ready"),
      has_bom: z.boolean().describe("Has Bill of Materials ready"),
      has_budget: z.boolean().describe("Has budget allocated"),
      has_timeline: z.boolean().describe("Has timeline defined"),
      has_ip_protection: z.boolean().describe("Has IP/trademark protection"),
      first_time: z.boolean().describe("First time in Shenzhen"),
    }),
    execute: async ({ has_cad, has_bom, has_budget, has_timeline, has_ip_protection, first_time }) => {
      const items = [
        { item: "CAD/3D files", ready: has_cad, priority: "critical" },
        { item: "Bill of Materials", ready: has_bom, priority: "critical" },
        { item: "Budget allocated", ready: has_budget, priority: "high" },
        { item: "Timeline defined", ready: has_timeline, priority: "high" },
        { item: "IP/trademark protection", ready: has_ip_protection, priority: "critical" },
      ];
      const readyCount = items.filter((i) => i.ready).length;
      const score = Math.round((readyCount / items.length) * 100);
      return {
        readiness_score: `${score}%`,
        status: score >= 80 ? "Ready to go!" : score >= 60 ? "Almost ready" : "More prep needed",
        checklist: items,
        missing: items.filter((i) => !i.ready).map((i) => `Warning: ${i.item} (${i.priority} priority)`),
        first_timer_tips: first_time
          ? PRE_TRIP_CHECKLIST.slice(0, 5).map((t) => t.content)
          : undefined,
      };
    },
  }),
};
