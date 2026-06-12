"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Server,
  Cloud,
  Terminal as TerminalIcon,
  Coffee,
  Globe,
  Database,
  Cpu,
  BarChart,
  Lock,
  Code,
  Smartphone,
  Info,
  Mail
} from 'lucide-react';

interface GroupItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
  link: string;
}

export default function GroupsPage() {
  const router = useRouter();

  useEffect(() => {
    const employeeId = localStorage.getItem("employeeId");
    if (!employeeId) {
      router.push('/login');
    }
  }, [router]);

  const groups: GroupItem[] = [
    {
      icon: <Server className="w-8 h-8 text-[#CB5534]" />,
      title: "DevOps with AWS",
      desc: "CI/CD pipelines, Docker, Kubernetes, Jenkins, AWS Cloud & Automation workflows",
      link: "https://chat.whatsapp.com/LStta1GmBoVFNuLRNgqZzm?mode=gi_t"
    },
    {
      icon: <Cloud className="w-8 h-8 text-[#CB5534]" />,
      title: "Cloud Computing",
      desc: "Cloud infrastructure, virtualization, cloud deployment strategies & architecture",
      link: "https://chat.whatsapp.com/IN8HO2ZfA23I1iXavgHXw2"
    },
    {
      icon: <TerminalIcon className="w-8 h-8 text-[#CB5534]" />,
      title: "Python Development",
      desc: "Python projects, REST APIs, automation scripts & backend development",
      link: "https://chat.whatsapp.com/C1JSKfIJgLlHAn8D5kZF6o?mode=gi_t"
    },
    {
      icon: <Coffee className="w-8 h-8 text-[#CB5534]" />,
      title: "Java Development",
      desc: "Java OOP, Spring Boot, enterprise development & JDBC database projects",
      link: "https://chat.whatsapp.com/FolvjabGnc0FHtokOtNOW0?mode=gi_t"
    },
    {
      icon: <Globe className="w-8 h-8 text-[#CB5534]" />,
      title: "Web Development",
      desc: "HTML, CSS, JavaScript, frontend frameworks & responsive web projects",
      link: "https://chat.whatsapp.com/F2aHmMsa2LF3wbPGKz6tK6?mode=gi_t"
    },
    {
      icon: <Database className="w-8 h-8 text-[#CB5534]" />,
      title: "MERN Stack",
      desc: "MongoDB, Express.js, React, Node.js — full-stack development from scratch",
      link: "https://chat.whatsapp.com/GCycOHFjjho3Z4SkCWSG4T?mode=gi_t"
    },
    {
      icon: <Cpu className="w-8 h-8 text-[#CB5534]" />,
      title: "Artificial Intelligence",
      desc: "AI tools, machine learning models, intelligent systems & AI chatbot development",
      link: "https://chat.whatsapp.com/HczXKUAqhKPIW6b6PNm9te"
    },
    {
      icon: <BarChart className="w-8 h-8 text-[#CB5534]" />,
      title: "Data Science",
      desc: "Data analysis, visualization, Pandas, ML models & exploratory data analysis",
      link: "https://chat.whatsapp.com/BoKiGA9hUH28Y0bdE1UGBO"
    },
    {
      icon: <Lock className="w-8 h-8 text-[#CB5534]" />,
      title: "Cyber Security",
      desc: "Security fundamentals, ethical hacking, network analysis & penetration testing",
      link: "https://chat.whatsapp.com/IN8HO2ZfA23I1iXavgHXw2"
    },
    {
      icon: <Code className="w-8 h-8 text-[#CB5534]" />,
      title: "Software Engineering",
      desc: "Software lifecycle, system architecture, UML, Agile sprints & test design",
      link: "https://chat.whatsapp.com/D5pz7BRbMC2Flwte5jzibw?mode=gi_t"
    },
    {
      icon: <Smartphone className="w-8 h-8 text-[#CB5534]" />,
      title: "Flutter Development",
      desc: "Cross-platform mobile apps, Firebase, state management & Dart programming",
      link: "https://chat.whatsapp.com/BoKiGA9hUH28Y0bdE1UGBO"
    },
    {
      icon: <Info className="w-8 h-8 text-[#CB5534]" />,
      title: "General Internship Group",
      desc: "If your domain is not listed above, join this common group for general updates",
      link: "https://chat.whatsapp.com/IN8HO2ZfA23I1iXavgHXw2"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#FBF7EE] text-[#1E1A17] font-sans p-6 sm:p-10 relative overflow-x-hidden selection:bg-[#CB5534]/30 selection:text-[#CB5534]">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.015)_0%,transparent_70%)] pointer-events-none z-0" />

      <div className="max-w-[1100px] mx-auto space-y-12 relative z-10 animate-fade-up">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#E2D9CD]/50 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FDFCF7] border-[#E2D9CD] border border-[#CB5534]/30 rounded-xl flex items-center justify-center shadow-lg shadow-[#CB5534]/5 shrink-0">
              <svg className="w-6 h-5" viewBox="0 0 28 24" fill="none">
                <path d="M3 9C3 6.79 4.79 5 7 5C9.21 5 11 6.79 11 9C11 11.21 9.21 13 7 13C4.79 13 3 11.21 3 9Z" stroke="#CB5534" strokeWidth="2" fill="none"/>
                <path d="M11 9C11 6.79 12.79 5 15 5C17.21 5 19 6.79 19 9C19 11.21 17.21 13 15 13C12.79 13 11 11.21 11 9Z" stroke="#CB5534" strokeWidth="2" fill="none"/>
                <path d="M5 23C5 19 7 16 9 16L10 19L8 23Z" fill="#CB5534" opacity="0.75"/>
                <path d="M23 23C23 19 21 16 19 16L18 19L20 23Z" fill="#CB5534" opacity="0.75"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold tracking-[3px] text-[#CB5534]">TEN</div>
              <div className="text-[10px] tracking-wider text-[#8E8279] uppercase mt-0.5">The Entrepreneurship Network</div>
            </div>
          </div>

          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 px-4 py-2 border border-[#E2D9CD] hover:border-[#CB5534]/30 hover:bg-[#CB5534]/5 rounded-xl text-xs font-semibold text-[#1E1A17] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 bg-[#CB5534]/10 border border-[#CB5534]/25 text-[#CB5534] rounded-full text-[10px] font-bold tracking-[1.5px] uppercase">
            ✦ Join Your Domain Group
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1E1A17] tracking-tight leading-tight font-serif">
            Welcome to <br />
            <span className="bg-gradient-to-r from-[#CB5534] to-[#CB5534] bg-clip-text text-transparent">TEN Internship Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed">
            Join your respective domain's WhatsApp group to receive internship updates, 
            daily tasks, meeting links, project assignments, and mentorship guidance.
          </p>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group, idx) => (
            <div
              key={idx}
              className="bg-white border-[#E2D9CD] backdrop-blur-md border border-[#E2D9CD] rounded-2xl p-6 flex flex-col justify-between hover:scale-[1.01] hover:border-[#CB5534]/35 transition-all duration-300 relative group"
            >
              {/* Subtle top border hover line */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#CB5534]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] rounded-xl flex items-center justify-center group-hover:bg-[#CB5534]/5 transition-colors">
                  {group.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-[#1E1A17] tracking-tight font-serif">{group.title}</h3>
                  <p className="text-xs text-[#5C524C] leading-relaxed min-h-[48px]">{group.desc}</p>
                </div>
              </div>

              <div className="pt-6">
                <a
                  href={group.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-200 hover:border-emerald-500 text-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/10"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Join Domain Group
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Important Notice */}
        <div className="bg-white border-[#E2D9CD] border border-[#CB5534]/30 rounded-2xl p-6 sm:p-8 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
          <div className="flex items-center gap-3">
            <span className="text-xl">📢</span>
            <h2 className="text-lg font-bold text-[#1E1A17] font-serif tracking-tight">Important Notice</h2>
            <span className="inline-block px-2.5 py-0.5 bg-[#CB5534]/10 border border-[#CB5534]/20 rounded-full text-[9px] font-bold text-[#CB5534] uppercase tracking-wider">
              Must Read
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed pr-1 max-w-4xl">
            Please join <strong>only your respective domain group</strong> to receive the correct 
            internship updates, meeting links, tasks, projects, certificates, and mentorship guidance. 
            Joining multiple groups may cause confusion in task tracking.
          </p>
          <div className="inline-flex items-center gap-2 pt-2 text-xs font-bold text-emerald-600">
            <Mail className="w-4 h-4 shrink-0" />
            For any queries, contact: hr@entrepreneurshipnetwork.net
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-[#8E8279] tracking-wider pt-6">
          <span className="text-[#CB5534] font-bold">TEN</span> &mdash; The Entrepreneurship Network &middot; Internship Portal &middot; &copy; 2026
        </div>
      </div>
    </div>
  );
}
