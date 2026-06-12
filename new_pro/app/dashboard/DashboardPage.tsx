"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Inter, Playfair_Display } from 'next/font/google';
import {
  ShieldCheck,
  Loader2,
  Trash2,
  Edit,
  Search,
  Users,
  Lock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus
} from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
});

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  domain: string;
  email: string;
  whatsapp: string;
  joiningDate: string;
  tenure: string;
  createdAt: string;
  updatedAt?: string;
}

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'confirm';
  title: string;
  text: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function DashboardPage() {
  const router = useRouter();

  // Security Gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState('');

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Modal alerts
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info' as any,
    title: '',
    text: '',
  });

  useEffect(() => {
    // Check session login
    const loginTime = sessionStorage.getItem("dashboardLogin");
    if (loginTime) {
      const currentTime = new Date().getTime();
      if (currentTime - parseInt(loginTime) < 10 * 60 * 1000) {
        setIsAuthenticated(true);
        loadStudents();
        return;
      }
    }
    // Otherwise force auth gate
    setIsAuthenticated(false);
  }, []);

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGateError('');
    if (gatePassword === "SecurePortal@786") {
      sessionStorage.setItem("dashboardLogin", String(new Date().getTime()));
      setIsAuthenticated(true);
      loadStudents();
    } else {
      setGateError('Incorrect access password. Please try again.');
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch("/students", {
        headers: {
          Authorization: "Bearer mysecret123"
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      } else {
        showAlert('error', 'Fetch Failed', 'Failed to retrieve students database records.');
      }
    } catch (err) {
      showAlert('error', 'Network Error', 'Could not establish connection to the data API.');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type: 'success' | 'error' | 'confirm', title: string, text: string, onConfirm?: () => void, onCancel?: () => void) => {
    setAlert({ isOpen: true, type, title, text, onConfirm, onCancel });
  };

  const closeAlert = () => {
    setAlert((prev) => ({ ...prev, isOpen: false }));
  };

  // Checkbox toggle
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s._id)));
    }
  };

  // Delete handlers
  const handleDeleteSingle = (id: string, name: string) => {
    showAlert('confirm', 'Confirm Deletion', `Are you sure you want to delete student ${name}?`, async () => {
      closeAlert();
      setLoading(true);
      try {
        const r = await fetch(`/students/${id}`, { method: "DELETE" });
        if (r.ok) {
          setStudents((prev) => prev.filter((s) => s._id !== id));
          setSelectedIds((prev) => {
            const copy = new Set(prev);
            copy.delete(id);
            return copy;
          });
          showAlert('success', 'Student Deleted', 'The student record has been removed.');
        } else {
          showAlert('error', 'Deletion Failed', 'Failed to complete record deletion.');
        }
      } catch (err) {
        showAlert('error', 'Error', 'Failed to communicate deletion request.');
      } finally {
        setLoading(false);
      }
    }, () => closeAlert());
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      showAlert('error', 'No Selection', 'Please select at least one student checkbox first.');
      return;
    }

    showAlert('confirm', 'Delete Selected', `Are you sure you want to delete ${selectedIds.size} selected student(s)?`, async () => {
      closeAlert();
      setLoading(true);
      try {
        const idsArray = Array.from(selectedIds);
        for (const id of idsArray) {
          await fetch(`/students/${id}`, { method: "DELETE" });
        }
        setStudents((prev) => prev.filter((s) => !selectedIds.has(s._id)));
        setSelectedIds(new Set());
        showAlert('success', 'Batch Deletion Complete', 'Selected student records have been successfully purged.');
      } catch (err) {
        showAlert('error', 'Error', 'Something went wrong during batch deletion.');
      } finally {
        setLoading(false);
      }
    }, () => closeAlert());
  };

  // Filter students based on search query
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.employeeId.toLowerCase().includes(q) ||
      s.domain.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  // Render Auth Gate overlay if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={`${inter.variable} ${playfair.variable} min-h-screen w-full bg-[#FBF7EE] text-[#1E1A17] font-sans flex items-center justify-center p-6 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(203,85,52,0.02)_0%,transparent_70%)] pointer-events-none z-0" />
        <div className="w-full max-w-sm relative z-10 bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#CB5534] to-transparent rounded-t-2xl" />
          
          <div className="space-y-2">
            <div className="w-12 h-12 bg-[#FDFCF7] border-[#E2D9CD] rounded-xl border border-[#E2D9CD] flex items-center justify-center mx-auto text-[#CB5534]">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[#1E1A17] font-serif">Security Gateway</h2>
            <p className="text-xs text-[#5C524C] leading-relaxed max-w-xs mx-auto">
              This panel is restricted. Provide the administrative authorization password.
            </p>
          </div>

          <form onSubmit={handleGateSubmit} className="space-y-4">
            <input
              type="password"
              value={gatePassword}
              onChange={(e) => setGatePassword(e.target.value)}
              placeholder="Enter gate password"
              required
              className="w-full px-4 py-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] rounded-xl text-xs text-center text-[#1E1A17] placeholder-zinc-700 focus:outline-none focus:border-[#CB5534]/50 focus:ring-1 focus:ring-[#CB5534]/25"
            />

            {gateError && (
              <div className="text-[11px] text-rose-600 font-medium">{gateError}</div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#CB5534] hover:bg-[#B24629] text-white font-semibold text-xs rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-[#CB5534]/15 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Access Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <button
            onClick={() => router.push('/')}
            className="text-[#8E8279] hover:text-[#1E1A17] text-xs font-semibold block mx-auto underline transition-colors"
          >
            Cancel and Return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${inter.variable} ${playfair.variable} min-h-screen bg-[#FBF7EE] text-[#1E1A17] font-sans p-6 sm:p-10 relative overflow-hidden selection:bg-[#CB5534]/30 selection:text-[#CB5534]`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(203,85,52,0.015)_0%,transparent_70%)] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* Header Block */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 flex justify-between items-center flex-wrap gap-4 shadow-xl">
          <div className="space-y-1">
            <span className="text-xs font-extrabold tracking-widest text-[#CB5534] uppercase font-mono">Operations Hub</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1A17] tracking-tight font-serif flex items-center gap-2">
              <Users className="w-7 h-7 text-[#CB5534]" /> Internship Dashboard
            </h1>
          </div>
          
          <button
            onClick={() => {
              sessionStorage.removeItem("dashboardLogin");
              setIsAuthenticated(false);
            }}
            className="px-4 py-2 border border-[#E2D9CD] hover:border-rose-200 hover:bg-rose-500/5 hover:text-rose-600 rounded-xl text-xs font-semibold text-[#1E1A17] transition-all cursor-pointer"
          >
            Lock Dashboard
          </button>
        </div>

        {/* Info Metric banner */}
        <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-xl p-5 shadow-md flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#CB5534]/5 border border-[#CB5534]/20 rounded-lg flex items-center justify-center text-[#CB5534]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold tracking-wider text-[#8E8279]">Database Count</div>
              <div className="text-lg font-bold text-[#1E1A17]">Registered Students: {students.length}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 border border-rose-200 hover:border-rose-500 text-rose-600 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.size})
            </button>
          </div>
        </div>

        {/* Filter Input panel */}
        <div className="bg-white/90 border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-4 flex gap-4 items-center">
          <Search className="w-5 h-5 text-[#8E8279] shrink-0 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, employee ID, domain, email..."
            className="flex-1 bg-transparent border-none text-sm text-[#1E1A17] focus:outline-none placeholder-zinc-700 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#8E8279] hover:text-white text-xs font-bold px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Grid cards listing */}
        {loading && students.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#CB5534]" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl py-16 text-center space-y-2">
            <Users className="w-10 h-10 text-[#8E8279] mx-auto" />
            <h3 className="text-lg font-bold text-[#1E1A17] font-serif">No Students Found</h3>
            <p className="text-[#8E8279] text-xs max-w-xs mx-auto">
              No registered students match your search criteria. Update the query and check again.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((s) => {
              const isChecked = selectedIds.has(s._id);
              const fullName = `${s.firstName} ${s.lastName}`;
              return (
                <div
                  key={s._id}
                  className={`bg-white border-[#E2D9CD] backdrop-blur-md border rounded-2xl p-5 shadow-lg space-y-4 hover:scale-[1.01] transition-all duration-300 relative ${
                    isChecked ? 'border-[#CB5534] bg-[#CB5534]/5' : 'border-[#E2D9CD]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(s._id)}
                        className="w-4 h-4 rounded border-[#E2D9CD] bg-[#FDFCF7] border-[#E2D9CD] checked:bg-[#CB5534] accent-[#CB5534] transition-all shrink-0 cursor-pointer"
                      />
                      <h3 className="text-lg font-bold text-[#1E1A17] tracking-tight">{fullName}</h3>
                    </div>

                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/20 uppercase tracking-wider">
                      {s.tenure}
                    </span>
                  </div>

                  <div className="space-y-2 font-mono text-[11px] text-[#5C524C]">
                    <div className="flex justify-between gap-2 border-b border-[#E2D9CD]/50 pb-1">
                      <span className="text-[#8E8279] font-bold uppercase">Emp ID</span>
                      <span className="text-[#1E1A17] font-bold">{s.employeeId}</span>
                    </div>
                    
                    <div className="flex justify-between gap-2 border-b border-[#E2D9CD]/50 pb-1">
                      <span className="text-[#8E8279] font-bold uppercase">Domain</span>
                      <span className="text-[#1E1A17] font-semibold text-right max-w-[180px] truncate">{s.domain}</span>
                    </div>
                    
                    <div className="flex justify-between gap-2 border-b border-[#E2D9CD]/50 pb-1">
                      <span className="text-[#8E8279] font-bold uppercase">Email</span>
                      <span className="text-[#1E1A17] text-right truncate max-w-[180px] select-all">{s.email}</span>
                    </div>
                    
                    <div className="flex justify-between gap-2 border-b border-[#E2D9CD]/50 pb-1">
                      <span className="text-[#8E8279] font-bold uppercase">Whatsapp</span>
                      <span className="text-[#1E1A17] text-right select-all">{s.whatsapp}</span>
                    </div>

                    <div className="flex justify-between gap-2 border-b border-[#E2D9CD]/50 pb-1">
                      <span className="text-[#8E8279] font-bold uppercase">Joining Date</span>
                      <span className="text-[#1E1A17] text-right">
                        {s.joiningDate ? new Date(s.joiningDate).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between gap-2">
                      <span className="text-[#8E8279] font-bold uppercase">Last Sync</span>
                      <span className="text-[#5C524C] text-right">
                        {new Date(s.updatedAt || s.createdAt).toLocaleString('en-IN', { hour12: true, dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 pt-2 border-t border-[#E2D9CD]/50">
                    <button
                      onClick={() => router.push(`/edit?id=${s._id}`)}
                      className="flex-1 py-2 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/30 hover:bg-[#CB5534]/5 hover:text-[#CB5534] rounded-xl text-xs font-semibold text-[#1E1A17] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(s._id, fullName)}
                      className="flex-1 py-2 bg-rose-500/5 border border-rose-500/10 hover:border-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-semibold text-rose-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Alert dialog overlays */}
      {alert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1A17]/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 shadow-2xl space-y-4 animate-[scaleIn_0.2s_cubic-bezier(0.34,1.56,0.64,1)]">
            <div className="flex items-center gap-3">
              {alert.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
              {alert.type === 'error' && <XCircle className="w-6 h-6 text-rose-600 shrink-0" />}
              {alert.type === 'confirm' && <AlertTriangle className="w-6 h-6 text-[#CB5534] shrink-0 animate-pulse" />}
              
              <h4 className="text-base font-bold text-[#1E1A17]">{alert.title}</h4>
            </div>

            <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed pr-1">{alert.text}</p>

            <div className="flex justify-end gap-2 pt-2">
              {alert.type === 'confirm' && alert.onCancel && (
                <button
                  onClick={alert.onCancel}
                  className="px-4 py-2 border border-[#E2D9CD] hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-xl text-xs font-semibold text-[#5C524C] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (alert.onConfirm) alert.onConfirm();
                  else closeAlert();
                }}
                className="px-4 py-2 bg-[#CB5534] hover:bg-[#B24629] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                {alert.type === 'confirm' ? 'Confirm' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
