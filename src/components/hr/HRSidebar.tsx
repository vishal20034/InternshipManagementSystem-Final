import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Zap, 
  History,
  Settings, 
  LogOut,
  Send
} from 'lucide-react';
import { clsx } from 'clsx';

interface HRSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSwitchToStudent: () => void;
}

const HRSidebar: React.FC<HRSidebarProps> = ({ activeTab, setActiveTab, onSwitchToStudent }) => {
  const menuItems = [
    { id: 'hr-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'interns', label: 'Interns', icon: Users },
    { id: 'send-documents', label: 'Send Documents', icon: Send },
    { id: 'document-history', label: 'Document History', icon: History },
    { id: 'automation', label: 'Automation Rules', icon: Zap },
    { id: 'hr-settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen bg-slate-900 flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            HR
          </div>
          <span className="font-bold text-xl text-white">TEN Portal</span>
        </div>
        <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">HR Management</span>

        <nav className="mt-8 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={clsx(
                "w-5 h-5",
                activeTab === item.id ? "text-emerald-400" : "text-slate-500 group-hover:text-white"
              )} />
              <span className="font-medium">{item.label}</span>
              {item.id === 'document-history' && (
                <span className="ml-auto bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  New
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-2 border-t border-slate-800">
        <button 
          onClick={onSwitchToStudent}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all duration-200"
        >
          <FileText className="w-5 h-5" />
          <span className="font-medium">Student Portal</span>
        </button>
        <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default HRSidebar;
