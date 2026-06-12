"use client";

import React, { useState, useEffect } from 'react';
import { Check, Clipboard, ClipboardCheck, ArrowRight } from 'lucide-react';

export default function SuccessPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [copiedEmp, setCopiedEmp] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [particles, setParticles] = useState<{ id: number; left: number; delay: number; size: number; color: string; duration: number; rotate: number }[]>([]);

  useEffect(() => {
    // Read credentials from sessionStorage
    const empId = sessionStorage.getItem("reg_employeeId") || "";
    const pass = sessionStorage.getItem("reg_password") || "";
    setEmployeeId(empId);
    setPassword(pass);

    // Generate confetti particles
    const newParticles = Array.from({ length: 60 }).map((_, idx) => ({
      id: idx,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      size: 4 + Math.random() * 6,
      color: `hsl(${Math.random() * 60 + 30}, 80%, 60%)`,
      duration: 2 + Math.random() * 3,
      rotate: Math.random() * 360
    }));
    setParticles(newParticles);
  }, []);

  const handleCopy = async (value: string, setCopied: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (_) {
      // Fallback copy
      const t = document.createElement("textarea");
      t.value = value;
      t.style.position = "fixed";
      t.style.left = "-9999px";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const handleContinue = () => {
    sessionStorage.removeItem("reg_employeeId");
    sessionStorage.removeItem("reg_password");
    const redirect = sessionStorage.getItem("redirectAfterSuccess") || "groups";
    sessionStorage.removeItem("redirectAfterSuccess");
    // Normalize to SPA route if it ends with .html
    const route = redirect.replace('.html', '').replace(/^\/?/, '/');
    window.location.href = route;
  };

  return (
    <div className="min-h-screen w-full bg-[#FBF7EE] text-slate-200 font-sans flex items-center justify-center p-6 relative overflow-hidden selection:bg-[#CB5534]/30 selection:text-[#CB5534]">
      
      {/* Background Orbs & Confetti Particles */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(203,85,52,0.02)_0%,transparent_70%)] pointer-events-none z-0" />
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute animate-particle-rise"
            style={{
              top: '-10px',
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.id % 2 === 0 ? '50%' : '2px',
              transform: `rotate(${p.rotate}deg)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              animationFillMode: 'forwards'
            }}
          />
        ))}
      </div>

      {/* Success Card */}
      <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-[#E2D9CD] rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-[slideUp_0.5s_ease-out]">
        
        {/* Decorative Golden Line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-[#CB5534] uppercase bg-[#CB5534]/5 border border-[#CB5534]/10 mb-6">
            ✨ TEN Portal
          </span>
          
          <div className="w-16 h-16 bg-[#CB5534]/5 border border-[#CB5534]/30 text-[#CB5534] rounded-full flex items-center justify-center text-3xl font-extrabold mx-auto mb-5 shadow-lg shadow-amber-900/10">
            ✓
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1A17] tracking-tight mb-2 font-serif">
            Registration Successful!
          </h1>
          <p className="text-xs sm:text-sm text-[#5C524C] font-normal leading-relaxed">
            Your account is ready. Save these credentials before continuing.
          </p>
        </div>

        {/* Credentials Box */}
        <div className="space-y-4 mb-6">
          
          {/* Employee ID Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#E2D9CD]/50 bg-white/[0.01]">
            <div className="min-w-[100px]">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#8E8279]">Employee ID</span>
            </div>
            <div className="flex-1 font-mono text-sm font-bold text-[#1E1A17] overflow-hidden text-ellipsis whitespace-nowrap">
              {employeeId || '—'}
            </div>
            <button
              onClick={() => handleCopy(employeeId, setCopiedEmp)}
              className="sm:self-center self-start text-xs font-bold px-4 py-2 border border-[#E2D9CD] rounded-lg hover:border-[#CB5534]/30 hover:bg-[#CB5534]/5 hover:text-[#CB5534] text-[#5C524C] cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {copiedEmp ? (
                <><ClipboardCheck className="w-3.5 h-3.5 text-[#CB5534]" /> Copied</>
              ) : (
                <><Clipboard className="w-3.5 h-3.5" /> Copy</>
              )}
            </button>
          </div>

          {/* Password Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#E2D9CD]/50 bg-white/[0.01]">
            <div className="min-w-[100px]">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#8E8279]">Password</span>
            </div>
            <div className="flex-1 font-mono text-sm font-bold text-[#1E1A17] overflow-hidden text-ellipsis whitespace-nowrap">
              {password || '—'}
            </div>
            <button
              onClick={() => handleCopy(password, setCopiedPass)}
              className="sm:self-center self-start text-xs font-bold px-4 py-2 border border-[#E2D9CD] rounded-lg hover:border-[#CB5534]/30 hover:bg-[#CB5534]/5 hover:text-[#CB5534] text-[#5C524C] cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {copiedPass ? (
                <><ClipboardCheck className="w-3.5 h-3.5 text-[#CB5534]" /> Copied</>
              ) : (
                <><Clipboard className="w-3.5 h-3.5" /> Copy</>
              )}
            </button>
          </div>

        </div>

        {/* Note Box */}
        <div className="bg-[#CB5534]/5 border border-[#CB5534]/15 text-[#CB5534]/95 rounded-xl p-4 text-[11px] leading-relaxed mb-8 text-center sm:text-left font-medium">
          ⚠️ These credentials were also sent to your email. Please screenshot them before continuing.
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-neutral-950 font-bold rounded-xl shadow-lg shadow-amber-900/10 cursor-pointer transition-all flex items-center justify-center gap-2"
        >
          Continue to Groups <ArrowRight className="w-4 h-4 text-neutral-950" />
        </button>

      </div>

    </div>
  );
}
