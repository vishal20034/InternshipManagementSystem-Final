"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import {
  Users,
  Briefcase,
  FileText,
  Mail,
  Bot,
  Trash2,
  Edit3,
  Search,
  Bell,
  RefreshCw,
  Plus,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Menu,
  ChevronRight,
  Send,
  Eye,
  EyeOff,
  UserCheck,
  Award
} from 'lucide-react';
import BotWidget from '../../components/BotWidget';

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  domain: string;
  email: string;
  whatsapp?: string;
  mobile?: string;
  phone?: string;
  joiningDate: string;
  tenure: string;
  collegeName?: string;
  college?: string;
  password?: string;
  certificateApprovedByHR?: boolean;
  certificateApprovedByCoordinator?: boolean;
}

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  text: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function HrPortalPage() {
  const router = useRouter();

  // Guard & auth
  const [loading, setLoading] = useState(true);
  const [hrUser, setHrUser] = useState<any>(null);

  // Nav
  const [activeTab, setActiveTab] = useState<'analytics' | 'roster' | 'documents' | 'bot' | 'notifications'>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Custom alert dialog
  const [alertDialog, setAlertDialog] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    text: ''
  });

  // DB States
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomainFilter, setSelectedDomainFilter] = useState("");
  
  // Student Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addStudentForm, setAddStudentForm] = useState({
    firstName: "",
    lastName: "",
    domain: "Web Development",
    email: "",
    whatsapp: "",
    joiningDate: new Date().toISOString().split("T")[0],
    tenure: "1 Month",
    collegeName: "",
    password: ""
  });
  const [passVisible, setPassVisible] = useState(false);

  // Docs Review States
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [generatingOffer, setGeneratingOffer] = useState(false);

  // Bot Q&A States
  const [botQueries, setBotQueries] = useState<any[]>([]);
  const [botFilterDomain, setBotFilterDomain] = useState("");
  const [botFilterStatus, setBotFilterStatus] = useState("");
  const [totalOpenQueries, setTotalOpenQueries] = useState(0);
  const [botAnswerOpen, setBotAnswerOpen] = useState(false);
  const [selectedBotQuery, setSelectedBotQuery] = useState<any>(null);
  const [botAnswerText, setBotAnswerText] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Notifications states
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState<"info" | "success" | "warning" | "urgent">("info");
  const [notifTarget, setNotifTarget] = useState("all");
  const [notifTargetStudentId, setNotifTargetStudentId] = useState("");
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [sendingNotif, setSendingNotif] = useState(false);

  // Analytics Stats
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });
  const [domainStats, setDomainStats] = useState<any[]>([]);

  // Chart Canvas refs
  const domainCanvasRef = useRef<HTMLCanvasElement>(null);
  const statusCanvasRef = useRef<HTMLCanvasElement>(null);
  const regCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartsRef = useRef<any[]>([]);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // Auth Gate check
  useEffect(() => {
    try {
      const hr = sessionStorage.getItem("hrUser");
      if (!hr) {
        router.push("/hr-login");
        return;
      }
      setHrUser(JSON.parse(hr));
      setLoading(false);
    } catch (_) {
      router.push("/hr-login");
    }
  }, []);

  // Refresh tab data
  useEffect(() => {
    if (hrUser) {
      loadTabValues(activeTab);
    }
  }, [hrUser, activeTab]);

  // Load active tab statistics & datasets
  const loadTabValues = (tab: typeof activeTab) => {
    if (tab === 'analytics') {
      loadAnalytics();
    }
    if (tab === 'roster') {
      loadRoster();
    }
    if (tab === 'documents') {
      loadPendingDocuments();
    }
    if (tab === 'bot') {
      loadBotQueries();
    }
    if (tab === 'notifications') {
      loadSentNotifications();
    }
  };

  const triggerAlert = (type: AlertState['type'], title: string, text: string, onConfirm?: () => void, onCancel?: () => void) => {
    setAlertDialog({ isOpen: true, type, title, text, onConfirm, onCancel });
  };

  const closeAlert = () => {
    setAlertDialog(prev => ({ ...prev, isOpen: false }));
  };

  // 1. Analytics & Charts
  const loadAnalytics = async () => {
    try {
      const r = await fetch("/students", {
        headers: { Authorization: "Bearer mysecret123" }
      });
      if (r.ok) {
        const list = await r.json();
        
        // Compute statistics
        const total = list.length;
        const approved = list.filter((s: any) => s.certificateApprovedByHR).length;
        const pending = list.filter((s: any) => s.certificateApprovedByCoordinator && !s.certificateApprovedByHR).length;
        const rejected = list.filter((s: any) => s.hrRejected).length;
        
        const statsObj = { total, approved, pending, rejected };
        setStats(statsObj);

        // Domain counters
        const dCounts: Record<string, number> = {};
        list.forEach((s: any) => {
          if (s.domain) dCounts[s.domain] = (dCounts[s.domain] || 0) + 1;
        });
        const dStats = Object.keys(dCounts).map(d => ({ domain: d, count: dCounts[d] }));
        setDomainStats(dStats);

        // Render charts once script is ready
        setTimeout(() => renderCharts(statsObj, dStats), 300);
      }
    } catch (_) {}
  };

  const renderCharts = (statsObj: any, dStats: any[]) => {
    const Chart = (window as any).Chart;
    if (!Chart || !dStats.length) return;

    // Destroy current charts
    chartsRef.current.forEach(c => c.destroy());
    chartsRef.current = [];

    Chart.defaults.color = '#a8a29e';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';

    const domainNames = dStats.map(d => d.domain.replace(' Development','').replace(' with AWS',''));
    const domainCounts = dStats.map(d => d.count);
    const goldPalette = ['#CB5534','#c9a227','#b8901f','#a87817','#986010','#874808','#763000','#651800','#540000','#430000'];

    if (domainCanvasRef.current) {
      const c1 = new Chart(domainCanvasRef.current, {
        type: 'doughnut',
        data: {
          labels: domainNames,
          datasets: [{ data: domainCounts, backgroundColor: goldPalette, borderColor: '#090d16', borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 10 }, padding: 8 } } } }
      });
      chartsRef.current.push(c1);
    }

    if (statusCanvasRef.current) {
      const c2 = new Chart(statusCanvasRef.current, {
        type: 'bar',
        data: {
          labels: ['Approved', 'Pending', 'Rejected'],
          datasets: [{ data: [statsObj.approved||0, statsObj.pending||0, statsObj.rejected||0], backgroundColor: ['rgba(16,185,129,0.7)','rgba(245,158,11,0.7)','rgba(244,63,94,0.7)'], borderColor: ['#10b981','#f59e0b','#f43f5e'], borderWidth: 1.5, borderRadius: 8 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }
      });
      chartsRef.current.push(c2);
    }

    if (regCanvasRef.current) {
      const c3 = new Chart(regCanvasRef.current, {
        type: 'bar',
        data: {
          labels: dStats.map(d => d.domain),
          datasets: [{ label: 'Students', data: domainCounts, backgroundColor: 'rgba(212,175,55,0.55)', borderColor: '#CB5534', borderWidth: 1.5, borderRadius: 6 }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } } }
      });
      chartsRef.current.push(c3);
    }
  };

  // 2. Roster Database Loader
  const loadRoster = async () => {
    try {
      const r = await fetch("/students", {
        headers: { Authorization: "Bearer mysecret123" }
      });
      if (r.ok) {
        const list = await r.json();
        setStudents(list || []);
      }
    } catch (_) {}
  };

  // Add student form submit
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/students/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addStudentForm)
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', 'Student Created', `Intern successfully onboarded under Employee ID: ${data.student?.employeeId}`);
        setAddModalOpen(false);
        setAddStudentForm({
          firstName: "",
          lastName: "",
          domain: "Web Development",
          email: "",
          whatsapp: "",
          joiningDate: new Date().toISOString().split("T")[0],
          tenure: "1 Month",
          collegeName: "",
          password: ""
        });
        loadRoster();
      } else {
        triggerAlert('error', 'Failed', data.message || 'Could not save student record.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Server connection failure.');
    }
  };

  // Delete student
  const handleDeleteStudent = (id: string, name: string) => {
    triggerAlert('confirm', 'Purge Student?', `Delete student ${name} entirely from the database? This is permanent.`, async () => {
      closeAlert();
      try {
        const res = await fetch(`/students/${id}`, { method: "DELETE" });
        if (res.ok) {
          triggerAlert('success', 'Deleted', 'Student record purged.');
          loadRoster();
        } else {
          triggerAlert('error', 'Failed', 'Could not delete student.');
        }
      } catch (_) {
        triggerAlert('error', 'Error', 'Connection failed.');
      }
    }, () => closeAlert());
  };

  // Edit student submit
  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      const response = await fetch(`/students/${selectedStudent._id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedStudent)
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', 'Profile Saved', 'Intern record updated successfully.');
        setEditModalOpen(false);
        setSelectedStudent(null);
        loadRoster();
      } else {
        triggerAlert('error', 'Failed', data.message || 'Could not update student.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Network error.');
    }
  };

  // 3. Pending documents review
  const loadPendingDocuments = async () => {
    try {
      const r = await fetch('/api/v2/admin/documents/pending');
      const d = await r.json();
      if (d.success) {
        setPendingDocs(d.documents || []);
      }
    } catch (_) {}
  };

  // Reject doc upload
  const handleRejectDoc = (studentId: string) => {
    const reason = prompt('Rejection reason (will be sent to student):', 'Documents do not meet requirements. Please re-upload clearer images.');
    if (reason === null) return;
    
    triggerAlert('confirm', 'Reject Proofs?', 'Notify student of document rejection and request re-upload?', async () => {
      closeAlert();
      try {
        const r = await fetch(`/api/v2/admin/documents/reject/${studentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rejectionReason: reason })
        });
        const d = await r.json();
        if (d.success) {
          triggerAlert('success', 'Rejected', 'Student has been requested to re-upload documents.');
          loadPendingDocuments();
        } else {
          triggerAlert('error', 'Failed', d.message || 'Could not reject proofs.');
        }
      } catch (_) {
        triggerAlert('error', 'Error', 'Network error.');
      }
    }, () => closeAlert());
  };

  // Generate offer letter (bulk or single)
  const handleGenerateOfferLetters = (ids: string[]) => {
    if (!ids.length) return;
    triggerAlert('confirm', 'Generate Offer Letters?', `Generate and email offer letters for ${ids.length} selected students? This will approve their files.`, async () => {
      closeAlert();
      setGeneratingOffer(true);
      try {
        const r = await fetch('/api/v2/admin/documents/generate-offer-letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds: ids })
        });
        const d = await r.json();
        if (d.success) {
          const succeeded = d.results.filter((x: any) => x.success).length;
          triggerAlert('success', 'Generated', `Successfully emailed ${succeeded} of ${ids.length} offer letter(s).`);
          setSelectedDocIds(new Set());
          loadPendingDocuments();
        } else {
          triggerAlert('error', 'Failed', d.message || 'Failed generating offer letters.');
        }
      } catch (_) {
        triggerAlert('error', 'Error', 'Server connection failure.');
      } finally {
        setGeneratingOffer(false);
      }
    }, () => closeAlert());
  };

  // 4. Bot queries
  const loadBotQueries = async () => {
    const params = new URLSearchParams();
    if (botFilterDomain) params.set('domain', botFilterDomain);
    if (botFilterStatus) params.set('status', botFilterStatus);
    
    try {
      const res = await fetch('/api/v2/bots/hr/queries?' + params);
      const data = await res.json();
      setBotQueries(data.queries || []);
      setTotalOpenQueries(data.totalOpen || 0);
    } catch (_) {}
  };

  // Submit Bot answer
  const handleSubmitBotAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBotQuery || !botAnswerText.trim()) return;
    setSubmittingAnswer(true);
    try {
      const hrName = hrUser?.name || hrUser?.username || "HR Team";
      const res = await fetch('/api/v2/bots/hr/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryId: selectedBotQuery._id,
          hrAnswer: botAnswerText,
          hrAnsweredBy: hrName
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', 'Answer Submitted', 'Answer successfully saved and synced to student bot.');
        setBotAnswerOpen(false);
        setSelectedBotQuery(null);
        setBotAnswerText("");
        loadBotQueries();
      } else {
        triggerAlert('error', 'Failed', data.error || 'Could not save bot answer.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Connection failed.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // 5. Notifications sender
  const loadSentNotifications = async () => {
    try {
      const r = await fetch('/notifications/all');
      if (r.ok) {
        const d = await r.json();
        setSentNotifications(d.notifications || []);
      }
    } catch (_) {}
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setSendingNotif(true);

    try {
      const payload = {
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        target: notifTarget,
        targetStudentId: notifTarget === 'individual' ? notifTargetStudentId : undefined,
        from: "HR Team"
      };

      const res = await fetch('/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', 'Broadcast Completed', 'Message successfully sent and socket broadcasted to active student tabs.');
        setNotifTitle("");
        setNotifMessage("");
        setNotifTarget("all");
        setNotifTargetStudentId("");
        loadSentNotifications();
      } else {
        triggerAlert('error', 'Broadcast Failed', data.message || 'Could not distribute notification.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Broadcaster connection failure.');
    } finally {
      setSendingNotif(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    triggerAlert('confirm', 'Logout HR Portal?', 'Are you sure you want to sign out and leave the HR Portal?', () => {
      sessionStorage.removeItem("hrUser");
      router.push("/hr-login");
    }, () => closeAlert());
  };

  // Filtering rosters
  const filteredRoster = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const domainMatch = selectedDomainFilter ? s.domain === selectedDomainFilter : true;
    const searchMatch = (s.firstName || "").toLowerCase().includes(q) ||
      (s.lastName || "").toLowerCase().includes(q) ||
      (s.employeeId || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q);
    return domainMatch && searchMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#FBF7EE] flex items-center justify-center">
        <div className="text-[#CB5534] text-sm font-bold flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" /> Loading Portal...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FBF7EE] text-[#1E1A17] font-sans p-6 sm:p-10 relative overflow-hidden selection:bg-[#CB5534]/30 selection:text-[#CB5534]">
      <Script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" strategy="lazyOnload" onLoad={() => setScriptsLoaded(true)} />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(203,85,52,0.015)_0%,transparent_70%)] pointer-events-none z-0" />

      {/* Main Container Wrapper */}
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* Header Block */}
        <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 sm:p-6 flex justify-between items-center flex-wrap gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 rounded-xl text-[#1E1A17] transition-all cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold tracking-widest text-[#CB5534] uppercase font-mono">
                HR Workspace
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1E1A17] tracking-tight font-serif flex items-center gap-2">
                Administrative Portal
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadTabValues(activeTab)}
              className="p-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 rounded-xl text-[#1E1A17] transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-[#E2D9CD] hover:border-rose-200 hover:bg-rose-500/5 hover:text-rose-600 rounded-xl text-xs font-semibold text-[#1E1A17] transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab Selection Content Router */}
        <div className="space-y-6">
          
          {/* 1. Analytics & Charts */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stats overview metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Total Interns</div>
                  <div className="text-3xl font-black text-[#1E1A17] font-serif">{stats.total}</div>
                </div>
                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">HR Certified</div>
                  <div className="text-3xl font-black text-[#CB5534] font-serif">{stats.approved}</div>
                </div>
                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Pending Signatures</div>
                  <div className="text-3xl font-black text-sky-400 font-serif">{stats.pending}</div>
                </div>
                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Rejected Profiles</div>
                  <div className="text-3xl font-black text-rose-600 font-serif">{stats.rejected}</div>
                </div>
              </div>

              {/* Chart grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#1E1A17] font-serif border-l-2 border-[#CB5534] pl-3">Doughnut: Domain Allocation</h3>
                  <div className="h-64 relative">
                    <canvas ref={domainCanvasRef} id="domainChart" />
                  </div>
                </div>
                
                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#1E1A17] font-serif border-l-2 border-emerald-500 pl-3">Bar: Profile Verification Statuses</h3>
                  <div className="h-64 relative">
                    <canvas ref={statusCanvasRef} id="statusChart" />
                  </div>
                </div>

                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 space-y-4 md:col-span-2">
                  <h3 className="text-sm font-bold text-[#1E1A17] font-serif border-l-2 border-sky-500 pl-3">Horizontal: Domain Registration metrics</h3>
                  <div className="h-72 relative">
                    <canvas ref={regCanvasRef} id="regChart" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Roster Database list view */}
          {activeTab === 'roster' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3 flex-1 max-w-sm">
                  <Search className="w-5 h-5 text-[#8E8279]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter roster database by name, ID, email..."
                    className="bg-transparent border-none text-xs outline-none text-[#1E1A17] w-full placeholder-zinc-800"
                  />
                </div>

                <div className="flex gap-2.5 items-center flex-wrap">
                  <select
                    value={selectedDomainFilter}
                    onChange={(e) => setSelectedDomainFilter(e.target.value)}
                    className="bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl px-3 py-1.5 text-xs text-[#1E1A17]"
                  >
                    <option value="">All Domains</option>
                    {domainStats.map(ds => (
                      <option key={ds.domain} value={ds.domain}>{ds.domain}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setAddModalOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-[#CB5534] to-[#CB5534] text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Onboard New Intern
                  </button>
                </div>
              </div>

              {/* Database grid view */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoster.length === 0 ? (
                  <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-12 text-center text-xs text-[#8E8279] md:col-span-3">
                    No interns found matching filter query in roster database.
                  </div>
                ) : (
                  filteredRoster.map(s => (
                    <div key={s._id} className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="text-base font-bold text-[#1E1A17] tracking-tight">{s.firstName} {s.lastName}</h4>
                            <span className="text-[10px] text-[#8E8279] font-mono mt-0.5">ID: {s.employeeId}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            s.certificateApprovedByHR ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-[#CB5534]/5 text-[#CB5534] border border-[#CB5534]/15'
                          }`}>
                            {s.certificateApprovedByHR ? "HR Certified" : "Awaiting HR"}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-[#5C524C] font-mono">
                          <div>Domain: <span className="text-[#1E1A17]">{s.domain}</span></div>
                          <div className="truncate">Email: <span className="text-[#1E1A17] select-all">{s.email}</span></div>
                          <div>WhatsApp: <span className="text-[#1E1A17] select-all">{s.whatsapp || s.mobile || s.phone || "—"}</span></div>
                          <div>College: <span className="text-[#1E1A17] truncate max-w-[200px] inline-block align-bottom">{s.collegeName || s.college || "—"}</span></div>
                          <div>Tenure: <span className="text-[#1E1A17]">{s.tenure} ({s.joiningDate ? new Date(s.joiningDate).toLocaleDateString('en-IN') : "—"})</span></div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-[#E2D9CD]/50 justify-end">
                        <button
                          onClick={() => { setSelectedStudent(s); setEditModalOpen(true); }}
                          className="px-3 py-1.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 text-[#1E1A17] hover:text-[#CB5534] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s._id, `${s.firstName} ${s.lastName}`)}
                          className="px-3 py-1.5 bg-rose-500/5 border border-rose-500/10 hover:border-rose-500 hover:bg-rose-500 text-rose-600 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. Pending documents proofs review */}
          {activeTab === 'documents' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif">Onboarding Documents Review Portal</h3>
                  <p className="text-[11px] text-[#8E8279]">{pendingDocs.length} submissions pending HR checks.</p>
                </div>
                
                {selectedDocIds.size > 0 && (
                  <button
                    onClick={() => handleGenerateOfferLetters(Array.from(selectedDocIds))}
                    disabled={generatingOffer}
                    className="px-4 py-2 bg-gradient-to-r from-[#CB5534] to-[#CB5534] text-zinc-950 font-bold text-xs rounded-xl transition-all hover:scale-[1.01]"
                  >
                    {generatingOffer ? "Generating..." : `Generate Bulk Offer Letters (${selectedDocIds.size})`}
                  </button>
                )}
              </div>

              {/* Documents grid list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingDocs.length === 0 ? (
                  <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-12 text-center text-xs text-[#8E8279] md:col-span-2">
                    📭 No onboarding documents pending review.
                  </div>
                ) : (
                  pendingDocs.map(doc => {
                    const isChecked = selectedDocIds.has(doc.studentId);
                    return (
                      <div key={doc.studentId} className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedDocIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(doc.studentId)) next.delete(doc.studentId);
                                    else next.add(doc.studentId);
                                    return next;
                                  });
                                }}
                                className="w-4 h-4 accent-[#CB5534] rounded shrink-0"
                              />
                              <div>
                                <h4 className="text-sm font-bold text-[#1E1A17] leading-snug">{doc.studentName}</h4>
                                <span className="text-[10px] text-[#8E8279] font-mono mt-0.5">ID: {doc.employeeId} · Domain: {doc.domain}</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 bg-[#CB5534]/5 border border-[#CB5534]/15 text-[#CB5534] text-[9px] font-bold rounded-full uppercase tracking-wider shrink-0 animate-pulse">
                              Pending Review
                            </span>
                          </div>

                          {/* File Links */}
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold pt-2">
                            {doc.addressProofUrl ? (
                              <a href={doc.addressProofUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#FBF7EE] border border-[#E2D9CD]/50 hover:border-[#E2D9CD] text-[#1E1A17] rounded-lg text-center">
                                📄 Address Proof
                              </a>
                            ) : (
                              <div className="p-2 bg-[#FBF7EE] border border-[#E2D9CD]/50 text-[#8E8279] rounded-lg text-center">No Address Proof</div>
                            )}

                            {doc.marksheetUrl ? (
                              <a href={doc.marksheetUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-[#FBF7EE] border border-[#E2D9CD]/50 hover:border-[#E2D9CD] text-[#1E1A17] rounded-lg text-center">
                                📄 Marksheet Card
                              </a>
                            ) : (
                              <div className="p-2 bg-[#FBF7EE] border border-[#E2D9CD]/50 text-[#8E8279] rounded-lg text-center">No Marksheet</div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-[#E2D9CD]/50 justify-end">
                          <button
                            onClick={() => handleRejectDoc(doc.studentId)}
                            className="px-3 py-1.5 border border-rose-200 hover:border-rose-500 hover:bg-rose-500 hover:text-white text-rose-600 text-xs font-bold rounded-lg transition-all"
                          >
                            ✕ Reject File
                          </button>
                          <button
                            onClick={() => handleGenerateOfferLetters([doc.studentId])}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-bold rounded-lg transition-all"
                          >
                            Generate Offer Letter
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 4. Bot queries tab */}
          {activeTab === 'bot' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif">HR Bot Assistant Queries</h3>
                  <p className="text-[11px] text-[#8E8279]">{totalOpenQueries} queries open needing response.</p>
                </div>

                <div className="flex gap-2.5 items-center flex-wrap">
                  <select
                    value={botFilterDomain}
                    onChange={(e) => { setBotFilterDomain(e.target.value); setTimeout(loadBotQueries, 100); }}
                    className="bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl px-3 py-1.5 text-xs text-[#1E1A17]"
                  >
                    <option value="">All Domains</option>
                    {domainStats.map(ds => (
                      <option key={ds.domain} value={ds.domain}>{ds.domain}</option>
                    ))}
                  </select>

                  <select
                    value={botFilterStatus}
                    onChange={(e) => { setBotFilterStatus(e.target.value); setTimeout(loadBotQueries, 100); }}
                    className="bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl px-3 py-1.5 text-xs text-[#1E1A17]"
                  >
                    <option value="">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="answered">Answered</option>
                  </select>
                </div>
              </div>

              {/* Bot query listing cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {botQueries.length === 0 ? (
                  <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-12 text-center text-xs text-[#8E8279] md:col-span-2">
                    🤖 No bot queries logged matching criteria.
                  </div>
                ) : (
                  botQueries.map(q => (
                    <div key={q._id} className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-[#1E1A17] leading-snug">{q.userName || q.userId || "Student"}</h4>
                            <span className="text-[10px] text-[#8E8279] font-mono mt-0.5">Domain: {q.domain || "—"}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            q.status === 'open' ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}>
                            {q.status === 'open' ? "Open" : "Answered"}
                          </span>
                        </div>

                        <p className="text-xs text-[#1E1A17] leading-relaxed font-serif bg-[#FBF7EE]/20 p-3 rounded-lg border border-[#E2D9CD]/50">
                          "{q.question}"
                        </p>

                        {q.hrAnswer && (
                          <div className="bg-[#FBF7EE]/40 p-3 border border-[#E2D9CD]/50 rounded-lg text-xs leading-relaxed italic text-[#5C524C]">
                            <b>Ans:</b> "{q.hrAnswer}" <span className="block text-[9px] font-bold text-[#8E8279] mt-1">&mdash; Answered by: {q.hrAnsweredBy || "System"}</span>
                          </div>
                        )}
                      </div>

                      {q.status === 'open' && (
                        <button
                          onClick={() => { setSelectedBotQuery(q); setBotAnswerOpen(true); }}
                          className="w-full mt-2 py-2 bg-gradient-to-r from-[#CB5534] to-[#CB5534] text-zinc-950 font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          Write Answer Response
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 5. Broadcaster notifications tab */}
          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start animate-fade-in">
              {/* Form panel */}
              <form onSubmit={handleSendNotification} className="md:col-span-5 bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2 border-b border-[#E2D9CD]/50 pb-3">
                  <Send className="w-5 h-5 text-[#CB5534]" />
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif">Compose Broadcast Alert</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Notification Title *</label>
                  <input
                    type="text"
                    required
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Enter short title..."
                    className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Notice Level *</label>
                    <select
                      value={notifType}
                      onChange={(e: any) => setNotifType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                    >
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Notice Scope *</label>
                    <select
                      value={notifTarget}
                      onChange={(e) => setNotifTarget(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                    >
                      <option value="all">All Students</option>
                      <option value="individual">Individual Student</option>
                    </select>
                  </div>
                </div>

                {notifTarget === 'individual' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Student Employee ID *</label>
                    <input
                      type="text"
                      required
                      value={notifTargetStudentId}
                      onChange={(e) => setNotifTargetStudentId(e.target.value)}
                      placeholder="e.g. TEN-MERN-1002"
                      className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Broadcast Alert Text Message *</label>
                  <textarea
                    required
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Provide alert descriptions details..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] outline-none focus:border-[#CB5534]/35 resize-none transition-all"
                  />
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="submit"
                    disabled={sendingNotif}
                    className="w-full py-2.5 bg-[#CB5534] hover:bg-[#B24629] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {sendingNotif ? "Transmitting..." : "Transmit Broadcast"}
                  </button>
                </div>
              </form>

              {/* History panel */}
              <div className="md:col-span-7 space-y-4">
                <h4 className="text-sm font-bold text-[#5C524C] font-mono">Transmission History Log</h4>
                
                {sentNotifications.length === 0 ? (
                  <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-12 text-center text-xs text-[#8E8279]">
                    No notifications broadcasted yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {sentNotifications.map((sn, idx) => (
                      <div key={sn._id || idx} className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-4 space-y-1 text-left relative">
                        <div className="flex justify-between items-center text-[9px] font-bold text-[#8E8279] font-mono">
                          <span>Target: {sn.target} {sn.targetStudentId ? `(${sn.targetStudentId})` : ""}</span>
                          <span>{new Date(sn.createdAt).toLocaleString('en-IN')}</span>
                        </div>
                        <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            sn.type === 'urgent' ? 'bg-rose-500 animate-pulse' :
                            sn.type === 'warning' ? 'bg-[#CB5534]' :
                            sn.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                          }`} />
                          {sn.title}
                        </h5>
                        <p className="text-[11px] text-[#5C524C] leading-relaxed font-serif">{sn.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT STUDENT PROFILE MODAL */}
      {editModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => { setEditModalOpen(false); setSelectedStudent(null); }} className="absolute inset-0 bg-[#1E1A17]/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-in text-left">
            <button
              onClick={() => { setEditModalOpen(false); setSelectedStudent(null); }}
              className="absolute top-4 right-4 p-1.5 hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-lg text-[#8E8279] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#1E1A17] font-serif">Edit Student Profile Details</h3>
              <p className="text-xs text-[#8E8279]">ID: {selectedStudent.employeeId}</p>
            </div>

            <form onSubmit={handleEditStudent} className="space-y-4 text-xs text-[#5C524C]">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">First Name</label>
                  <input
                    type="text"
                    required
                    value={selectedStudent.firstName}
                    onChange={(e) => setSelectedStudent((prev: any) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">Last Name</label>
                  <input
                    type="text"
                    required
                    value={selectedStudent.lastName}
                    onChange={(e) => setSelectedStudent((prev: any) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">Domain *</label>
                  <select
                    value={selectedStudent.domain}
                    onChange={(e) => setSelectedStudent((prev: any) => ({ ...prev, domain: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Python Development">Python Development</option>
                    <option value="Java Development">Java Development</option>
                    <option value="DevOps with AWS">DevOps with AWS</option>
                    <option value="MERN Stack Development">MERN Stack Development</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Cyber Security">Cyber Security</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Flutter Development">Flutter Development</option>
                    <option value="HR Management">HR Management</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">Tenure *</label>
                  <select
                    value={selectedStudent.tenure}
                    onChange={(e) => setSelectedStudent((prev: any) => ({ ...prev, tenure: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  >
                    <option value="1 Month">1 Month</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">Joined Date</label>
                  <input
                    type="date"
                    required
                    value={selectedStudent.joiningDate ? selectedStudent.joiningDate.split("T")[0] : ""}
                    onChange={(e) => setSelectedStudent((prev: any) => ({ ...prev, joiningDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">WhatsApp / Mobile</label>
                  <input
                    type="text"
                    required
                    value={selectedStudent.whatsapp || selectedStudent.mobile || selectedStudent.phone || ""}
                    onChange={(e) => setSelectedStudent((prev: any) => ({ ...prev, whatsapp: e.target.value, mobile: e.target.value, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">College / Institution</label>
                <input
                  type="text"
                  value={selectedStudent.collegeName || selectedStudent.college || ""}
                  onChange={(e) => setSelectedStudent((prev: any) => ({ ...prev, collegeName: e.target.value, college: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">Portal Password</label>
                <input
                  type="text"
                  required
                  value={selectedStudent.password || ""}
                  onChange={(e) => setSelectedStudent((prev: any) => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs font-mono"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-[#E2D9CD]/50">
                <button
                  type="button"
                  onClick={() => { setEditModalOpen(false); setSelectedStudent(null); }}
                  className="flex-1 py-2.5 border border-[#E2D9CD] hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#5C524C] font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#CB5534] to-[#CB5534] text-zinc-950 font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW STUDENT PROFILE MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setAddModalOpen(false)} className="absolute inset-0 bg-[#1E1A17]/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-in text-left">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-lg text-[#8E8279] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#1E1A17] font-serif">Onboard New Intern Student</h3>
              <p className="text-xs text-[#8E8279]">Fill in the intern record fields below. Password is auto generated or manual.</p>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4 text-xs text-[#5C524C]">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">First Name *</label>
                  <input
                    type="text"
                    required
                    value={addStudentForm.firstName}
                    onChange={(e) => setAddStudentForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={addStudentForm.lastName}
                    onChange={(e) => setAddStudentForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">Domain *</label>
                  <select
                    value={addStudentForm.domain}
                    onChange={(e) => setAddStudentForm(prev => ({ ...prev, domain: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Python Development">Python Development</option>
                    <option value="Java Development">Java Development</option>
                    <option value="DevOps with AWS">DevOps with AWS</option>
                    <option value="MERN Stack Development">MERN Stack Development</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Cyber Security">Cyber Security</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Flutter Development">Flutter Development</option>
                    <option value="HR Management">HR Management</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Tenure *</label>
                  <select
                    value={addStudentForm.tenure}
                    onChange={(e) => setAddStudentForm(prev => ({ ...prev, tenure: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  >
                    <option value="1 Month">1 Month</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={addStudentForm.email}
                    onChange={(e) => setAddStudentForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="intern@domain.com"
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">WhatsApp / Phone *</label>
                  <input
                    type="text"
                    required
                    value={addStudentForm.whatsapp}
                    onChange={(e) => setAddStudentForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Joined Date</label>
                  <input
                    type="date"
                    required
                    value={addStudentForm.joiningDate}
                    onChange={(e) => setAddStudentForm(prev => ({ ...prev, joiningDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">College / Institution</label>
                  <input
                    type="text"
                    value={addStudentForm.collegeName}
                    onChange={(e) => setAddStudentForm(prev => ({ ...prev, collegeName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Temporary Password *</label>
                <div className="relative">
                  <input
                    type={passVisible ? "text" : "password"}
                    required
                    value={addStudentForm.password}
                    onChange={(e) => setAddStudentForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter security password for login..."
                    className="w-full px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-[#1E1A17] outline-none focus:border-[#CB5534]/35 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setPassVisible(!passVisible)}
                    className="absolute top-2 right-3 text-[#8E8279] hover:text-[#1E1A17]"
                  >
                    {passVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-[#E2D9CD]/50">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-[#E2D9CD] hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#5C524C] font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#CB5534] to-[#CB5534] text-zinc-950 font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOT QUERY ANSWER RESPOND MODAL */}
      {botAnswerOpen && selectedBotQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => { setBotAnswerOpen(false); setSelectedBotQuery(null); setBotAnswerText(""); }} className="absolute inset-0 bg-[#1E1A17]/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-in text-left">
            <button
              onClick={() => { setBotAnswerOpen(false); setSelectedBotQuery(null); setBotAnswerText(""); }}
              className="absolute top-4 right-4 p-1.5 hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-lg text-[#8E8279] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#1E1A17] font-serif">Answer HR Bot Query</h3>
              <p className="text-[11px] text-[#8E8279]">From student: {selectedBotQuery.userName || selectedBotQuery.userId || "—"}</p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#FBF7EE]/40 p-4 border border-[#E2D9CD]/50 rounded-xl text-xs text-[#1E1A17] font-serif leading-relaxed italic">
                "{selectedBotQuery.question}"
              </div>

              <form onSubmit={handleSubmitBotAnswer} className="space-y-4 text-xs text-[#5C524C]">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8E8279]">HR Answer Text Response *</label>
                  <textarea
                    required
                    value={botAnswerText}
                    onChange={(e) => setBotAnswerText(e.target.value)}
                    placeholder="Provide clear response to intern query..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] outline-none focus:border-[#CB5534]/35 resize-none transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setBotAnswerOpen(false); setSelectedBotQuery(null); setBotAnswerText(""); }}
                    className="flex-1 py-2.5 border border-[#E2D9CD] hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#5C524C] font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAnswer}
                    className="flex-1 py-2.5 bg-gradient-to-r from-[#CB5534] to-[#CB5534] text-zinc-950 font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    {submittingAnswer ? "Submitting..." : "Submit Response"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION DRAWER */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-[#1E1A17]/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-72 max-w-[85vw] bg-[#FBF7EE] border-r border-[#E2D9CD] p-6 flex flex-col justify-between animate-slide-left z-10">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FDFCF7] border-[#E2D9CD] border border-[#CB5534]/30 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-5" viewBox="0 0 28 24" fill="none">
                    <path d="M3 9C3 6.79 4.79 5 7 5C9.21 5 11 6.79 11 9C11 11.21 9.21 13 7 13C4.79 13 3 11.21 3 9Z" stroke="#CB5534" strokeWidth="2" fill="none"/>
                    <path d="M11 9C11 6.79 12.79 5 15 5C17.21 5 19 6.79 19 9C19 11.21 17.21 13 15 13C12.79 13 11 11.21 11 9Z" stroke="#CB5534" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold tracking-[3px] text-[#CB5534]">TEN</span>
                  <span className="block text-[9px] text-[#8E8279] uppercase tracking-widest mt-0.5">HR Portal</span>
                </div>
              </div>

              <nav className="flex flex-col gap-1 text-xs font-semibold">
                <button
                  onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'analytics' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Briefcase className="w-4 h-4 shrink-0" /> Analytics Summary
                </button>
                <button
                  onClick={() => { setActiveTab('roster'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'roster' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Users className="w-4 h-4 shrink-0" /> Roster Database
                </button>
                <button
                  onClick={() => { setActiveTab('documents'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'documents' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <FileText className="w-4 h-4 shrink-0" /> Review Onboarding Docs
                </button>
                <button
                  onClick={() => { setActiveTab('bot'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'bot' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Bot className="w-4 h-4 shrink-0" /> Bot Queries
                </button>
                <button
                  onClick={() => { setActiveTab('notifications'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'notifications' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Bell className="w-4 h-4 shrink-0" /> Send Alerts Broadcast
                </button>
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/10 hover:border-rose-500 text-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Logout HR Admin
            </button>
          </div>
        </div>
      )}

      {/* ALERT DIALOG OVERLAY */}
      {alertDialog.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 shadow-2xl space-y-4 animate-[scaleIn_0.2s_cubic-bezier(0.34,1.56,0.64,1)] text-left">
            <div className="flex items-center gap-3">
              {alertDialog.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
              {alertDialog.type === 'error' && <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />}
              {alertDialog.type === 'warning' && <AlertCircle className="w-6 h-6 text-[#CB5534] shrink-0 animate-pulse" />}
              {alertDialog.type === 'confirm' && <AlertCircle className="w-6 h-6 text-[#CB5534] shrink-0 animate-pulse" />}
              {alertDialog.type === 'info' && <AlertCircle className="w-6 h-6 text-sky-400 shrink-0" />}
              
              <h4 className="text-base font-bold text-[#1E1A17] tracking-tight font-serif">{alertDialog.title}</h4>
            </div>

            <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed pr-1 select-text whitespace-pre-wrap">
              {alertDialog.text}
            </p>

            <div className="flex justify-end gap-2 pt-2 text-xs">
              {alertDialog.type === 'confirm' && (
                <button
                  onClick={() => {
                    if (alertDialog.onCancel) alertDialog.onCancel();
                    else closeAlert();
                  }}
                  className="px-4 py-2 border border-[#E2D9CD] hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-xl font-semibold text-[#5C524C] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (alertDialog.onConfirm) alertDialog.onConfirm();
                  else closeAlert();
                }}
                className="px-4 py-2 bg-[#CB5534] hover:bg-[#B24629] text-white rounded-xl font-semibold transition-all cursor-pointer"
              >
                {alertDialog.type === 'confirm' ? 'Confirm' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bot widget */}
      <BotWidget />
    </div>
  );
}
