"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Award, FileText, User, Layout, Landmark, Loader2, Search } from 'lucide-react';
import Link from 'next/link';

interface VerificationResult {
  success: boolean;
  document_number?: string;
  document_type?: string;
  employee_id?: string;
  student_name?: string;
  domain?: string;
  issued_date?: string;
  issued_by?: string;
  document?: {
    docType?: string;
    documentId?: string;
    employeeId?: string;
    domain?: string;
    generatedAt?: string;
    generatedBy?: string;
  };
  student?: {
    employeeId?: string;
    firstName?: string;
    lastName?: string;
    domain?: string;
  };
}

export default function VerifyPage() {
  const [docId, setDocId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    // Check URL params on load
    const params = new URLSearchParams(window.location.search);
    const prefillId = params.get('id');
    if (prefillId) {
      setDocId(prefillId);
      verifyDocument(prefillId);
    }
  }, []);

  const verifyDocument = async (idToVerify?: string) => {
    const targetId = (idToVerify || docId).trim();
    if (!targetId) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/v2/verify/' + encodeURIComponent(targetId));
      const data = await res.json();
      setResult({ ...data, success: res.ok });
    } catch (err) {
      setResult({ success: false });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      verifyDocument();
    }
  };

  const getDocTypeLabel = (res: VerificationResult) => {
    if (res.document_type) return res.document_type;
    const doc = res.document || {};
    const typeLabels: Record<string, string> = {
      offer_letter: "Offer Letter",
      loc: "Letter of Completion",
      lor: "Letter of Recommendation",
      star: "Star Performer",
      expert_certificate: "Expert Certificate",
      nano_degree: "Nano Degree",
      fellowship: "Fellowship"
    };
    return typeLabels[doc.docType || ''] || doc.docType || "Document";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#FBF7EE] text-[#1E1A17] font-sans flex flex-col justify-between selection:bg-[#CB5534]/30 selection:text-[#1E1A17] relative overflow-hidden select-none">
      
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#CB5534]/6 to-transparent rounded-full filter blur-3xl pointer-events-none z-0" />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden py-16 sm:py-20 text-center border-b border-[#E2D9CD] bg-gradient-to-b from-[#FDFCF7] via-[#F5EFEB]/30 to-[#FDFCF7]">
        <div className="relative z-10 max-w-2xl mx-auto px-4 animate-[fadeUp_0.4s_ease_both]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-[#CB5534] uppercase bg-[#CB5534]/5 border border-[#CB5534]/15 mb-6">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Verification Portal
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1E1A17] tracking-tight mb-4 font-display">
            Document <span className="text-[#CB5534]">Verification</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5C524C] font-semibold leading-relaxed max-w-lg mx-auto">
            Verify the authenticity of certificates, offer letters, and recommendations issued by The Entrepreneurship Network.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-12 -mt-10 relative z-20 animate-[fadeUp_0.5s_ease_both]">
        
        {/* Search Card */}
        <div className="bg-white/95 backdrop-blur-md border border-[#E2D9CD] rounded-3xl p-6 sm:p-8 shadow-[0_24px_64px_-16px_rgba(30,26,23,0.06),_0_0_0_1px_rgba(226,217,205,0.3)] mb-8 relative">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent rounded-t-2xl" />
          <h2 className="text-lg font-bold text-[#1E1A17] mb-1 font-display">Enter Document Number</h2>
          <p className="text-xs text-[#5C524C] mb-6 font-medium">
            Enter the unique document number printed on your TEN certificate / offer letter / LOR to verify its authenticity.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. TEN-OL-2026-4F2A9C"
              className="flex-1 min-w-0 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl px-4 py-3 text-sm text-[#1E1A17] font-mono tracking-wide placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534] focus:ring-3 focus:ring-[#CB5534]/10 transition-all"
              autoFocus
            />
            <button
              onClick={() => verifyDocument()}
              disabled={loading}
              className="bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white font-bold text-sm rounded-xl px-7 py-3 transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(203,85,52,0.15)] cursor-pointer border-none"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>Verify</>
              )}
            </button>
          </div>

          <div className="mt-5 text-xs text-[#8E8279] flex items-center gap-2 font-medium">
            <Search className="w-3.5 h-3.5 text-[#8E8279] shrink-0" />
            Document IDs are found at the bottom of every TEN certificate
          </div>
        </div>

        {/* Results Section */}
        {(loading || result) && (
          <div className="animate-[slideUp_0.4s_ease_out] w-full">
            <div className="bg-white/95 backdrop-blur-md border border-[#E2D9CD] rounded-3xl p-6 sm:p-8 shadow-[0_24px_64px_-16px_rgba(30,26,23,0.04),_0_0_0_1px_rgba(226,217,205,0.2)]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#5C524C] gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-[#CB5534]" />
                  <p className="text-xs sm:text-sm font-semibold">Verifying document with server database...</p>
                </div>
              ) : result && result.success ? (
                // Document Found & Verified
                <div>
                  <div className="flex items-center gap-4 mb-6 pb-5 border-b border-[#E2D9CD]/50">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                      ✓
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1E1A17] font-display">Document Verified</h3>
                      <p className="text-xs text-emerald-700 font-semibold">This document is authentic and was officially issued by TEN</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <div className="bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl p-4 sm:col-span-2">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1">Document ID</div>
                      <div className="text-xs font-mono font-bold text-[#CB5534] tracking-wider break-all">
                        {result.document_number || result.document?.documentId || docId}
                      </div>
                    </div>
                    <div className="bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl p-4">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1">Document Type</div>
                      <div className="text-sm font-bold text-[#1E1A17]">{getDocTypeLabel(result)}</div>
                    </div>
                    <div className="bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl p-4">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1">Employee ID</div>
                      <div className="text-sm font-mono font-bold text-[#1E1A17]">
                        {result.employee_id || result.document?.employeeId || result.student?.employeeId || '—'}
                      </div>
                    </div>
                    <div className="bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl p-4">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1">Student Name</div>
                      <div className="text-sm font-bold text-[#1E1A17]">
                        {result.student_name || 
                         (result.student 
                           ? `${result.student.firstName || ''} ${result.student.lastName || ''}`.trim() 
                           : '—')}
                      </div>
                    </div>
                    <div className="bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl p-4">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1">Domain / Role</div>
                      <div className="text-sm font-bold text-[#1E1A17]">
                        {result.domain || result.document?.domain || result.student?.domain || '—'}
                      </div>
                    </div>
                    <div className="bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl p-4">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1">Issued On</div>
                      <div className="text-sm font-bold text-[#1E1A17]">
                        {formatDate(result.issued_date || result.document?.generatedAt)}
                      </div>
                    </div>
                    <div className="bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl p-4">
                      <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1">Issued By</div>
                      <div className="text-sm font-bold text-[#1E1A17]">
                        {result.issued_by || result.document?.generatedBy || 'The Entrepreneurship Network (TEN)'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3.5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                    <Award className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-emerald-800 mb-0.5">Authentic Document</div>
                      <div className="text-[11px] text-emerald-700/80 font-medium leading-normal">
                        This document was digitally generated by The Entrepreneurship Network and its details match our database records.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Document Not Found
                <div>
                  <div className="flex items-center gap-4 mb-6 pb-5 border-b border-[#E2D9CD]/50">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-rose-50 border border-rose-200 text-rose-600">
                      ✗
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1E1A17] font-display">Document Not Found</h3>
                      <p className="text-xs text-rose-700 font-semibold">No document matches this ID in our system</p>
                    </div>
                  </div>

                  <div className="bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl p-4 mb-6">
                    <div className="text-[10px] font-bold tracking-wider uppercase text-[#8E8279] mb-1">Searched Document ID</div>
                    <div className="text-sm font-mono font-bold text-[#CB5534] break-all">{docId}</div>
                  </div>

                  <div className="flex gap-3.5 bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
                    <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-rose-850 mb-0.5">Unverified Document</div>
                      <div className="text-[11px] text-rose-700/80 font-medium leading-normal">
                        This document ID does not exist in our records. If you believe this is an error, please contact <a href="mailto:hr@entrepreneurshipnetwork.net" className="text-[#CB5534] hover:underline font-bold">hr@entrepreneurshipnetwork.net</a>.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Login Shortcuts */}
              <div className="role-tabs flex flex-col sm:flex-row gap-2 mt-6 pt-6 border-t border-[#E2D9CD]/50">
                <Link href="/login" className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold border border-[#E2D9CD] bg-white text-[#5C524C] hover:border-[#CB5534] hover:text-[#CB5534] transition-all flex items-center justify-center gap-1.5 active:scale-95">
                  <User className="w-3.5 h-3.5" /> Student Login
                </Link>
                <Link href="/coordinator-login" className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold border border-[#E2D9CD] bg-white text-[#5C524C] hover:border-[#CB5534] hover:text-[#CB5534] transition-all flex items-center justify-center gap-1.5 active:scale-95">
                  <Layout className="w-3.5 h-3.5" /> Coordinator Login
                </Link>
                <Link href="/hr-login" className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold border border-[#E2D9CD] bg-white text-[#5C524C] hover:border-[#CB5534] hover:text-[#CB5534] transition-all flex items-center justify-center gap-1.5 active:scale-95">
                  <Landmark className="w-3.5 h-3.5" /> HR Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-8 px-4 text-xs text-[#8E8279] border-t border-[#E2D9CD] bg-[#FDFCF7] relative z-10 font-medium">
        <p className="leading-relaxed">
          &copy; The Entrepreneurship Network &mdash; Limitless Technologies LLP
          <br className="hidden sm:inline" /> For questions or fraud reports: <a href="mailto:hr@entrepreneurshipnetwork.net" className="text-[#CB5534] hover:underline font-bold">hr@entrepreneurshipnetwork.net</a>
        </p>
      </footer>
    </div>
  );
}