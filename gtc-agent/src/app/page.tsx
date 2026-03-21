"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import type { UIMessage } from "ai";

// Markdown rendering
function renderText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (/^[\u2022\-\*]\s/.test(line)) {
      return (
        <li key={i} className="ml-4 list-disc text-zinc-200">
          {renderInline(line.replace(/^[\u2022\-\*]\s/, ""))}
        </li>
      );
    }
    if (/^\d+\.\s/.test(line)) {
      return (
        <li key={i} className="ml-4 list-decimal text-zinc-200">
          {renderInline(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h4 key={i} className="font-semibold text-sm mt-3 mb-1 text-white">
          {renderInline(line.slice(4))}
        </h4>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={i} className="font-semibold text-base mt-3 mb-1 text-white">
          {renderInline(line.slice(3))}
        </h3>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h2 key={i} className="font-bold text-lg mt-4 mb-1 text-white">
          {renderInline(line.slice(2))}
        </h2>
      );
    }
    if (line.startsWith("---") || line.startsWith("___")) {
      return <hr key={i} className="border-zinc-700 my-2" />;
    }
    if (line.startsWith("> ")) {
      return (
        <blockquote key={i} className="border-l-2 border-blue-500/50 pl-3 text-zinc-400 italic my-1">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    }
    if (line.startsWith("☐ ") || line.startsWith("☑ ")) {
      const checked = line.startsWith("☑");
      return (
        <div key={i} className="flex items-start gap-2 my-0.5">
          <span className={`mt-0.5 ${checked ? "text-emerald-400" : "text-zinc-500"}`}>
            {checked ? "✓" : "○"}
          </span>
          <span className="text-zinc-200">{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return (
      <p key={i} className="mb-0.5 text-zinc-200">
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-zinc-800 text-emerald-300 rounded px-1.5 py-0.5 text-[13px] font-mono border border-zinc-700/50"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    // Links
    const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

const TOOL_LABELS: Record<string, { label: string; emoji: string }> = {
  search_suppliers: { label: "Searching verified suppliers", emoji: "🔍" },
  search_alibaba: { label: "Searching Alibaba", emoji: "🛒" },
  web_search: { label: "Searching the web", emoji: "🌐" },
  draft_supplier_message: { label: "Drafting outreach message", emoji: "✉️" },
  generate_checklist: { label: "Generating checklist", emoji: "📋" },
  plan_trip_itinerary: { label: "Planning itinerary", emoji: "🗺️" },
  translate_message: { label: "Translating", emoji: "🌏" },
  parse_bom: { label: "Parsing BOM", emoji: "📦" },
  research_factory: { label: "Researching factory", emoji: "🏭" },
  compare_quotes: { label: "Comparing quotes", emoji: "⚖️" },
  extract_x_post: { label: "Extracting post", emoji: "📱" },
  save_tip: { label: "Saving tip", emoji: "💡" },
  generate_production_roadmap: { label: "Building roadmap", emoji: "🛤️" },
  assess_readiness: { label: "Assessing readiness", emoji: "✅" },
};

function ToolCallIndicator({ toolName, state }: { toolName: string; state: string }) {
  const tool = TOOL_LABELS[toolName] || { label: toolName, emoji: "⚙️" };
  const isDone = state === "output-available";
  return (
    <div
      className={`inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-xs transition-all ${
        isDone
          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
      }`}
    >
      <span>{tool.emoji}</span>
      <span>{tool.label}</span>
      {!isDone && (
        <span className="flex gap-0.5">
          <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </span>
      )}
      {isDone && <span className="text-emerald-400">✓</span>}
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} group`}>
      <div
        className={`flex items-center justify-center h-8 w-8 shrink-0 rounded-full text-xs font-medium ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            : "bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-300 ring-1 ring-zinc-600/50"
        }`}
      >
        {isUser ? "Y" : "G"}
      </div>

      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            if (!part.text) return null;
            return (
              <div
                key={i}
                className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                  isUser
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-md"
                    : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-md shadow-lg shadow-black/20"
                }`}
              >
                {isUser ? <span className="text-blue-50">{part.text}</span> : renderText(part.text)}
              </div>
            );
          }

          if (part.type === "dynamic-tool") {
            return <ToolCallIndicator key={i} toolName={part.toolName} state={part.state} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Find suppliers", prompt: "I need to find suppliers for my hardware project", emoji: "🔍", desc: "Search 25+ verified factories" },
  { label: "Pre-trip checklist", prompt: "Give me a comprehensive pre-trip checklist for visiting Shenzhen for the first time", emoji: "✈️", desc: "VPN, WeChat, logistics" },
  { label: "Draft message", prompt: "Help me draft a professional outreach message to a Chinese factory", emoji: "✉️", desc: "English + Chinese bilingual" },
  { label: "Production roadmap", prompt: "Help me create a production roadmap from prototype to mass production", emoji: "🛤️", desc: "POC to mass production" },
];

export default function Home() {
  const { messages, sendMessage, status } = useChat();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isStreaming = status === "streaming" || status === "submitted";

  const handleSend = (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || isStreaming) return;
    sendMessage({ text: messageText });
    setInput("");
  };

  return (
    <div className="flex flex-col h-dvh bg-[#0a0a0b]">
      {/* Header */}
      <header className="shrink-0 px-4 sm:px-6 py-3 border-b border-zinc-800/80 backdrop-blur-sm bg-[#0a0a0b]/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20">
                G
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0b] ${
                  isStreaming ? "bg-blue-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-white">GTC Agent</h1>
              <p className="text-[11px] text-zinc-500">Shenzhen manufacturing co-pilot</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
            <div className={`h-1.5 w-1.5 rounded-full ${isStreaming ? "bg-blue-400 animate-pulse" : "bg-emerald-400"}`} />
            <span className="text-[11px] text-zinc-500 font-medium">
              {isStreaming ? "Working" : "Ready"}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {!hasMessages ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-140px)] px-4 sm:px-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold mb-5 shadow-xl shadow-blue-500/20">
                  G
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Navigate Shenzhen manufacturing
                </h2>
                <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                  I help hardware founders go from prototype to production. Search verified factories, draft supplier messages, and plan your trip.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.prompt)}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-left transition-all group"
                  >
                    <span className="text-lg mt-0.5">{action.emoji}</span>
                    <div>
                      <div className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                        {action.label}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">{action.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-8 text-[11px] text-zinc-600">
                <span>25+ verified factories</span>
                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                <span>EN + CN bilingual</span>
                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                <span>Real-time streaming</span>
              </div>
            </div>
          ) : (
            /* Chat messages */
            <div className="px-4 sm:px-6 py-4 space-y-5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {isStreaming && messages.length > 0 && (messages[messages.length - 1].role as string) === "user" && (
                <div className="flex gap-3">
                  <div className="flex items-center justify-center h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-300 ring-1 ring-zinc-600/50 text-xs font-medium">
                    G
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-md bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-zinc-800/80 bg-[#0a0a0b]/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 items-center"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about factories, suppliers, Shenzhen trips..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all disabled:opacity-50"
                disabled={isStreaming}
              />
            </div>
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="h-[46px] w-[46px] rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white disabled:opacity-30 disabled:from-zinc-700 disabled:to-zinc-700 shrink-0 transition-all flex items-center justify-center shadow-lg shadow-blue-500/10"
            >
              {isStreaming ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </form>
          <p className="text-[10px] text-zinc-700 text-center mt-2">
            Built at Research at Scale 2026 · Chaihuo Makerspace, Shenzhen
          </p>
        </div>
      </div>
    </div>
  );
}
