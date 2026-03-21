# GTC (Go-to-China) Agent

GTC (Go-to-China) Agent is a WhatsApp AI agent that helps hardware founders navigate the Chinese manufacturing ecosystem, from pre-trip prep to factory sourcing to production management.

Hardware founders visiting Shenzhen face a fragmented, overwhelming landscape: critical knowledge is buried across outdated guides, gated WeChat groups, and personal networks. No tool actually acts for them. GTC Agent changes that. It's not a chatbot that gives advice, it's an agent that executes multi-step workflows on your behalf:

1. **Action engine**: drafts bilingual supplier outreach messages (English + Chinese), generates personalized pre-trip checklists, parses BOMs and suggests sourcing options, and tracks production timelines with reminders
2. **Curated knowledge base**: fine-tuned with RAG on first-hand experience from a 2-month China hardware residency, with vetted factory contacts across categories (motors, CNC, PCB, casting, batteries), sourcing platforms, and on-the-ground navigation tips. The knowledge base grows with every conversation: user tips, factory reviews, and sourcing insights are captured, verified, and folded back in, so the agent gets smarter the more founders use it.
3. **Network connector**: matches founders to verified suppliers, makerspaces, and key ecosystem contacts based on what they're building

The agent reasons about each founder's experience level, project type, and journey phase to adapt its responses. A first-timer gets step-by-step logistics guidance, a repeat visitor gets straight to factory intros.

**Core features:**
- Pre-trip checklist generation (VPN, eSIM, WeChat, Alipay, transit)
- Vetted factory and supplier lookups by category (25+ verified factories)
- Bilingual message drafting (English + Chinese)
- Real-time component search via LCSC API (live pricing, stock, datasheets)
- 1688.com supplier search (China's domestic wholesale, 30-60% cheaper than Alibaba)
- Baidu search for Chinese-language factory intel Google can't find
- DeepSeek AI for manufacturing-grade Chinese translation and supplier communication analysis
- Supplier quote comparison with decision matrices
- Production roadmap generation (POC > EVT > DVT > PVT > MP)
- BOM parsing with sourcing strategies
- Trip itinerary planning

**Tech stack:** Next.js 16, Google Gemini 2.5, DeepSeek (Chinese language expert), LCSC API, 1688 scraping, Baidu search, OpenClaw (WhatsApp), Tailwind CSS, Bun, Vercel

**Live:**
- Web chat: https://gtc-agent.vercel.app
- API: `POST https://gtc-agent.vercel.app/api/chat`
- WhatsApp: via OpenClaw gateway

See [`gtc-agent/`](./gtc-agent) for setup and usage.

## Docs

- [`docs/shenzhen-copilot-design.md`](./docs/shenzhen-copilot-design.md) — full product design document
- [`docs/plans/`](./docs/plans/) — marketing and growth plans
