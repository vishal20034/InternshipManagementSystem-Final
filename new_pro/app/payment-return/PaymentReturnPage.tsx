"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Inter, Playfair_Display } from 'next/font/google';
import { CheckCircle2, XCircle, Clock, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

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

interface TransactionData {
  amountRupees?: number;
  txnUtr?: string;
  txnTime?: string;
  createdAt?: string;
}

export default function PaymentReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // States
  const [status, setStatus] = useState<'verifying' | 'success' | 'pending' | 'failed'>('verifying');
  const [pollAttempt, setPollAttempt] = useState(1);
  const [txnData, setTxnData] = useState<TransactionData | null>(null);
  const [orderId, setOrderId] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // 1. Initial parameter parsing
  useEffect(() => {
    const oId = searchParams.get('orderId') || sessionStorage.getItem('lastOrderId') || '';
    const empId = localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId') || '';

    setOrderId(oId);
    setEmployeeId(empId);

    if (!oId) {
      setStatus('failed');
      return;
    }

    if (oId && empId) {
      startStatusPolling(oId, empId, 1);
    } else if (oId && !empId) {
      setStatus('failed');
    }
  }, [searchParams]);

  // Polling recursive mechanism in React
  const startStatusPolling = async (oid: string, empId: string, attempt: number) => {
    setPollAttempt(attempt);

    if (attempt > 12) {
      setStatus('pending');
      return;
    }

    if (!empId) {
      setStatus('failed');
      return;
    }

    try {
      const r = await fetch(`/api/v2/payment/status/${oid}`, {
        headers: { 'x-employee-id': empId }
      });
      const d = await r.json();

      if (d.status === 'success') {
        setTxnData(d);
        setStatus('success');
      } else if (d.status === 'failed') {
        setStatus('failed');
      } else {
        // Continue polling
        setTimeout(() => startStatusPolling(oid, empId, attempt + 1), 3000);
      }
    } catch (_) {
      // Continue polling on network error
      setTimeout(() => startStatusPolling(oid, empId, attempt + 1), 3000);
    }
  };

  const handleRestartPoll = () => {
    if (!orderId || !employeeId) return;
    setStatus('verifying');
    startStatusPolling(orderId, employeeId, 1);
  };

  const formatTxnDate = (data: TransactionData) => {
    const dateStr = data.txnTime || data.createdAt;
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={`${inter.variable} ${playfair.variable} min-h-screen w-full bg-[#FBF7EE] text-[#1E1A17] font-sans flex items-center justify-center p-6 relative overflow-hidden selection:bg-[#CB5534]/30 selection:text-[#CB5534]`}>
      
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(203,85,52,0.02)_0%,transparent_70%)] pointer-events-none z-0" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-radial-gradient from-[#CB5534]/5 to-transparent rounded-full filter blur-3xl pointer-events-none z-0" />

      {/* Main card box */}
      <div className="relative z-10 w-full max-w-md bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-8 sm:p-10 shadow-2xl text-center">
        
        {/* Golden top decorative bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#CB5534] to-transparent rounded-t-2xl" />

        {/* State 1: Verifying status */}
        {status === 'verifying' && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-[#CB5534]/5 border border-[#CB5534]/20">
              <Loader2 className="w-8 h-8 animate-spin text-[#CB5534]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#1E1A17] font-serif">Verifying Payment</h2>
              <p className="text-[#5C524C] text-xs sm:text-sm leading-relaxed pr-1 max-w-xs mx-auto">
                Please wait while we confirm your transaction status with the bank processor...
              </p>
            </div>
            <div className="text-[11px] font-mono text-[#8E8279] font-bold bg-[#FDFCF7] border-[#E2D9CD] py-2 rounded-lg border border-[#E2D9CD]/50">
              Attempt {pollAttempt} of 12 &mdash; checking status...
            </div>
          </div>
        )}

        {/* State 2: Success status */}
        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#CB5534] font-serif">Payment Successful!</h2>
              <p className="text-[#5C524C] text-xs sm:text-sm leading-relaxed max-w-xs mx-auto">
                Your payment has been confirmed. Your account status is now successfully updated.
              </p>
            </div>

            {txnData && (
              <div className="bg-white/[0.01] border border-[#E2D9CD]/50 rounded-xl p-4 text-left space-y-3">
                <div className="flex justify-between items-center text-xs border-b border-[#E2D9CD]/50 pb-2">
                  <span className="text-[#8E8279] font-semibold uppercase tracking-wider">Amount Paid</span>
                  <span className="text-base font-extrabold text-[#CB5534]">₹{txnData.amountRupees}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-[#E2D9CD]/50 pb-2">
                  <span className="text-[#8E8279] font-semibold uppercase tracking-wider">Transaction ID</span>
                  <span className="font-mono text-white font-semibold break-all text-right">{txnData.txnUtr || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8E8279] font-semibold uppercase tracking-wider">Date &amp; Time</span>
                  <span className="text-[#1E1A17] font-semibold text-right">{formatTxnDate(txnData)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <a
                href="/student-dashboard"
                className="w-full py-3.5 bg-[#CB5534] hover:bg-[#B24629] text-white font-semibold text-xs rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-[#CB5534]/15 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Back to Dashboard <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/my-documents"
                className="w-full py-3 border border-[#E2D9CD] hover:border-white/20 rounded-xl text-[#1E1A17] hover:text-white text-xs font-semibold transition-all flex items-center justify-center cursor-pointer"
              >
                View My Documents
              </a>
            </div>
          </div>
        )}

        {/* State 3: Pending status */}
        {status === 'pending' && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-[#CB5534]/5 text-[#CB5534] border border-[#CB5534]/20">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#1E1A17] font-serif">Verification in Progress</h2>
              <p className="text-[#5C524C] text-xs sm:text-sm leading-relaxed pr-1 max-w-xs mx-auto">
                Your payment is currently being verified. This usually takes 1&ndash;2 minutes. Your account will update automatically once confirmed.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleRestartPoll}
                className="w-full py-3.5 bg-[#CB5534] hover:bg-[#B24629] text-white font-semibold text-xs rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-[#CB5534]/15 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Check Again
              </button>
              <a
                href="/student-dashboard"
                className="w-full py-3 border border-[#E2D9CD] hover:border-white/20 rounded-xl text-[#1E1A17] hover:text-white text-xs font-semibold transition-all flex items-center justify-center cursor-pointer"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        )}

        {/* State 4: Failed status */}
        {status === 'failed' && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-rose-50 text-rose-600 border border-rose-200">
              <XCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#1E1A17] font-serif">Payment Not Completed</h2>
              <p className="text-[#5C524C] text-xs sm:text-sm leading-relaxed pr-1 max-w-xs mx-auto">
                Your payment was not completed or failed verification. You have not been charged. Please try again.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="/payment"
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-rose-950/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Try Again
              </a>
              <a
                href="/student-dashboard"
                className="w-full py-3 border border-[#E2D9CD] hover:border-white/20 rounded-xl text-[#1E1A17] hover:text-white text-xs font-semibold transition-all flex items-center justify-center cursor-pointer"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
