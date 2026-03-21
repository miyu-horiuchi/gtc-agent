"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import type { UIMessage } from "ai";

// Simple markdown-ish rendering
function renderText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bullet points
    if (/^[\u2022\-\*]\s/.test(line)) {
      const content = line.replace(/^[\u2022\-\*]\s/, "");
      return (
        <li key={i} className="ml-4 list-disc">
          {renderInline(content)}
        </li>
      );
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      return (
        <li key={i} className="ml-4 list-decimal">
          {renderInline(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
    }
    // Headers
    if (line.startsWith("### ")) {
      return (
        <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h4>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={i} className="font-semibold text-base mt-3 mb-1">
          {renderInline(line.slice(3))}
        </h3>
      );
    }
    // Empty line
    if (line.trim() === "") {
      return <br key={i} />;
    }
    // Normal line
    return (
      <p key={i} className="mb-0.5">
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string) {
  // Split by **bold**, `code`, and regular text
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-zinc-700/50 text-zinc-200 rounded px-1 py-0.5 text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Friendly names for tool calls
const TOOL_LABELS: Record<string, string> = {
  search_suppliers: "Searching suppliers",
  search_alibaba: "Searching Alibaba",
  web_search: "Searching the web",
  draft_supplier_message: "Drafting message",
  generate_checklist: "Generating checklist",
  plan_trip_itinerary: "Planning itinerary",
  translate_message: "Translating",
  parse_bom: "Parsing BOM",
  research_factory: "Researching factory",
  compare_quotes: "Comparing quotes",
  extract_x_post: "Extracting post",
  save_tip: "Saving tip",
  generate_production_roadmap: "Building roadmap",
  assess_readiness: "Assessing readiness",
};

function ToolCallIndicator({ toolName, state }: { toolName: string; state: string }) {
  const label = TOOL_LABELS[toolName] || toolName;
  const isDone = state === "output-available";
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-gray-800/50 border border-gray-700/50 text-xs text-gray-400">
      <span className={isDone ? "text-green-400" : "animate-pulse text-blue-400"}>
        {isDone ? "+" : "..."}
      </span>
      <span>{label}{isDone ? " -- done" : ""}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex items-center justify-center h-8 w-8 shrink-0 mt-0.5 rounded-full text-xs font-bold ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"
        }`}
      >
        {isUser ? "U" : "G"}
      </div>

      <div
        className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            if (!part.text) return null;
            return (
              <div
                key={i}
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100 border border-gray-700/50"
                }`}
              >
                {isUser ? part.text : renderText(part.text)}
              </div>
            );
          }

          if (part.type === "dynamic-tool") {
            return (
              <ToolCallIndicator
                key={i}
                toolName={part.toolName}
                state={part.state}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Find suppliers", prompt: "Find suppliers for my project" },
  { label: "Pre-trip checklist", prompt: "Give me a pre-trip checklist for visiting Shenzhen" },
  { label: "Draft message", prompt: "Help me draft a message to a supplier" },
  { label: "Compare quotes", prompt: "Help me compare supplier quotes" },
];

export default function Home() {
  const { messages, sendMessage, status } = useChat({
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Hey! I'm GTC Agent.\n\nI help hardware founders navigate prototype-to-production in Shenzhen. I can:\n\n- Give you a pre-trip checklist\n- Recommend vetted factories & suppliers\n- Draft outreach messages (EN + CN)\n- Translate WeChat messages\n- Guide you through manufacturing stages\n\nWhat are you building? Or ask me anything about Shenzhen.",
          },
        ],
      },
    ],
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="flex flex-col h-dvh max-w-3xl mx-auto">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-600 text-white font-bold text-sm">
              G
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">GTC Agent</h1>
              <p className="text-xs text-gray-400">Your AI guide to hardware manufacturing in Shenzhen</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isStreaming ? "bg-blue-400 animate-pulse" : "bg-green-400"}`} />
            <span className="text-xs text-gray-500">{isStreaming ? "Thinking" : "Online"}</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isStreaming && messages.length > 0 && (messages[messages.length - 1].role as string) === "user" && (
          <div className="flex gap-3">
            <div className="flex items-center justify-center h-8 w-8 shrink-0 rounded-full bg-gray-700 text-gray-200 text-xs font-bold">
              G
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-gray-800 border border-gray-700/50">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2 border-t border-gray-800">
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                className="text-xs border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-gray-100 rounded-lg px-3 py-1.5 transition-colors"
                onClick={() => handleSend(action.prompt)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="flex gap-2 items-end">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Shenzhen, factories, manufacturing..."
            className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all disabled:opacity-50"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="h-[46px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-40 shrink-0 transition-colors"
          >
            {isStreaming ? "..." : "Send"}
          </button>
        </form>

        <p className="text-[10px] text-gray-600 text-center mt-2">
          GTC Agent can make mistakes. Verify important info independently.
        </p>
      </div>
    </div>
  );
}
