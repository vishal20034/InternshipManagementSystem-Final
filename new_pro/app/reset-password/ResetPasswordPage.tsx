"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Inter, Playfair_Display } from 'next/font/google';
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock
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

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  text: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Params
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [isLinkValid, setIsLinkValid] = useState(true);

  // Inputs
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Alert State
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    text: '',
  });

  useEffect(() => {
    const resetToken = searchParams.get('token') || '';
    const resetRole = (searchParams.get('role') || '').toLowerCase();
    const validRoles = ['student', 'coordinator', 'hr'];

    setToken(resetToken);
    setRole(resetRole);

    if (!resetToken || !validRoles.includes(resetRole)) {
      setIsLinkValid(false);
      setErrorMsg('This reset link is invalid or incomplete. Please request a new one.');
    }
  }, [searchParams]);

  const showAlert = (type: 'success' | 'error' | 'info', title: string, text: string) => {
    setAlert({ isOpen: true, type, title, text });
  };

  const closeAlert = () => {
    setAlert((prev) => ({ ...prev, isOpen: false }));
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isLinkValid) return;

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, role, newPassword })
      });
      const d = await r.json();
      setLoading(false);

      if (d.success) {
        showAlert('success', 'Password Updated', 'Your security password has been successfully reset. Redirecting to login...');
        
        setTimeout(() => {
          closeAlert();
          const targetPath = role === 'student' ? '/login'
                           : role === 'coordinator' ? '/coordinator-login'
                           : '/hr-login';
          router.push(targetPath);
        }, 2400);

      } else {
        setErrorMsg(d.message || "Failed to reset password. The link may have expired.");
      }
    } catch (e) {
      setLoading(false);
      setErrorMsg("A network error occurred. Please try again.");
    }
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
            <div className="text-[10px] tracking-wider text-[#8E8279] uppercase font-mono">Secure Access Recovery</div>
          </div>
        </div>

        {/* Card Component */}
        <div className="bg-white/90 border-[#E2D9CD] backdrop-blur-md border border-[#E2D9CD] rounded-2xl p-8 sm:p-10 shadow-2xl relative space-y-6">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#CB5534] to-transparent rounded-t-2xl" />

          <div className="space-y-1 pb-1">
            <h2 className="text-2xl font-bold text-[#1E1A17] tracking-tight font-serif flex items-center gap-2">
              Password Reset
              {role && (
                <span className="text-[10px] font-bold tracking-widest text-[#CB5534] border border-[#CB5534]/20 bg-[#CB5534]/10 px-2 py-0.5 rounded-full uppercase ml-1.5 select-none font-mono">
                  {role}
                </span>
              )}
            </h2>
            <p className="text-xs text-[#5C524C] leading-normal">
              Enter your new strong password below to complete recovery.
            </p>
          </div>

          <form onSubmit={handleResetSubmit} className="space-y-5">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#5C524C]">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                disabled={!isLinkValid}
                className="w-full px-4 py-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534]/50 focus:ring-1 focus:ring-[#CB5534]/20 transition-all font-mono"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#5C524C]">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
                disabled={!isLinkValid}
                className="w-full px-4 py-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534]/50 focus:ring-1 focus:ring-[#CB5534]/20 transition-all font-mono"
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
              disabled={loading || !isLinkValid}
              className="w-full py-3.5 bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-[#CB5534]/15 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <>Update Password <ArrowRight className="w-4 h-4" /></>}
            </button>

            <div className="text-[10px] text-[#8E8279] text-center leading-normal">
              If your link has expired, request a new recovery link from the sign in page.
            </div>
          </form>
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-center text-xs font-semibold text-[#8E8279]">
          <a href="/login" className="hover:text-[#CB5534] transition-colors">
            &larr; Back to Main Portal
          </a>
        </div>

      </div>

      {/* Alert modal overlay */}
      {alert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1A17]/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 shadow-2xl space-y-4 animate-[scaleIn_0.2s_cubic-bezier(0.34,1.56,0.64,1)]">
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
