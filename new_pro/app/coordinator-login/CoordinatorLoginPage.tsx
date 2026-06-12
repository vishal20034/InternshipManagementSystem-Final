"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  User,
  CheckCircle2,
  XCircle,
  Lock,
  ChevronRight,
  HelpCircle,
  Briefcase
} from 'lucide-react';

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  text: string;
}

export default function CoordinatorLoginPage() {
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const logged = sessionStorage.getItem("coordinatorLoggedIn");
      if (logged === "true") {
        router.push("/coordinator-dashboard");
      }
    }
  }, [router]);

  // Inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/coordinator-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (data.success) {
        sessionStorage.setItem("coordinatorLoggedIn", "true");
        sessionStorage.setItem("coordinatorDomain", JSON.stringify(data.coordinator.domain || []));
        sessionStorage.setItem("coordinatorUsername", data.coordinator.username);

        showAlert('success', 'Login Successful', 'Welcome back, Coordinator.');

        setTimeout(() => {
          closeAlert();
          router.push("/coordinator-dashboard");
        }, 1500);

      } else {
        showAlert('error', 'Login Failed', data.message || 'Invalid username or password.');
      }
    } catch (error) {
      setLoading(false);
      showAlert('error', 'Server Error', 'A network error occurred. Please try again.');
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
          role: "coordinator"
        })
      });
      const data = await res.json();
      setForgotLoading(false);

      if (data.success) {
        setForgotOpen(false);
        showAlert('success', 'Request Sent', 'Password recovery instructions have been sent to your email.');
      } else {
        showAlert('error', 'Request Failed', data.message || 'Failed to dispatch reset email.');
      }
    } catch (_) {
      setForgotLoading(false);
      showAlert('error', 'Server Error', 'Failed to communicate with recovery server.');
    }
  };

  const coordinators = [
    { user: 'devops_aws_admin', label: 'DevOps with AWS' },
    { user: 'python_admin', label: 'Python Development' },
    { user: 'java_admin', label: 'Java Development' },
    { user: 'web_admin', label: 'Web Development' },
    { user: 'mern_admin', label: 'MERN Stack Development' },
    { user: 'ai_admin', label: 'Artificial Intelligence' },
    { user: 'datascience_admin', label: 'Data Science' },
    { user: 'cyber_admin', label: 'Cyber Security' },
    { user: 'software_admin', label: 'Software Engineering' },
    { user: 'flutter_admin', label: 'Flutter Development' }
  ];

  return (
    <div className="min-h-screen w-full bg-[#FBF7EE] text-[#1E1A17] font-sans flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      
      {/* Background Orbs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-[#CB5534]/6 to-transparent rounded-full filter blur-[120px] pointer-events-none z-0" />
      <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] bg-gradient-to-tr from-[#CB5534]/4 to-transparent rounded-full filter blur-[100px] pointer-events-none z-0" />

      <div className="w-full max-w-lg relative z-10 space-y-8 animate-[fadeUp_0.5s_ease_both]">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-[#CB5534]/6 border border-[#CB5534]/20 rounded-xl flex items-center justify-center mx-auto shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer">
            <span className="text-xl font-bold text-[#CB5534]">∞</span>
          </div>
          <div className="space-y-0.5">
            <div className="text-base font-extrabold tracking-[0.25em] text-[#CB5534] uppercase font-display">TEN</div>
            <div className="text-[9px] tracking-wider text-[#5C524C] uppercase font-bold">Coordinator Secure Access</div>
          </div>
        </div>

        {/* Card Block */}
        <div className="bg-white/95 backdrop-blur-md border border-[#E2D9CD] rounded-3xl p-8 sm:p-10 shadow-[0_24px_64px_-16px_rgba(30,26,23,0.06),_0_0_0_1px_rgba(226,217,205,0.3)] relative space-y-6">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent rounded-t-3xl" />

          <div className="space-y-1 pb-2">
            <h2 className="text-2xl font-bold text-[#1E1A17] font-display tracking-tight">Coordinator Login</h2>
            <p className="text-xs text-[#5C524C] font-medium leading-normal">
              Secure console for verification of tasks, submissions, and metrics.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#CB5534]" /> Coordinator Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter coordinator username"
                required
                className="w-full px-4 py-3 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-sm text-[#1E1A17] placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 transition-all font-mono"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#CB5534]" /> Password
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all hover:scale-[1.01] active:scale-95 shadow-[0_4px_16px_rgba(203,85,52,0.15)] flex items-center justify-center gap-2 cursor-pointer mt-2 border-none"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>Login to Dashboard <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Security Alert Note */}
          <div className="bg-[#2E7D32]/6 border border-[#2E7D32]/15 rounded-xl p-4 space-y-1">
            <h4 className="text-xs font-bold text-[#2E7D32] flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Security Protection Enabled
            </h4>
            <p className="text-[11px] text-[#5C524C] leading-relaxed font-semibold">
              Access is strictly restricted to verified managers and domain owners. Task approvals are subject to double-factor verification.
            </p>
          </div>

          {/* Coordinators lists */}
          <div className="border border-[#E2D9CD] rounded-xl p-4 bg-[#FDFCF7] space-y-3">
            <h3 className="text-xs font-extrabold tracking-widest text-[#CB5534] uppercase flex items-center gap-1.5 font-display">
              <Briefcase className="w-4 h-4 text-[#CB5534]" /> Active Coordinators
            </h3>
            
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 select-none font-mono text-xs">
              {coordinators.map((c, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#E2D9CD]/50 last:border-none">
                  <span className="text-[#CB5534] bg-[#CB5534]/6 px-2 py-0.5 rounded border border-[#CB5534]/15 font-bold">
                    {c.user}
                  </span>
                  <span className="text-[#8E8279] font-bold text-right">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
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
          <a href="/" className="hover:text-[#CB5534] transition-colors">← Home</a>
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
                Provide your Coordinator Username below and we will trigger recovery instructions to your associated email.
              </p>
              
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={forgotEmpId}
                  onChange={(e) => setForgotEmpId(e.target.value)}
                  placeholder="Enter Username"
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
