"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, ClipboardCheck, Info, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Message = { kind: "ok" | "warn" | "error"; text: string };

export default function QrAttendancePage() {
  const router = useRouter();
  const params = useSearchParams();
  const domain = params.get("domain") || "";
  const coordinatorId = params.get("coordinatorId") || "";
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(
    domain ? null : { kind: "warn", text: "This QR is missing a domain. Ask your coordinator for a fresh QR." },
  );
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const cachedEmpId = localStorage.getItem("employeeId");
    if (!cachedEmpId) {
      router.push('/login');
    } else {
      setEmployeeId(cachedEmpId);
    }
  }, [router]);

  const icon = useMemo(() => {
    if (!message) return null;
    if (message.kind === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    if (message.kind === "warn") return <Info className="h-4 w-4 text-[#CB5534]" />;
    return <AlertCircle className="h-4 w-4 text-rose-600" />;
  }, [message]);

  const markAttendance = async () => {
    if (!employeeId.trim() || !password) {
      setMessage({ kind: "error", text: "Employee ID and password are required." });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/qr-attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employeeId.trim(), password, domain, coordinatorId }),
      });
      const data = await response.json();

      if (data.success) {
        setCompleted(true);
        setMessage({ kind: "ok", text: data.message || "Attendance marked successfully. Have a great day!" });
      } else if (data.alreadyMarked) {
        setCompleted(true);
        setMessage({ kind: "warn", text: data.message || "Attendance already marked for today." });
      } else {
        setMessage({ kind: "error", text: data.message || "Failed to mark attendance." });
      }
    } catch {
      setMessage({ kind: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FBF7EE] px-4 py-10 text-[#1E1A17]">
      <section className="mx-auto max-w-md animate-fade-up">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-lg border border-[#CB5534]/30 bg-[#CB5534]/10 text-[#CB5534]">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#8E8279]">TEN Attendance</p>
        </div>

        <Card>
          <CardHeader>
            {domain && <span className="mb-3 w-fit rounded-full border border-[#CB5534]/25 bg-[#CB5534]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#CB5534]">{domain}</span>}
            <CardTitle className="font-serif text-2xl">{domain ? `Mark Your Attendance - ${domain}` : "Mark Your Attendance"}</CardTitle>
            <p className="text-sm text-[#5C524C]">Enter your portal credentials to record today&apos;s class attendance.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${message.kind === "ok" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-800" : message.kind === "warn" ? "border-amber-400/20 bg-amber-400/10 text-amber-800" : "border-rose-400/20 bg-rose-400/10 text-rose-800"}`}>
                {icon}
                <span>{message.text}</span>
              </div>
            )}

            {!completed && (
              <div className="space-y-3">
                <Input value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} placeholder="Employee ID" autoComplete="off" onKeyDown={(event) => event.key === "Enter" && markAttendance()} />
                <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" onKeyDown={(event) => event.key === "Enter" && markAttendance()} />
                <Button className="w-full" onClick={markAttendance} disabled={!domain || loading}>
                  {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <LogIn className="h-4 w-4" />}
                  {loading ? "Marking..." : "Mark My Attendance"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-[#8E8279]">The Entrepreneurship Network</p>
      </section>
    </main>
  );
}
