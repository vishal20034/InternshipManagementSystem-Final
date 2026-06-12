"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatWidgetProps {
  role: "student" | "coordinator" | "hr";
  name: string;
  employeeId?: string;
  username?: string;
  domain?: string;
}

export default function ChatWidget({ role, name, employeeId, username, domain }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-5 z-[2147483600]">
      {open && (
        <section className="mb-3 w-[min(340px,calc(100vw-40px))] rounded-lg border border-white/10 bg-zinc-950 p-4 text-stone-100 shadow-2xl shadow-black/40">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">TEN Team Chat</p>
              <p className="text-xs text-stone-500">{name} - {role}{domain ? ` - ${domain}` : ""}</p>
            </div>
            <Button aria-label="Close team chat" size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3 text-sm text-stone-200">
            Live team chat is being migrated to the React portal. For urgent support, contact your coordinator or HR with your ID: {employeeId || username || "available in your profile"}.
          </div>
        </section>
      )}
      <Button variant="secondary" className="rounded-full" onClick={() => setOpen((value) => !value)}>
        <MessageSquare className="h-4 w-4" />
        Team Chat
      </Button>
    </div>
  );
}
