"use client";

import { useMemo, useState } from "react";
import { Bot, GraduationCap, MessageCircle, Send, X } from "lucide-react";
import { INTERNSHIP_QUERY_BOT_KNOWLEDGE } from "./internship-query-bot-prompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  id: number;
  role: "bot" | "user";
  text: string;
};

function answerQuestion(question: string) {
  const normalized = question.toLowerCase();
  const hit = INTERNSHIP_QUERY_BOT_KNOWLEDGE.find((item) => item.match.some((keyword) => normalized.includes(keyword)));
  if (hit) return hit.answer;
  return "I can help with internship tasks, attendance, documents, certificates, payments, tests, and dashboard navigation. Tell me what you are trying to do, and include your Employee ID only if HR or coordinator follow-up is needed.";
}

export default function InternshipQueryBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "bot",
      text: "Hi, I am your TEN internship query assistant. Ask me about tasks, documents, certificates, attendance, or payments.",
    },
  ]);

  const nextId = useMemo(() => messages.length + 1, [messages.length]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const answer = answerQuestion(text);
    setMessages((current) => [
      ...current,
      { id: nextId, role: "user", text },
      { id: nextId + 1, role: "bot", text: answer },
    ]);
    setInput("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-[2147483647]">
      {open && (
        <section className="mb-3 flex h-[520px] w-[min(380px,calc(100vw-40px))] flex-col overflow-hidden rounded-lg border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50">
          <header className="flex items-center justify-between border-b border-white/10 bg-zinc-900 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-100">Internship Query Bot</p>
                <p className="text-xs text-stone-500">TEN student support</p>
              </div>
            </div>
            <Button aria-label="Close query bot" size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "bg-[#CB5534] text-white" : "border border-white/10 bg-zinc-900 text-stone-200"}`}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                placeholder="Ask about your internship..."
              />
              <Button aria-label="Send query" size="icon" onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      )}

      <Button className="h-14 rounded-full px-5 shadow-xl shadow-black/30" onClick={() => setOpen((value) => !value)}>
        {open ? <Bot className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        Query Bot
      </Button>
    </div>
  );
}
