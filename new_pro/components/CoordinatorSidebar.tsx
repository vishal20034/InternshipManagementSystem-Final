"use client";

import { BarChart3, BookOpenCheck, ClipboardList, Code2, FileCheck2, Megaphone, Moon, Star, Sun, Trophy, UsersRound } from "lucide-react";

const iconClass = "h-4 w-4 shrink-0";

export default function CoordinatorSidebar() {
  const switchTab = (tabName: string) => {
    if (typeof window !== "undefined" && (window as any).openCoordModal) (window as any).openCoordModal(tabName);
  };

  const toggleTheme = () => {
    if (typeof window !== "undefined" && (window as any).toggleTheme) (window as any).toggleTheme();
  };

  const nav = [
    { tab: "submissions", label: "Submissions", icon: FileCheck2, active: true },
    { tab: "attendance", label: "Attendance", icon: UsersRound },
    { tab: "overview", label: "Student Overview", icon: BarChart3 },
    { tab: "notice", label: "Notice Board", icon: Megaphone },
    { tab: "test", label: "Test Manager", icon: ClipboardList },
    { tab: "coding", label: "Coding Problems", icon: Code2 },
    { tab: "tasks", label: "Task Manager", icon: ClipboardList },
    { tab: "leaderboard", label: "Leaderboard", icon: Trophy },
    { tab: "lbperf", label: "Performance Ranking", icon: Star },
    { tab: "guidelines", label: "Intern Guidelines", icon: BookOpenCheck },
  ];

  return (
    <nav className="coord-sidebar">
      <div className="coord-sidebar-logo">
        <div className="coord-sidebar-brand">
          <div className="coord-sidebar-icon">
            <img src="/ten-logo.png" alt="TEN Logo" className="block h-[42px] w-[42px] object-contain" />
          </div>
          <div className="coord-sidebar-title">TEN <span>Coordinator</span></div>
        </div>
      </div>
      <div className="coord-nav">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.tab} className={`coord-nav-btn ${item.active ? "active" : ""}`} data-tab={item.tab} onClick={() => switchTab(item.tab)}>
              <Icon className={iconClass} /> {item.label}
            </button>
          );
        })}
      </div>
      <div className="border-t border-[#D4AF37]/10 px-4 py-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">Theme</div>
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4" />
          <label className="theme-switch">
            <input type="checkbox" id="themeToggle" onChange={toggleTheme} />
            <span className="theme-slider" />
          </label>
          <Sun className="h-4 w-4" />
        </div>
      </div>
    </nav>
  );
}
