"use client";

import { Award, BarChart3, Bell, Bot, Building2, ClipboardList, FileText, GraduationCap, LayoutDashboard, LogOut, Megaphone, Moon, Rocket, Sun, Timer, Trophy, UsersRound } from "lucide-react";

const iconClass = "h-4 w-4 shrink-0";

export default function HRSidebar() {
  const showView = (viewName: string) => {
    if (typeof window !== "undefined" && (window as any).showView) (window as any).showView(viewName);
  };

  const toggleTheme = () => {
    if (typeof window !== "undefined" && (window as any).toggleTheme) (window as any).toggleTheme();
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined" && (window as any).doLogout) (window as any).doLogout();
  };

  const nav = [
    { section: "Overview", items: [
      { view: "overview", label: "Dashboard", icon: LayoutDashboard, active: true },
      { view: "insights", label: "Insights", icon: BarChart3 },
    ] },
    { section: "People", items: [
      { view: "students", label: "All Students", icon: GraduationCap },
      { view: "tracker", label: "Internship Tracker", icon: Timer },
      { view: "submissions", label: "Submissions", icon: ClipboardList },
      { view: "domains", label: "Domain Analytics", icon: Building2 },
      { view: "attendance-monitor", label: "Attendance Monitor", icon: UsersRound },
    ] },
    { section: "Certificates", items: [{ view: "certificates", label: "Certificate Approvals", icon: Award }] },
    { section: "Promotions", items: [{ view: "promotions", label: "Promotions", icon: Rocket }] },
    { section: "Leaderboard", items: [{ view: "leaderboard", label: "Performance Leaderboard", icon: Trophy }] },
    { section: "Documents", items: [{ view: "documents", label: "Generate Documents", icon: FileText }] },
    { section: "Communications", items: [
      { view: "send-notif", label: "Send Notification", icon: Megaphone },
      { view: "notif-history", label: "Notification History", icon: Bell },
    ] },
  ];

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-badge-sm">
          <div className="logo-icon">
            <img src="/ten-logo.png" alt="TEN Logo" className="block h-[42px] w-[42px] object-contain drop-shadow-[0_0_6px_rgba(212,175,55,0.4)]" />
          </div>
          <div>
            <div className="logo-txt"><span>TEN</span> Portal</div>
            <div className="logo-role">HR Management</div>
          </div>
        </div>
      </div>

      <div className="sidebar-nav">
        {nav.map((group) => (
          <div key={group.section}>
            <div className="nav-section-title">{group.section}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.view} className={`nav-btn ${item.active ? "active" : ""}`} onClick={() => showView(item.view)} data-view={item.view}>
                  <Icon className={iconClass} /> {item.label}
                </button>
              );
            })}
            <div className="nav-divider" />
          </div>
        ))}
        <button className="nav-btn" onClick={() => { if (typeof window !== "undefined" && (window as any).showAIQueries) (window as any).showAIQueries(); }}>
          <Bot className={iconClass} /> AI Queries
        </button>
      </div>

      <div className="sidebar-bottom">
        <div className="mb-3 border-t border-[#D4AF37]/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <label className="theme-switch">
              <input type="checkbox" id="themeToggle" onChange={toggleTheme} />
              <span className="theme-slider" />
            </label>
            <Sun className="h-4 w-4" />
          </div>
        </div>
        <div className="hr-user-info">
          <div className="hr-avatar" id="hrAvatar">H</div>
          <div>
            <div className="hr-name" id="hrNameDisplay">HR Admin</div>
            <div className="hr-sub">HR Department</div>
          </div>
        </div>
        <button className="logout-btn-sidebar" onClick={handleSignOut}>
          <LogOut className={iconClass} /> Sign Out
        </button>
      </div>
    </nav>
  );
}
