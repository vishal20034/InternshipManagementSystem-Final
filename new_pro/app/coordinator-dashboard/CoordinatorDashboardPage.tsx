"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import {
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  Users,
  PenSquare,
  Award,
  Code2,
  FolderLock,
  BookOpen,
  LogOut,
  Bell,
  RefreshCw,
  Search,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  User,
  Plus,
  Trash2,
  FileText,
  Upload,
  Download,
  Terminal as TermIcon,
  ChevronRight,
  TrendingUp,
  Brain,
  QrCode,
  Menu
} from 'lucide-react';

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  text: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface CodingQuestion {
  _id?: string;
  title: string;
  difficulty: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  sampleInput: string;
  sampleOutput: string;
  testCases: { input: string; output: string; isHidden: boolean }[];
}

export default function CoordinatorDashboardPage() {
  const router = useRouter();

  // Security Gate
  const [loading, setLoading] = useState(true);
  const [domainStr, setDomainStr] = useState("");
  const [coordUsername, setCoordUsername] = useState("");
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'attendance' | 'leaderboard' | 'lbperf' | 'coding' | 'test' | 'tasks' | 'guidelines' | 'notice'>('submissions');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Custom alert dialog
  const [alertDialog, setAlertDialog] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    text: ''
  });

  // Notice states
  const [notice, setNotice] = useState({
    morningMeeting: "Not updated",
    eveningMeeting: "Not updated",
    meetingLink: "",
    importantNotice: ""
  });
  const [updatingNotice, setUpdatingNotice] = useState(false);

  // Roster Attendance states
  const [rosterDate, setRosterDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attSearch, setAttSearch] = useState("");
  const [roster, setRoster] = useState<any[]>([]);
  const [attRecords, setAttRecords] = useState<Record<string, { self?: string; coordinator?: string; coordId?: string; source?: string; coordSource?: string }>>({});
  const [selectedRosterIds, setSelectedRosterIds] = useState<Set<string>>(new Set());
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrTargetUrl, setQrTargetUrl] = useState("");

  // Student Overview states
  const [overviewSearch, setOverviewSearch] = useState("");
  const [overviewStudents, setOverviewStudents] = useState<any[]>([]);

  // Submissions states
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionStats, setSubmissionStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    attendanceCount: 0
  });
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  // Test Manager states
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [pdfParsedQuestions, setPdfParsedQuestions] = useState<Question[]>([]);
  const [selectedParsedIdx, setSelectedParsedIdx] = useState<Set<number>>(new Set());
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfStatus, setPdfStatus] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);

  // Custom task uploader states
  const [tasksList, setTasksList] = useState<string[]>([]);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [uploadingTask, setUploadingTask] = useState(false);
  const [coordinatorFileName, setCoordinatorFileName] = useState("");
  const [coordinatorFileUrl, setCoordinatorFileUrl] = useState("");

  // Coding Manager states
  const [codingQuestions, setCodingQuestions] = useState<any[]>([]);
  const [codingSubmissions, setCodingSubmissions] = useState<any[]>([]);
  const [addCodingOpen, setAddCodingOpen] = useState(false);
  const [newCq, setNewCq] = useState<CodingQuestion>({
    title: "",
    difficulty: "Easy",
    description: "",
    inputFormat: "",
    outputFormat: "",
    sampleInput: "",
    sampleOutput: "",
    testCases: []
  });
  const [newTcInput, setNewTcInput] = useState({ input: "", output: "", isHidden: false });

  // Init auth check
  useEffect(() => {
    try {
      const logged = sessionStorage.getItem("coordinatorLoggedIn");
      const domainVal = sessionStorage.getItem("coordinatorDomain");
      const coordName = sessionStorage.getItem("coordinatorUsername");

      if (logged !== "true" || !domainVal) {
        router.push("/coordinator-login");
        return;
      }

      const parsedDomain = Array.isArray(JSON.parse(domainVal))
        ? JSON.parse(domainVal)[0]
        : JSON.parse(domainVal);

      setDomainStr(parsedDomain);
      setCoordUsername(coordName || "coordinator");
      setLoading(false);
    } catch (_) {
      router.push("/coordinator-login");
    }
  }, []);

  // Fetch data on domain initialization or active tab change
  useEffect(() => {
    if (domainStr) {
      loadNoticeValues();
      loadSubmissions();
      startSSE();
      triggerTabFetch(activeTab);
    }
  }, [domainStr, activeTab]);

  // Trigger tab fetch
  const triggerTabFetch = (tab: typeof activeTab) => {
    if (tab === 'attendance') {
      loadAttendanceTab();
      loadCoordQR();
    }
    if (tab === 'overview') {
      loadOverview();
    }
    if (tab === 'coding') {
      loadCodingQuestions();
      loadCodingSubmissions();
    }
    if (tab === 'test') {
      loadExistingTestQuestions();
    }
    if (tab === 'tasks') {
      loadCoordTasks();
    }
    if (tab === 'lbperf') {
      setTimeout(() => {
        if ((window as any).TenExtras) {
          (window as any).TenExtras.injectCoordinator({ domain: domainStr, mountId: "ten-extras-coord-mount" });
        }
      }, 300);
    }
  };

  const startSSE = () => {
    if (!domainStr) return;
    try {
      const sse = new EventSource("/notice-events/" + encodeURIComponent(domainStr));
      sse.onmessage = (e) => {
        if (e.data && e.data !== "connected") {
          try {
            const payload = JSON.parse(e.data);
            if (payload.event === "notice-updated") {
              loadNoticeValues();
            }
          } catch (_) {}
        }
      };
      return () => {
        sse.close();
      };
    } catch (_) {}
  };

  const triggerAlert = (type: AlertState['type'], title: string, text: string, onConfirm?: () => void, onCancel?: () => void) => {
    setAlertDialog({ isOpen: true, type, title, text, onConfirm, onCancel });
  };

  const closeAlert = () => {
    setAlertDialog(prev => ({ ...prev, isOpen: false }));
  };

  // 1. Notice loader
  const loadNoticeValues = async () => {
    try {
      const r = await fetch("/get-notice/" + encodeURIComponent(domainStr));
      if (r.ok) {
        const d = await r.json();
        setNotice({
          morningMeeting: d.morningMeeting || "",
          eveningMeeting: d.eveningMeeting || "",
          meetingLink: d.meetingLink || "",
          importantNotice: d.importantNotice || ""
        });
      }
    } catch (_) {}
  };

  // Save notice
  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingNotice(true);
    try {
      const response = await fetch("/update-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domainStr,
          ...notice
        })
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', 'Notice Updated', 'All students in your domain will see this notice update instantly.');
        loadNoticeValues();
        loadSubmissions();
      } else {
        triggerAlert('error', 'Update Failed', 'Could not update important notice.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Server communication error.');
    } finally {
      setUpdatingNotice(false);
    }
  };

  // 2. Load submissions
  const loadSubmissions = async () => {
    try {
      const response = await fetch("/all-submissions/" + encodeURIComponent(domainStr));
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data || []);
        
        // Initial feedbacks mapping
        const fMap: Record<string, string> = {};
        data.forEach((s: any) => {
          fMap[s._id] = s.feedback || "";
        });
        setFeedbacks(fMap);

        // Stats calculation
        setSubmissionStats({
          total: data.length,
          approved: data.filter((s: any) => s.status === "Approved").length,
          rejected: data.filter((s: any) => s.status === "Rejected").length,
          attendanceCount: data.filter((s: any) => s.attendanceGiven).length
        });
      }
    } catch (_) {}
  };

  // Update submission status
  const handleReviewSubmission = (id: string, status: 'Approved' | 'Rejected') => {
    const feedback = feedbacks[id] || "";
    triggerAlert('confirm', `${status} Submission?`, 'Are you sure you want to log this decision? Reviews are permanent and cannot be modified later.', async () => {
      closeAlert();
      try {
        const response = await fetch("/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status, feedback, domain: domainStr })
        });
        const data = await response.json();
        if (data.success) {
          triggerAlert('success', `Submission ${status}`, 'The grading decision has been successfully locked.');
          loadSubmissions();
        } else if (data.alreadyReviewed) {
          triggerAlert('warning', 'Already Graded', 'This task has already been reviewed by a coordinator.');
        } else {
          triggerAlert('error', 'Failed', 'Could not submit grading review.');
        }
      } catch (_) {
        triggerAlert('error', 'Error', 'Connection error.');
      }
    }, () => closeAlert());
  };

  // 3. Attendance Tab loaders
  const loadAttendanceTab = async () => {
    try {
      // Fetch roster overview
      const ro = await fetch("/coordinator/student-overview/" + encodeURIComponent(domainStr));
      const rd = await ro.json();
      const seen = new Set();
      const rosterList = (rd.students || []).filter((s: any) => {
        const k = s.employeeId || s._id;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
      setRoster(rosterList);

      // Fetch attendance records for current selected date
      const ar = await fetch(`/coordinator/attendance/${encodeURIComponent(domainStr)}?date=${rosterDate}`);
      const ad = await ar.json();
      const recordsMap: Record<string, any> = {};
      (ad.records || []).forEach((r: any) => {
        if (!recordsMap[r.employeeId]) recordsMap[r.employeeId] = {};
        recordsMap[r.employeeId][r.markedBy] = r.status;
        recordsMap[r.employeeId].source = r.source;
        recordsMap[r.employeeId].coordSource = r.coordSource;
      });
      setAttRecords(recordsMap);
      setSelectedRosterIds(new Set());
    } catch (_) {}
  };

  // Trigger attendance date change fetch
  useEffect(() => {
    if (domainStr && activeTab === 'attendance') {
      loadAttendanceTab();
    }
  }, [rosterDate]);

  // Load QR code
  const loadCoordQR = async () => {
    try {
      const r = await fetch(`/coordinator/qr/${encodeURIComponent(coordUsername)}?domain=${encodeURIComponent(domainStr)}`);
      const d = await r.json();
      if (d.success) {
        setQrDataUrl(d.dataUrl);
        setQrTargetUrl(d.url);
      }
    } catch (_) {}
  };

  // Mark coordinator attendance
  const handleMarkCoordAttendance = async (employeeId: string, status: 'Present' | 'Absent') => {
    try {
      const r = await fetch("/attendance/coordinator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, date: rosterDate, status, coordinatorId: coordUsername })
      });
      const d = await r.json();
      if (d.success) {
        loadAttendanceTab();
        triggerAlert('success', 'Presence Recorded', `Marked ${employeeId} as ${status}`);
      } else {
        triggerAlert('error', 'Failed', d.message || 'Could not register presence.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Network connection error.');
    }
  };

  // Bulk mark attendance
  const handleBulkAttendance = (status: 'Present' | 'Absent') => {
    const ids = Array.from(selectedRosterIds);
    if (!ids.length) return;
    
    triggerAlert('confirm', `Bulk Mark ${status}?`, `Mark all ${ids.length} selected students as ${status} for ${rosterDate}?`, async () => {
      closeAlert();
      try {
        const r = await fetch("/attendance/coordinator/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: domainStr,
            employeeIds: ids,
            date: rosterDate,
            status,
            coordinatorId: coordUsername
          })
        });
        const d = await r.json();
        if (d.success) {
          triggerAlert('success', 'Success', `Successfully updated presence roster for ${ids.length} interns.`);
          loadAttendanceTab();
        } else {
          triggerAlert('error', 'Bulk Failed', d.message || 'Failed bulk sign-in.');
        }
      } catch (_) {
        triggerAlert('error', 'Error', 'Connection failed.');
      }
    }, () => closeAlert());
  };

  // 4. Student overview loader (approvals)
  const loadOverview = async () => {
    try {
      const r = await fetch("/coordinator/student-overview/" + encodeURIComponent(domainStr));
      const d = await r.json();
      setOverviewStudents(d.students || []);
    } catch (_) {}
  };

  // Approve student for certificate
  const handleApproveStudent = (id: string, name: string) => {
    triggerAlert('confirm', 'Approve Certificate?', `Submit HR recommendation approval for ${name}?`, async () => {
      closeAlert();
      try {
        const r = await fetch(`/students/${id}/coordinator-approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinatorId: coordUsername, remarks: "Domain requirement met" })
        });
        const d = await r.json();
        if (d.success) {
          triggerAlert('success', 'Approved', 'Intern approved and sent to HR for certification.');
          loadOverview();
        } else {
          triggerAlert('error', 'Approval Failed', d.message || 'Could not record approval.');
        }
      } catch (_) {
        triggerAlert('error', 'Error', 'Network error.');
      }
    }, () => closeAlert());
  };

  // Revoke student approval
  const handleRevokeStudent = (id: string) => {
    triggerAlert('confirm', 'Revoke Approval?', 'Are you sure you want to revoke coordinator approval? This removes them from the HR certification list.', async () => {
      closeAlert();
      try {
        const r = await fetch(`/students/${id}/coordinator-revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        });
        const d = await r.json();
        if (d.success) {
          triggerAlert('success', 'Revoked', 'Student approval successfully revoked.');
          loadOverview();
        } else {
          triggerAlert('error', 'Revoke Failed', d.message || 'Could not revoke approval.');
        }
      } catch (_) {
        triggerAlert('error', 'Error', 'Connection error.');
      }
    }, () => closeAlert());
  };

  // 5. MCQ Test Manager
  const loadExistingTestQuestions = async () => {
    try {
      const r = await fetch("/get-test-questions/" + encodeURIComponent(domainStr));
      const d = await r.json();
      if (d.success) {
        setTestQuestions(d.questions || []);
      }
    } catch (_) {}
  };

  const handleSaveTest = async () => {
    if (testQuestions.length === 0) {
      triggerAlert('warning', 'No Questions', 'Provide at least one question block before saving.');
      return;
    }

    try {
      const r = await fetch("/save-test-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainStr, questions: testQuestions })
      });
      const d = await r.json();
      if (d.success) {
        triggerAlert('success', 'Test Saved', 'Proctored assessment updated successfully.');
        loadExistingTestQuestions();
      } else {
        triggerAlert('error', 'Save Failed', 'Could not save question list.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Network error.');
    }
  };

  const handleParsePdfQuestions = async () => {
    if (!pdfFile) {
      triggerAlert('info', 'Choose File', 'Please select a PDF assessment file first.');
      return;
    }
    setPdfParsing(true);
    setPdfStatus("📄 Extracting test cases & questions...");
    try {
      const fd = new FormData();
      fd.append("pdfFile", pdfFile);
      const r = await fetch("/coordinator/test/upload-pdf", {
        method: "POST",
        body: fd
      });
      const d = await r.json();
      if (d.success) {
        setPdfParsedQuestions(d.questions || []);
        setSelectedParsedIdx(new Set((d.questions || []).map((_: any, i: number) => i)));
        setPdfStatus(`✅ Successfully extracted ${d.questions?.length || 0} questions.`);
      } else {
        setPdfStatus("❌ PDF parsing failed: " + (d.message || "Unknown error"));
      }
    } catch (e: any) {
      setPdfStatus("❌ Connection error: " + e.message);
    } finally {
      setPdfParsing(false);
    }
  };

  const handleImportParsed = () => {
    const checked = pdfParsedQuestions.filter((_, i) => selectedParsedIdx.has(i));
    if (!checked.length) {
      triggerAlert('info', 'No Selection', 'Choose at least one extracted question block.');
      return;
    }
    setTestQuestions(prev => [...prev, ...checked]);
    setPdfOpen(false);
    setPdfFile(null);
    setPdfParsedQuestions([]);
    setSelectedParsedIdx(new Set());
    setPdfStatus("");
    triggerAlert('success', 'Imported', `Appended ${checked.length} questions to the test editor.`);
  };

  // 6. Custom Tasks
  const loadCoordTasks = async () => {
    try {
      const res = await fetch("/coordinator/tasks/" + encodeURIComponent(domainStr));
      if (res.ok) {
        const data = await res.json();
        setTasksList(data.tasks || []);
        setCoordinatorFileName(data.fileName || "");
        setCoordinatorFileUrl(data.fileUrl || "");
      }
    } catch (_) {}
  };

  const handleUploadTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingTask(true);
    try {
      const fd = new FormData();
      fd.append("domain", domainStr);
      tasksList.forEach(t => fd.append("tasks[]", t));
      if (newTaskInput.trim()) {
        fd.append("tasks[]", newTaskInput.trim());
      }
      if (taskFile) {
        fd.append("taskFile", taskFile);
      }

      const res = await fetch("/coordinator/tasks/upload", {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        triggerAlert('success', 'Tasks Uploaded', 'Custom tasks list updated successfully.');
        setNewTaskInput("");
        setTaskFile(null);
        loadCoordTasks();
      } else {
        triggerAlert('error', 'Upload Failed', data.message || 'Failed task uploads.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Connection failed.');
    } finally {
      setUploadingTask(false);
    }
  };

  // 7. Coding Manager
  const loadCodingQuestions = async () => {
    try {
      const r = await fetch("/student/coding-questions/" + encodeURIComponent(domainStr));
      const d = await r.json();
      setCodingQuestions(d.questions || []);
    } catch (_) {}
  };

  const loadCodingSubmissions = async () => {
    try {
      const r = await fetch("/coordinator/coding-submissions/" + encodeURIComponent(domainStr));
      const d = await r.json();
      setCodingSubmissions(d.submissions || []);
    } catch (_) {}
  };

  const handleAddCodingQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCq.title || !newCq.description) {
      triggerAlert('warning', 'Missing Details', 'Title and Description details are required.');
      return;
    }

    try {
      const r = await fetch("/api/v2/coordinator/coding-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainStr, ...newCq })
      });
      const d = await r.json();
      if (d.success) {
        triggerAlert('success', 'Coding Question Added', 'Algorithmic challenge successfully published.');
        setAddCodingOpen(false);
        setNewCq({
          title: "",
          difficulty: "Easy",
          description: "",
          inputFormat: "",
          outputFormat: "",
          sampleInput: "",
          sampleOutput: "",
          testCases: []
        });
        loadCodingQuestions();
      } else {
        triggerAlert('error', 'Failed', d.message || 'Could not save coding question.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Server connection failure.');
    }
  };

  // Logout
  const handleLogout = () => {
    triggerAlert('confirm', 'Logout?', 'Are you sure you want to logout from the Coordinator Portal?', () => {
      sessionStorage.removeItem("coordinatorLoggedIn");
      sessionStorage.removeItem("coordinatorDomain");
      sessionStorage.removeItem("coordinatorUsername");
      router.push("/coordinator-login");
    }, () => closeAlert());
  };

  // Submissions filtered list
  const filteredSubmissions = submissions;

  // Roster filtered list
  const filteredRoster = roster.filter(s =>
    (s.name || "").toLowerCase().includes(attSearch.toLowerCase()) ||
    (s.employeeId || "").toLowerCase().includes(attSearch.toLowerCase())
  );

  // Overview filtered list
  const filteredOverview = overviewStudents.filter(s =>
    (s.name || "").toLowerCase().includes(overviewSearch.toLowerCase()) ||
    (s.employeeId || "").toLowerCase().includes(overviewSearch.toLowerCase())
  );

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
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js" strategy="lazyOnload" />
      <Script src="/ten-extras.js" strategy="lazyOnload" />
      
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
                Coordinator Hub
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1E1A17] tracking-tight font-serif flex items-center gap-2">
                Manage: {domainStr}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadSubmissions}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main workspace frame */}
          <div className="lg:col-span-12 space-y-6">
            
            {/* Overview / Submissions tab */}
            {activeTab === 'submissions' && (
              <div className="space-y-6">
                {/* Stats row overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                    <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Total Deliverables</div>
                    <div className="text-3xl font-black text-[#1E1A17] font-serif">{submissionStats.total}</div>
                  </div>
                  <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                    <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Approved Tasks</div>
                    <div className="text-3xl font-black text-[#CB5534] font-serif">{submissionStats.approved}</div>
                  </div>
                  <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                    <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Rejected Tasks</div>
                    <div className="text-3xl font-black text-rose-600 font-serif">{submissionStats.rejected}</div>
                  </div>
                  <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                    <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Attendance Given</div>
                    <div className="text-3xl font-black text-sky-400 font-serif">{submissionStats.attendanceCount}</div>
                  </div>
                </div>

                {/* Submissions List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-[#1E1A17] font-serif border-l-2 border-[#CB5534] pl-3">Pending Tasks to Grade</h3>
                  {filteredSubmissions.length === 0 ? (
                    <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-16 text-center text-xs text-[#8E8279]">
                      📭 No student submissions loaded yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredSubmissions.map(sub => {
                        const isReviewed = sub.reviewedOnce === true;
                        return (
                          <div
                            key={sub._id}
                            className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all duration-300 relative overflow-hidden ${
                              isReviewed ? 'bg-[#FBF7EE]/20 border-[#E2D9CD]/50 opacity-70' : 'bg-white border-[#E2D9CD] border-[#E2D9CD]'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between items-start gap-2 flex-wrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-[#CB5534]/10 rounded-full flex items-center justify-center text-[#CB5534] font-bold font-mono uppercase text-sm shrink-0">
                                    {sub.employeeId[0] || "?"}
                                  </div>
                                  <div>
                                    <h4 className="text-base font-bold text-[#1E1A17] tracking-tight">{sub.employeeId}</h4>
                                    <p className="text-[10px] text-[#8E8279]">{sub.domain} · {sub.internshipDuration || "1 Month"}</p>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  sub.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                  sub.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                  'bg-[#CB5534]/5 text-[#CB5534] border border-[#CB5534]/15'
                                }`}>
                                  {sub.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FBF7EE]/40 p-4 border border-[#E2D9CD]/50 rounded-xl text-xs">
                                <div>
                                  <div className="text-[9px] uppercase font-bold text-[#8E8279]">Submission Task</div>
                                  <div className="font-semibold text-white">{sub.task}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] uppercase font-bold text-[#8E8279]">Last Score</div>
                                  <div className="font-semibold text-white">{sub.performance || "B"}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] uppercase font-bold text-[#8E8279]">Meetings Joined</div>
                                  <div className="font-semibold text-white">{sub.meetingsJoined || 0}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] uppercase font-bold text-[#8E8279]">Duration type</div>
                                  <div className="font-semibold text-white">{sub.internshipDuration || "1 Month"}</div>
                                </div>
                              </div>

                              {/* Student Submission notes */}
                              {sub.note && (
                                <p className="text-xs text-[#5C524C] leading-relaxed font-serif bg-[#FBF7EE]/20 p-3 rounded-lg border border-[#E2D9CD]/50">
                                  <b>Notes:</b> {sub.note}
                                </p>
                              )}

                              {/* Deliverable Link Chips */}
                              <div className="flex flex-wrap gap-2 text-[10px] font-bold font-mono">
                                {sub.githubLink && (
                                  <a href={sub.githubLink} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 text-[#1E1A17] rounded-lg">
                                    GitHub URL
                                  </a>
                                )}
                                {sub.image && (
                                  <a href={sub.image} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 text-[#1E1A17] rounded-lg">
                                    Screenshot
                                  </a>
                                )}
                                {sub.pdf && (
                                  <a href={sub.pdf} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 text-[#1E1A17] rounded-lg">
                                    Documentation PDF
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Actions review */}
                            <div className="border-t border-[#E2D9CD]/50 pt-4 space-y-3">
                              {isReviewed ? (
                                <div className="text-xs text-[#8E8279] italic bg-[#FBF7EE]/30 p-3 rounded-xl border border-[#E2D9CD]/50 text-center">
                                  🔒 Feedback submitted: "{sub.feedback}". Review choice is locked.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8E8279]">Coordinator Feedback remarks</label>
                                  <textarea
                                    value={feedbacks[sub._id] || ""}
                                    onChange={(e) => setFeedbacks(prev => ({ ...prev, [sub._id]: e.target.value }))}
                                    placeholder="Provide feedback details before locking evaluation..."
                                    rows={2}
                                    className="w-full px-4 py-3 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] placeholder-zinc-800 outline-none focus:border-[#CB5534]/30 transition-all resize-none"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => handleReviewSubmission(sub._id, 'Rejected')}
                                      className="px-4 py-2 border border-rose-200 hover:border-rose-500 hover:bg-rose-500 hover:text-white text-rose-600 text-xs font-bold rounded-xl transition-all cursor-pointer animate-fade-in"
                                    >
                                      ❌ Reject
                                    </button>
                                    <button
                                      onClick={() => handleReviewSubmission(sub._id, 'Approved')}
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-bold rounded-xl transition-all cursor-pointer animate-fade-in"
                                    >
                                      ✅ Approve Task
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Attendance tab */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Left Controls column */}
                  <div className="md:col-span-8 space-y-6">
                    {/* Date select & search */}
                    <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-[#CB5534]" />
                        <label className="text-xs font-bold text-[#5C524C] uppercase tracking-widest shrink-0">Roster Date:</label>
                        <input
                          type="date"
                          value={rosterDate}
                          onChange={(e) => setRosterDate(e.target.value)}
                          className="bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl px-3 py-1.5 text-xs text-[#1E1A17] focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 border border-[#E2D9CD] rounded-xl bg-[#FBF7EE] px-3 py-1.5 flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-[#8E8279]" />
                        <input
                          type="text"
                          value={attSearch}
                          onChange={(e) => setAttSearch(e.target.value)}
                          placeholder="Search roster by name or ID..."
                          className="bg-transparent border-none text-xs outline-none text-[#1E1A17] w-full"
                        />
                      </div>
                    </div>

                    {/* Bulk controls bar */}
                    {selectedRosterIds.size > 0 && (
                      <div className="bg-white border-[#E2D9CD] border border-[#CB5534]/35 rounded-2xl p-4 flex items-center justify-between gap-4 animate-scale-in">
                        <span className="text-xs font-bold text-[#CB5534]">{selectedRosterIds.size} selected</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBulkAttendance('Present')}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs rounded-lg transition-all"
                          >
                            Mark Present
                          </button>
                          <button
                            onClick={() => handleBulkAttendance('Absent')}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all"
                          >
                            Mark Absent
                          </button>
                          <button
                            onClick={() => setSelectedRosterIds(new Set())}
                            className="px-3 py-1.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:bg-white/10 text-[#5C524C] rounded-lg text-xs"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Roster list */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <h4 className="text-sm font-bold text-[#5C524C]">Class Interns</h4>
                        <div className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={filteredRoster.length > 0 && selectedRosterIds.size === filteredRoster.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRosterIds(new Set(filteredRoster.map(r => r.employeeId)));
                              } else {
                                setSelectedRosterIds(new Set());
                              }
                            }}
                            className="w-4 h-4 accent-[#CB5534] rounded"
                          />
                          <span className="font-bold text-[#8E8279]">Select All</span>
                        </div>
                      </div>

                      {filteredRoster.length === 0 ? (
                        <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-12 text-center text-xs text-[#8E8279]">
                          📭 No interns matched query.
                        </div>
                      ) : (
                        filteredRoster.map(s => {
                          const isChecked = selectedRosterIds.has(s.employeeId);
                          const rec = attRecords[s.employeeId] || {};
                          const selfVal = rec.self || "not marked";
                          const classVal = rec.coordinator || "not marked";
                          const isQr = rec.source === 'qr' || rec.coordSource === 'qr';

                          return (
                            <div
                              key={s.employeeId}
                              className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedRosterIds(prev => {
                                      const next = new Set(prev);
                                      if (next.has(s.employeeId)) next.delete(s.employeeId);
                                      else next.add(s.employeeId);
                                      return next;
                                    });
                                  }}
                                  className="w-4 h-4 accent-[#CB5534] rounded shrink-0"
                                />
                                <div>
                                  <h4 className="text-sm font-bold text-[#1E1A17] leading-snug">{s.name}</h4>
                                  <div className="flex flex-wrap gap-2 mt-1 text-[9px] font-bold font-mono uppercase">
                                    <span className="text-[#8E8279]">ID: {s.employeeId}</span>
                                    <span className={`px-1.5 py-0.5 rounded ${
                                      selfVal === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    }`}>
                                      Self: {selfVal}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded ${
                                      classVal === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                    }`}>
                                      Class: {classVal}
                                    </span>
                                    {isQr && <span className="bg-[#CB5534]/5 border border-[#CB5534]/15 text-[#CB5534] px-1 py-0.5 rounded">📱 QR</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                                <button
                                  onClick={() => handleMarkCoordAttendance(s.employeeId, 'Absent')}
                                  className="px-3 py-1.5 border border-rose-200 hover:border-rose-500 hover:bg-rose-500 hover:text-white text-rose-600 text-xs font-semibold rounded-lg transition-all"
                                >
                                  Absent
                                </button>
                                <button
                                  onClick={() => handleMarkCoordAttendance(s.employeeId, 'Present')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-semibold rounded-lg transition-all"
                                >
                                  Present
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right QR Code column */}
                  <div className="md:col-span-4 bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 text-center space-y-4">
                    <QrCode className="w-8 h-8 text-[#CB5534] mx-auto" />
                    <h3 className="text-base font-bold text-[#1E1A17] font-serif tracking-tight">Roster Attendance QR</h3>
                    <p className="text-xs text-[#5C524C] leading-relaxed">
                      Students can scan this QR code to check in and mark their attendance.
                    </p>

                    {qrDataUrl ? (
                      <div className="space-y-4">
                        <div className="w-44 h-44 bg-white p-2 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                          <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={qrDataUrl}
                            download="attendance-qr.png"
                            className="flex-1 py-2 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 text-[#1E1A17] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Download QR
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-xs text-[#8E8279]">Generating QR...</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Student approvals tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 flex items-center gap-3">
                  <Search className="w-5 h-5 text-[#8E8279]" />
                  <input
                    type="text"
                    value={overviewSearch}
                    onChange={(e) => setOverviewSearch(e.target.value)}
                    placeholder="Search roster list to approve certification..."
                    className="bg-transparent border-none text-xs outline-none text-[#1E1A17] w-full placeholder-zinc-800"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredOverview.length === 0 ? (
                    <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-12 text-center text-xs text-[#8E8279] md:col-span-2">
                      📭 No interns matched query.
                    </div>
                  ) : (
                    filteredOverview.map(s => {
                      const st = s.stats || {};
                      const eligible = st.combinedPct >= 75;

                      return (
                        <div key={s._id} className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h4 className="text-base font-bold text-[#1E1A17] tracking-tight">{s.name}</h4>
                                <div className="text-[10px] text-[#8E8279] font-mono mt-0.5">ID: {s.employeeId} · Domain: {s.domain}</div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                eligible ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                              }`}>
                                {st.combinedPct || 0}% Combined
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 bg-[#FBF7EE]/40 p-3 rounded-xl border border-[#E2D9CD]/50 text-[10px] text-center font-mono">
                              <div>
                                <span className="text-[#8E8279] block uppercase">Self</span>
                                <span className="text-[#1E1A17] font-semibold">{st.selfPct || 0}% ({st.selfTotal || 0}d)</span>
                              </div>
                              <div>
                                <span className="text-[#8E8279] block uppercase">Class</span>
                                <span className="text-[#1E1A17] font-semibold">{st.coordPct || 0}% ({st.coordPresent || 0}/{st.coordTotal || 0})</span>
                              </div>
                              <div>
                                <span className="text-[#8E8279] block uppercase">Grade</span>
                                <span className="text-[#1E1A17] font-semibold">{s.performance || "B"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-[#E2D9CD]/50 pt-4">
                            {s.certificateApprovedByHR ? (
                              <div className="text-xs text-emerald-600 font-bold bg-emerald-950/10 p-2.5 rounded-xl border border-emerald-200 text-center">
                                🎓 Finalized: Approved by HR Department.
                              </div>
                            ) : s.certificateApprovedByCoordinator ? (
                              <div className="space-y-2 text-center">
                                <div className="text-xs text-[#8E8279] bg-[#FBF7EE]/40 p-2.5 rounded-xl border border-[#E2D9CD]/50 font-semibold">
                                  ✅ Approved by you. Awaiting HR review.
                                </div>
                                <button
                                  onClick={() => handleRevokeStudent(s._id)}
                                  className="w-full py-2 border border-rose-200 hover:border-rose-500 hover:bg-rose-500 hover:text-white text-rose-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                >
                                  Revoke Approval
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleApproveStudent(s._id, s.name)}
                                className="w-full py-2 bg-gradient-to-r from-[#CB5534] to-[#CB5534] hover:scale-[1.01] active:scale-95 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                              >
                                🎖 Approve Certification
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Announcements Broadcast tab */}
            {activeTab === 'notice' && (
              <div className="space-y-6">
                <form onSubmit={handleUpdateNotice} className="bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-4 max-w-2xl mx-auto">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
                  
                  <div className="flex items-center gap-2 border-b border-[#E2D9CD]/50 pb-3">
                    <Megaphone className="w-5 h-5 text-[#CB5534]" />
                    <h3 className="text-base font-bold text-[#1E1A17] font-serif">Broadcast Notices for {domainStr}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Morning Meeting Info</label>
                      <input
                        type="text"
                        value={notice.morningMeeting}
                        onChange={(e) => setNotice(prev => ({ ...prev, morningMeeting: e.target.value }))}
                        placeholder="e.g. 10:00 AM Roster Form"
                        className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Evening Meeting Info</label>
                      <input
                        type="text"
                        value={notice.eveningMeeting}
                        onChange={(e) => setNotice(prev => ({ ...prev, eveningMeeting: e.target.value }))}
                        placeholder="e.g. 6:00 PM Review Session"
                        className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Meeting Room URL Link</label>
                    <input
                      type="url"
                      value={notice.meetingLink}
                      onChange={(e) => setNotice(prev => ({ ...prev, meetingLink: e.target.value }))}
                      placeholder="https://meet.google.com/..."
                      className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Notice Announcement Text</label>
                    <textarea
                      value={notice.importantNotice}
                      onChange={(e) => setNotice(prev => ({ ...prev, importantNotice: e.target.value }))}
                      placeholder="Write important notes, rules, or deliverables instructions..."
                      rows={5}
                      className="w-full px-4 py-3 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] outline-none focus:border-[#CB5534]/35 resize-none transition-all"
                    />
                  </div>

                  <div className="pt-4 text-right">
                    <button
                      type="submit"
                      disabled={updatingNotice}
                      className="w-full py-2.5 bg-[#CB5534] hover:bg-[#B24629] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#CB5534]/15 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {updatingNotice ? "Broadcasting..." : "Broadcast Notice Updated"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Custom Tasks manager tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <form onSubmit={handleUploadTasks} className="bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-2 border-b border-[#E2D9CD]/50 pb-3">
                    <FolderLock className="w-5 h-5 text-[#CB5534]" />
                    <h3 className="text-base font-bold text-[#1E1A17] font-serif">Publish Custom Domain Tasks</h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Publish Custom Task Text (Optional)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        placeholder="Enter custom task instructions text..."
                        className="flex-1 px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] outline-none focus:border-[#CB5534]/35"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newTaskInput.trim()) return;
                          setTasksList(prev => [...prev, newTaskInput.trim()]);
                          setNewTaskInput("");
                        }}
                        className="px-4 bg-[#CB5534]/10 border border-[#CB5534]/20 hover:bg-[#CB5534]/25 text-[#CB5534] text-xs font-bold rounded-xl"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Tasks list preview */}
                  {tasksList.length > 0 && (
                    <div className="space-y-2 bg-[#FBF7EE]/20 p-4 border border-[#E2D9CD]/50 rounded-xl text-xs">
                      <div className="text-[9px] font-bold text-[#8E8279] uppercase tracking-wider">Pending Custom Tasks List:</div>
                      <div className="space-y-2">
                        {tasksList.map((t, i) => (
                          <div key={i} className="flex justify-between items-center bg-[#FBF7EE]/40 p-2.5 rounded-lg border border-[#E2D9CD]/50">
                            <span>{t}</span>
                            <button
                              type="button"
                              onClick={() => setTasksList(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-rose-600 hover:text-rose-300 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C] font-mono">Upload Task PDF / Document Attachment File</label>
                    <div className="relative border border-[#E2D9CD] rounded-xl bg-[#FBF7EE] py-6 text-center text-xs text-[#8E8279] hover:border-white/20 transition-colors">
                      <input
                        type="file"
                        onChange={(e) => setTaskFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span>{taskFile ? `📸 ${taskFile.name}` : "📁 Drag & drop or Choose Onboarding Attachment"}</span>
                    </div>
                    {coordinatorFileName && (
                      <div className="text-[10px] text-emerald-600 font-bold">Current published file: {coordinatorFileName}</div>
                    )}
                  </div>

                  <div className="pt-2 text-right">
                    <button
                      type="submit"
                      disabled={uploadingTask}
                      className="w-full py-2.5 bg-[#CB5534] hover:bg-[#B24629] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      {uploadingTask ? "Publishing..." : "Publish Tasks & Files"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Test questions management tab */}
            {activeTab === 'test' && (
              <div className="space-y-6">
                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 flex justify-between items-center flex-wrap gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-bold text-[#1E1A17] font-serif">Assessment Questionnaire Manager</h3>
                    <p className="text-[11px] text-[#8E8279]">Manual review or upload from assessment question PDFs.</p>
                  </div>
                  <button
                    onClick={() => setPdfOpen(true)}
                    className="px-4 py-2 border border-[#E2D9CD] hover:border-[#CB5534]/35 text-[#1E1A17] text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    📄 Parse PDF Questions
                  </button>
                </div>

                {/* Edit questionnaire manual list */}
                <div className="space-y-4">
                  {testQuestions.map((q, idx) => (
                    <div key={idx} className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 space-y-4 relative">
                      <button
                        onClick={() => setTestQuestions(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-4 right-4 text-xs text-rose-600 hover:underline"
                      >
                        Remove Block
                      </button>

                      <div className="text-xs font-bold text-[#8E8279]">Question {idx + 1}</div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestQuestions(prev => prev.map((item, i) => i === idx ? { ...item, question: val } : item));
                          }}
                          placeholder="Enter question content text..."
                          className="w-full px-4 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#8E8279]">Option {String.fromCharCode(65 + optIdx)}:</span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTestQuestions(prev => prev.map((item, i) => {
                                    if (i === idx) {
                                      const nextOpts = [...item.options];
                                      nextOpts[optIdx] = val;
                                      return { ...item, options: nextOpts };
                                    }
                                    return item;
                                  }));
                                }}
                                className="flex-1 px-3 py-1.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-2 text-xs">
                          <span className="font-bold text-[#8E8279]">Correct Option Answer:</span>
                          <select
                            value={q.correctAnswer}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setTestQuestions(prev => prev.map((item, i) => i === idx ? { ...item, correctAnswer: val } : item));
                            }}
                            className="bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl px-3 py-1 text-xs text-[#1E1A17]"
                          >
                            <option value={0}>A</option>
                            <option value={1}>B</option>
                            <option value={2}>C</option>
                            <option value={3}>D</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-between items-center gap-2 pt-4">
                    <button
                      onClick={() => setTestQuestions(prev => [...prev, { question: "", options: ["", "", "", ""], correctAnswer: 0 }])}
                      className="px-4 py-2 bg-white border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 text-[#1E1A17] hover:text-white text-xs font-bold rounded-xl"
                    >
                      + Add Question Block
                    </button>
                    <button
                      onClick={handleSaveTest}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#CB5534] to-[#CB5534] hover:scale-[1.01] active:scale-95 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Save Test Questions List
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Coding Challenge builder tab */}
            {activeTab === 'coding' && (
              <div className="space-y-6">
                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 flex justify-between items-center flex-wrap gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-bold text-[#1E1A17] font-serif">Algorithmic Problem Manager</h3>
                    <p className="text-[11px] text-[#8E8279]">Edit coding problems list and view submitted student verdicts.</p>
                  </div>
                  <button
                    onClick={() => setAddCodingOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-[#CB5534] to-[#CB5534] text-zinc-950 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    + Publish New Coding Challenge
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Coding questions published list */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-[#5C524C]">Published challenges</h4>
                    
                    {codingQuestions.length === 0 ? (
                      <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-12 text-center text-xs text-[#8E8279]">
                        No challenges.
                      </div>
                    ) : (
                      codingQuestions.map((q, idx) => (
                        <div key={q._id || idx} className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-4 flex justify-between items-center">
                          <div>
                            <h5 className="text-sm font-bold text-[#1E1A17] leading-snug">{q.title}</h5>
                            <span className="text-[10px] text-[#8E8279] font-mono mt-0.5">Diff: {q.difficulty} · {q.testCases?.length || 0} cases</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Coding submissions list */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-[#5C524C] font-mono">Recent Student Coding Submissions</h4>
                    
                    {codingSubmissions.length === 0 ? (
                      <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-12 text-center text-xs text-[#8E8279]">
                        No submissions logged.
                      </div>
                    ) : (
                      codingSubmissions.map((sub, idx) => (
                        <div key={sub._id || idx} className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-4 space-y-2">
                          <div className="flex justify-between items-start text-xs">
                            <div>
                              <h5 className="font-bold text-white">{sub.employeeId}</h5>
                              <span className="text-[9px] text-[#8E8279] font-mono">Lang: {sub.language}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              sub.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}>
                              {sub.status}
                            </span>
                          </div>
                          
                          {/* Code summary */}
                          <details className="group">
                            <summary className="text-[9px] font-bold text-[#8E8279] cursor-pointer font-mono select-none">Show code solution</summary>
                            <pre className="mt-2 bg-[#FBF7EE] p-2 border border-[#E2D9CD]/50 rounded-lg text-[10px] font-mono text-[#5C524C] overflow-x-auto whitespace-pre">
                              {sub.code}
                            </pre>
                          </details>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboards tab */}
            {activeTab === 'lbperf' && (
              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-4 text-center">
                <h3 className="text-base font-bold text-[#1E1A17] font-serif">Performance Ranks overview</h3>
                <div id="ten-extras-coord-mount" />
              </div>
            )}

            {/* Rules & Guidelines tab */}
            {activeTab === 'guidelines' && (
              <div className="space-y-6">
                <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-4 max-w-4xl mx-auto text-xs sm:text-sm text-[#1E1A17] leading-relaxed">
                  <h3 className="text-lg font-bold text-[#1E1A17] font-serif border-b border-[#E2D9CD]/50 pb-2">Coordinator Portal Standards</h3>
                  <ul className="space-y-3 list-disc pl-5 text-[#5C524C] leading-relaxed">
                    <li>Deliverable reviews should be logged accurately. Review choices (Approve/Reject) cannot be toggled once finalized.</li>
                    <li>Update roster meetings times every morning to support check-in notifications.</li>
                    <li>MCQ assessment questions can be saved in lists or imported from PDF templates.</li>
                    <li>Approve students for certification consideration only if domain tasks are fully checked.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF QUESTION EXTRACTOR MODAL */}
      {pdfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => { setPdfOpen(false); setPdfFile(null); setPdfParsedQuestions([]); setPdfStatus(""); }} className="absolute inset-0 bg-[#1E1A17]/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => { setPdfOpen(false); setPdfFile(null); setPdfParsedQuestions([]); setPdfStatus(""); }}
              className="absolute top-4 right-4 p-1.5 hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-lg text-[#8E8279] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#1E1A17] font-serif">Import Test Questions from PDF</h3>
              <p className="text-xs text-[#5C524C]">Attach a PDF document with multiple choice questions to auto-extract.</p>
            </div>

            <div className="space-y-4">
              <div className="relative border border-[#E2D9CD] rounded-xl bg-[#FBF7EE] py-8 text-center text-xs text-[#8E8279] hover:border-white/20 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span>{pdfFile ? `📄 ${pdfFile.name}` : "📁 Click to Choose PDF Document"}</span>
              </div>

              {pdfStatus && <div className="text-xs font-semibold text-[#1E1A17] text-center font-mono">{pdfStatus}</div>}

              {pdfParsedQuestions.length > 0 && (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  <div className="flex justify-between items-center text-xs px-1">
                    <span className="font-bold text-[#5C524C]">Extracted questions</span>
                    <button
                      onClick={() => {
                        if (selectedParsedIdx.size === pdfParsedQuestions.length) setSelectedParsedIdx(new Set());
                        else setSelectedParsedIdx(new Set(pdfParsedQuestions.map((_, i) => i)));
                      }}
                      className="text-[#8E8279] hover:text-white"
                    >
                      Toggle All
                    </button>
                  </div>

                  {pdfParsedQuestions.map((q, i) => {
                    const isChecked = selectedParsedIdx.has(i);
                    return (
                      <div key={i} className="bg-[#FBF7EE]/40 border border-[#E2D9CD]/50 rounded-xl p-4 flex gap-3 text-left items-start">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedParsedIdx(prev => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i);
                              else next.add(i);
                              return next;
                            });
                          }}
                          className="w-4 h-4 accent-[#CB5534] rounded mt-1 shrink-0"
                        />
                        <div className="space-y-2 flex-1 min-w-0 text-xs">
                          <h5 className="font-bold text-white leading-relaxed">Q{i + 1}. {q.question}</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#5C524C]">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className={`p-2 rounded border ${
                                q.correctAnswer === optIdx ? 'bg-emerald-950/10 border-emerald-200 text-emerald-600' : 'bg-white border-[#E2D9CD] border-[#E2D9CD]/50'
                              }`}>
                                <b>{String.fromCharCode(65 + optIdx)})</b> {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#E2D9CD]/50">
              <button
                onClick={handleParsePdfQuestions}
                disabled={pdfParsing}
                className="flex-1 py-2.5 bg-white border-[#E2D9CD] hover:bg-zinc-800 text-[#1E1A17] font-bold text-xs rounded-xl transition-all"
              >
                {pdfParsing ? "Extracting..." : "📄 Extract Questions"}
              </button>
              <button
                onClick={handleImportParsed}
                disabled={selectedParsedIdx.size === 0}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#CB5534] to-[#CB5534] disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Import Selected ({selectedParsedIdx.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW CODING CHALLENGE MODAL */}
      {addCodingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setAddCodingOpen(false)} className="absolute inset-0 bg-[#1E1A17]/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto text-left">
            <button
              onClick={() => setAddCodingOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-lg text-[#8E8279] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#1E1A17] font-serif">Publish Algorithmic Coding Challenge</h3>
              <p className="text-xs text-[#5C524C]">Add description details, languages starter, and validation test cases.</p>
            </div>

            <form onSubmit={handleAddCodingQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Problem Title *</label>
                  <input
                    type="text"
                    required
                    value={newCq.title}
                    onChange={(e) => setNewCq(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Difficulty Rating *</label>
                  <select
                    value={newCq.difficulty}
                    onChange={(e) => setNewCq(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Question Description &amp; Details *</label>
                <textarea
                  required
                  value={newCq.description}
                  onChange={(e) => setNewCq(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] outline-none focus:border-[#CB5534]/35 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Input Specification format</label>
                  <input
                    type="text"
                    value={newCq.inputFormat}
                    onChange={(e) => setNewCq(prev => ({ ...prev, inputFormat: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Output Specification format</label>
                  <input
                    type="text"
                    value={newCq.outputFormat}
                    onChange={(e) => setNewCq(prev => ({ ...prev, outputFormat: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Sample Stdin Input</label>
                  <textarea
                    value={newCq.sampleInput}
                    onChange={(e) => setNewCq(prev => ({ ...prev, sampleInput: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">Sample Expected Output</label>
                  <textarea
                    value={newCq.sampleOutput}
                    onChange={(e) => setNewCq(prev => ({ ...prev, sampleOutput: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] font-mono"
                  />
                </div>
              </div>

              {/* Coding Question Test Cases builder */}
              <div className="border-t border-[#E2D9CD]/50 pt-4 space-y-3">
                <div className="text-xs font-bold text-[#5C524C] uppercase tracking-widest">Test Validation Cases</div>
                
                <div className="bg-[#FBF7EE]/40 p-4 border border-[#E2D9CD]/50 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#8E8279] uppercase">Input stream arguments</label>
                      <textarea
                        value={newTcInput.input}
                        onChange={(e) => setNewTcInput(prev => ({ ...prev, input: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-1.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-lg text-xs font-mono text-[#1E1A17]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#8E8279] uppercase">Expected output verdict</label>
                      <textarea
                        value={newTcInput.output}
                        onChange={(e) => setNewTcInput(prev => ({ ...prev, output: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-1.5 bg-[#FBF7EE] border border-[#E2D9CD] rounded-lg text-xs font-mono text-[#1E1A17]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-[#8E8279]">
                      <input
                        type="checkbox"
                        checked={newTcInput.isHidden}
                        onChange={(e) => setNewTcInput(prev => ({ ...prev, isHidden: e.target.checked }))}
                        className="w-4 h-4 accent-[#CB5534] rounded"
                      />
                      Hidden test case from students
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTcInput.output) return;
                        setNewCq(prev => ({ ...prev, testCases: [...prev.testCases, newTcInput] }));
                        setNewTcInput({ input: "", output: "", isHidden: false });
                      }}
                      className="px-3 py-1.5 bg-[#CB5534]/10 border border-[#CB5534]/20 hover:bg-[#CB5534]/25 text-[#CB5534] font-bold rounded-lg"
                    >
                      + Add Case Block
                    </button>
                  </div>
                </div>

                {/* Test cases list previews */}
                {newCq.testCases.length > 0 && (
                  <div className="space-y-2">
                    {newCq.testCases.map((tc, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#FBF7EE] p-2.5 border border-[#E2D9CD]/50 rounded-lg text-xs">
                        <div>
                          <span className="font-bold text-[#8E8279]">Case #{idx + 1}</span>
                          <span className="text-[9px] text-[#CB5534] ml-2 uppercase font-mono">{tc.isHidden ? "Hidden" : "Public"}</span>
                          <div className="text-[10px] text-[#5C524C] font-mono mt-0.5 truncate max-w-sm">In: {tc.input} | Out: {tc.output}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewCq(prev => ({ ...prev, testCases: prev.testCases.filter((_, i) => i !== idx) }))}
                          className="text-rose-600 hover:text-rose-300 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3 border-t border-[#E2D9CD]/50">
                <button
                  type="button"
                  onClick={() => setAddCodingOpen(false)}
                  className="flex-1 py-2.5 border border-[#E2D9CD] hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#5C524C] font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#CB5534] to-[#CB5534] text-zinc-950 font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Publish Challenge
                </button>
              </div>
            </form>
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
                  <span className="block text-[9px] text-[#8E8279] uppercase tracking-widest mt-0.5">Coordinator Portal</span>
                </div>
              </div>

              <nav className="flex flex-col gap-1 text-xs font-semibold">
                <button
                  onClick={() => { setActiveTab('submissions'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'submissions' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" /> Task Submissions
                </button>
                <button
                  onClick={() => { setActiveTab('attendance'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'attendance' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <CalendarDays className="w-4 h-4 shrink-0" /> Mark Attendance
                </button>
                <button
                  onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'overview' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Users className="w-4 h-4 shrink-0" /> Student Approvals
                </button>
                <button
                  onClick={() => { setActiveTab('notice'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'notice' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Megaphone className="w-4 h-4 shrink-0" /> Notice Broadcast
                </button>
                <button
                  onClick={() => { setActiveTab('tasks'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'tasks' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <FolderLock className="w-4 h-4 shrink-0" /> Publish Custom Tasks
                </button>
                <button
                  onClick={() => { setActiveTab('test'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'test' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <PenSquare className="w-4 h-4 shrink-0" /> MCQ Test Manager
                </button>
                <button
                  onClick={() => { setActiveTab('coding'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'coding' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Code2 className="w-4 h-4 shrink-0" /> Coding Manager
                </button>
                <button
                  onClick={() => { setActiveTab('lbperf'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'lbperf' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Award className="w-4 h-4 shrink-0" /> Performance Ranks
                </button>
                <button
                  onClick={() => { setActiveTab('guidelines'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'guidelines' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" /> Portal Guidelines
                </button>
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/10 hover:border-rose-500 text-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Logout coordinator
            </button>
          </div>
        </div>
      )}

      {/* ALERT DIALOG SYSTEM */}
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
    </div>
  );
}
