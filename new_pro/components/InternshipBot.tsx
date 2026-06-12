"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  ChevronDown,
  Sparkles,
  AlertCircle,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────────────── */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

interface BotResponse {
  success: boolean;
  reply: string;
  topic?: string;
  needsEscalation?: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────── */
const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hello! I'm the **TEN Internship Assistant**. I can help you with:\n\n• Internship tasks & deadlines\n• Document & certificate status\n• Attendance & schedule\n• General TEN queries\n\nAsk me anything!",
    timestamp: Date.now(),
  },
];

const QUICK_PROMPTS = [
  "How do I upload documents?",
  "When is my offer letter issued?",
  "How to mark attendance?",
  "What are the internship domains?",
];

/* ── Markdown-lite renderer (bold, bullets, links) ─────────────── */
function renderMarkdown(raw: string): React.ReactNode {
  const lines = raw.split("\n");
  return lines.map((line, i) => {
    // Bold
    let processed: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;
    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        processed.push(line.slice(lastIndex, match.index));
      }
      processed.push(
        <strong key={`b-${i}-${match.index}`} className="font-semibold text-stone-100">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) processed.push(line.slice(lastIndex));
    if (processed.length === 0) processed.push(line);

    // Bullet
    if (/^[•\-\*]\s/.test(line)) {
      return (
        <div key={i} className="flex gap-2 ml-1 my-0.5">
          <span className="text-[#D4AF37] mt-0.5 shrink-0">•</span>
          <span>{processed.map((p, j) => (typeof p === "string" ? p.replace(/^[•\-\*]\s/, "") : p))}</span>
        </div>
      );
    }
    // Empty line
    if (line.trim() === "") return <div key={i} className="h-2" />;
    // Default
    return (
      <span key={i}>
        {processed}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

/* ── Component ────────────────────────────────────────────────────── */
export default function InternshipBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Send message
  const send = useCallback(
    async (text?: string) => {
      const q = (text ?? input).trim();
      if (!q || loading) return;

      setError(null);
      const userMsg: ChatMessage = { id: uid(), role: "user", text: q, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/v2/bots/query-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            employeeId: getEmployeeId(),
            userName: getUserName(),
            userType: getUserType(),
          }),
        });

        if (!res.ok) throw new Error("Network error. Please try again.");

        const data: BotResponse = await res.json();
        const reply = data.reply || data.success
          ? data.reply || "I couldn't generate a response. Please try rephrasing."
          : "Sorry, I didn't understand that. Could you rephrase?";

        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", text: reply, timestamp: Date.now() },
        ]);

        if (data.needsEscalation) {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "assistant",
              text: "📌 **This has been flagged for HR review.** They will follow up with you via email.",
              timestamp: Date.now(),
            },
          ]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            text: "⚠️ I couldn't reach the server. Please check your connection and try again.",
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading],
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="fixed bottom-5 right-5 z-[2147483647] font-sans">
      {/* Chat Panel */}
      {open && (
        <div
          className="mb-3 w-[min(380px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50 overflow-hidden"
          style={{ animation: "botSlideUp 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#1a1510] to-zinc-950 border-b border-white/10">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">TEN Internship Assistant</p>
              <p className="text-[11px] text-stone-500">
                {loading ? "Thinking..." : "Ask me anything"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Thread */}
          <div ref={threadRef} className="h-[380px] overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#CB5534] text-white rounded-br-md"
                      : "bg-white/5 text-stone-300 border border-white/5 rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? renderMarkdown(msg.text) : msg.text}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-stone-300 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/5 border border-white/5 px-4 py-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-500 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-500 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-500 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Quick Prompts (shown only when few messages) */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  onClick={() => send(qp)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-stone-400 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all cursor-pointer"
                >
                  {qp}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-white/10 bg-zinc-950 px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about your internship..."
                disabled={loading}
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all disabled:opacity-50"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#CB5534] to-[#B24629] text-white disabled:opacity-40 hover:from-[#E05E3A] hover:to-[#CB5534] transition-all cursor-pointer disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#CB5534] to-[#B24629] text-white shadow-lg shadow-[#CB5534]/25 hover:shadow-[#CB5534]/40 hover:scale-105 transition-all cursor-pointer"
          aria-label="Open internship chatbot"
          style={{ animation: "botPop 0.3s ease-out" }}
        >
          <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
          {/* Notification dot */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4AF37] text-[8px] font-bold text-zinc-950">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        </button>
      )}

      {/* Inject keyframe animations */}
      <style>{`
        @keyframes botSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes botPop {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ── Client-only localStorage helpers ────────────────────────────── */
function getEmployeeId(): string {
  if (typeof window === "undefined") return "";
  const s = JSON.parse(localStorage.getItem("student") || sessionStorage.getItem("student") || "{}");
  return localStorage.getItem("employeeId") || sessionStorage.getItem("employeeId") || s.employeeId || "";
}
function getUserName(): string {
  if (typeof window === "undefined") return "";
  const s = JSON.parse(localStorage.getItem("student") || sessionStorage.getItem("student") || "{}");
  return s.firstName ? `${s.firstName} ${s.lastName || ""}`.trim() : "Student";
}
function getUserType(): string {
  if (typeof window === "undefined") return "student";
  return localStorage.getItem("userType") || sessionStorage.getItem("userType") || "student";
}