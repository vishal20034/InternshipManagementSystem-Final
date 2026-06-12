"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Brain,
  FolderLock,
  Award,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Briefcase,
  Users
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const empId = localStorage.getItem("employeeId");
      if (empId) {
        router.push("/student-dashboard");
        return;
      }
      const coordLogged = sessionStorage.getItem("coordinatorLoggedIn");
      if (coordLogged === "true") {
        router.push("/coordinator-dashboard");
        return;
      }
      const hrUser = sessionStorage.getItem("hrUser");
      if (hrUser) {
        router.push("/hr-portal");
        return;
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-[#FBF7EE] text-[#1E1A17] font-sans flex items-center justify-center p-4 sm:p-8 md:p-12 relative overflow-hidden select-none">
      {/* Decorative Blur Orbs */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-[#CB5534]/8 to-[#F08467]/3 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-[#CB5534]/5 to-transparent blur-[100px] rounded-full pointer-events-none z-0" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-12 bg-white/95 backdrop-blur-md border border-[#E2D9CD] rounded-[36px] shadow-[0_24px_64px_-16px_rgba(30,26,23,0.06),_0_0_0_1px_rgba(226,217,205,0.3)] overflow-hidden animate-[fadeUp_0.5s_ease_both]">
        
        {/* Left Branding Panel */}
        <div className="md:col-span-7 p-8 sm:p-12 md:p-16 flex flex-col justify-between relative overflow-hidden gap-12 bg-gradient-to-b from-[#FDFCF7] via-[#F5EFEB]/50 to-[#FDFCF7] border-b md:border-b-0 md:border-r border-[#E2D9CD]">
          {/* Top orange accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
          
          <div className="space-y-12">
            {/* Logo and brand */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#CB5534]/6 border border-[#CB5534]/20 rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(203,85,52,0.1)] relative shrink-0">
                <span className="text-xl font-bold text-[#CB5534]">∞</span>
              </div>
              <div>
                <div className="text-lg font-black tracking-[4px] text-[#CB5534] font-display">TEN</div>
                <div className="text-[9px] tracking-[0.18em] text-[#5C524C] font-semibold uppercase mt-0.5">The Entrepreneurship Network</div>
              </div>
            </div>

            {/* Title and tagline */}
            <div className="space-y-5">
              <h1 className="text-4xl sm:text-5xl font-black text-[#1E1A17] leading-[1.15] font-display tracking-tight">
                Launch Your Career <span className="text-[#CB5534]">With Real Impact</span>
              </h1>
              <p className="text-sm sm:text-base text-[#5C524C] leading-relaxed max-w-lg">
                Gain hands-on experience, build high-tier portfolio projects, and earn stipend coins in a gamified professional workspace.
              </p>
            </div>

            {/* Feature lists */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-3.5 text-xs font-bold text-[#1E1A17] bg-white p-3 rounded-xl border border-[#E2D9CD] shadow-sm">
                <div className="w-8 h-8 bg-[#CB5534]/8 border border-[#CB5534]/15 rounded-lg flex items-center justify-center text-[#CB5534] shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                Performance Tracking
              </div>
              <div className="flex items-center gap-3.5 text-xs font-bold text-[#1E1A17] bg-white p-3 rounded-xl border border-[#E2D9CD] shadow-sm">
                <div className="w-8 h-8 bg-[#CB5534]/8 border border-[#CB5534]/15 rounded-lg flex items-center justify-center text-[#CB5534] shrink-0">
                  <Brain className="w-4 h-4" />
                </div>
                Expert Coordinators
              </div>
              <div className="flex items-center gap-3.5 text-xs font-bold text-[#1E1A17] bg-white p-3 rounded-xl border border-[#E2D9CD] shadow-sm">
                <div className="w-8 h-8 bg-[#CB5534]/8 border border-[#CB5534]/15 rounded-lg flex items-center justify-center text-[#CB5534] shrink-0">
                  <FolderLock className="w-4 h-4" />
                </div>
                Review & Verification
              </div>
              <div className="flex items-center gap-3.5 text-xs font-bold text-[#1E1A17] bg-white p-3 rounded-xl border border-[#E2D9CD] shadow-sm">
                <div className="w-8 h-8 bg-[#CB5534]/8 border border-[#CB5534]/15 rounded-lg flex items-center justify-center text-[#CB5534] shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                Official Badges & LOR
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6 border-t border-[#E2D9CD] pt-8">
            <div>
              <div className="text-2xl font-black text-[#CB5534] font-display">12+</div>
              <div className="text-[10px] text-[#8E8279] font-bold uppercase tracking-wider mt-1">Tech Domains</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#CB5534] font-display">1k+</div>
              <div className="text-[10px] text-[#8E8279] font-bold uppercase tracking-wider mt-1">Interns Graduated</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#CB5534] font-display">100%</div>
              <div className="text-[10px] text-[#8E8279] font-bold uppercase tracking-wider mt-1">Remote & Flexible</div>
            </div>
          </div>
        </div>

        {/* Right Action Panel */}
        <div className="md:col-span-5 p-8 sm:p-12 md:p-14 flex flex-col justify-center bg-white relative">
          <div className="w-full space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E1A17] font-display tracking-tight">Select Portal</h2>
              <p className="text-xs sm:text-sm text-[#5C524C]">
                Log in or sign up to access your personalized workspace.
              </p>
            </div>

            {/* Portal buttons */}
            <div className="space-y-3.5 pt-2">
              {/* Register */}
              <button
                onClick={() => router.push('/register')}
                className="w-full flex items-center justify-between p-4.5 bg-[#CB5534] hover:bg-[#B24629] text-white rounded-xl transition-all shadow-[0_4px_16px_rgba(203,85,52,0.18)] hover:scale-[1.01] active:scale-95 group font-bold text-sm cursor-pointer border-none"
              >
                <span className="flex items-center gap-3 pl-2">
                  <Users className="w-4.5 h-4.5" /> Register as Intern
                </span>
                <ArrowRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1 mr-2" />
              </button>

              {/* Student Login */}
              <button
                onClick={() => router.push('/login')}
                className="w-full flex items-center justify-between p-4.5 bg-[#FDFCF7] border border-[#E2D9CD] hover:border-[#CB5534] hover:bg-[#CB5534]/4 text-[#1E1A17] rounded-xl transition-all hover:scale-[1.01] active:scale-95 group font-bold text-sm cursor-pointer"
              >
                <span className="flex items-center gap-3 pl-2">
                  <GraduationCap className="w-5 h-5 text-[#CB5534]" /> Student Login
                </span>
                <ArrowRight className="w-4.5 h-4.5 text-[#8E8279] group-hover:text-[#CB5534] transition-transform group-hover:translate-x-1 mr-2" />
              </button>

              <div className="flex items-center my-6 py-2">
                <div className="flex-1 h-[1px] bg-[#E2D9CD]" />
                <span className="px-3.5 text-[9px] font-bold text-[#8E8279] uppercase tracking-[0.2em] font-mono">Management</span>
                <div className="flex-1 h-[1px] bg-[#E2D9CD]" />
              </div>

              {/* Coordinator Portal */}
              <button
                onClick={() => router.push('/coordinator-login')}
                className="w-full flex items-center justify-between p-4 bg-[#FDFCF7] border border-[#E2D9CD] hover:border-[#CB5534] hover:bg-[#CB5534]/4 text-[#1E1A17] rounded-xl transition-all hover:scale-[1.01] active:scale-95 group font-semibold text-xs cursor-pointer"
              >
                <span className="flex items-center gap-3 pl-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-[#CB5534]" /> Coordinator Portal
                </span>
                <ArrowRight className="w-4 h-4 text-[#8E8279] group-hover:text-[#CB5534] transition-transform group-hover:translate-x-1 mr-2" />
              </button>

              {/* HR Portal */}
              <button
                onClick={() => router.push('/hr-login')}
                className="w-full flex items-center justify-between p-4 bg-[#FDFCF7] border border-[#E2D9CD] hover:border-[#CB5534] hover:bg-[#CB5534]/4 text-[#1E1A17] rounded-xl transition-all hover:scale-[1.01] active:scale-95 group font-semibold text-xs cursor-pointer"
              >
                <span className="flex items-center gap-3 pl-2">
                  <Briefcase className="w-4.5 h-4.5 text-[#CB5534]" /> HR Portal
                </span>
                <ArrowRight className="w-4 h-4 text-[#8E8279] group-hover:text-[#CB5534] transition-transform group-hover:translate-x-1 mr-2" />
              </button>

              {/* Verify Portal Link */}
              <div className="pt-6 text-center border-t border-[#E2D9CD] mt-6">
                <a
                  href="/verify"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#CB5534] hover:underline"
                >
                  🛡️ Verification Portal
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-[#8E8279] font-medium tracking-wide pt-4">
              &copy; 2026 The Entrepreneurship Network. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
