# GTC Agent

Action-first AI agent for hardware founders navigating prototype-to-production in Shenzhen, China.

Built by Miyu during Research at Scale 2026 at Chaihuo makerspace.

## What it does

- Search 25+ verified factories (motors, CNC, batteries, smart rings, chips, FPC, casting)
- Draft bilingual supplier outreach messages (English + Chinese)
- Generate pre-trip checklists and trip itineraries
- Compare supplier quotes with decision matrices
- Production roadmap from POC to mass production
- Readiness assessments for Shenzhen trips
- Parse BOMs and suggest sourcing strategies

## Stack

- **AI**: Vercel AI SDK v6 + Google Gemini 2.5 Flash (via AI Gateway)
- **Framework**: Next.js 16 (App Router)
- **WhatsApp**: OpenClaw (personal AI assistant platform)
- **Hosting**: Vercel (serverless)
- **Tools**: 12 autonomous function-calling tools with Zod schemas

## Live

- **Web chat**: https://gtc-agent.vercel.app
- **API**: `POST https://gtc-agent.vercel.app/api/chat`
- **WhatsApp**: via OpenClaw gateway

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
