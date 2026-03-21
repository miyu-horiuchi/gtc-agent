# GTC Agent

Action-first AI agent for hardware founders navigating prototype-to-production in Shenzhen, China. Not a chatbot that gives advice — an agent that executes multi-step workflows on your behalf.

Built by Miyu during Research at Scale 2026 at Chaihuo makerspace.

## What it does

**Action Engine**
- Search 25+ verified factories (motors, CNC, batteries, smart rings, chips, FPC, casting)
- Live Alibaba search — fetches real supplier listings
- Web search for manufacturing info beyond the local database
- Draft bilingual supplier outreach messages (English + Chinese)
- Generate personalized pre-trip checklists and trip itineraries
- Compare supplier quotes with decision matrices
- Production roadmap from POC → EVT → DVT → PVT → mass production
- Parse BOMs and suggest sourcing strategies per component
- Extract insights from X/Twitter posts about hardware and manufacturing

**Curated Knowledge Base**
- 25+ verified factory contacts from firsthand visits during a 2-month Shenzhen residency
- Sourcing platforms, key locations, and on-the-ground navigation tips
- Community tips database that grows with every conversation via `save_tip` tool

**Adaptive Responses**
- Reasons about each founder's experience level, project type, and journey phase
- First-timers get step-by-step logistics guidance
- Repeat visitors get straight to factory intros

## Stack

- **AI**: Vercel AI SDK v6 + Google Gemini 2.5 Flash (via Vercel AI Gateway)
- **Streaming**: `streamText` + `useChat` for real-time responses
- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: shadcn/ui + Tailwind CSS v4 + Geist fonts (dark mode)
- **WhatsApp**: OpenClaw (personal AI assistant platform)
- **Hosting**: Vercel (serverless functions)
- **Tools**: 15 autonomous function-calling tools with Zod schemas
- **Search**: Weighted scoring system for knowledge base + live Alibaba/web search

## Live

- **Web chat**: https://gtc-agent.vercel.app (streaming, dark mode, tool indicators)
- **API**: `POST https://gtc-agent.vercel.app/api/chat`
- **WhatsApp**: via OpenClaw gateway + Vercel AI Gateway

## Setup

```bash
bun install
```

### Environment Variables

Create `.env.local`:
```
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
```

### Development

```bash
bun run dev
```

### Deploy to Vercel

```bash
vercel link
vercel env add GOOGLE_GENERATIVE_AI_API_KEY production
vercel --prod
```

### WhatsApp (via OpenClaw)

1. Install OpenClaw: `npm install -g openclaw@latest`
2. Enable WhatsApp: `openclaw plugins enable whatsapp`
3. Connect WhatsApp: `openclaw channels login --channel whatsapp`
4. Configure Vercel AI Gateway as model provider
5. Start gateway: `openclaw gateway --verbose`

The GTC Agent skill auto-loads from `~/.openclaw/workspace/skills/gtc-agent/`.

## Knowledge Base

Sourced from Research at Scale 2026 (Chaihuo makerspace, Shenzhen):

- **Factories**: OMC StepperOnline, Xfoyomotor, TTmotor, Jinsucnc, Xtool, Vanssa, Grepow, Espressif, iSource Asia, and more
- **Locations**: Huaqiangbei, Chaihuo, Yihua Electron Plaza, TroubleMakers, Seeed Studio
- **Platforms**: LCSC, Alibaba, 1688, JLC PCB, Made-in-China
