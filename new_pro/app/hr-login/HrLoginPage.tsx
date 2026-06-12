"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  text: string;
}

export default function HrLoginPage() {
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hrUser = sessionStorage.getItem("hrUser");
      if (hrUser) {
        router.push("/hr-portal");
      }
    }
  }, [router]);

  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot Password States
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmpId, setForgotEmpId] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Alert State
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    text: '',
  });

  const showAlert = (type: 'success' | 'error' | 'info', title: string, text: string) => {
    setAlert({ isOpen: true, type, title, text });
  };

  const closeAlert = () => {
    setAlert((prev) => ({ ...prev, isOpen: false }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const r = await fetch('/hr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          username: email.trim(),
          password: password.trim()
        })
      });
      const d = await r.json();
      setLoading(false);

      if (d.success) {
        sessionStorage.setItem('hrUser', JSON.stringify(d.hr));
        router.push('/hr-portal');
      } else {
        setErrorMsg(d.message || 'Invalid credentials. Please try again.');
      }
    } catch (e) {
      setLoading(false);
      setErrorMsg('A network error occurred. Please try again later.');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmpId.trim()) return;

    setForgotLoading(true);
    try {
      const res = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: forgotEmpId.trim(),
          role: "hr"
        })
      });
      const data = await res.json();
      setForgotLoading(false);

      if (data.success) {
        setForgotOpen(false);
        showAlert('success', 'Request Sent', 'A password reset instructions mail has been sent.');
      } else {
        showAlert('error', 'Request Failed', data.message || 'Could not initiate reset procedure.');
      }
    } catch (_) {
      setForgotLoading(false);
      showAlert('error', 'Server Error', 'Failed to communicate with authorization server.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FBF7EE] text-[#1E1A17] font-sans flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      
      {/* Background Orbs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-[#CB5534]/6 to-transparent rounded-full filter blur-[120px] pointer-events-none z-0" />
      <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-gradient-to-tr from-[#CB5534]/4 to-transparent rounded-full filter blur-[100px] pointer-events-none z-0" />

      <div className="w-full max-w-md relative z-10 space-y-8 animate-[fadeUp_0.5s_ease_both]">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-[#CB5534]/6 border border-[#CB5534]/20 rounded-xl flex items-center justify-center mx-auto shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer">
            <span className="text-xl font-bold text-[#CB5534]">∞</span>
          </div>
          <div className="space-y-0.5">
            <div className="text-base font-extrabold tracking-[0.25em] text-[#CB5534] uppercase font-display">TEN</div>
            <div className="text-[9px] tracking-wider text-[#5C524C] uppercase font-bold">HR Console Secure Access</div>
          </div>
        </div>

        {/* Card wrapper */}
        <div className="bg-white/95 backdrop-blur-md border border-[#E2D9CD] rounded-3xl p-8 sm:p-10 shadow-[0_24px_64px_-16px_rgba(30,26,23,0.06),_0_0_0_1px_rgba(226,217,205,0.3)] relative space-y-6">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent rounded-t-3xl" />

          <div className="space-y-1 pb-2">
            <h2 className="text-2xl font-bold text-[#1E1A17] font-display tracking-tight">HR Sign In</h2>
            <p className="text-xs text-[#5C524C] font-medium leading-normal">
              Access the HR management, tracking, and certification dashboard.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* HR Email */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#CB5534]" /> HR Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter HR email"
                required
                className="w-full px-4 py-3 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-sm text-[#1E1A17] placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 transition-all font-mono"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#CB5534]" /> Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full px-4 py-3 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-sm text-[#1E1A17] placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 transition-all"
              />
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-600 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all hover:scale-[1.01] active:scale-95 shadow-[0_4px_16px_rgba(203,85,52,0.15)] flex items-center justify-center gap-2 cursor-pointer mt-2 border-none"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>Sign In to HR Portal <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <a href="/promoted-register" className="text-xs text-[#CB5534] hover:underline font-bold flex items-center justify-center gap-1">
              Promoted staff? Register here <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Navigation / Actions Footer */}
        <div className="flex justify-center gap-4 text-xs font-bold text-[#5C524C]">
          <button
            onClick={() => setForgotOpen(true)}
            className="hover:text-[#CB5534] transition-colors cursor-pointer bg-transparent border-none p-0 outline-none font-bold"
          >
            Forgot Password
          </button>
          <span className="text-[#E2D9CD] font-normal">&middot;</span>
          <a href="/login" className="hover:text-[#CB5534] transition-colors">Student Login</a>
          <span className="text-[#E2D9CD] font-normal">&middot;</span>
          <a href="/" className="hover:text-[#CB5534] transition-colors">← Main Portal</a>
        </div>

        <div className="text-center text-[10px] text-[#8E8279] font-medium">
          &copy; 2026 TEN Internship Management System
        </div>

      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1A17]/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white border border-[#E2D9CD] rounded-2xl p-6 shadow-2xl space-y-4 animate-[scaleUp_0.2s_ease-out]">
            <div className="flex items-center gap-2 border-b border-[#E2D9CD] pb-3">
              <HelpCircle className="w-5 h-5 text-[#CB5534]" />
              <h3 className="text-base font-bold text-[#1E1A17] font-display">Forgot Password</h3>
            </div>
            
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <p className="text-xs text-[#5C524C] leading-relaxed">
                Provide your HR Email below and we will trigger recovery instructions to your email address.
              </p>
              
              <div className="space-y-1.5">
                <input
                  type="email"
                  value={forgotEmpId}
                  onChange={(e) => setForgotEmpId(e.target.value)}
                  placeholder="Enter HR Email"
                  required
                  className="w-full px-4 py-2.5 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] placeholder-[#8E8279]/40 focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-2 border border-[#E2D9CD] hover:bg-[#F5EFEB] rounded-xl text-xs font-semibold text-[#5C524C] transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5"
                >
                  {forgotLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Request Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Alert Dialog */}
      {alert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1A17]/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white border border-[#E2D9CD] rounded-2xl p-6 shadow-2xl space-y-4 animate-[scaleUp_0.2s_ease-out]">
            <div className="flex items-center gap-3">
              {alert.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
              {alert.type === 'error' && <XCircle className="w-6 h-6 text-rose-600 shrink-0" />}
              {alert.type === 'info' && <ShieldCheck className="w-6 h-6 text-[#CB5534] shrink-0" />}
              
              <h4 className="text-base font-bold text-[#1E1A17] font-display">{alert.title}</h4>
            </div>

            <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed pr-1">{alert.text}</p>

            <div className="flex justify-end pt-2">
              <button
                onClick={closeAlert}
                className="px-4 py-2 bg-[#CB5534] hover:bg-[#B24629] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer border-none font-display"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
