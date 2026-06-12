"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Download, FileText, Lock, Upload, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatusData = Record<string, any>;
type DocType = "address" | "marksheet";

export default function MyDocumentsPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [data, setData] = useState<StatusData>({});
  const [active, setActive] = useState<"upload" | "docs">("upload");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState<DocType | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const student = JSON.parse(localStorage.getItem("student") || sessionStorage.getItem("student") || "{}");
      const id = localStorage.getItem("employeeId") || sessionStorage.getItem("employeeId") || student.employeeId || "";
      if (!id) {
        router.push("/login");
        return;
      }
      setEmployeeId(id);
    }
  }, [router]);

  const loadStatus = async () => {
    if (!employeeId) return;
    try {
      const response = await fetch("/api/v2/documents/my-status", { headers: { "x-employee-id": employeeId } });
      const json = await response.json();
      if (json.success) setData(json);
    } catch {
      setMessage("Could not load document status.");
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadStatus();
    }
  }, [employeeId]);

  const locked = useMemo(() => ["pending", "under_review", "approved"].includes(data.status), [data.status]);
  const statusLabel = data.status === "approved" ? "Approved" : data.status === "rejected" ? "Rejected" : data.status === "pending" || data.status === "under_review" ? "Under Review" : "Not Uploaded";

  const uploadFile = async (type: DocType, file?: File) => {
    if (!file || !employeeId || locked) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Maximum file size is 5MB.");
      return;
    }
    setUploading(type);
    setMessage("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("employeeId", employeeId);
    try {
      const endpoint = type === "address" ? "/api/v2/documents/upload-address-proof" : "/api/v2/documents/upload-marksheet";
      const response = await fetch(endpoint, { method: "POST", headers: { "x-employee-id": employeeId }, body: formData });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || "Upload failed.");
      setMessage(json.autoSubmitted || json.uploadStatus === "pending" ? "Documents submitted for HR review." : "Document uploaded successfully.");
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const submitDocuments = async () => {
    setMessage("");
    try {
      const response = await fetch("/api/v2/documents/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-employee-id": employeeId },
        body: JSON.stringify({ employeeId }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.message || "Submit failed.");
      setMessage("Documents submitted for HR review.");
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submit failed.");
    }
  };

  const rows = [
    { name: "Offer Letter", desc: "Internship offer from TEN", url: data.offer_letter_url, date: data.offerLetterSentAt },
    { name: "Letter of Recommendation", desc: "Issued by HR after eligible completion", url: data.lor_url, date: data.lorSentAt },
    { name: "Letter of Completion", desc: "Issued at full course completion", url: data.loc_url, date: data.locSentAt },
    { name: "Star Performance Award", desc: "Awarded to top performers by HR", url: data.star_performance_url, date: data.starPerformanceSentAt },
  ];

  return (
    <main className="min-h-screen bg-[#FBF7EE] text-[#1E1A17] font-sans px-4 py-8 relative overflow-hidden select-none">
      
      {/* Decorative Orbs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-[#CB5534]/5 to-transparent blur-[120px] rounded-full pointer-events-none z-0" />

      <section className="mx-auto max-w-5xl space-y-5 relative z-10 animate-[fadeUp_0.4s_ease_both]">
        
        {/* Main Header Card */}
        <Card className="bg-white border-[#E2D9CD] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
          <CardHeader className="pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-display text-3xl font-extrabold text-[#1E1A17]">My Documents</CardTitle>
                <p className="mt-1.5 text-xs sm:text-sm text-[#5C524C] font-medium">Upload onboarding verification files and download official issued letters.</p>
              </div>
              <button 
                onClick={() => router.push("/student-dashboard")}
                className="flex items-center justify-center gap-1.5 px-4 py-2 border border-[#E2D9CD] hover:border-[#CB5534] hover:bg-[#CB5534]/5 text-[#1E1A17] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer bg-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`rounded-xl border p-4 shadow-sm flex items-center gap-3 ${
              data.status === "approved" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-[#CB5534]/5 border-[#CB5534]/15 text-[#CB5534]"
            }`}>
              {data.status === "approved" ? <CheckCircle2 className="h-5.5 w-5.5 shrink-0" /> : <AlertCircle className="h-5.5 w-5.5 shrink-0" />}
              <div>
                <p className="font-bold text-sm">Status: {statusLabel}</p>
                <p className="text-xs text-[#5C524C] font-medium mt-0.5">{data.rejectionReason ? `Reason: ${data.rejectionReason}` : "Onboarding verification is checked by HR managers."}</p>
              </div>
            </div>

            {message && <div className="rounded-xl border border-[#CB5534]/15 bg-[#CB5534]/5 p-3.5 text-xs font-semibold text-[#CB5534]">{message}</div>}

            <div className="flex gap-2">
              <button 
                onClick={() => setActive("upload")}
                className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  active === "upload" ? "bg-[#CB5534] text-white border-none shadow-sm" : "bg-white border border-[#E2D9CD] text-[#5C524C] hover:border-[#CB5534]"
                }`}
              >
                Upload Files
              </button>
              <button 
                onClick={() => setActive("docs")}
                className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  active === "docs" ? "bg-[#CB5534] text-white border-none shadow-sm" : "bg-white border border-[#E2D9CD] text-[#5C524C] hover:border-[#CB5534]"
                }`}
              >
                Issued Letters & Certificates
              </button>
            </div>
          </CardContent>
        </Card>

        {active === "upload" ? (
          <div className="grid gap-5 md:grid-cols-2">
            {(["address", "marksheet"] as DocType[]).map((type) => (
              <Card key={type} className="bg-white border-[#E2D9CD] shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold text-[#1E1A17]">{type === "address" ? "Address Verification Proof" : "College Marksheet Document"}</CardTitle>
                  <p className="text-xs text-[#5C524C] font-medium mt-1 leading-normal">
                    {type === "address" 
                      ? data.addressProofUrl ? "Uploaded successfully. Click below to reselect." : "Upload Aadhaar, Passport, or Electricity Bill (PDF/Image max 5MB)."
                      : data.marksheetUrl ? "Uploaded successfully. Click below to reselect." : "Upload recent term marksheet or college ID card (PDF/Image max 5MB)."}
                  </p>
                </CardHeader>
                <CardContent>
                  <label className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#E2D9CD] bg-[#FDFCF7] hover:bg-[#CB5534]/4 hover:border-[#CB5534] p-8 text-center transition-all ${
                    locked ? "opacity-60 cursor-not-allowed" : ""
                  }`}>
                    {locked ? <Lock className="mb-3 h-8 w-8 text-[#8E8279]" /> : <Upload className="mb-3 h-8 w-8 text-[#CB5534]" />}
                    <span className="text-xs font-bold text-[#1E1A17]">{locked ? "Submission locked during HR review" : uploading === type ? "Uploading..." : "Click to select file"}</span>
                    <input className="hidden" type="file" disabled={locked || uploading === type} onChange={(event) => uploadFile(type, event.target.files?.[0])} />
                  </label>
                </CardContent>
              </Card>
            ))}
            <div className="md:col-span-2 pt-2">
              <button 
                onClick={submitDocuments} 
                disabled={locked || !employeeId}
                className="px-6 py-3 bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer border-none shadow-sm flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4" /> Submit Documents for Verification
              </button>
            </div>
          </div>
        ) : (
          <Card className="bg-white border-[#E2D9CD] shadow-sm">
            <CardContent className="pt-5">
              <div className="space-y-3">
                {rows.map((row) => (
                  <div key={row.name} className="flex flex-col gap-3 rounded-xl border border-[#E2D9CD] bg-[#FDFCF7] p-4 sm:flex-row sm:items-center sm:justify-between hover:border-[#CB5534]/30 transition-all">
                    <div>
                      <p className="font-bold text-sm text-[#1E1A17]">{row.name}</p>
                      <p className="text-xs text-[#5C524C] font-medium mt-0.5">{row.desc}</p>
                      <p className="text-[10px] text-[#8E8279] font-mono mt-1">{row.date ? `Issued: ${new Date(row.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}` : "HR verification pending"}</p>
                    </div>
                    {row.url ? (
                      <button 
                        onClick={() => window.open(row.url, "_blank")}
                        className="px-4 py-2 border border-[#E2D9CD] hover:border-[#CB5534] hover:bg-[#CB5534]/5 text-[#1E1A17] rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer bg-white flex items-center gap-1.5 shadow-sm"
                      >
                        <Download className="h-3.5 w-3.5 text-[#CB5534]" /> Download PDF
                      </button>
                    ) : (
                      <span className="text-xs text-[#8E8279] font-semibold bg-stone-100 px-2.5 py-1 rounded">Not issued yet</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
