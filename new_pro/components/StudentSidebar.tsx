"use client";

import { Award, Bell, BookOpenCheck, Code2, CreditCard, FileCheck2, FileText, LayoutDashboard, LogOut, MessageCircle, Moon, ReceiptText, ScrollText, Sun, Trophy, UsersRound } from "lucide-react";

const iconClass = "h-4 w-4 shrink-0";

export default function StudentSidebar() {
  const switchView = (viewName: string) => {
    if (typeof window !== "undefined" && (window as any).switchStudentView) (window as any).switchStudentView(viewName);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined" && (window as any).tenLogout) (window as any).tenLogout();
  };

  const toggleTheme = () => {
    if (typeof window !== "undefined" && (window as any).toggleTheme) (window as any).toggleTheme();
  };

  const nav = [
    { label: "Overview", view: "stu-view-overview", icon: LayoutDashboard, active: true },
    { label: "Announcements", view: "stu-view-notice", icon: Bell },
    { label: "My Tasks", view: "stu-view-domain-tasks", icon: FileCheck2 },
    { label: "Coding Problems", view: "stu-view-coding", icon: Code2 },
    { label: "Submissions", view: "stu-view-submissions", icon: ReceiptText },
    { label: "Attendance", view: "stu-view-attendance", icon: UsersRound },
    { label: "Take Test", view: "stu-view-test", icon: ScrollText },
    { label: "Guidelines", view: "stu-view-guidelines", icon: BookOpenCheck },
    { label: "Leaderboard & Badges", view: "stu-view-leaderboard", icon: Trophy },
  ];

  return (
    <div className="stu-sidebar">
      <div className="stu-sidebar-brand">
        <div className="stu-sidebar-brand-icon">
          <img src="/ten-logo.png" alt="TEN Logo" className="block h-[42px] w-[42px] object-contain drop-shadow-[0_0_6px_rgba(212,175,55,0.4)]" />
        </div>
        <div className="stu-sidebar-brand-text">
          <span className="brand-name">TEN</span>
          <span className="brand-sub">Student Portal</span>
        </div>
      </div>

      <nav className="stu-sidebar-nav">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} className={`stu-nav-btn ${item.active ? "active" : ""}`} data-view={item.view} onClick={() => switchView(item.view)}>
              <Icon className={iconClass} /> {item.label}
            </button>
          );
        })}

        <button className="stu-nav-btn border border-[#D4AF37]/20 bg-[#D4AF37]/10" onClick={() => { window.location.href = "/v2-tasks"; }}>
          <Trophy className={iconClass} /> Task Journey <span className="ml-1 rounded bg-[#D4AF37]/20 px-1.5 py-0.5 text-[10px] font-extrabold text-[#D4AF37]">NEW</span>
        </button>
        <button className="stu-nav-btn border border-amber-500/20 bg-amber-500/10" onClick={() => { window.location.href = "/my-documents"; }}>
          <FileText className={iconClass} /> My Documents <span className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-400">NEW</span>
        </button>
        <a className="stu-nav-btn flex items-center gap-2 border border-indigo-400/25 bg-indigo-400/10 no-underline" href="https://discord.gg/GYnZFbDE7" target="_blank" rel="noopener noreferrer">
          <MessageCircle className={iconClass} /> Discord Community
        </a>
        <button className="stu-nav-btn border border-violet-400/20 bg-violet-400/10" onClick={() => { window.location.href = "/my-certificates"; }}>
          <Award className={iconClass} /> My Certificates <span className="ml-1 rounded bg-violet-400/20 px-1.5 py-0.5 text-[10px] font-extrabold text-violet-300">NEW</span>
        </button>
        <button className="stu-nav-btn border border-emerald-400/20 bg-emerald-400/10" onClick={() => { window.location.href = "/payment"; }}>
          <CreditCard className={iconClass} /> Make Payment <span className="ml-1 rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-400">NEW</span>
        </button>
        <button className="stu-nav-btn mt-2 border border-rose-400/20 bg-rose-400/10" onClick={handleLogout}>
          <LogOut className={iconClass} /> Logout
        </button>
      </nav>

      <div className="theme-toggle-wrap border-t border-[#D4AF37]/10 px-5 py-3">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#6a7a94]">Theme</span>
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4" />
          <label className="theme-switch">
            <input type="checkbox" id="themeToggle" onChange={toggleTheme} />
            <span className="theme-slider" />
          </label>
          <Sun className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
