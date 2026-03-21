# GTC Agent

Action-first WhatsApp agent for hardware founders navigating Shenzhen manufacturing.

## Setup

```bash
bun install
```

## Development

```bash
bun run dev
```

## Environment Variables

Copy `.env.local` and fill in your API keys:
- `GOOGLE_AI_API_KEY` - Gemini API key
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` - For WhatsApp integration
- `TWILIO_WHATSAPP_NUMBER` - Your Twilio WhatsApp number
