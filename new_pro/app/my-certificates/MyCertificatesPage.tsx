"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Download, ExternalLink, Lock, Share2, Sparkles, Volume2, VolumeX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CertType = "expert" | "nano_degree" | "fellowship";
type CertData = Record<string, any>;

const labels: Record<CertType, { name: string; desc: string; threshold: number; price: string }> = {
  expert: { name: "Expert Certificate", desc: "Awarded for 30% course completion", threshold: 30, price: "INR 100" },
  nano_degree: { name: "Nano Degree", desc: "Awarded for 70% course completion", threshold: 70, price: "INR 1000" },
  fellowship: { name: "Fellowship", desc: "Top cohort performers only", threshold: 90, price: "INR 2500" },
};

export default function MyCertificatesPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [data, setData] = useState<CertData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [reveal, setReveal] = useState<CertType | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("employeeId") || sessionStorage.getItem("employeeId") || "";
      if (!id) {
        router.push("/login");
        return;
      }
      setEmployeeId(id);
    }
  }, [router]);

  useEffect(() => {
    async function loadCerts() {
      if (!employeeId) return;
      try {
        const response = await fetch("/api/v2/certificates/my-certs", { headers: { "x-employee-id": employeeId } });
        const json = await response.json();
        if (!json.success) throw new Error(json.message || "Could not load certificates.");
        setData(json);
        if (json.fellowship?.unlocked) setReveal("fellowship");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadCerts();
  }, [employeeId]);

  const openCertificate = async (type: CertType) => {
    const existing = data[type]?.record?.pdfUrl || data[type]?.pdfUrl;
    if (existing) {
      window.open(existing, "_blank");
      return;
    }
    try {
      const response = await fetch(`/api/v2/certificates/generate-pdf/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-employee-id": employeeId },
      });
      const json = await response.json();
      if (json.success && json.pdfUrl) window.open(json.pdfUrl, "_blank");
    } catch {
      setError("Could not generate the certificate PDF.");
    }
  };

  const share = (network: "linkedin" | "whatsapp") => {
    const url = encodeURIComponent(`${window.location.origin}/cert-verify`);
    const text = encodeURIComponent("I just earned my TEN Internship Certificate.");
    const link = network === "linkedin"
      ? `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=TEN%20Certificate&summary=${text}`
      : `https://wa.me/?text=${text}%20${url}`;
    window.open(link, "_blank");
  };

  const completion = data.expert?.completionPct || 0;

  return (
    <main className="min-h-screen bg-[#FBF7EE] text-[#1E1A17] font-sans px-4 py-8 relative overflow-hidden select-none">
      
      {/* Decorative Orbs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-[#CB5534]/5 to-transparent blur-[120px] rounded-full pointer-events-none z-0" />

      <section className="mx-auto max-w-6xl space-y-5 relative z-10 animate-[fadeUp_0.4s_ease_both]">
        
        {/* Main Header Card */}
        <Card className="bg-white border-[#E2D9CD] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
          <CardHeader className="pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-display text-3xl font-extrabold text-[#1E1A17]">My Certificates</CardTitle>
                <p className="mt-1.5 text-xs sm:text-sm text-[#5C524C] font-medium">Track your milestone eligibility, unlock certificates, and download verified PDFs.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => router.push("/student-dashboard")}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 border border-[#E2D9CD] hover:border-[#CB5534] hover:bg-[#CB5534]/5 text-[#1E1A17] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer bg-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
                </button>
                <button 
                  onClick={() => setMuted((value) => !value)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-[#E2D9CD] text-[#5C524C] hover:text-[#1E1A17] rounded-xl text-xs font-bold transition-all cursor-pointer bg-white"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {muted ? "Muted" : "Sound"}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-[#E2D9CD] bg-[#FDFCF7] p-4 shadow-sm">
              <div className="mb-2.5 flex items-center justify-between text-xs sm:text-sm font-semibold">
                <span className="text-[#5C524C]">Course Completion Progress</span>
                <span className="text-[#CB5534] font-mono">{completion}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#E2D9CD]">
                <div className="h-full rounded-full bg-[#CB5534] transition-all duration-500" style={{ width: `${Math.min(100, completion)}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-600">{error}</div>}
        
        {loading ? (
          <div className="text-center py-12 text-[#5C524C] font-semibold text-xs flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-[#E2D9CD] border-t-[#CB5534] rounded-full animate-spin"></span>
            Loading certificates...
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {(Object.keys(labels) as CertType[]).map((type) => {
              const info = labels[type];
              const cert = data[type] || {};
              const unlocked = Boolean(cert.unlocked);
              const pct = cert.completionPct ?? completion;
              return (
                <Card key={type} className={`bg-white border-[#E2D9CD] shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 ${unlocked ? "border-[#CB5534]/30" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2D9CD] bg-[#FDFCF7] text-[#CB5534] shadow-inner">
                      {unlocked ? <Award className="h-5.5 w-5.5" /> : <Lock className="h-5 w-5 text-[#8E8279]" />}
                    </div>
                    <CardTitle className="text-base font-extrabold text-[#1E1A17]">{info.name}</CardTitle>
                    <p className="text-xs text-[#5C524C] font-medium leading-relaxed mt-1">{info.desc}</p>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    <div>
                      <div className="mb-2 flex justify-between text-[10px] font-bold text-[#8E8279] uppercase tracking-wider">
                        <span>{pct}% Completed</span>
                        <span>Unlocks at {info.threshold}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#E2D9CD]">
                        <div className="h-full rounded-full bg-[#CB5534]" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] font-extrabold tracking-widest text-[#CB5534] bg-[#CB5534]/5 border border-[#CB5534]/15 px-2.5 py-0.5 rounded-full uppercase">
                        {info.price}
                      </span>
                    </div>
                    <button 
                      disabled={!unlocked} 
                      onClick={() => openCertificate(type)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                        unlocked 
                          ? "bg-[#CB5534] hover:bg-[#B24629] text-white shadow-md shadow-[#CB5534]/10" 
                          : "bg-stone-100 text-[#8E8279] opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <Download className="h-4 w-4" /> {unlocked ? "Download PDF" : "Locked"}
                    </button>
                    {unlocked && (
                      <button 
                        onClick={() => setReveal(type)}
                        className="w-full py-2 border border-[#E2D9CD] hover:border-[#CB5534] text-[#1E1A17] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer bg-white flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="h-4 w-4 text-[#CB5534]" /> Reveal Certificate
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Reveal Certificate Modal */}
      {reveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1A17]/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <Card className="w-full max-w-lg bg-white border-[#E2D9CD] shadow-2xl relative overflow-hidden text-center p-6 animate-[scaleUp_0.2s_ease-out]">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#CB5534]" />
            <CardHeader className="pb-3">
              <Sparkles className="mx-auto h-12 w-12 text-[#CB5534] animate-pulse" />
              <CardTitle className="font-display text-2xl font-extrabold text-[#1E1A17] pt-2">{labels[reveal].name}</CardTitle>
              <p className="text-xs text-[#5C524C] font-semibold">{labels[reveal].desc}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-[#5C524C] font-medium leading-relaxed">
                Congratulations! Share your certificate directly with your professional network or open the direct verify URL page.
              </p>
              
              <div className="flex gap-2 flex-wrap justify-center pt-2">
                <button 
                  onClick={() => openCertificate(reveal)}
                  className="px-5 py-2.5 bg-[#CB5534] hover:bg-[#B24629] text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer border-none shadow-sm flex items-center gap-1.5"
                >
                  <ExternalLink className="h-4 w-4" /> Open Document
                </button>
                <button 
                  onClick={() => share("linkedin")}
                  className="px-4 py-2.5 border border-[#E2D9CD] hover:border-[#CB5534] text-[#1E1A17] font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer bg-white flex items-center gap-1.5"
                >
                  <Share2 className="h-4 w-4 text-[#CB5534]" /> Share LinkedIn
                </button>
                <button 
                  onClick={() => share("whatsapp")}
                  className="px-4 py-2.5 border border-[#E2D9CD] hover:border-[#CB5534] text-[#1E1A17] font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer bg-white flex items-center gap-1.5"
                >
                  <Share2 className="h-4 w-4 text-[#CB5534]" /> Share WhatsApp
                </button>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => setReveal(null)}
                  className="text-xs font-bold text-[#8E8279] hover:text-[#CB5534] transition-colors cursor-pointer bg-transparent border-none outline-none"
                >
                  Dismiss
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
