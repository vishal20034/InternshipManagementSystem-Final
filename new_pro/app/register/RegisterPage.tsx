"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  User,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Brain,
  BarChart2,
  AlertTriangle,
  Mail,
  PhoneCall,
  Calendar,
  Layers,
  AlertCircle
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const empId = localStorage.getItem("employeeId");
      if (empId) {
        router.push("/student-dashboard");
      }
    }
  }, [router]);

  // Controlled states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [domain, setDomain] = useState('');
  const [tenure, setTenure] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Already registered block states
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [alreadyEmployeeId, setAlreadyEmployeeId] = useState('');

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !whatsapp.trim() || !collegeName.trim() || !domain || !tenure) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          collegeName: collegeName.trim(),
          domain,
          tenure,
          joiningDate: new Date()
        })
      });

      const data = await response.json();
      setLoading(false);

      if (data.success) {
        sessionStorage.setItem("redirectAfterSuccess", "groups");
        sessionStorage.setItem("reg_employeeId", data.employeeId || "");
        sessionStorage.setItem("reg_password", data.password || "");
        router.push("/success");
      } else if (data.already) {
        setAlreadyRegistered(true);
        setAlreadyEmployeeId(data.employeeId || '');
      } else {
        setErrorMsg(data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setLoading(false);
      setErrorMsg('A connection or server error occurred. Please try again.');
    }
  };

  const domains = [
    'DevOps with AWS',
    'Python Development',
    'Java Development',
    'Web Development',
    'MERN Stack Development',
    'Artificial Intelligence',
    'Data Science',
    'Cyber Security',
    'Software Engineering',
    'Flutter Development',
    'HR Management',
    'Venture Capital',
    'Vibe Coding',
    'Space Research',
    'Business Analyst'
  ];

  const durations = [
    '45 Days',
    '1 Month',
    '3 Months',
    '6 Months'
  ];

  return (
    <div className="min-h-screen w-full bg-[#FBF7EE] text-[#1E1A17] font-sans flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      
      {/* Background Orbs */}
      <div className="absolute -bottom-40 -right-40 w-[450px] h-[450px] bg-gradient-to-br from-[#CB5534]/5 to-transparent rounded-full filter blur-[120px] pointer-events-none z-0" />
      <div className="absolute -top-40 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-[#CB5534]/5 to-transparent rounded-full filter blur-[100px] pointer-events-none z-0" />

      {/* Grid Layout Wrap */}
      <div className="relative z-10 w-full max-w-5xl bg-white/95 backdrop-blur-md border border-[#E2D9CD] rounded-3xl shadow-[0_24px_64px_-16px_rgba(30,26,23,0.06),_0_0_0_1px_rgba(226,217,205,0.3)] overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-[fadeUp_0.5s_ease_both]">
        
        {/* Left Panel: Branding & Benefits */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-b from-[#FDFCF7] via-[#F5EFEB]/50 to-[#FDFCF7] p-10 flex-col justify-between relative border-r border-[#E2D9CD]">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
          
          <div className="space-y-12">
            {/* Top Brand logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#CB5534]/6 border border-[#CB5534]/20 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-lg font-bold text-[#CB5534]">∞</span>
              </div>
              <div>
                <div className="text-xs font-black tracking-[0.2em] text-[#CB5534] uppercase font-display">TEN</div>
                <div className="text-[9px] tracking-wider text-[#5C524C] uppercase font-bold">The Entrepreneurship Network</div>
              </div>
            </div>

            {/* Hero Heading */}
            <div className="space-y-4">
              <h1 className="text-3xl font-black text-[#1E1A17] leading-tight font-display tracking-tight">
                Build Your <span className="text-[#CB5534]">Professional</span> Career
              </h1>
              <p className="text-[#5C524C] text-xs leading-relaxed font-semibold">
                Join TEN&apos;s internship platform to gain real-world experience, build projects, and collaborate with domain coordinators.
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[#1E1A17] text-xs font-bold">
                <div className="w-8 h-8 bg-white border border-[#E2D9CD] rounded-lg flex items-center justify-center text-[#CB5534] shadow-sm">
                  <BarChart2 className="w-4 h-4" />
                </div>
                Real Industry Projects
              </div>
              <div className="flex items-center gap-3 text-[#1E1A17] text-xs font-bold">
                <div className="w-8 h-8 bg-white border border-[#E2D9CD] rounded-lg flex items-center justify-center text-[#CB5534] shadow-sm">
                  <TrendingUp className="w-4 h-4" />
                </div>
                Live Performance Tracking
              </div>
              <div className="flex items-center gap-3 text-[#1E1A17] text-xs font-bold">
                <div className="w-8 h-8 bg-white border border-[#E2D9CD] rounded-lg flex items-center justify-center text-[#CB5534] shadow-sm">
                  <GraduationCap className="w-4 h-4" />
                </div>
                Internship Certificate
              </div>
              <div className="flex items-center gap-3 text-[#1E1A17] text-xs font-bold">
                <div className="w-8 h-8 bg-white border border-[#E2D9CD] rounded-lg flex items-center justify-center text-[#CB5534] shadow-sm">
                  <Brain className="w-4 h-4" />
                </div>
                Professional Mentorship
              </div>
            </div>
          </div>

          <div className="text-[10px] text-[#8E8279] font-bold">
            &copy; 2026 TEN &mdash; Internship Management System
          </div>
        </div>

        {/* Right Panel: Form */}
        <div className="md:col-span-7 p-6 sm:p-10 space-y-6 max-h-[90vh] overflow-y-auto">
          
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-[#1E1A17] font-display tracking-tight">Intern Registration</h2>
            <p className="text-xs text-[#5C524C] font-medium">
              Create your credentials to access the TEN internship platform.
            </p>
          </div>

          {!alreadyRegistered ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1">
                    <User className="w-3 h-3 text-[#CB5534]" /> First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    required
                    className="w-full px-4 py-2.5 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1">
                    <User className="w-3 h-3 text-[#CB5534]" /> Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    required
                    className="w-full px-4 py-2.5 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#CB5534]" /> Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-2.5 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 transition-all font-mono"
                />
              </div>

              {/* Whatsapp */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1">
                  <PhoneCall className="w-3 h-3 text-[#CB5534]" /> WhatsApp Number
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="e.g. +91 99999 99999"
                  required
                  className="w-full px-4 py-2.5 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 transition-all font-mono"
                />
              </div>

              {/* College */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-[#CB5534]" /> College / University Name
                </label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="Enter your college or university"
                  required
                  className="w-full px-4 py-2.5 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] placeholder-[#8E8279]/50 focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 transition-all"
                />
              </div>

              {/* Domain and Tenure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#CB5534]" /> Domain
                  </label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 transition-all"
                  >
                    <option value="" className="text-[#8E8279]">Select Domain</option>
                    {domains.map((dom) => (
                      <option key={dom} value={dom} className="text-[#1E1A17] bg-[#FDFCF7]">{dom}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-[#5C524C] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#CB5534]" /> Duration
                  </label>
                  <select
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] focus:outline-none focus:border-[#CB5534] focus:ring-2 focus:ring-[#CB5534]/10 transition-all"
                  >
                    <option value="" className="text-[#8E8279]">Select Duration</option>
                    {durations.map((dur) => (
                      <option key={dur} value={dur} className="text-[#1E1A17] bg-[#FDFCF7]">{dur}</option>
                    ))}
                  </select>
                </div>
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
                className="w-full py-3.5 bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all hover:scale-[1.01] active:scale-95 shadow-[0_4px_16px_rgba(203,85,52,0.15)] flex items-center justify-center gap-2 cursor-pointer mt-2 border-none"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>Register Now <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          ) : (
            /* Already Registered box state */
            <div className="bg-[#FDFCF7] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm animate-[fadeUp_0.4s_ease]">
              <div className="w-12 h-12 bg-amber-100 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[#1E1A17] font-display">Already Registered</h2>
              <p className="text-[#5C524C] text-xs sm:text-sm max-w-sm mx-auto leading-relaxed font-semibold">
                You are already registered in the TEN Internship Portal with the following credentials.
              </p>
              
              <div className="py-2.5 px-4 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-sm font-mono text-[#CB5534] font-bold inline-block select-all max-w-full truncate">
                Employee ID: {alreadyEmployeeId}
              </div>
              
              <div className="pt-2">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full py-3.5 bg-[#CB5534] hover:bg-[#B24629] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-[0_4px_16px_rgba(203,85,52,0.15)]"
                >
                  Go to Login <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Quick shortcuts */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <button
              onClick={() => router.push('/login')}
              className="py-2.5 border border-[#E2D9CD] hover:border-[#CB5534] bg-white rounded-xl text-[10px] font-bold uppercase tracking-wider text-[#5C524C] hover:text-[#CB5534] hover:bg-[#CB5534]/4 transition-all cursor-pointer"
            >
              Student Login
            </button>
            <button
              onClick={() => router.push('/coordinator-login')}
              className="py-2.5 border border-[#E2D9CD] hover:border-[#CB5534] bg-white rounded-xl text-[10px] font-bold uppercase tracking-wider text-[#5C524C] hover:text-[#CB5534] hover:bg-[#CB5534]/4 transition-all cursor-pointer"
            >
              Coordinator
            </button>
            <a
              href="/"
              className="py-2.5 border border-[#E2D9CD] hover:border-[#CB5534] bg-white rounded-xl text-[10px] font-bold uppercase tracking-wider text-[#5C524C] hover:text-[#CB5534] hover:bg-[#CB5534]/4 transition-all flex items-center justify-center"
            >
              Home
            </a>
          </div>

          <div className="text-center text-[10px] text-[#8E8279] font-medium md:hidden">
            &copy; 2026 TEN &mdash; Internship Management System
          </div>
        </div>

      </div>

    </div>
  );
}
