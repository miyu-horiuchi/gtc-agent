"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import type { UIMessage } from "ai";

function renderText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (/^[\u2022\-\*]\s/.test(line)) {
      return (
        <li key={i} className="ml-4 list-none before:content-['—'] before:mr-2 before:text-[#b0a494]">
          {renderInline(line.replace(/^[\u2022\-\*]\s/, ""))}
        </li>
      );
    }
    if (/^\d+\.\s/.test(line)) {
      return (
        <li key={i} className="ml-4 list-decimal marker:text-[#b0a494]">
          {renderInline(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
    }
    if (line.startsWith("### ")) {
      return (
        <h4 key={i} className="font-serif text-base mt-4 mb-1 tracking-wide uppercase text-[10px] text-[#8a8070] font-normal" style={{ fontFamily: "var(--font-serif)" }}>
          {line.slice(4)}
        </h4>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={i} className="text-lg mt-4 mb-1 tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
          {line.slice(3)}
        </h3>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h2 key={i} className="text-xl mt-5 mb-2 tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
          {line.slice(2)}
        </h2>
      );
    }
    if (line.startsWith("---")) {
      return <hr key={i} className="border-[#d8cfc4] my-4" />;
    }
    if (line.startsWith("> ")) {
      return (
        <blockquote key={i} className="border-l border-[#1a1a1a] pl-4 text-[#8a8070] italic my-2 text-[13px]">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    }
    if (line.startsWith("☐ ") || line.startsWith("☑ ")) {
      const checked = line.startsWith("☑");
      return (
        <div key={i} className="flex items-start gap-3 my-1">
          <span className={`mt-0.5 text-xs ${checked ? "text-[#1a1a1a]" : "text-[#b0a494]"}`}>
            {checked ? "●" : "○"}
          </span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-3" />;
    return (
      <p key={i} className="mb-1 leading-relaxed">
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
        <strong key={i} className="font-medium text-[#1a1a1a]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-[#e8e0d5] text-[#1a1a1a] rounded px-1.5 py-0.5 text-[12px] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
          className="text-[#1a1a1a] underline underline-offset-4 decoration-[#b0a494] hover:decoration-[#1a1a1a] transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

const TOOL_LABELS: Record<string, string> = {
  search_suppliers: "SEARCHING SUPPLIERS",
  search_alibaba: "SEARCHING ALIBABA",
  web_search: "SEARCHING WEB",
  draft_supplier_message: "DRAFTING MESSAGE",
  generate_checklist: "GENERATING CHECKLIST",
  plan_trip_itinerary: "PLANNING ITINERARY",
  translate_message: "TRANSLATING",
  parse_bom: "PARSING BOM",
  research_factory: "RESEARCHING FACTORY",
  compare_quotes: "COMPARING QUOTES",
  extract_x_post: "EXTRACTING POST",
  save_tip: "SAVING TIP",
  generate_production_roadmap: "BUILDING ROADMAP",
  assess_readiness: "ASSESSING READINESS",
};

function ToolCallIndicator({ toolName, state }: { toolName: string; state: string }) {
  const label = TOOL_LABELS[toolName] || toolName.toUpperCase();
  const isDone = state === "output-available";
  return (
    <div className="flex items-center gap-3 py-2 text-[10px] tracking-[0.15em] text-[#8a8070] uppercase">
      <div className={`h-1.5 w-1.5 rounded-full ${isDone ? "bg-[#1a1a1a]" : "bg-[#b0a494] animate-pulse"}`} />
      <span>{label}</span>
      {isDone && <span className="text-[#1a1a1a]">✓</span>}
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "text-right" : "text-left"}`}>
        {!isUser && (
          <div className="text-[10px] tracking-[0.15em] text-[#b0a494] uppercase mb-2 ml-0.5">
            GTC Agent
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {message.parts.map((part, i) => {
            if (part.type === "text") {
              if (!part.text) return null;
              return (
                <div
                  key={i}
                  className={
                    isUser
                      ? "bg-[#1a1a1a] text-[#f5f0eb] rounded-[3px] px-5 py-4 text-[14px] leading-relaxed"
                      : "bg-[#ece5dc] text-[#1a1a1a] rounded-[3px] px-5 py-4 text-[14px] leading-relaxed"
                  }
                >
                  {isUser ? part.text : renderText(part.text)}
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
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Find suppliers", prompt: "I need to find suppliers for my hardware project" },
  { label: "Pre-trip checklist", prompt: "Give me a comprehensive pre-trip checklist for visiting Shenzhen for the first time" },
  { label: "Draft a message", prompt: "Help me draft a professional outreach message to a Chinese factory" },
  { label: "Production roadmap", prompt: "Help me create a production roadmap from prototype to mass production" },
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
    const t = text ?? input.trim();
    if (!t || isStreaming) return;
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <div className="flex flex-col h-dvh">
      {/* Header — thin, quiet */}
      <header className="shrink-0 px-6 sm:px-10 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-[11px] tracking-[0.25em] uppercase text-[#1a1a1a] font-normal">
            GTC Agent
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${isStreaming ? "bg-[#b0a494] animate-pulse" : "bg-[#1a1a1a]"}`} />
          <span className="text-[10px] tracking-[0.1em] text-[#b0a494] uppercase">
            {isStreaming ? "Working" : "Ready"}
          </span>
        </div>
      </header>

      <div className="w-full max-w-2xl mx-auto px-6 sm:px-10">
        <div className="border-t border-[#d8cfc4]" />
      </div>

      {/* Main content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 sm:px-10">
          {!hasMessages ? (
            <div className="flex flex-col justify-center min-h-[calc(100dvh-180px)] py-20">
              <div className="mb-16">
                <h2 className="text-[11px] tracking-[0.25em] uppercase text-[#b0a494] mb-6">
                  Shenzhen Manufacturing
                </h2>
                <p className="text-3xl sm:text-4xl leading-tight tracking-tight max-w-md" style={{ fontFamily: "var(--font-serif)" }}>
                  Navigate prototype to production in China.
                </p>
                <p className="text-[14px] text-[#8a8070] mt-4 leading-relaxed max-w-sm">
                  Search verified factories, draft bilingual outreach, plan your trip — built from two months on the ground at Chaihuo makerspace.
                </p>
              </div>

              <div className="space-y-0">
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.prompt)}
                    className={`block w-full text-left py-4 text-[14px] text-[#1a1a1a] hover:text-[#8a8070] transition-colors ${
                      i < QUICK_ACTIONS.length - 1 ? "border-b border-[#d8cfc4]" : ""
                    }`}
                  >
                    <span className="text-[10px] tracking-[0.15em] text-[#b0a494] uppercase mr-4">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 space-y-6">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {isStreaming && messages.length > 0 && (messages[messages.length - 1].role as string) === "user" && (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#b0a494] animate-pulse" />
                  <span className="text-[10px] tracking-[0.15em] text-[#b0a494] uppercase">
                    Thinking
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input — minimal */}
      <div className="shrink-0">
        <div className="max-w-2xl mx-auto px-6 sm:px-10">
          <div className="border-t border-[#d8cfc4]" />
        </div>
        <div className="max-w-2xl mx-auto px-6 sm:px-10 py-4">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about factories, suppliers, Shenzhen..."
              className="flex-1 bg-transparent text-[14px] text-[#1a1a1a] placeholder:text-[#b0a494] focus:outline-none py-2"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="text-[10px] tracking-[0.15em] uppercase text-[#1a1a1a] hover:text-[#8a8070] disabled:text-[#d8cfc4] transition-colors py-2 px-1"
            >
              {isStreaming ? "..." : "Send"}
            </button>
          </form>
          <p className="text-[9px] tracking-[0.1em] text-[#c4b5a3] uppercase text-center mt-3 mb-1">
            Research at Scale 2026 · Chaihuo Makerspace · Shenzhen
          </p>
        </div>
      </div>
    </div>
  );
}
