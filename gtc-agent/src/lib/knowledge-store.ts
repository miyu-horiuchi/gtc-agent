// Anonymous knowledge extraction and persistence
// Stores manufacturing insights from conversations — never personal/company data

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redis) {
    redis = new Redis({
      url,
      token,
    });
  }
  return redis;
}

export interface KnowledgeEntry {
  type: "supplier_info" | "pricing" | "tip" | "location" | "process";
  content: string;
  category: string;
  timestamp: string;
}

// Extract anonymous manufacturing knowledge from an assistant response
export function extractKnowledge(text: string): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = [];
  const now = new Date().toISOString();

  // Extract factory/supplier mentions with URLs
  const urlPattern = /(?:https?:\/\/[^\s),]+)/g;
  const urls = text.match(urlPattern);
  if (urls) {
    for (const url of urls.slice(0, 5)) {
      const idx = text.indexOf(url);
      const context = text.slice(Math.max(0, idx - 80), idx + url.length + 40).trim();
      entries.push({
        type: "supplier_info",
        content: context,
        category: "supplier_url",
        timestamp: now,
      });
    }
  }

  // Extract MOQ mentions
  const moqPattern = /MOQ[:\s]+(\d[\d,]*)\s*(units?|pcs|pieces)?/gi;
  let match;
  while ((match = moqPattern.exec(text)) !== null) {
    const context = text.slice(Math.max(0, match.index - 60), match.index + match[0].length + 40).trim();
    entries.push({
      type: "pricing",
      content: context,
      category: "moq",
      timestamp: now,
    });
  }

  // Extract pricing mentions
  const pricePattern = /\$[\d,.]+\s*(?:\/?\s*(?:unit|pc|piece|kg|lot))?/gi;
  while ((match = pricePattern.exec(text)) !== null) {
    const context = text.slice(Math.max(0, match.index - 60), match.index + match[0].length + 40).trim();
    entries.push({
      type: "pricing",
      content: context,
      category: "price",
      timestamp: now,
    });
  }

  // Extract lead time mentions
  const leadTimePattern = /(?:lead\s*time|delivery|turnaround)[:\s]+(\d+[-\u2013]\d+|\d+)\s*(days?|weeks?|months?)/gi;
  while ((match = leadTimePattern.exec(text)) !== null) {
    const context = text.slice(Math.max(0, match.index - 60), match.index + match[0].length + 40).trim();
    entries.push({
      type: "process",
      content: context,
      category: "lead_time",
      timestamp: now,
    });
  }

  return entries;
}

// Save extracted knowledge to Redis
export async function saveKnowledge(entries: KnowledgeEntry[]): Promise<void> {
  const r = getRedis();
  if (!r || entries.length === 0) return;

  try {
    const pipeline = r.pipeline();
    for (const entry of entries) {
      const key = `knowledge:${entry.type}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
      pipeline.set(key, JSON.stringify(entry), { ex: 60 * 60 * 24 * 90 }); // 90 day TTL
      pipeline.lpush(`knowledge:index:${entry.type}`, key);
      pipeline.ltrim(`knowledge:index:${entry.type}`, 0, 499); // Keep last 500 per type
    }
    pipeline.incrby("knowledge:total_entries", entries.length);
    await pipeline.exec();
  } catch (e) {
    console.error("[knowledge-store] Failed to save:", e);
  }
}

// Get knowledge stats
export async function getKnowledgeStats(): Promise<{ total: number; byType: Record<string, number> } | null> {
  const r = getRedis();
  if (!r) return null;

  try {
    const total = (await r.get<number>("knowledge:total_entries")) || 0;
    const types = ["supplier_info", "pricing", "tip", "location", "process"];
    const byType: Record<string, number> = {};
    for (const type of types) {
      byType[type] = (await r.llen(`knowledge:index:${type}`)) || 0;
    }
    return { total, byType };
  } catch {
    return null;
  }
}
