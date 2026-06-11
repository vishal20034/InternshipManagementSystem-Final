import React from 'react';
import { Bell, Search, Shield } from 'lucide-react';
import { HRUser } from '../../types';

interface HRNavbarProps {
  user: HRUser;
}

const HRNavbar: React.FC<HRNavbarProps> = ({ user }) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 fixed top-0 right-0 left-64 z-10 px-8 flex items-center justify-between">
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input 
          type="text" 
          placeholder="Search interns, documents..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400 uppercase">{user.role}</span>
        </div>
        
        <button className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-slate-900 rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 pl-6 border-l border-slate-700">
          <div className="text-right">
            <p className="text-sm font-bold text-white leading-none">{user.name}</p>
            <p className="text-xs text-slate-500 mt-1">{user.email}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HRNavbar;
