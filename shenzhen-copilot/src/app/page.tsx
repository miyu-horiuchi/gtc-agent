"use client";

import { useState, useRef, useEffect } from "react";
import { MapEmbed } from "@/components/MapEmbed";

interface Location {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  area?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  locations?: Location[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm your Shenzhen Co-Pilot 🏭\n\nI help hardware founders navigate prototype-to-production in Shenzhen. I can:\n\n• Give you a pre-trip checklist\n• Recommend vetted factories & suppliers\n• Draft outreach messages (EN + CN)\n• Translate WeChat messages\n• Guide you through manufacturing stages\n\nWhat are you building? Or ask me anything about Shenzhen.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      // Extract locations from tool results if present
      let locations: Location[] = [];
      if (data.toolResults) {
        for (const result of data.toolResults) {
          // From itinerary tool
          if (result.all_locations) {
            locations = result.all_locations.filter((l: Location) => l.lat && l.lng);
          }
          // From individual itinerary days
          if (result.itinerary) {
            for (const day of result.itinerary) {
              if (day.locations) {
                for (const loc of day.locations) {
                  if (loc.lat && loc.lng && !locations.some(l => l.name === loc.name)) {
                    locations.push(loc);
                  }
                }
              }
            }
          }
          // From factory/supplier search with coordinates
          if (result.factories || result.results) {
            const items = result.factories || result.results || [];
            for (const item of items) {
              if (item.lat && item.lng) {
                locations.push({ name: item.name || item.title, lat: item.lat, lng: item.lng, address: item.address });
              }
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, locations },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      <header className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Shenzhen Co-Pilot</h1>
        <p className="text-sm text-gray-400">
          Your AI guide to hardware manufacturing in Shenzhen
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[80%]">
              <div
                className={`rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                {msg.content}
              </div>
              {msg.locations && msg.locations.length > 0 && (
                <MapEmbed locations={msg.locations} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3 text-gray-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about Shenzhen, factories, manufacturing..."
            className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-6 py-3 font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
