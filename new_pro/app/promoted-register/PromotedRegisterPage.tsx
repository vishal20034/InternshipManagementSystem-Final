"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inter, Playfair_Display } from 'next/font/google';
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronLeft
} from 'lucide-react';

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

interface VerifiedStaff {
  email: string;
  tempPassword: string;
  name: string;
  employeeId: string;
  newRole: 'hr' | 'coordinator';
  domain: string[];
}

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  text: string;
}

export default function PromotedRegisterPage() {
  const router = useRouter();

  // Wizard Step
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 Form Inputs
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  // Step 2 Form Inputs
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tenure, setTenure] = useState('');

  // Verified Data
  const [verified, setVerified] = useState<VerifiedStaff | null>(null);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !tempPassword.trim()) {
      setErrorMsg('Email and temporary password are required.');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/promoted/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), tempPassword: tempPassword.trim() })
      });
      const d = await r.json();
      setLoading(false);

      if (!d.valid) {
        setErrorMsg(d.message || "Invalid temporary credentials.");
        return;
      }

      setVerified({
        email: email.trim(),
        tempPassword: tempPassword.trim(),
        name: d.name || '',
        employeeId: d.employeeId || '',
        newRole: d.newRole || 'coordinator',
        domain: d.domain || []
      });
      
      setStep(2);
    } catch (e) {
      setLoading(false);
      setErrorMsg("Failed to connect to verification server.");
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!verified) {
      setErrorMsg('Verification required.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/promoted/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verified.email,
          tempPassword: verified.tempPassword,
          newPassword,
          tenure: tenure || undefined
        })
      });
      const d = await r.json();
      setLoading(false);

      if (d.success) {
        showAlert('success', 'Registration Complete', 'Welcome to your new staff role at TEN!');
        setTimeout(() => {
          closeAlert();
          // Redirect to main path returned or fall back to /login
          const targetRedirect = d.redirect ? d.redirect.replace('.html', '') : '/login';
          router.push(targetRedirect);
        }, 1500);
      } else {
        setErrorMsg(d.message || 'Registration failed.');
      }
    } catch (e) {
      setLoading(false);
      setErrorMsg("Failed to communicate registration request.");
    }
  };

  const getRoleLabel = (role?: 'hr' | 'coordinator') => {
    if (role === 'hr') return 'HR Manager';
    return 'Domain Coordinator';
  };

  return (
    <div className={`${inter.variable} ${playfair.variable} min-h-screen w-full bg-[#FBF7EE] text-[#1E1A17] font-sans flex items-center justify-center p-6 relative overflow-hidden selection:bg-[#CB5534]/30 selection:text-[#CB5534]`}>
      
      {/* Background Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(203,85,52,0.02)_0%,transparent_70%)] pointer-events-none z-0" />

      <div className="w-full max-w-md relative z-10 space-y-8 animate-[fadeUp_0.65s_ease_both]">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-[#CB5534]/5 border border-[#CB5534]/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-black/30 hover:scale-105 active:scale-95 transition-all">
            <img
              src="/ten-logo.png"
              alt="TEN Logo"
              className="w-10 h-10 object-contain filter drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]"
            />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-extrabold tracking-[0.25em] text-[#CB5534] uppercase">TEN</div>
            <div className="text-[10px] tracking-wider text-[#8E8279] uppercase font-mono">Promoted Staff Portal</div>
          </div>
        </div>

        {/* Card Component */}
        <div className="bg-white/90 border-[#E2D9CD] backdrop-blur-md border border-[#E2D9CD] rounded-2xl p-8 sm:p-10 shadow-2xl relative space-y-6">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#CB5534] to-transparent rounded-t-2xl" />

          <div className="space-y-1 pb-1">
            <h2 className="text-2xl font-bold text-[#1E1A17] tracking-tight font-serif">Complete Account Setup</h2>
            <p className="text-xs text-[#5C524C] leading-normal">
              Use the temporary password from your staff promotion notification.
            </p>
          </div>

          {/* Stepper progress indicator */}
          <div className="flex gap-2.5">
            <div className="flex-1 h-1 bg-[#FDFCF7] border-[#E2D9CD] rounded-full overflow-hidden border border-[#E2D9CD]">
              <div className="h-full bg-gradient-to-r from-[#CB5534] to-[#CB5534] transition-all duration-300 w-full" />
            </div>
            <div className="flex-1 h-1 bg-[#FDFCF7] border-[#E2D9CD] rounded-full overflow-hidden border border-[#E2D9CD]">
              <div className={`h-full bg-gradient-to-r from-[#CB5534] to-[#CB5534] transition-all duration-300 ${
                step === 2 ? 'w-full' : 'w-0'
              }`} />
            </div>
          </div>

          {/* STEP 1: Temp Credentials Verification */}
          {step === 1 && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#5C524C]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Promotion recipient email"
                  required
                  className="w-full px-4 py-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] rounded-xl text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#CB5534]/50 focus:ring-1 focus:ring-[#CB5534]/20 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#5C524C]">
                  Temporary Password
                </label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Password from the official email"
                  required
                  className="w-full px-4 py-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] rounded-xl text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#CB5534]/50 focus:ring-1 focus:ring-[#CB5534]/20 transition-all"
                />
                <div className="text-[10px] text-[#8E8279] font-medium leading-relaxed">
                  Temporary credentials expire 48 hours after generation.
                </div>
              </div>

              {errorMsg && (
                <div className="text-xs text-rose-600 bg-rose-500/5 px-4 py-3 rounded-xl border border-rose-500/15 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-[#CB5534]/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <>Verify Credentials <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* STEP 2: Password reset details */}
          {step === 2 && verified && (
            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#5C524C]">Full Name</label>
                <input
                  type="text"
                  value={verified.name}
                  readOnly
                  className="w-full px-4 py-2.5 bg-white/[0.02] border border-[#E2D9CD]/50 text-[#5C524C] rounded-xl text-xs outline-none select-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#5C524C]">Employee ID</label>
                <input
                  type="text"
                  value={verified.employeeId}
                  readOnly
                  className="w-full px-4 py-2.5 bg-white/[0.02] border border-[#E2D9CD]/50 text-[#5C524C] rounded-xl text-xs outline-none select-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#5C524C]">Assigned Role</label>
                <div className="mt-1">
                  <span className="inline-block px-3.5 py-1 rounded-full text-[10px] font-extrabold bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/20 uppercase tracking-wider">
                    {getRoleLabel(verified.newRole)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#5C524C]">New Secure Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="w-full px-4 py-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] rounded-xl text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#CB5534]/50 focus:ring-1 focus:ring-[#CB5534]/20 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#5C524C]">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full px-4 py-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] rounded-xl text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#CB5534]/50 focus:ring-1 focus:ring-[#CB5534]/20 transition-all font-mono"
                />
              </div>

              {errorMsg && (
                <div className="text-xs text-rose-600 bg-rose-500/5 px-4 py-3 rounded-xl border border-rose-500/15 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <>Complete Setup <CheckCircle2 className="w-4 h-4" /></>}
              </button>
            </form>
          )}

        </div>

        {/* Navigation Footer */}
        <div className="flex justify-center text-xs font-semibold text-[#8E8279]">
          <a href="/login" className="hover:text-[#CB5534] transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Student Login
          </a>
        </div>

      </div>

      {/* Alert modal overlay */}
      {alert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1A17]/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              {alert.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
              {alert.type === 'error' && <XCircle className="w-6 h-6 text-rose-600 shrink-0" />}
              {alert.type === 'info' && <ShieldCheck className="w-6 h-6 text-[#CB5534] shrink-0" />}
              
              <h4 className="text-base font-bold text-[#1E1A17]">{alert.title}</h4>
            </div>

            <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed pr-1">{alert.text}</p>

            <div className="flex justify-end pt-2">
              <button
                onClick={closeAlert}
                className="px-4 py-2 bg-[#CB5534] hover:bg-[#B24629] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer font-serif"
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
