"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, CreditCard, IndianRupee, QrCode, Smartphone, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MERCHANT_UPI = "8595986120@ptyes";
const MERCHANT_NAME = "TEN Internship";

function buildUpiUrl(pa: string, pn: string, amount: string, note: string) {
  return `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${encodeURIComponent(amount)}&cu=INR&tn=${encodeURIComponent(note)}`;
}

export default function PaymentPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [student, setStudent] = useState({ employeeId: "", name: "Student" });
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("TEN Internship Payment");
  const [step, setStep] = useState<"form" | "pay">("form");
  const [utr, setUtr] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const numericAmount = Number(amount);
  const upiUrl = useMemo(
    () => buildUpiUrl(MERCHANT_UPI, MERCHANT_NAME, numericAmount.toFixed(2), description || "TEN Internship Payment"),
    [numericAmount, description],
  );

  useEffect(() => {
    const employeeId = localStorage.getItem("employeeId") || sessionStorage.getItem("employeeId") || "";
    const name = localStorage.getItem("studentName") || sessionStorage.getItem("studentName") || "Student";
    if (!employeeId) {
      window.location.href = "/login";
      return;
    }
    setStudent({ employeeId, name });
  }, []);

  useEffect(() => {
    if (step !== "pay" || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, upiUrl, {
      width: 212,
      margin: 1,
      color: { dark: "#050505", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).catch(() => setError("Could not generate payment QR. Please use a UPI app link below."));
  }, [step, upiUrl]);

  const saveOrderRecord = async () => {
    try {
      await fetch("/api/v2/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-employee-id": student.employeeId },
        body: JSON.stringify({
          amount: numericAmount,
          invoiceRef: `INV-${student.employeeId}-${Date.now()}`,
          description,
          directUpi: true,
        }),
      });
    } catch {
      // Order creation is best-effort; UTR confirmation still records the payment attempt.
    }
  };

  const showPaymentStep = async () => {
    setError("");
    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      setError("Please enter a valid amount. Minimum payment is INR 1.");
      return;
    }
    setStep("pay");
    setConfirmed(false);
    setUtr("");
    await saveOrderRecord();
  };

  const openUpi = (app: "upi" | "gpay" | "phonepe" | "paytm") => {
    const note = encodeURIComponent(description || "TEN Internship Payment");
    const encodedAmount = numericAmount.toFixed(2);
    const links = {
      upi: upiUrl,
      gpay: `gpay://upi/pay?pa=${encodeURIComponent(MERCHANT_UPI)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${encodedAmount}&cu=INR&tn=${note}`,
      phonepe: `phonepe://pay?pa=${encodeURIComponent(MERCHANT_UPI)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${encodedAmount}&cu=INR&tn=${note}`,
      paytm: `paytmmp://pay?pa=${encodeURIComponent(MERCHANT_UPI)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${encodedAmount}&cu=INR&tn=${note}`,
    };
    window.location.href = links[app];
  };

  const confirmPayment = async () => {
    if (utr.trim().length < 6) {
      setError("Please enter a valid UTR or transaction ID.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      await fetch("/api/v2/payment/utr-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-employee-id": student.employeeId },
        body: JSON.stringify({ utr: utr.trim(), amount: numericAmount, description }),
      });
      setConfirmed(true);
    } catch {
      setError("Could not submit your UTR right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBF7EE] px-4 py-10 text-[#1E1A17]">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <a href="/student-dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-[#8E8279] transition hover:text-[#CB5534]">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </a>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#CB5534]/25 bg-[#CB5534]/10 text-[#CB5534]">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="font-serif text-2xl">Secure UPI Payment</CardTitle>
              <p className="text-sm text-[#5C524C]">Pay TEN through any UPI app.</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-lg border border-[#E2D9CD] bg-[#FBF7EE]/50 p-4">
            <p className="font-semibold text-[#1E1A17]">{student.name}</p>
            <p className="font-mono text-xs text-[#8E8279]">{student.employeeId || "Loading..."}</p>
          </div>

          {error && <div className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div>}

          {step === "form" ? (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8279]">Amount</label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[#CB5534]" />
                <Input className="pl-10" inputMode="numeric" min={1} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
              </div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8279]">Remarks</label>
              <textarea
                className="min-h-24 w-full rounded-lg border border-[#E2D9CD] bg-[#FBF7EE]/60 p-3 text-sm text-[#1E1A17] outline-none focus:border-[#CB5534]/60 focus:ring-2 focus:ring-[#CB5534]/20"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <Button className="w-full" onClick={showPaymentStep}>
                <QrCode className="h-4 w-4" />
                Generate Payment QR
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-sm text-[#8E8279]">Amount to pay</p>
                <p className="text-4xl font-black text-[#CB5534]">INR {numericAmount.toLocaleString("en-IN")}</p>
                <p className="mt-2 font-mono text-sm text-[#5C524C]">{MERCHANT_UPI}</p>
              </div>

              <div className="flex justify-center">
                <div className="rounded-lg bg-white p-3">
                  <canvas ref={canvasRef} width={212} height={212} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => openUpi("gpay")}><Smartphone className="h-4 w-4" />Google Pay</Button>
                <Button variant="outline" onClick={() => openUpi("phonepe")}><Smartphone className="h-4 w-4" />PhonePe</Button>
                <Button variant="outline" onClick={() => openUpi("paytm")}><WalletCards className="h-4 w-4" />Paytm</Button>
                <Button variant="outline" onClick={() => openUpi("upi")}><QrCode className="h-4 w-4" />Any UPI</Button>
              </div>

              {confirmed ? (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-center text-emerald-100">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-300" />
                  <p className="font-semibold">Payment Submitted</p>
                  <p className="text-sm text-emerald-100/75">Your UTR has been recorded for verification.</p>
                </div>
              ) : (
                <div className="space-y-3 border-t border-[#E2D9CD] pt-5">
                  <p className="text-sm text-[#5C524C]">After paying, enter your UTR or transaction ID.</p>
                  <Input value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="UTR / Transaction ID" />
                  <Button className="w-full" onClick={confirmPayment} disabled={submitting}>
                    {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" /> : <CheckCircle2 className="h-4 w-4" />}
                    {submitting ? "Submitting..." : "Submit Payment Confirmation"}
                  </Button>
                  <Button className="w-full" variant="ghost" onClick={() => setStep("form")}>Enter different amount</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
