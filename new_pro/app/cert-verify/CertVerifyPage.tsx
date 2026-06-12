"use client";

import React, { useState, useEffect } from 'react';
import { Inter, Playfair_Display } from 'next/font/google';
import { ShieldCheck, Award, AlertCircle, Loader2, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
});

interface CertificateData {
  success: boolean;
  valid: boolean;
  studentName?: string;
  domain?: string;
  certificateType?: string;
  issuedAt?: string;
  certificateId?: string;
}

export default function CertVerifyPage() {
  const [certIdInput, setCertIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificateData | null>(null);

  useEffect(() => {
    // Check URL params on load
    const params = new URLSearchParams(window.location.search);
    const paramId = params.get('id') || params.get('certId');
    if (paramId) {
      setCertIdInput(paramId);
      verifyCert(paramId);
    }
  }, []);

  const verifyCert = async (idToVerify?: string) => {
    const targetId = (idToVerify || certIdInput).trim().toUpperCase();
    if (!targetId) return;

    setLoading(true);
    setResult(null);

    try {
      const r = await fetch(`/api/v2/certificates/verify/${encodeURIComponent(targetId)}`);
      const d = await r.json();
      setResult(d);
    } catch (e) {
      setResult({ success: false, valid: false });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      verifyCert();
    }
  };

  const getCertificateTypeLabel = (type?: string) => {
    if (!type) return 'Certificate';
    const typeLabels: Record<string, string> = {
      expert: 'Expert Certificate',
      nano_degree: 'Nano Degree Certificate',
      fellowship: 'Fellowship Certificate'
    };
    return typeLabels[type] || type;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className={`${inter.variable} ${playfair.variable} min-h-screen bg-[#FBF7EE] text-[#1E1A17] font-sans flex flex-col justify-between selection:bg-[#CB5534]/30 selection:text-[#CB5534]`}>
      
      {/* Hero Section */}
      <div className="relative overflow-hidden py-16 sm:py-24 text-center border-b border-[#E2D9CD] bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(203,85,52,0.04)_0%,transparent_60%)] pointer-events-none" />
        <div className="relative z-10 max-w-xl mx-auto px-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider text-[#CB5534] uppercase bg-[#CB5534]/5 border border-[#CB5534]/20 mb-6">
            <ShieldCheck className="w-3.5 h-3.5" /> Secure Verification
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1E1A17] tracking-tight mb-4 font-serif">
            Certificate <span className="text-[#CB5534]">Verification</span>
          </h1>
          <p className="text-sm sm:text-base text-[#5C524C] font-normal leading-relaxed">
            Verify the authenticity of any TEN internship certificate instantly.
          </p>
        </div>
      </div>

      {/* Search & Results Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-12 -mt-10 relative z-20">
        
        {/* Search Card */}
        <Card className="mb-8 rounded-2xl bg-white/90 border-[#E2D9CD] p-1 backdrop-blur-md">
          <CardContent className="p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-1">Enter Certificate ID</h2>
          <p className="text-xs text-[#8E8279] mb-6">
            Format: TEN-2026-EXP-K4M7R2 &middot; TEN-2026-ND-XXXXX &middot; TEN-2026-FEL-XXXXX
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="text"
              value={certIdInput}
              onChange={(e) => setCertIdInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="TEN-2026-EXP-XXXXXX"
              className="min-w-0 flex-1 rounded-xl bg-[#FDFCF7] border-[#E2D9CD] font-mono tracking-wide placeholder:text-zinc-700"
            />
            <Button
              onClick={() => verifyCert()}
              disabled={loading}
              className="rounded-xl bg-[#CB5534] px-6 text-white shadow-lg shadow-[#CB5534]/10 hover:bg-[#B24629]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>Verify <ArrowRight className="w-4 h-4 text-white" /></>
              )}
            </Button>
          </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {(loading || result) && (
          <div className="w-full">
            <div className="bg-white/90 border-[#E2D9CD] backdrop-blur-md border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#5C524C] gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-[#CB5534]" />
                  <p className="text-sm font-medium">Verifying certificate in database...</p>
                </div>
              ) : result && result.success && result.valid ? (
                // Valid Certificate Layout
                <div>
                  <div className="flex items-center gap-4 mb-6 pb-5 border-b border-[#E2D9CD]">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-200">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Certificate Valid</h3>
                      <p className="text-xs text-emerald-600/80 font-medium">This certificate has been verified as authentic</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <div className="bg-white/[0.02] border border-[#E2D9CD]/30 rounded-xl p-4">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1.5">Certificate Holder</div>
                      <div className="text-sm font-semibold text-white">{result.studentName || '—'}</div>
                    </div>
                    <div className="bg-white/[0.02] border border-[#E2D9CD]/30 rounded-xl p-4">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1.5">Domain</div>
                      <div className="text-sm font-semibold text-white">{result.domain || '—'}</div>
                    </div>
                    <div className="bg-white/[0.02] border border-[#E2D9CD]/30 rounded-xl p-4">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1.5">Certificate Type</div>
                      <div className="mt-0.5">
                        <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/20">
                          {getCertificateTypeLabel(result.certificateType)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/[0.02] border border-[#E2D9CD]/30 rounded-xl p-4">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1.5">Issue Date</div>
                      <div className="text-sm font-semibold text-white">{formatDate(result.issuedAt)}</div>
                    </div>
                    <div className="bg-white/[0.02] border border-[#E2D9CD]/30 rounded-xl p-4 sm:col-span-2">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1.5">Certificate ID</div>
                      <div className="text-xs font-mono font-bold text-[#CB5534] tracking-wider break-all">{result.certificateId}</div>
                    </div>
                  </div>

                  <div className="flex gap-3.5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-6">
                    <Award className="w-8 h-8 text-[#CB5534] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-emerald-600 mb-0.5">Verified &mdash; Issued by The Entrepreneurship Network</div>
                      <div className="text-[11px] text-emerald-500/70 font-medium leading-normal">
                        This certificate is authentic and was issued upon successful internship completion.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Invalid/Not Found Layout
                <div>
                  <div className="flex items-center gap-4 mb-6 pb-5 border-b border-[#E2D9CD]">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-200">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Certificate Not Found</h3>
                      <p className="text-xs text-rose-600/80 font-medium">This certificate ID could not be verified</p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 bg-rose-500/5 border border-rose-200 rounded-xl p-4">
                    <AlertCircle className="w-8 h-8 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-rose-600 mb-0.5">Invalid or unrecognised certificate</div>
                      <div className="text-[11px] text-rose-6000/70 font-medium leading-normal">
                        Please check the certificate ID and try again. Contact <a href="mailto:hr@entrepreneurshipnetwork.net" className="text-[#CB5534] hover:underline">hr@entrepreneurshipnetwork.net</a> for support.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-8 px-4 text-xs text-[#8E8279] border-t border-[#E2D9CD] bg-[#FBF7EE] relative z-10">
        <p className="leading-relaxed">
          This verification service is provided by <a href="/" className="text-[#CB5534] hover:underline">The Entrepreneurship Network</a>.
          <br className="hidden sm:inline" /> Certificates are issued upon successful completion of the internship program.
        </p>
      </footer>
    </div>
  );
}
