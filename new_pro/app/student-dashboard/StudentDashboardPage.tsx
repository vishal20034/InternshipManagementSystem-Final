"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import {
  LayoutDashboard,
  Megaphone,
  ClipboardList,
  Code2,
  Send,
  CalendarDays,
  PenSquare,
  Award,
  BookOpen,
  FolderUp,
  CreditCard,
  LogOut,
  Bell,
  RefreshCw,
  User,
  X,
  FileDown,
  ChevronRight,
  TrendingUp,
  Brain,
  Video,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Coins,
  Menu,
  Eye,
  EyeOff,
  Terminal as TermIcon
} from 'lucide-react';
import BotWidget from '../../components/BotWidget';

interface Student {
  name?: string;
  fullName?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  employeeId: string;
  domain: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  college?: string;
  collegeName?: string;
  joiningDate?: string;
  internshipEnd?: string;
  endDate?: string;
  tenure?: string;
  joinerType?: 'new' | 'whatsapp';
  joinerTypeSelected?: boolean;
  onboardingPopupSeen?: boolean;
}

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  text: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const DOMAIN_CONFIG: Record<string, { icon: string; color: string; short: string }> = {
  "DevOps with AWS":         { icon: "☁️", color: "#f59e0b", short: "DevOps / AWS" },
  "Python Development":      { icon: "🐍", color: "#3b82f6", short: "Python Dev" },
  "Java Development":        { icon: "☕", color: "#ef4444", short: "Java Dev" },
  "Web Development":         { icon: "🌐", color: "#8b5cf6", short: "Web Dev" },
  "MERN Stack Development":  { icon: "⚛️", color: "#06b6d4", short: "MERN Stack" },
  "Artificial Intelligence": { icon: "🤖", color: "#10b981", short: "AI" },
  "Data Science":            { icon: "📊", color: "#6366f1", short: "Data Science" },
  "Cyber Security":          { icon: "🛡️", color: "#f43f5e", short: "Cyber Security" },
  "Software Engineering":    { icon: "💻", color: "#14b8a6", short: "Software Eng" },
  "Flutter Development":     { icon: "📱", color: "#0ea5e9", short: "Flutter Dev" },
  "HR Management":           { icon: "👔", color: "#CB5534", short: "HR Management" }
};

const TASKS_BY_DOMAIN: Record<string, string[]> = {
  "DevOps with AWS": ["Deploy static website on AWS", "Create EC2 instance", "Install Jenkins", "Dockerize node app"],
  "Python Development": ["Create calculator project", "Build API using Flask", "Build a web scraper", "Django REST API"],
  "Java Development": ["Bank management system", "OOP concepts demo", "Spring Boot REST API", "JDBC project"],
  "Web Development": ["Responsive landing page", "Portfolio website", "Build a todo app", "CSS animations project"],
  "MERN Stack Development": ["Todo fullstack app", "Authentication system", "Blog with CRUD", "Real-time chat app"],
  "Artificial Intelligence": ["AI chatbot", "Image classifier", "Sentiment analysis", "Object detection"],
  "Data Science": ["Data visualization", "Pandas analysis", "Machine learning model", "EDA project"],
  "Cyber Security": ["Nmap scan", "Security audit", "Password strength tool", "Basic firewall setup"],
  "Software Engineering": ["Agile sprint plan", "SDLC document", "UML diagrams", "Test case design"],
  "Flutter Development": ["Flutter UI demo", "Firebase auth", "Todo app in Flutter", "State management demo"],
  "HR Management": ["Employee onboarding plan", "Performance review template", "Policy document", "Recruitment funnel analysis"],
  "Venture Capital": ["VC pitch deck", "Startup valuation model", "Term sheet analysis", "Investment thesis document"],
  "Vibe Coding": ["Build a vibe-driven UI", "AI-assisted app prototype", "No-code tool project", "Prompt engineering demo"],
  "Space Research": ["Satellite orbit simulator", "Space mission report", "Astronomy data analysis", "Rocket trajectory model"],
  "Business Analyst": ["Requirements gathering doc", "Business process flowchart", "SWOT analysis report", "Use case diagram"],
  "HR": ["Job description writing", "Interview scorecard", "HR policy draft", "Employee engagement survey"]
};

const STARTER_CODE: Record<string, string> = {
  javascript: "// Read stdin if needed:\n// let s=''; process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>{ /* parse and print */ });\n\n",
  python: "# Read stdin if needed:\n# import sys; data = sys.stdin.read()\n\n",
  java: "import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n",
  cpp: "#include<bits/stdc++.h>\nusing namespace std;\nint main(){\n    \n    return 0;\n}\n"
};

const CM_MODES: Record<string, string> = {
  javascript: "javascript",
  python: "python",
  java: "text/x-java",
  cpp: "text/x-c++src"
};

export default function StudentDashboardPage() {
  const router = useRouter();

  // App & Auth states
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Modals visibility
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [joinerTypeOpen, setJoinerTypeOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  
  // Custom dialog alert state
  const [alertDialog, setAlertDialog] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    text: ''
  });

  // Task Submission states
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [selectedTaskName, setSelectedTaskName] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [submissionNote, setSubmissionNote] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);

  // Notice & Announcements state
  const [notice, setNotice] = useState({
    title: "Important Notice",
    importantNotice: "No notice",
    morningMeeting: "Not updated",
    eveningMeeting: "Not updated",
    meetingLink: ""
  });

  // Coordinator Tasks state
  const [coordinatorTasks, setCoordinatorTasks] = useState<string[]>([]);
  const [coordinatorFileUrl, setCoordinatorFileUrl] = useState("");
  const [coordinatorFileName, setCoordinatorFileName] = useState("");

  // Submissions state
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Attendance stats state
  const [attendanceStats, setAttendanceStats] = useState({
    selfPct: 0,
    selfTotal: 0,
    coordPct: 0,
    coordPresent: 0,
    coordTotal: 0,
    combinedPct: 0,
    combinedPresentDays: 0,
    eligible: false
  });
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [attendanceMarkedToday, setAttendanceMarkedToday] = useState(false);

  // Documents state
  const [docUploadStatus, setDocUploadStatus] = useState({
    visible: false,
    status: "",
    rejectionReason: ""
  });

  // Performance state
  const [performance, setPerformance] = useState({
    score: 0,
    grade: "B",
    currentStreak: 0,
    bestStreak: 0,
    certificateApproved: false
  });

  // V2 Task Journey state
  const [v2Stats, setV2Stats] = useState({
    totalCoins: 0,
    approved: 0,
    available: 0,
    v2Onboarded: false
  });

  // Coding problem state
  const [codingQuestions, setCodingQuestions] = useState<any[]>([]);
  const [codingModalOpen, setCodingModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeContent, setCodeContent] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [runLoading, setRunLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [codeOutput, setCodeOutput] = useState("— output will appear here —");
  const [codeVerdict, setCodeVerdict] = useState<any>(null);
  const [codingTab, setCodingTab] = useState<'editor' | 'terminal'>('editor');

  // Proctoring States
  const [violations, setViolations] = useState(0);
  const [procStatus, setProcStatus] = useState("Off");
  const [procWarning, setProcWarning] = useState("");
  const violationCountRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cleanupProctoringRef = useRef<() => void>(() => {});

  // Terminal States
  const xtermRef = useRef<HTMLDivElement | null>(null);
  const xtermInstanceRef = useRef<any>(null);
  const fitAddonInstanceRef = useRef<any>(null);
  const socketInstanceRef = useRef<any>(null);

  // External scripts loaded trigger
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // CodeMirror refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const cmInstanceRef = useRef<any>(null);

  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  // Section titles mapping
  const sectionTitles: Record<string, string> = {
    'overview': 'Dashboard Overview',
    'notice': 'Important Notice',
    'domain-tasks': 'Your Domain Tasks',
    'coding': 'Coding Problems',
    'submissions': 'Submitted Tasks',
    'attendance': 'Daily Attendance',
    'test': 'Domain MCQ Test',
    'guidelines': 'Internship Guidelines',
    'leaderboard': 'Extras & Badges'
  };

  // Auth & Init
  useEffect(() => {
    try {
      const stored = localStorage.getItem('student');
      if (!stored) {
        router.push('/login');
        return;
      }
      const stu: Student = JSON.parse(stored);
      if (!stu || !stu.employeeId) {
        router.push('/login');
        return;
      }
      setStudent(stu);
      setLoading(false);

      // Trigger Onboarding Popup checking
      const legacyInstructions = localStorage.getItem('tenInstructionsSeen_' + stu.employeeId);
      if (!stu.onboardingPopupSeen && !legacyInstructions) {
        setOnboardingOpen(true);
      }

      // Trigger Joiner Type Popup checking
      const legacyJoiner = localStorage.getItem('tenJoinerType_' + stu.employeeId);
      if (!stu.joinerTypeSelected && !legacyJoiner) {
        setJoinerTypeOpen(true);
      }

      // Refresh student profile from server
      fetchProfileData(stu.employeeId);
    } catch (err) {
      router.push('/login');
    }
  }, []);

  // Fetch all dashboard data when student state changes
  useEffect(() => {
    if (student) {
      refreshAllData();
      startSSE();
    }
  }, [student]);

  // CodeMirror initialization hook
  useEffect(() => {
    if (codingModalOpen && editorRef.current && (window as any).CodeMirror) {
      // Cleanup previous CodeMirror instance if exists
      if (cmInstanceRef.current) {
        cmInstanceRef.current.toTextArea();
        cmInstanceRef.current = null;
      }

      cmInstanceRef.current = (window as any).CodeMirror.fromTextArea(editorRef.current, {
        lineNumbers: true,
        theme: "dracula",
        mode: CM_MODES[selectedLanguage] || "javascript",
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: false,
        autofocus: true
      });

      cmInstanceRef.current.setValue(STARTER_CODE[selectedLanguage] || "");

      cmInstanceRef.current.on('change', (cm: any) => {
        setCodeContent(cm.getValue());
      });
    }

    return () => {
      if (cmInstanceRef.current) {
        cmInstanceRef.current.toTextArea();
        cmInstanceRef.current = null;
      }
    };
  }, [codingModalOpen, selectedLanguage, scriptsLoaded]);

  // SSE (Server Sent Events) Connection
  const startSSE = () => {
    if (!student) return;
    try {
      const src = new EventSource('/student-events/' + encodeURIComponent(student.employeeId));
      src.onmessage = (e) => {
        if (!e.data || e.data === 'connected') return;
        try {
          const payload = JSON.parse(e.data);
          if (payload.event === 'notification') {
            const n = payload.notification;
            // Show custom alert toast
            triggerAlert('info', n.title, n.message);
            loadNotifications();
            if (n.title === 'Class attendance marked' || n.title === 'Class attendance updated') {
              loadAttendance();
            }
          }
          if (payload.event === 'notice-updated') {
            loadNotice();
          }
        } catch (_) {}
      };

      return () => {
        src.close();
      };
    } catch (_) {}
  };

  const fetchProfileData = async (empId: string) => {
    try {
      const response = await fetch('/api/v2/student/me', {
        headers: { 'x-employee-id': empId }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.student) {
          const updatedStudent = { ...student, ...data.student } as Student;
          setStudent(updatedStudent);
          localStorage.setItem('student', JSON.stringify(updatedStudent));
        }
      }
    } catch (_) {}
  };

  const refreshAllData = () => {
    loadNotice();
    loadSubmissions();
    loadCoordinatorTasks();
    loadAttendance();
    loadV2TaskJourney();
    loadPerformance();
    loadCodingProblems();
    loadNotifications();
  };

  const triggerAlert = (type: AlertState['type'], title: string, text: string, onConfirm?: () => void, onCancel?: () => void) => {
    setAlertDialog({
      isOpen: true,
      type,
      title,
      text,
      onConfirm,
      onCancel
    });
  };

  const closeAlert = () => {
    setAlertDialog(prev => ({ ...prev, isOpen: false }));
  };

  // 1. Notice fetcher
  const loadNotice = async () => {
    if (!student) return;
    try {
      const r = await fetch("/get-notice/" + encodeURIComponent(student.domain));
      if (r.ok) {
        const d = await r.json();
        setNotice({
          title: d.title || "Important Notice",
          importantNotice: d.importantNotice || "No notice",
          morningMeeting: d.morningMeeting || "Not updated",
          eveningMeeting: d.eveningMeeting || "Not updated",
          meetingLink: d.meetingLink || ""
        });
      }
    } catch (_) {}
  };

  // 2. Coordinator tasks fetcher
  const loadCoordinatorTasks = async () => {
    if (!student) return;
    try {
      const res = await fetch("/coordinator/tasks/" + encodeURIComponent(student.domain));
      if (res.ok) {
        const data = await res.json();
        setCoordinatorTasks(data.tasks || []);
        setCoordinatorFileUrl(data.fileUrl || "");
        setCoordinatorFileName(data.fileName || "");
      }
    } catch (_) {}
  };

  // 3. Submissions load
  const loadSubmissions = async () => {
    if (!student) return;
    try {
      const response = await fetch(`/student-submissions/${encodeURIComponent(student.employeeId)}`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (_) {}
  };

  // 4. Attendance fetcher
  const loadAttendance = async () => {
    if (!student) return;
    try {
      const r = await fetch(`/attendance/student/${encodeURIComponent(student.employeeId)}`);
      if (r.ok) {
        const d = await r.json();
        if (d.success) {
          setAttendanceStats(d.stats || {});
          setAttendanceHistory(d.attendance || []);
          setAttendanceMarkedToday(d.markedToday || false);
        }
      }
    } catch (_) {}
  };

  // 5. V2 Task Journey fetcher
  const loadV2TaskJourney = async () => {
    if (!student) return;
    try {
      const res = await fetch('/api/v2/student/status', {
        headers: { 'x-employee-id': student.employeeId }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setV2Stats({
            totalCoins: data.totalCoins ?? 0,
            approved: data.taskStats?.approved ?? 0,
            available: (data.taskStats?.available ?? 0) + (data.taskStats?.in_progress ?? 0),
            v2Onboarded: data.v2Onboarded ?? false
          });
        }
      }
    } catch (_) {}
  };

  // 6. Performance loader
  const loadPerformance = async () => {
    if (!student) return;
    try {
      const r = await fetch(`/students/${encodeURIComponent(student.employeeId)}/performance`);
      if (r.ok) {
        const d = await r.json();
        if (d.success && d.performance) {
          setPerformance({
            score: d.performance.score || 0,
            grade: d.performance.grade || "B",
            currentStreak: d.performance.currentStreak || 0,
            bestStreak: d.performance.bestStreak || 0,
            certificateApproved: d.performance.certificateApprovedByHR || false
          });
        }
      }
    } catch (_) {}
  };

  // 7. Coding problems loader
  const loadCodingProblems = async () => {
    if (!student) return;
    try {
      const r = await fetch(`/student/coding-questions/${encodeURIComponent(student.domain)}`);
      if (r.ok) {
        const d = await r.json();
        setCodingQuestions(d.questions || []);
      }
    } catch (_) {}
  };

  // 8. Notifications loading
  const loadNotifications = async () => {
    if (!student) return;
    try {
      const r = await fetch(`/notifications/student/${encodeURIComponent(student.employeeId)}`);
      if (r.ok) {
        const d = await r.json();
        setNotifications(d.notifications || []);
        setUnreadNotificationsCount(d.unread || 0);
      }
    } catch (_) {}
  };

  // Set document upload status
  useEffect(() => {
    if (student) {
      const getDocStatus = async () => {
        try {
          const r = await fetch('/api/v2/documents/my-status', { headers: { 'x-employee-id': student.employeeId } });
          if (r.ok) {
            const d = await r.json();
            if (d.success) {
              if (d.status === 'not_uploaded' || d.status === 'rejected' || d.status === 'pending' || d.status === 'under_review') {
                setDocUploadStatus({
                  visible: true,
                  status: d.status,
                  rejectionReason: d.rejectionReason || ""
                });
              } else {
                setDocUploadStatus(prev => ({ ...prev, visible: false }));
              }
            }
          }
        } catch (_) {}
      };
      getDocStatus();
    }
  }, [student]);

  // Give Attendance function
  const markSelfAttendance = async () => {
    if (!student) return;
    try {
      const r = await fetch("/attendance/self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: student.employeeId })
      });
      const d = await r.json();
      if (d.success) {
        triggerAlert('success', 'Attendance Marked', 'Your attendance for today is successfully recorded!');
        loadAttendance();
      } else if (d.alreadyMarked) {
        triggerAlert('info', 'Already Marked', 'You have already marked attendance for today.');
      } else {
        triggerAlert('error', 'Mark Failed', d.message || 'Could not register attendance.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Failed to connect to attendance API.');
    }
  };

  // Submit task handler
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    if (!githubLink.trim()) {
      triggerAlert('error', 'Validation Error', 'Github link is required.');
      return;
    }

    setSubmittingTask(true);
    try {
      const formData = new FormData();
      formData.append("employeeId", student.employeeId);
      formData.append("domain", student.domain);
      formData.append("githubLink", githubLink);
      formData.append("note", submissionNote);
      formData.append("task", selectedTaskName);
      if (imageFile) formData.append("image", imageFile);
      if (pdfFile) formData.append("pdf", pdfFile);

      const response = await fetch("/submit-task", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert('success', 'Task Submitted', 'Your task has been successfully uploaded for review.');
        setSubmissionModalOpen(false);
        setGithubLink("");
        setSubmissionNote("");
        setImageFile(null);
        setPdfFile(null);
        loadSubmissions();
      } else {
        triggerAlert('error', 'Submission Failed', data.message || 'Failed to submit the task.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'A network error occurred while submitting.');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Delete submission
  const handleDeleteSubmission = (id: string) => {
    if (!student) return;
    triggerAlert('confirm', 'Delete Submission?', 'Are you sure you want to delete this submission? This will also remove the uploaded files.', async () => {
      closeAlert();
      try {
        const res = await fetch(`/submissions/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: student.employeeId })
        });
        const data = await res.json();
        if (data.success) {
          triggerAlert('success', 'Deleted', 'Submission successfully removed.');
          loadSubmissions();
        } else {
          triggerAlert('error', 'Failed', data.message || 'Could not delete submission.');
        }
      } catch (_) {
        triggerAlert('error', 'Error', 'Failed to submit delete request.');
      }
    }, () => closeAlert());
  };

  // Onboarding modal dismiss
  const acknowledgeOnboarding = async () => {
    if (!student) return;
    try {
      // Set local storage
      localStorage.setItem('tenInstructionsSeen_' + student.employeeId, 'true');
      const updated = { ...student, onboardingPopupSeen: true };
      setStudent(updated);
      localStorage.setItem('student', JSON.stringify(updated));
      setOnboardingOpen(false);

      // Persist to server
      await fetch('/api/v2/student/mark-onboarding-seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-employee-id': student.employeeId }
      });
    } catch (_) {}
  };

  // Joiner Type modal selection
  const handleSelectJoinerType = async (type: 'new' | 'whatsapp') => {
    if (!student) return;
    try {
      // Set local storage
      localStorage.setItem('tenJoinerType_' + student.employeeId, type);
      const updated = { ...student, joinerTypeSelected: true, joinerType: type };
      setStudent(updated);
      localStorage.setItem('student', JSON.stringify(updated));
      setJoinerTypeOpen(false);

      // Persist to server
      await fetch('/api/v2/student/set-joiner-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-employee-id': student.employeeId },
        body: JSON.stringify({ joinerType: type })
      });
    } catch (_) {}
  };

  // Notifications Mark all read
  const markNotificationsAllRead = async () => {
    if (!student) return;
    try {
      await fetch('/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerId: student.employeeId })
      });
      setUnreadNotificationsCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, readBy: [...n.readBy, student.employeeId] })));
    } catch (_) {}
  };

  // Logout handler
  const handleLogout = () => {
    triggerAlert('confirm', 'Logout', 'Are you sure you want to exit and logout from the TEN Portal?', () => {
      localStorage.removeItem('student');
      localStorage.removeItem('employeeId');
      localStorage.removeItem('ten_token');
      localStorage.removeItem('ten_employee_id');
      sessionStorage.clear();
      router.push('/login');
    }, () => closeAlert());
  };

  // Open coding problem modal
  const handleOpenCodingProblem = async (qid: string) => {
    try {
      const res = await fetch("/student/coding-questions/question/" + qid);
      const data = await res.json();
      if (data.success && data.question) {
        setSelectedQuestion(data.question);
        setCodingModalOpen(true);
        setCodeOutput("— output will appear here —");
        setCodeVerdict(null);
        setSelectedLanguage("javascript");
        setCodeContent(STARTER_CODE.javascript);
        
        // Start proctoring camera
        setTimeout(() => startProctoring(data.question._id), 400);
      } else {
        triggerAlert('error', 'Error', 'Failed to retrieve problem details.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Network error occurred while fetching problem.');
    }
  };

  // Close coding problem modal
  const handleCloseCodingModal = () => {
    cleanupProctoringRef.current();
    cleanupTerminal();
    setCodingModalOpen(false);
    setSelectedQuestion(null);
    setCodingTab('editor');
  };

  // Proctoring logic
  const startProctoring = async (qid: string) => {
    violationCountRef.current = 0;
    setViolations(0);
    setProcWarning("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setProcStatus("Active");
    } catch (err) {
      setProcStatus("Blocked");
      setProcWarning("Camera access blocked — test may be flagged");
    }

    const blurListener = () => {
      registerViolation(qid, "Tab/Window switch detected");
    };
    const visibilityListener = () => {
      if (document.hidden) {
        registerViolation(qid, "Tab hidden / minimized");
      }
    };

    window.addEventListener('blur', blurListener);
    document.addEventListener('visibilitychange', visibilityListener);

    cleanupProctoringRef.current = () => {
      window.removeEventListener('blur', blurListener);
      document.removeEventListener('visibilitychange', visibilityListener);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setProcStatus("Off");
    };
  };

  const registerViolation = async (qid: string, reason: string) => {
    violationCountRef.current++;
    setViolations(violationCountRef.current);
    setProcWarning(reason);
    setTimeout(() => {
      setProcWarning(prev => prev === reason ? "" : prev);
    }, 4000);

    try {
      await fetch('/student/proctoring/violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: student?.employeeId || '',
          questionId: qid,
          reason,
          violationNumber: violationCountRef.current,
          timestamp: new Date().toISOString()
        })
      });
    } catch (_) {}
  };

  // Compile / Run Code compiler
  const handleRunCode = async () => {
    if (!selectedQuestion) return;
    setRunLoading(true);
    setCodeOutput("⏳ Running…");
    try {
      const res = await fetch("/code/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeContent,
          language: selectedLanguage,
          input: customInput
        })
      });
      const d = await res.json();
      const time = d.executionTime != null ? ` · ${d.executionTime} ms` : "";
      if (d.success) {
        setCodeOutput((d.output && d.output.length ? d.output : "(no output)") + `\n\n— ✅ Run complete${time}`);
      } else {
        setCodeOutput((d.output ? d.output + "\n\n" : "") + (d.error || "(unknown error)") + `\n\n— ❌ Status: ${d.error || "Error"}${time}`);
      }
    } catch (e: any) {
      setCodeOutput("Network error: " + (e.message || e));
    } finally {
      setRunLoading(false);
    }
  };

  // Submit code compiler against test cases
  const handleSubmitCode = async () => {
    if (!selectedQuestion || !student) return;
    setSubmitLoading(true);
    setCodeOutput("⏳ Submitting and running against all test cases…");
    try {
      const res = await fetch("/code/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: student.employeeId,
          questionId: selectedQuestion._id,
          language: selectedLanguage,
          code: codeContent
        })
      });
      const d = await res.json();
      const verdict = d.status || (d.success ? "Accepted" : "Failed");
      setCodeVerdict(verdict);

      let lines = [
        `── Verdict: ${verdict} ──`,
        `Passed ${d.passedCases || 0} / ${d.totalCases || 0} test cases`,
        ""
      ];

      (d.results || []).forEach((c: any, i: number) => {
        lines.push(`• Case ${i + 1}${c.isHidden ? " (hidden)" : ""}: ${c.passed ? "✅ pass" : "❌ fail"}`);
        if (!c.passed && !c.isHidden) {
          lines.push(`    input    : ${c.input || ""}`);
          lines.push(`    expected : ${c.expected || ""}`);
          lines.push(`    actual   : ${c.actual || ""}`);
          if (c.error) lines.push(`    error    : ${c.error}`);
        }
      });

      setCodeOutput(lines.join("\n"));

      if (verdict === "Accepted") {
        triggerAlert('success', 'Problem Solved!', `Congratulations! Passed ${d.passedCases}/${d.totalCases} cases.`);
        setTimeout(() => {
          setCodeOutput(prev => prev + "\n\n🐙 If GitHub integration is configured, your solution will be pushed automatically.");
        }, 1500);
      }
    } catch (e: any) {
      setCodeOutput("Network error: " + (e.message || e));
    } finally {
      setSubmitLoading(false);
    }
  };

  // Terminal Workspace generator
  const handleOpenTerminalWorkspace = async () => {
    if (!selectedQuestion || !student) return;
    try {
      const res = await fetch("/student/coding/open-terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: student.employeeId,
          questionId: selectedQuestion._id,
          language: selectedLanguage
        })
      });
      const d = await res.json();
      if (d.success) {
        triggerAlert('info', 'Terminal Workspace Ready', `Directory: ${d.workDir}\n\nRun command:\n${d.launchCmd}\n\nEdit files in workspace, then run ./submit.sh to submit.`);
      } else {
        triggerAlert('error', 'Failed', d.message || 'Could not build terminal environment.');
      }
    } catch (_) {
      triggerAlert('error', 'Error', 'Server connection error.');
    }
  };

  // xterm.js tab switching
  const handleSwitchTab = (tab: 'editor' | 'terminal') => {
    setCodingTab(tab);
    if (tab === 'terminal') {
      setTimeout(() => initTerminal(selectedQuestion, selectedLanguage), 100);
    } else {
      cleanupTerminal();
    }
  };

  const initTerminal = (question: any, lang: string) => {
    if (!(window as any).Terminal || !xtermRef.current) return;
    
    // Prevent double init
    if (xtermInstanceRef.current) return;

    const term = new (window as any).Terminal({
      theme: { background: '#0c1220', foreground: '#cdd9ec', cursor: '#f5c542' },
      fontFamily: 'Consolas, Monaco, monospace',
      fontSize: 14,
      cursorBlink: true,
      convertEol: true,
      scrollback: 1000,
    });

    const fitAddon = new (window as any).FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(xtermRef.current);
    fitAddon.fit();

    xtermInstanceRef.current = term;
    fitAddonInstanceRef.current = fitAddon;

    const socket = (window as any).io({
      path: '/socket.io',
      auth: { role: 'student', employeeId: student?.employeeId }
    });

    socketInstanceRef.current = socket;

    socket.emit('terminal:start', {
      questionId: question._id,
      employeeId: student?.employeeId,
      language: lang,
      title: question.title || '',
      description: question.description || '',
      sampleInput: question.sampleInput || '',
      sampleOutput: question.sampleOutput || '',
    });

    socket.on('terminal:data', (d: string) => term.write(d));
    socket.on('terminal:error', (msg: string) => term.writeln(`\r\n\x1b[31m${msg}\x1b[0m\r\n`));
    term.onData((input: string) => socket.emit('terminal:input', input));

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);
    (window as any)._terminalResizeHandler = handleResize;
  };

  const cleanupTerminal = () => {
    if (socketInstanceRef.current) {
      socketInstanceRef.current.emit('terminal:kill');
      socketInstanceRef.current.off('terminal:data');
      socketInstanceRef.current.off('terminal:error');
      socketInstanceRef.current.disconnect();
      socketInstanceRef.current = null;
    }
    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.dispose();
      xtermInstanceRef.current = null;
    }
    if ((window as any)._terminalResizeHandler) {
      window.removeEventListener('resize', (window as any)._terminalResizeHandler);
      delete (window as any)._terminalResizeHandler;
    }
    fitAddonInstanceRef.current = null;
  };

  // Generate Landscape Certificate
  const handleGenerateCertificate = async () => {
    if (!student) return;
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210;
      const name = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim();
      const domain = student.domain || '';
      const empId = student.employeeId || '';
      const tenure = student.tenure || '1 Month';
      const certId = 'TEN-CERT-' + empId.replace(/\//g, '-') + '-' + Date.now().toString(36).toUpperCase();
      const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

      // Draw background
      doc.setFillColor(4, 7, 15);
      doc.rect(0, 0, W, H, 'F');

      // Draw borders
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(1.5);
      doc.rect(8, 8, W - 16, H - 16);
      doc.setLineWidth(0.4);
      doc.rect(11, 11, W - 22, H - 22);

      // Corner dots
      [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]].forEach(([x, y]) => {
        doc.setFillColor(212, 175, 55);
        doc.circle(x, y, 2, 'F');
      });

      // Top line
      doc.setFillColor(212, 175, 55);
      doc.rect(20, 20, W - 40, 1.5, 'F');

      // Draw texts
      doc.setFontSize(9);
      doc.setTextColor(212, 175, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('THE ENTREPRENEURSHIP NETWORK', W / 2, 34, { align: 'center' });

      doc.setFontSize(28);
      doc.setTextColor(240, 230, 200);
      doc.text('Certificate of Completion', W / 2, 64, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(160, 140, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('This is to certify that', W / 2, 77, { align: 'center' });

      doc.setFontSize(32);
      doc.setTextColor(212, 175, 55);
      doc.setFont('helvetica', 'bold');
      doc.text(name, W / 2, 94, { align: 'center' });

      const nameWidth = doc.getTextWidth(name);
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(W / 2 - nameWidth / 2, 97, W / 2 + nameWidth / 2, 97);

      doc.setFontSize(11);
      doc.setTextColor(200, 190, 170);
      doc.setFont('helvetica', 'normal');
      doc.text('has successfully completed the', W / 2, 108, { align: 'center' });

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(domain + ' Internship', W / 2, 120, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(160, 150, 130);
      doc.setFont('helvetica', 'normal');
      doc.text('Duration: ' + tenure + '   |   Employee ID: ' + empId, W / 2, 132, { align: 'center' });

      // Signatures line
      doc.setFillColor(212, 175, 55);
      doc.rect(20, H - 35, W - 40, 0.8, 'F');

      doc.setFontSize(9);
      doc.setTextColor(200, 190, 170);
      doc.text('_________________________', 55, H - 22, { align: 'center' });
      doc.text('Domain Coordinator', 55, H - 16, { align: 'center' });
      doc.setTextColor(212, 175, 55);
      doc.setFont('helvetica', 'bold');
      doc.text(domain, 55, H - 11, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 190, 170);
      doc.text('_________________________', W - 55, H - 22, { align: 'center' });
      doc.text('HR Department', W - 55, H - 16, { align: 'center' });
      doc.setTextColor(212, 175, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('TEN — The Entrepreneurship Network', W - 55, H - 11, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(160, 150, 130);
      doc.text('Issued on: ' + dateStr, W / 2, H - 22, { align: 'center' });

      doc.setFontSize(7);
      doc.setTextColor(80, 75, 65);
      doc.text('Certificate ID: ' + certId, W / 2, H - 15, { align: 'center' });

      doc.save('TEN_Certificate_' + name.replace(/\s+/g, '_') + '.pdf');

      // Add confetti
      if ((window as any).confetti) {
        (window as any).confetti({ particleCount: 200, spread: 100, colors: ['#CB5534', '#10b981', '#ffffff', '#f5c542'] });
      }
    } catch (_) {
      triggerAlert('error', 'Certificate Error', 'Could not compile and download your PDF certificate.');
    }
  };

  // Draw ID Card to Canvas & Download
  const handleGenerateIDCard = () => {
    if (!student) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 648, H = 408;
    canvas.width = W;
    canvas.height = H;

    const name = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim();
    const empId = student.employeeId;
    const domain = student.domain;
    const joined = student.joiningDate || '';

    // Draw background
    ctx.fillStyle = '#04070f';
    ctx.fillRect(0, 0, W, H);
    
    // Draw gold accent bar
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#CB5534');
    grad.addColorStop(1, '#6b4c0a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 10, H);
    
    // Draw inner stroke border
    ctx.strokeStyle = 'rgba(212,175,55,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    
    // Branding
    ctx.fillStyle = '#CB5534';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('TEN', 30, 50);
    ctx.fillStyle = '#8a8070';
    ctx.font = '11px Arial';
    ctx.fillText('The Entrepreneurship Network', 30, 68);
    
    // Horizontal divider
    ctx.fillStyle = 'rgba(212,175,55,0.3)';
    ctx.fillRect(30, 78, W - 60, 1);
    
    // Avatar slot
    ctx.fillStyle = 'rgba(212,175,55,0.15)';
    ctx.beginPath();
    ctx.arc(80, 160, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#CB5534';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Initials in avatar
    ctx.fillStyle = '#CB5534';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    const initials = name.split(' ').map(n => n[0] || '').join('').substring(0, 2).toUpperCase();
    ctx.fillText(initials, 80, 170);
    
    // Details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f0eee8';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(name, 155, 130);
    
    ctx.fillStyle = '#CB5534';
    ctx.font = 'bold 14px Courier New, monospace';
    ctx.fillText(empId, 155, 155);
    
    ctx.fillStyle = '#8a8070';
    ctx.font = '12px Arial';
    ctx.fillText('Domain:', 155, 180);
    ctx.fillStyle = '#f0eee8';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(domain, 155, 198);
    
    if (joined) {
      ctx.fillStyle = '#8a8070';
      ctx.font = '11px Arial';
      ctx.fillText('Joined: ' + joined, 155, 220);
    }
    
    // Footer band
    ctx.fillStyle = 'rgba(212,175,55,0.08)';
    ctx.fillRect(0, H - 50, W, 50);
    
    ctx.fillStyle = '#CB5534';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('INTERN', W / 2, H - 28);
    ctx.fillStyle = '#8a8070';
    ctx.font = '10px Arial';
    ctx.fillText('TEN — The Entrepreneurship Network', W / 2, H - 12);

    // Save as download
    const link = document.createElement('a');
    link.download = 'TEN_ID_Card_' + empId.replace(/\//g, '-') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const getMatchedDomain = (d: string) => {
    if (!d) return d;
    const keys = Object.keys(TASKS_BY_DOMAIN);
    if (TASKS_BY_DOMAIN[d]) return d;
    const lower = d.toLowerCase().trim();
    const found = keys.find(k => k.toLowerCase().trim() === lower);
    if (found) return found;
    const partial = keys.find(k => k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase()));
    return partial || d;
  };

  const currentDomainConfig = student ? DOMAIN_CONFIG[student.domain] || { icon: "🎓", color: "#3b82f6", short: student.domain } : null;
  const currentDomainTasks = student ? TASKS_BY_DOMAIN[getMatchedDomain(student.domain)] || [] : [];

  // Switch tabs & trigger data refetches
  const handleOpenSection = (sectionId: string) => {
    setActiveSection(sectionId);
    setSidebarOpen(false);

    if (sectionId === 'attendance') loadAttendance();
    if (sectionId === 'notice') loadNotice();
    if (sectionId === 'submissions') loadSubmissions();
    if (sectionId === 'coordinator-tasks') loadCoordinatorTasks();
    if (sectionId === 'coding') loadCodingProblems();
  };

  // Section specific content renderer
  const renderSectionContent = () => {
    if (!student) return null;
    const name = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';

    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Profile info card */}
            <div className="bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#CB5534]/5 blur-3xl rounded-full" />
              <div className="flex items-center gap-5 flex-col sm:flex-row text-center sm:text-left">
                <div className="w-16 h-16 bg-gradient-to-r from-[#CB5534] to-[#CB5534] rounded-full flex items-center justify-center text-zinc-950 font-bold text-2xl shadow-lg shrink-0">
                  {name[0]?.toUpperCase() || '?'}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-[#1E1A17] tracking-tight">{name}</h3>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <span className="px-2.5 py-0.5 bg-[#CB5534]/10 border border-[#CB5534]/25 text-[#CB5534] rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {student.domain}
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] text-[#5C524C] rounded-full text-[10px] font-mono">
                      ID: {student.employeeId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance quick look ring */}
              <div className="flex items-center gap-4 border-t md:border-t-0 border-[#E2D9CD]/50 pt-4 md:pt-0 w-full md:w-auto justify-center">
                <div className="relative w-16 h-16 shrink-0">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="24" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                    <circle
                      cx="32"
                      cy="32"
                      r="24"
                      stroke={attendanceStats.combinedPct >= 75 ? '#10b981' : attendanceStats.combinedPct >= 50 ? '#f59e0b' : '#f43f5e'}
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray="150.8"
                      strokeDashoffset={150.8 - (Math.min(attendanceStats.combinedPct, 100) / 100) * 150.8}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-[#CB5534]">
                    {attendanceStats.combinedPct}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Attendance</div>
                  <div className="text-sm font-extrabold text-[#1E1A17]">
                    {attendanceStats.eligible ? "Eligible ✅" : "Below 75% ❌"}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Tasks Approved</div>
                <div className="text-3xl font-black text-[#CB5534] font-serif">
                  {submissions.filter(s => s.status === 'Approved').length}
                </div>
              </div>

              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Active Streak</div>
                <div className="text-3xl font-black text-[#CB5534] font-serif flex items-center justify-center gap-1.5">
                  🔥 {performance.currentStreak} <span className="text-xs text-[#8E8279] font-sans font-normal">/ max {performance.bestStreak}</span>
                </div>
              </div>

              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Meetings Joined</div>
                <div className="text-3xl font-black text-[#CB5534] font-serif">
                  {attendanceStats.combinedPresentDays}
                </div>
              </div>

              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 text-center space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Total Coins</div>
                <div className="text-3xl font-black text-[#CB5534] font-serif flex items-center justify-center gap-1">
                  🪙 {v2Stats.totalCoins}
                </div>
              </div>
            </div>

            {/* V2 Task Journey Widget */}
            <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-10 h-10 bg-[#CB5534]/5 border border-[#CB5534]/20 rounded-xl flex items-center justify-center text-[#CB5534]">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1E1A17]">Your Coin Balance &amp; Task Journey</h4>
                  <p className="text-[11px] text-[#5C524C]">
                    Domain: {student.domain} {v2Stats.v2Onboarded ? "" : "· Get started to set up your workflow"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/v2-tasks')}
                className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-[#CB5534] to-[#CB5534] hover:scale-[1.01] active:scale-95 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
              >
                Go to Task Journey →
              </button>
            </div>

            {/* Extras script mount containers for old javascript compatibility */}
            <div id="ten-extras-mount" className="space-y-4" />
            <div id="ten-extras2-mount" className="space-y-4" />
          </div>
        );

      case 'notice':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
              
              <div className="flex items-center gap-3">
                <Megaphone className="w-6 h-6 text-[#CB5534]" />
                <h3 className="text-xl font-extrabold text-[#1E1A17] tracking-tight font-serif">{notice.title}</h3>
                <span className="px-2 py-0.5 bg-[#CB5534]/5 border border-[#CB5534]/15 text-[#CB5534] text-[9px] font-bold rounded-full uppercase tracking-wider shrink-0">
                  Broadcast
                </span>
              </div>

              <p className="text-sm text-[#1E1A17] leading-relaxed font-mono whitespace-pre-wrap bg-[#FBF7EE]/40 p-5 border border-[#E2D9CD]/50 rounded-xl">
                {notice.importantNotice}
              </p>

              {/* Meeting info row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#E2D9CD]/50 pt-6">
                <div className="bg-[#FBF7EE]/20 border border-[#E2D9CD]/50 rounded-xl p-4 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Morning Roster Meeting</div>
                  <div className="text-sm font-bold text-[#1E1A17]">{notice.morningMeeting}</div>
                </div>
                <div className="bg-[#FBF7EE]/20 border border-[#E2D9CD]/50 rounded-xl p-4 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Evening Roster Meeting</div>
                  <div className="text-sm font-bold text-[#1E1A17]">{notice.eveningMeeting}</div>
                </div>
              </div>

              {notice.meetingLink ? (
                <a
                  href={notice.meetingLink.startsWith("http") ? notice.meetingLink : `https://${notice.meetingLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#CB5534] hover:bg-[#B24629] text-white font-bold text-xs rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-[#CB5534]/15 cursor-pointer"
                >
                  <Video className="w-4 h-4 shrink-0" /> Join Roster Meeting Room
                </a>
              ) : (
                <button
                  disabled
                  className="w-full py-3 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD]/50 text-[#8E8279] font-bold text-xs rounded-xl cursor-not-allowed opacity-50"
                >
                  Roster Meeting Link is Not Active
                </button>
              )}
            </div>
          </div>
        );

      case 'domain-tasks':
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Hardcoded Domain tasks */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#1E1A17] font-serif border-l-2 border-[#CB5534] pl-3">Standard Domain Tasks</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentDomainTasks.map((task, idx) => (
                  <div key={idx} className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 bg-[#CB5534]/10 border border-[#CB5534]/25 text-[#CB5534] text-[9px] font-bold rounded-full">
                          TASK {idx + 1}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#1E1A17] tracking-tight">{task}</h4>
                      <p className="text-[11px] text-[#5C524C]">
                        Submit work deliverables with GitHub link, PDF documentation, and screenshot.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTaskName(task);
                        setSubmissionModalOpen(true);
                      }}
                      className="w-full py-2 border border-[#E2D9CD] hover:border-[#CB5534]/45 hover:bg-[#CB5534]/5 text-[#1E1A17] hover:text-[#CB5534] text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Submit Deliverable →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Coordinator uploaded files / custom tasks */}
            <div className="space-y-4 pt-4 border-t border-[#E2D9CD]/50">
              <h3 className="text-lg font-bold text-[#1E1A17] font-serif border-l-2 border-emerald-500 pl-3">Coordinator Custom Uploads</h3>
              
              {!coordinatorFileName && coordinatorTasks.length === 0 ? (
                <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-12 text-center text-xs text-[#8E8279]">
                  ⏳ No custom task files uploaded by domain coordinator yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {coordinatorFileUrl && (
                    <div className="bg-white border-[#E2D9CD] border border-emerald-200 border-l-4 border-l-emerald-500 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1 w-full sm:w-auto">
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] font-bold rounded-full">
                          FILE ATTACHMENT
                        </span>
                        <h4 className="text-sm font-bold text-[#1E1A17] truncate max-w-[280px]">{coordinatorFileName}</h4>
                        <p className="text-[11px] text-[#5C524C]">Your coordinator has shared an onboarding file.</p>
                      </div>
                      <a
                        href={coordinatorFileUrl}
                        download={coordinatorFileName}
                        className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <FileDown className="w-3.5 h-3.5" /> Download File
                      </a>
                    </div>
                  )}

                  {coordinatorTasks.map((t, idx) => (
                    <div key={idx} className="bg-white border-[#E2D9CD] border border-[#CB5534]/20 border-l-4 border-l-[#CB5534] rounded-2xl p-5 space-y-2">
                      <span className="px-2 py-0.5 bg-[#CB5534]/10 border border-[#CB5534]/20 text-[#CB5534] text-[9px] font-bold rounded-full">
                        CUSTOM TASK {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-[#1E1A17] tracking-tight">{t}</h4>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'submissions':
        return (
          <div className="space-y-6 animate-fade-in">
            {submissions.length === 0 ? (
              <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-16 text-center space-y-2">
                <ClipboardList className="w-8 h-8 text-[#8E8279] mx-auto" />
                <h4 className="text-base font-bold text-[#1E1A17] font-serif">No Submissions Found</h4>
                <p className="text-xs text-[#8E8279] max-w-xs mx-auto">
                  You have not uploaded any internship task deliverables yet. Make your first submission under Domain Tasks.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {submissions.map((sub, idx) => {
                  const reviewed = sub.status === "Approved" || sub.status === "Rejected";
                  return (
                    <div
                      key={sub._id || idx}
                      className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 space-y-4 flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-base font-bold text-[#1E1A17] tracking-tight line-clamp-1">{sub.task}</h4>
                          <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider shrink-0 ${
                            sub.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                            sub.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                            'bg-[#CB5534]/5 text-[#CB5534] border border-[#CB5534]/15'
                          }`}>
                            {sub.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#5C524C] space-y-1 font-mono">
                          <div><span className="text-[#8E8279]">Domain:</span> {sub.domain}</div>
                          <div className="line-clamp-2"><span className="text-[#8E8279]">Note:</span> {sub.note || "No note added"}</div>
                        </div>

                        {/* File links */}
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold font-mono">
                          {sub.githubLink && (
                            <a href={sub.githubLink} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 text-[#1E1A17] rounded-lg">
                              GitHub Link
                            </a>
                          )}
                          {sub.image && (
                            <a href={sub.image} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 text-[#1E1A17] rounded-lg">
                              Screenshot
                            </a>
                          )}
                          {sub.pdf && (
                            <a href={sub.pdf} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 text-[#1E1A17] rounded-lg">
                              PDF Documentation
                            </a>
                          )}
                        </div>

                        {/* Feedback block */}
                        <div className="bg-[#FBF7EE]/40 border border-[#E2D9CD]/50 rounded-xl p-3 space-y-1">
                          <div className="text-[9px] font-black uppercase tracking-wider text-[#8E8279]">Coordinator Review Feedback</div>
                          <p className="text-xs text-[#1E1A17] font-serif leading-relaxed italic">
                            "{sub.feedback || 'No review remarks provided yet.'}"
                          </p>
                        </div>
                      </div>

                      {reviewed && (
                        <button
                          onClick={() => handleDeleteSubmission(sub._id)}
                          className="w-full mt-4 py-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/10 hover:border-rose-500 text-rose-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          🗑 Delete Submission History
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'attendance':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Action Card to mark attendance */}
            <div className="bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#CB5534]/5 blur-3xl rounded-full" />
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-lg font-bold text-[#1E1A17] font-serif tracking-tight">Combined Attendance: {attendanceStats.combinedPct}%</h3>
                <p className="text-xs text-[#5C524C] max-w-sm">
                  {attendanceMarkedToday ? "Your attendance is registered for today. Come back tomorrow!" : "Log daily presence on this dashboard once every morning."}
                </p>
              </div>
              <button
                onClick={markSelfAttendance}
                disabled={attendanceMarkedToday}
                className="w-full md:w-auto px-6 py-3 bg-[#CB5534] hover:bg-[#B24629] disabled:from-white/5 disabled:to-white/5 border border-transparent disabled:border-[#E2D9CD]/50 disabled:text-[#8E8279] disabled:cursor-not-allowed hover:scale-[1.01] active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer shrink-0"
              >
                {attendanceMarkedToday ? "Attendance Recorded ✅" : "✅ Mark Today's Presence"}
              </button>
            </div>

            {/* Attendance breakdown counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Self Sign-Ins</div>
                <div className="text-2xl font-extrabold text-white">{attendanceStats.selfPct}%</div>
                <div className="text-[10px] text-[#8E8279] font-mono">{attendanceStats.selfTotal} days marked</div>
              </div>
              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Class (Coordinator) Sessions</div>
                <div className="text-2xl font-extrabold text-white">{attendanceStats.coordPct}%</div>
                <div className="text-[10px] text-[#8E8279] font-mono">{attendanceStats.coordPresent} present / {attendanceStats.coordTotal} sessions</div>
              </div>
              <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-5 space-y-1">
                <div className="text-[10px] uppercase font-bold text-[#8E8279] tracking-wider">Eligibility Guard</div>
                <div className={`text-2xl font-extrabold flex items-center gap-1.5 ${attendanceStats.eligible ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {attendanceStats.eligible ? "Eligible ✅" : "Below 75% ❌"}
                </div>
                <div className="text-[10px] text-[#8E8279] font-mono">Requires combined &gt;= 75%</div>
              </div>
            </div>

            {/* Threshold alerts */}
            {(() => {
              const tenure = (student.tenure || "").toLowerCase();
              let totalDays = 20, requiredDays = 15;
              if (tenure.includes("3")) { totalDays = 60; requiredDays = 45; }
              if (tenure.includes("6")) { totalDays = 120; requiredDays = 90; }
              const present = attendanceStats.combinedPresentDays || 0;
              const remaining = Math.max(0, requiredDays - present);

              return (
                <div className={`border p-4 rounded-xl text-xs font-semibold ${
                  remaining === 0 ? 'bg-emerald-950/20 border-emerald-200 text-emerald-600' : 'bg-amber-950/20 border-[#CB5534]/15 text-[#CB5534]'
                }`}>
                  {remaining === 0 ? (
                    <span>✅ You have met the 75% attendance requirement! ({present}/{totalDays} days)</span>
                  ) : (
                    <span>⚠️ {present}/{totalDays} days present — need {remaining} more to reach 75% ({requiredDays} days required)</span>
                  )}
                </div>
              );
            })()}

            {/* Attendance history table */}
            <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[#E2D9CD]/50 font-serif font-bold text-white text-sm bg-[#FBF7EE]/40">
                Attendance Sign-In History (Last 30 Days)
              </div>
              
              {attendanceHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8E8279]">
                  No attendance entries signed yet.
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="text-[#8E8279] border-b border-[#E2D9CD]/50 uppercase font-bold text-[10px] tracking-wider bg-[#FBF7EE]/20">
                        <th className="p-4">Date</th>
                        <th className="p-4">Self Attendance</th>
                        <th className="p-4">Class Session</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(() => {
                        const byDate: Record<string, { self?: string; coordinator?: string }> = {};
                        attendanceHistory.forEach(r => {
                          if (!byDate[r.dateKey]) byDate[r.dateKey] = {};
                          byDate[r.dateKey][r.markedBy as 'self' | 'coordinator'] = r.status;
                        });
                        const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, 30);
                        
                        return dates.map(dateKey => {
                          const record = byDate[dateKey];
                          const dateObj = new Date(dateKey);
                          const formattedDate = isNaN(dateObj.getTime()) ? dateKey : dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

                          return (
                            <tr key={dateKey} className="hover:bg-white/[0.02] transition-colors">
                              <td className="p-4 font-bold text-[#1E1A17]">{formattedDate}</td>
                              <td className="p-4">
                                {record.self ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    record.self === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                  }`}>
                                    {record.self}
                                  </span>
                                ) : "—"}
                              </td>
                              <td className="p-4">
                                {record.coordinator ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    record.coordinator === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                  }`}>
                                    {record.coordinator}
                                  </span>
                                ) : "—"}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      case 'coding':
        return (
          <div className="space-y-6 animate-fade-in">
            {codingQuestions.length === 0 ? (
              <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-16 text-center text-xs text-[#8E8279]">
                💻 No coding challenges published for your domain yet.
              </div>
            ) : (
              <div className="space-y-3">
                {codingQuestions.map((q, idx) => (
                  <div
                    key={q._id || idx}
                    onClick={() => handleOpenCodingProblem(q._id)}
                    className="bg-white border-[#E2D9CD] hover:bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="space-y-1.5 w-full sm:w-auto">
                      <h4 className="text-base font-extrabold text-[#1E1A17] tracking-tight group-hover:text-[#CB5534] transition-colors font-serif">
                        {q.title}
                      </h4>
                      <p className="text-xs text-[#5C524C] line-clamp-1 leading-relaxed max-w-xl">{q.description}</p>
                    </div>

                    <div className="flex gap-2 items-center shrink-0">
                      <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider ${
                        q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        q.difficulty === 'Medium' ? 'bg-[#CB5534]/5 text-[#CB5534] border border-[#CB5534]/15' :
                        'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}>
                        {q.difficulty || "Easy"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#8E8279] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'test':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-4 text-center max-w-xl mx-auto">
              <span className="text-4xl">📝</span>
              <h3 className="text-xl font-bold text-[#1E1A17] font-serif tracking-tight">Domain MCQ Proctoring Test</h3>
              <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed">
                Take the formal timed assessment for {student.domain}. The test tracks screen context changes and requires web camera proctoring enabled.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => router.push('/test')}
                  className="w-full py-3 bg-[#CB5534] hover:bg-[#B24629] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#CB5534]/15 cursor-pointer"
                >
                  Start Proctored Assessment →
                </button>
              </div>
            </div>
          </div>
        );

      case 'guidelines':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-4 max-w-4xl mx-auto text-xs sm:text-sm text-[#1E1A17] leading-relaxed">
              <h3 className="text-lg font-bold text-[#1E1A17] font-serif border-b border-[#E2D9CD]/50 pb-2">Internship Code of Conduct</h3>
              
              <ul className="space-y-3 list-disc pl-5 text-[#5C524C] leading-relaxed">
                <li>Daily attendance forms must be submitted twice daily (Morning and Evening updates).</li>
                <li>Submit domain task files promptly. Only coordinator approved deliverables build certification eligibility.</li>
                <li>Professional workplace communications must be maintained in Slack, Discord, and WhatsApp groups.</li>
                <li>Do not publish or disseminate workspace complaints or spam in the official roster groups. Use the designated support groups.</li>
                <li>Certificate generation eligibility requires attendance score &gt;= 75%, at least one task deliverables approved, and MCQ assessment score &gt;= 50%.</li>
              </ul>
            </div>
          </div>
        );

      case 'leaderboard':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Custom Confetti & eligibility certificate badges */}
            {performance.certificateApproved ? (
              <div className="bg-white/80 border-[#E2D9CD] border border-[#CB5534]/35 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none z-0" />
                <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row w-full md:w-auto z-10">
                  <span className="text-4xl animate-bounce">🏆</span>
                  <div>
                    <h3 className="text-base font-bold text-[#1E1A17] font-serif tracking-tight">Your Internship Certificate is Ready!</h3>
                    <p className="text-xs text-[#5C524C]">Approved by HR. Click below to download PDF document.</p>
                  </div>
                </div>
                <button
                  onClick={handleGenerateCertificate}
                  className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-[#CB5534] to-[#CB5534] hover:scale-[1.01] active:scale-95 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md shrink-0 cursor-pointer z-10"
                >
                  Download Internship Certificate
                </button>
              </div>
            ) : (
              <div className="bg-[#F5EFEB]/50 border-[#E2D9CD] border border-[#E2D9CD]/50 rounded-2xl py-8 text-center text-xs text-[#8E8279]">
                🏆 Certificates require HR &amp; Coordinator final approvals before becoming ready for download.
              </div>
            )}

            <div className="bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-6">
              <h3 className="text-base font-bold text-[#1E1A17] font-serif">Internship Digital Badge &amp; ID Card</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="space-y-1.5 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-[#1E1A17]">Download Employee ID Card</h4>
                  <p className="text-xs text-[#5C524C] leading-relaxed max-w-sm">
                    Generate an official digital photo identification badge as an intern for TEN.
                  </p>
                </div>
                <button
                  onClick={handleGenerateIDCard}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 hover:text-[#CB5534] text-[#1E1A17] text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Generate ID Card
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
      {/* Dynamic script tags imports */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" strategy="lazyOnload" />
      <Script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/clike/clike.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/xterm/5.3.0/xterm.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/xterm/5.3.0/addon-fit/addon-fit.min.js" strategy="lazyOnload" />
      <Script src="/socket.io/socket.io.js" strategy="lazyOnload" />
      <Script src="/chat-widget.js" strategy="lazyOnload" />
      <Script src="/ten-extras.js" strategy="lazyOnload" />
      <Script src="/ten-extras2.js" strategy="lazyOnload" />
      <Script src="/session-timeout.js" strategy="lazyOnload" onLoad={() => {
        setScriptsLoaded(true);
        if (student) initExtras(student);
      }} />

      {/* Stylesheets for external widgets */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/dracula.min.css" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/xterm/5.3.0/xterm.min.css" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(203,85,52,0.015)_0%,transparent_70%)] pointer-events-none z-0" />

      {/* Persistent Document Upload Banner */}
      {docUploadStatus.visible && (
        <div className="max-w-7xl mx-auto mb-6 relative z-30 bg-white border-[#E2D9CD] border border-[#CB5534]/30 rounded-2xl p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4 animate-fade-in shadow-lg shadow-amber-950/10">
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#CB5534]">
                {docUploadStatus.status === 'rejected' ? '❌ Documents Rejected — Please Re-upload' : 'Upload Your Onboarding Documents'}
              </h4>
              <p className="text-[11px] text-[#5C524C] leading-relaxed mt-0.5">
                {docUploadStatus.status === 'rejected' ? docUploadStatus.rejectionReason : 'Submit Address Proof & Marks Card to unlock Offer Letter.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/my-documents')}
            className="w-full sm:w-auto px-4 py-2 bg-[#CB5534]/5 hover:bg-[#CB5534] border border-[#CB5534]/15 hover:text-zinc-950 text-[#CB5534] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            Manage Documents →
          </button>
        </div>
      )}

      {/* Main container wrapper */}
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
                Intern Workspace
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1E1A17] tracking-tight font-serif flex items-center gap-2">
                Student Portal
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Notification bell button */}
            <button
              onClick={() => {
                setNotifPanelOpen(true);
                markNotificationsAllRead();
              }}
              className="relative p-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 rounded-xl text-[#1E1A17] transition-all cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 border border-zinc-950 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Refresh dashboard */}
            <button
              onClick={refreshAllData}
              className="p-2.5 bg-[#FDFCF7] border-[#E2D9CD] border border-[#E2D9CD] hover:border-white/20 rounded-xl text-[#1E1A17] transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* Profile modal toggle */}
            <button
              onClick={() => setProfileModalOpen(true)}
              className="p-2.5 bg-[#CB5534]/10 border border-[#CB5534]/20 hover:border-[#CB5534]/40 rounded-xl text-[#CB5534] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <User className="w-5 h-5" />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-[#E2D9CD] hover:border-rose-200 hover:bg-rose-500/5 hover:text-rose-600 rounded-xl text-xs font-semibold text-[#1E1A17] transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Section Modal container triggers */}
        {activeSection ? (
          renderSectionContent()
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Welcome banner inline */}
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-[#1E1A17] tracking-tight font-serif">
                Welcome, {student ? student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() : 'Student'} 🚀
              </h2>
              <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed">
                Select a section card below to view resources and manage your internship tasks.
              </p>
            </div>

            {/* Hub Section Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                onClick={() => handleOpenSection('overview')}
                className="bg-white border-[#E2D9CD] hover:bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer transition-all duration-300 relative group"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-2">
                  <div className="text-2xl">📊</div>
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif group-hover:text-[#CB5534] transition-colors">Overview</h3>
                  <p className="text-xs text-[#5C524C] leading-relaxed">View stats, scores, and active daily timeline events.</p>
                </div>
                <div className="text-right text-[10px] text-[#8E8279] group-hover:text-[#CB5534] font-bold font-mono transition-colors pt-2">
                  View →
                </div>
              </div>

              <div
                onClick={() => handleOpenSection('notice')}
                className="bg-white border-[#E2D9CD] hover:bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer transition-all duration-300 relative group"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-2">
                  <div className="text-2xl">📢</div>
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif group-hover:text-[#CB5534] transition-colors">Important Notice</h3>
                  <p className="text-xs text-[#5C524C] leading-relaxed">Read announcements and meetings updates shared by coordinators.</p>
                </div>
                <div className="text-right text-[10px] text-[#8E8279] group-hover:text-[#CB5534] font-bold font-mono transition-colors pt-2">
                  View →
                </div>
              </div>

              <div
                onClick={() => handleOpenSection('domain-tasks')}
                className="bg-white border-[#E2D9CD] hover:bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer transition-all duration-300 relative group"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-2">
                  <div className="text-2xl">📋</div>
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif group-hover:text-[#CB5534] transition-colors">My Tasks</h3>
                  <p className="text-xs text-[#5C524C] leading-relaxed">Submit work deliverable files and links for evaluation.</p>
                </div>
                <div className="text-right text-[10px] text-[#8E8279] group-hover:text-[#CB5534] font-bold font-mono transition-colors pt-2">
                  View →
                </div>
              </div>

              <div
                onClick={() => handleOpenSection('coding')}
                className="bg-white border-[#E2D9CD] hover:bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer transition-all duration-300 relative group"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-2">
                  <div className="text-2xl">💻</div>
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif group-hover:text-[#CB5534] transition-colors">Coding Problems</h3>
                  <p className="text-xs text-[#5C524C] leading-relaxed">Solve logic and algorithmic code challenges published for your domain.</p>
                </div>
                <div className="text-right text-[10px] text-[#8E8279] group-hover:text-[#CB5534] font-bold font-mono transition-colors pt-2">
                  View →
                </div>
              </div>

              <div
                onClick={() => handleOpenSection('submissions')}
                className="bg-white border-[#E2D9CD] hover:bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer transition-all duration-300 relative group"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-2">
                  <div className="text-2xl">📥</div>
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif group-hover:text-[#CB5534] transition-colors">Submissions</h3>
                  <p className="text-xs text-[#5C524C] leading-relaxed">Check feedback and approval status for all submitted tasks.</p>
                </div>
                <div className="text-right text-[10px] text-[#8E8279] group-hover:text-[#CB5534] font-bold font-mono transition-colors pt-2">
                  View →
                </div>
              </div>

              <div
                onClick={() => handleOpenSection('attendance')}
                className="bg-white border-[#E2D9CD] hover:bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer transition-all duration-300 relative group"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-2">
                  <div className="text-2xl">🪪</div>
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif group-hover:text-[#CB5534] transition-colors">Attendance</h3>
                  <p className="text-xs text-[#5C524C] leading-relaxed">Sign daily roster logs and track your combined percentage score.</p>
                </div>
                <div className="text-right text-[10px] text-[#8E8279] group-hover:text-[#CB5534] font-bold font-mono transition-colors pt-2">
                  View →
                </div>
              </div>

              <div
                onClick={() => handleOpenSection('test')}
                className="bg-white border-[#E2D9CD] hover:bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer transition-all duration-300 relative group"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-2">
                  <div className="text-2xl">📝</div>
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif group-hover:text-[#CB5534] transition-colors">Take Test</h3>
                  <p className="text-xs text-[#5C524C] leading-relaxed">Attempt the proctored multiple choice timed domain test.</p>
                </div>
                <div className="text-right text-[10px] text-[#8E8279] group-hover:text-[#CB5534] font-bold font-mono transition-colors pt-2">
                  View →
                </div>
              </div>

              <div
                onClick={() => handleOpenSection('guidelines')}
                className="bg-white border-[#E2D9CD] hover:bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer transition-all duration-300 relative group"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-2">
                  <div className="text-2xl">📖</div>
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif group-hover:text-[#CB5534] transition-colors">Guidelines</h3>
                  <p className="text-xs text-[#5C524C] leading-relaxed">Review the official internship handbook and workflow directions.</p>
                </div>
                <div className="text-right text-[10px] text-[#8E8279] group-hover:text-[#CB5534] font-bold font-mono transition-colors pt-2">
                  View →
                </div>
              </div>

              <div
                onClick={() => handleOpenSection('leaderboard')}
                className="bg-white border-[#E2D9CD] hover:bg-white/80 border-[#E2D9CD] border border-[#E2D9CD] hover:border-[#CB5534]/35 p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-pointer transition-all duration-300 relative group"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CB5534]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-2">
                  <div className="text-2xl">🏆</div>
                  <h3 className="text-base font-bold text-[#1E1A17] font-serif group-hover:text-[#CB5534] transition-colors">Extras &amp; Badges</h3>
                  <p className="text-xs text-[#5C524C] leading-relaxed">Verify certificate eligibility, download badges, and ID cards.</p>
                </div>
                <div className="text-right text-[10px] text-[#8E8279] group-hover:text-[#CB5534] font-bold font-mono transition-colors pt-2">
                  View →
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LEFT SIDEBAR OVERLAY DRAWER */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div onClick={() => setSidebarOpen(false)} className="absolute inset-0 bg-[#1E1A17]/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-72 max-w-[85vw] bg-[#FBF7EE] border-r border-[#E2D9CD] p-6 flex flex-col justify-between animate-slide-left z-10">
            <div className="space-y-8">
              {/* Brand logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FDFCF7] border-[#E2D9CD] border border-[#CB5534]/30 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-5" viewBox="0 0 28 24" fill="none">
                    <path d="M3 9C3 6.79 4.79 5 7 5C9.21 5 11 6.79 11 9C11 11.21 9.21 13 7 13C4.79 13 3 11.21 3 9Z" stroke="#CB5534" strokeWidth="2" fill="none"/>
                    <path d="M11 9C11 6.79 12.79 5 15 5C17.21 5 19 6.79 19 9C19 11.21 17.21 13 15 13C12.79 13 11 11.21 11 9Z" stroke="#CB5534" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold tracking-[3px] text-[#CB5534]">TEN</span>
                  <span className="block text-[9px] text-[#8E8279] uppercase tracking-widest mt-0.5">Student Portal</span>
                </div>
              </div>

              {/* Nav buttons */}
              <nav className="flex flex-col gap-1 text-xs font-semibold">
                <button
                  onClick={() => { handleOpenSection('overview'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'overview' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" /> Overview
                </button>
                <button
                  onClick={() => { handleOpenSection('notice'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'notice' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Megaphone className="w-4 h-4 shrink-0" /> Announcements
                </button>
                <button
                  onClick={() => { handleOpenSection('domain-tasks'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'domain-tasks' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0" /> My Tasks
                </button>
                <button
                  onClick={() => { handleOpenSection('coding'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'coding' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Code2 className="w-4 h-4 shrink-0" /> Coding problems
                </button>
                <button
                  onClick={() => { handleOpenSection('submissions'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'submissions' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Send className="w-4 h-4 shrink-0" /> Submissions
                </button>
                <button
                  onClick={() => { handleOpenSection('attendance'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'attendance' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <CalendarDays className="w-4 h-4 shrink-0" /> Attendance
                </button>
                <button
                  onClick={() => { handleOpenSection('test'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'test' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <PenSquare className="w-4 h-4 shrink-0" /> Take Test
                </button>
                <button
                  onClick={() => { handleOpenSection('guidelines'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'guidelines' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" /> Guidelines
                </button>
                <button
                  onClick={() => { handleOpenSection('leaderboard'); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === 'leaderboard' ? 'bg-[#CB5534]/10 text-[#CB5534] border border-[#CB5534]/25' : 'hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'}`}
                >
                  <Award className="w-4 h-4 shrink-0" /> Leaderboard &amp; Badges
                </button>

                <div className="h-[1px] bg-[#FDFCF7] border-[#E2D9CD] my-2" />

                <button
                  onClick={() => { setSidebarOpen(false); router.push('/my-documents'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17] transition-all text-left"
                >
                  <FolderUp className="w-4 h-4 shrink-0" /> Documents Folder
                </button>
                <button
                  onClick={() => { setSidebarOpen(false); router.push('/payment'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17] transition-all text-left"
                >
                  <CreditCard className="w-4 h-4 shrink-0" /> Payment
                </button>
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/10 hover:border-rose-500 text-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATION OVERLAY PANEL */}
      {notifPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setNotifPanelOpen(false)} className="absolute inset-0 bg-[#1E1A17]/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-96 max-w-[90vw] bg-[#FBF7EE] border-l border-[#E2D9CD] p-6 flex flex-col justify-between animate-slide-right z-10">
            <div className="space-y-6 flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center border-b border-[#E2D9CD]/50 pb-4">
                <h3 className="text-base font-extrabold text-[#1E1A17] font-serif flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#CB5534]" /> Notifications
                </h3>
                <button onClick={() => setNotifPanelOpen(false)} className="p-1.5 hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-lg text-[#8E8279] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center text-xs text-[#8E8279] space-y-1">
                    <Bell className="w-6 h-6 mx-auto opacity-20" />
                    <div>No new updates.</div>
                  </div>
                ) : (
                  notifications.map((n, idx) => {
                    const isUnread = student && !n.readBy.includes(student.employeeId);
                    return (
                      <div
                        key={n._id || idx}
                        className={`p-4 rounded-xl border transition-all text-left space-y-1 ${
                          isUnread ? 'bg-[#CB5534]/5 border-[#CB5534]/25 shadow-md shadow-[#CB5534]/5' : 'bg-white border-[#E2D9CD] border-[#E2D9CD]/50'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[9px] font-bold text-[#8E8279] font-mono">
                          <span>Sender: {n.from || 'System'}</span>
                          <span>{new Date(n.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                        <h4 className="text-xs font-bold text-[#1E1A17] leading-snug">{n.title}</h4>
                        <p className="text-[11px] text-[#5C524C] leading-relaxed font-serif">{n.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION FORM MODAL */}
      {submissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setSubmissionModalOpen(false)} className="absolute inset-0 bg-[#1E1A17]/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full max-w-lg bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-in">
            <button
              onClick={() => setSubmissionModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-lg text-[#8E8279] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[9px] font-extrabold tracking-widest text-[#CB5534] uppercase font-mono">
                Deliverable Upload
              </span>
              <h3 className="text-lg font-bold text-[#1E1A17] tracking-tight font-serif">Submit: {selectedTaskName}</h3>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-[#5C524C] tracking-wider">GitHub Project URL *</label>
                <input
                  type="url"
                  required
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  placeholder="https://github.com/yourusername/project"
                  className="w-full px-4 py-3 bg-[#FBF7EE] border border-[#E2D9CD] focus:border-[#CB5534]/50 rounded-xl text-xs text-[#1E1A17] placeholder-zinc-700 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-[#5C524C] tracking-wider">Additional Submission Notes</label>
                <textarea
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="Describe your implementation guidelines, hosting URLs, or details..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#FBF7EE] border border-[#E2D9CD] focus:border-[#CB5534]/50 rounded-xl text-xs text-[#1E1A17] placeholder-zinc-700 outline-none transition-all resize-none"
                />
              </div>

              {/* Multi file upload slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-[#5C524C] tracking-wider">Deliverable Screenshot (Optional)</label>
                  <div className="relative border border-[#E2D9CD] rounded-xl bg-[#FBF7EE] text-center py-4 text-[11px] text-[#8E8279] hover:border-white/20 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <span>{imageFile ? `📸 ${imageFile.name}` : "📁 Choose Image file"}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-[#5C524C] tracking-wider">PDF Documentation (Optional)</label>
                  <div className="relative border border-[#E2D9CD] rounded-xl bg-[#FBF7EE] text-center py-4 text-[11px] text-[#8E8279] hover:border-white/20 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <span>{pdfFile ? `📄 ${pdfFile.name}` : "📁 Choose PDF file"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSubmissionModalOpen(false)}
                  className="flex-1 py-3 border border-[#E2D9CD] hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-xl text-xs font-bold text-[#5C524C] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="flex-1 py-3 bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#CB5534]/15 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submittingTask ? "Submitting..." : "Submit Task Deliverables"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE VIEW MODAL */}
      {profileModalOpen && student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setProfileModalOpen(false)} className="absolute inset-0 bg-[#1E1A17]/60 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full max-w-md bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl animate-scale-in">
            <button
              onClick={() => setProfileModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-lg text-[#8E8279] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-[#CB5534] to-[#CB5534] rounded-full flex items-center justify-center text-zinc-950 font-bold text-2xl shadow-lg mx-auto">
                {student.name ? student.name[0]?.toUpperCase() : '?'}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#1E1A17] tracking-tight font-serif">
                  {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim()}
                </h3>
                <span className="inline-block px-3 py-0.5 bg-[#CB5534]/10 border border-[#CB5534]/25 text-[#CB5534] rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {student.domain}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="bg-[#FBF7EE]/40 border border-[#E2D9CD]/50 rounded-xl p-3.5 space-y-1">
                <div className="text-[9px] uppercase font-bold text-[#8E8279] tracking-wider">Employee ID</div>
                <div className="text-xs font-bold text-[#1E1A17] font-mono truncate">{student.employeeId}</div>
              </div>
              <div className="bg-[#FBF7EE]/40 border border-[#E2D9CD]/50 rounded-xl p-3.5 space-y-1">
                <div className="text-[9px] uppercase font-bold text-[#8E8279] tracking-wider">College</div>
                <div className="text-xs font-bold text-[#1E1A17] truncate">{student.college || student.collegeName || "—"}</div>
              </div>
              <div className="bg-[#FBF7EE]/40 border border-[#E2D9CD]/50 rounded-xl p-3.5 space-y-1 col-span-2">
                <div className="text-[9px] uppercase font-bold text-[#8E8279] tracking-wider">Email Address</div>
                <div className="text-xs font-bold text-[#1E1A17] truncate select-all">{student.email || "—"}</div>
              </div>
              <div className="bg-[#FBF7EE]/40 border border-[#E2D9CD]/50 rounded-xl p-3.5 space-y-1">
                <div className="text-[9px] uppercase font-bold text-[#8E8279] tracking-wider">Phone / WhatsApp</div>
                <div className="text-xs font-bold text-[#1E1A17] select-all">{student.phone || student.whatsapp || "—"}</div>
              </div>
              <div className="bg-[#FBF7EE]/40 border border-[#E2D9CD]/50 rounded-xl p-3.5 space-y-1">
                <div className="text-[9px] uppercase font-bold text-[#8E8279] tracking-wider">Joined Date</div>
                <div className="text-xs font-bold text-[#1E1A17]">
                  {student.joiningDate ? new Date(student.joiningDate).toLocaleDateString('en-IN') : "—"}
                </div>
              </div>
              
              {/* Display End date */}
              <div className="bg-[#FBF7EE]/40 border border-[#E2D9CD]/50 rounded-xl p-3.5 space-y-1 col-span-2">
                <div className="text-[9px] uppercase font-bold text-[#8E8279] tracking-wider">Internship Tenure End</div>
                <div className="text-xs font-bold text-[#1E1A17]">
                  {student.internshipEnd || student.endDate ? new Date((student.internshipEnd || student.endDate) as string).toLocaleDateString('en-IN') : "—"}
                </div>
              </div>

              {/* Password viewing */}
              {(student as any).password && (
                <div className="bg-[#FBF7EE]/40 border border-[#E2D9CD]/50 rounded-xl p-3.5 space-y-1 col-span-2 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-[9px] uppercase font-bold text-[#8E8279] tracking-wider">Portal Password</div>
                    <div className="text-xs font-bold text-[#1E1A17] font-mono tracking-wider">
                      {passwordVisible ? ((student as any).password || "—") : "••••••••"}
                    </div>
                  </div>
                  <button
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="p-1 text-[10px] font-bold text-[#CB5534] hover:underline"
                  >
                    {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>

            {/* Discord section */}
            <div className="bg-[#5865F2]/10 border border-[#5865F2]/25 rounded-2xl p-4 text-center space-y-3">
              <div className="text-xs font-bold text-[#5865F2] flex items-center justify-center gap-1.5">
                🎮 Join TEN Alumni Community
              </div>
              <a
                href="https://discord.gg/GYnZFbDE7"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl text-xs font-bold transition-colors shadow-md"
              >
                💬 Join Discord Server
              </a>
              <p className="text-[10px] text-[#8E8279] leading-relaxed">
                Connect with TEN alumni, mentors, coordinators, and network.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* JOINER TYPE MODAL QUESTION (DB BACKED, RUNS ONCE) */}
      {joinerTypeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="relative max-w-md w-full bg-white border-[#E2D9CD] border border-[#CB5534]/35 rounded-[24px] p-8 text-center space-y-6 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
            <div className="text-4xl animate-bounce">👋</div>
            <h3 className="text-xl font-bold text-[#CB5534] font-serif">Welcome to TEN Portal!</h3>
            <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed max-w-sm mx-auto">
              Before we configure your workspace, please tell us — are you a new joiner, or have you joined TEN before through WhatsApp and are new to this portal?
            </p>
            
            <div className="space-y-3 pt-4">
              <button
                onClick={() => {
                  triggerAlert('confirm', 'Confirm New Joiner?', 'You are selecting New Joiner. The legacy Google Attendance Form will not be required for you. You will only sign your presence on this dashboard.', () => {
                    closeAlert();
                    handleSelectJoinerType('new');
                  }, () => closeAlert());
                }}
                className="w-full py-4 bg-gradient-to-r from-[#CB5534] to-[#CB5534] text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-[#CB5534]/10 cursor-pointer"
              >
                🆕 I am a New Joiner
              </button>

              <button
                onClick={() => {
                  triggerAlert('confirm', 'Confirm WhatsApp Re-Joiner?', 'You are selecting WhatsApp Re-Joiner. You must mark attendance BOTH on this dashboard portal AND the google forms twice daily.', () => {
                    closeAlert();
                    handleSelectJoinerType('whatsapp');
                  }, () => closeAlert());
                }}
                className="w-full py-4 bg-[#FDFCF7] border-[#E2D9CD] border border-[#10b981]/20 hover:bg-[#10b981]/5 text-emerald-600 font-bold text-xs sm:text-sm rounded-xl transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                💬 Already Joined Before via WhatsApp
              </button>
            </div>
            
            <div className="text-[10px] text-[#8E8279] font-semibold italic">
              ⚠️ This option is final and cannot be modified later.
            </div>
          </div>
        </div>
      )}

      {/* FIRST LOGIN ONBOARDING MODAL INSTRUCTION SHEET */}
      {onboardingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="relative max-w-3xl w-full bg-white border-[#E2D9CD] border border-[#CB5534]/30 rounded-2xl p-6 sm:p-10 my-8 space-y-6 shadow-2xl text-left">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
            
            <div className="text-center space-y-4 mb-6">
              <div className="text-4xl">🎓</div>
              <span className="text-[10px] font-extrabold tracking-[4px] text-[#CB5534] uppercase font-mono block">The Entrepreneurship Network</span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#F0E6C8] font-serif leading-tight">INTERNSHIP ONBOARDING GUIDELINES &amp; INSTRUCTIONS</h2>
              <span className="inline-block px-3 py-1 bg-[#CB5534]/10 border border-[#CB5534]/20 rounded-full text-xs text-[#CB5534] font-semibold">
                Please read carefully before proceeding
              </span>
            </div>

            <div className="space-y-4 divide-y divide-white/5 max-h-[50vh] overflow-y-auto pr-2">
              <div className="space-y-2 pt-2">
                <h4 className="text-xs sm:text-sm font-bold text-[#F0E6C8] flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#CB5534]/10 border border-[#CB5534]/25 text-[#CB5534] text-[10px] font-black rounded-lg">01</span>
                  Daily Attendance Log (MANDATORY)
                </h4>
                <p className="text-[11.5px] text-[#5C524C] leading-relaxed pl-8">
                  Sign in twice daily (Morning and Evening updates). Share screenshots in roster groups to confirm presence. Missing records may suspend your internship.
                </p>
                <div className="pl-8 text-[11px] font-bold text-[#CB5534] font-mono leading-relaxed">
                  📎 Attendance form link (Re-joiners only): <a href="https://docs.google.com/forms/d/e/1FAIpQLSf3qZwNUgQl7vqqTnGW4PKrMDwRWPJEMiVQ-NUI6h4NnJa8Zg/viewform" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#CB5534]">Open Google Form</a>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <h4 className="text-xs sm:text-sm font-bold text-[#F0E6C8] flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#CB5534]/10 border border-[#CB5534]/25 text-[#CB5534] text-[10px] font-black rounded-lg">02</span>
                  Onboarding Guides &amp; Handbooks
                </h4>
                <p className="text-[11.5px] text-[#5C524C] leading-relaxed pl-8">
                  Read onboarding guidelines details. Induction documentation includes important information.
                </p>
                <div className="pl-8 space-y-1 text-[11px] font-semibold text-[#CB5534] font-mono leading-relaxed flex flex-col">
                  <a href="https://drive.google.com/file/d/1rMHH_-FE-FKD54xapu19P9NWS-dn1NfY/view?usp=drivesdk" target="_blank" rel="noopener noreferrer" className="hover:underline">📄 Open Induction PDF</a>
                  <a href="https://docs.google.com/document/d/e/2PACX-1vTfWXe3t_wQ0DmVAmFcYehd_iSUYY6UemtmoxCtNgP145pGbgFdxAO2IiWMSLla3brwuc3BVkewRRSo/pub" target="_blank" rel="noopener noreferrer" className="hover:underline">📋 Open Guidelines Doc</a>
                  <a href="https://drive.google.com/file/d/14TuDgp0LeyELj16dNKOZt_2zrgfZ-erh/view?usp=drive_link" target="_blank" rel="noopener noreferrer" className="hover:underline">🎬 Watch induction Zoom video (starts 10m onwards)</a>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <h4 className="text-xs sm:text-sm font-bold text-[#F0E6C8] flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#CB5534]/10 border border-[#CB5534]/25 text-[#CB5534] text-[10px] font-black rounded-lg">03</span>
                  Daily Task Submissions &amp; Code of Conduct
                </h4>
                <p className="text-[11.5px] text-[#5C524C] leading-relaxed pl-8">
                  Complete task requirements to earn points. Maintain professional behavior in all channels. Misconduct may result in workspace termination.
                </p>
              </div>
            </div>

            <div className="pt-6 text-center space-y-3">
              <button
                onClick={acknowledgeOnboarding}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#CB5534] to-[#CB5534] text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all hover:scale-[1.01] active:scale-95 shadow-md shadow-[#CB5534]/20 cursor-pointer"
              >
                ✅ I Have Read &amp; Understood — Let's Begin!
              </button>
              <p className="text-[10px] text-[#8E8279]">This guide sheet will not show again on this account.</p>
            </div>
          </div>
        </div>
      )}

      {/* CODING PROBLEM WORKSPACE MODAL */}
      {codingModalOpen && selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center coding-modal">
          <div onClick={handleCloseCodingModal} className="absolute inset-0 bg-black/85 backdrop-blur-sm z-0" />
          
          <div className="relative w-full max-w-[1300px] h-[92vh] bg-[#0c1220] border border-[#CB5534]/25 rounded-2xl overflow-hidden flex flex-col shadow-2xl m-auto z-10 animate-scale-in">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-[#CB5534]/12 bg-gradient-to-r from-[#0d1a2e] to-[#112240] shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-extrabold text-[#1E1A17] font-serif">{selectedQuestion.title}</h3>
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                  selectedQuestion.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                  selectedQuestion.difficulty === 'Medium' ? 'bg-[#CB5534]/5 text-[#CB5534] border border-[#CB5534]/15' :
                  'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                  {selectedQuestion.difficulty || "Easy"}
                </span>
              </div>
              <button
                onClick={handleCloseCodingModal}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-500 border border-rose-200 text-rose-600 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Exit Challenge
              </button>
            </div>

            {/* Split Pane */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
              {/* Left Details Panel */}
              <div className="lg:col-span-5 p-5 overflow-y-auto border-r border-[#CB5534]/10 bg-[#0a1020] text-[#cdd9ec] space-y-4">
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedQuestion.description}
                </div>
                
                {/* Format specs */}
                {(selectedQuestion.inputFormat || selectedQuestion.outputFormat) && (
                  <div className="border-t border-[#E2D9CD]/50 pt-4 space-y-2 text-xs text-[#5C524C]">
                    {selectedQuestion.inputFormat && (
                      <div>
                        <b className="text-[#1E1A17]">Input Specification:</b>
                        <p className="mt-0.5">{selectedQuestion.inputFormat}</p>
                      </div>
                    )}
                    {selectedQuestion.outputFormat && (
                      <div>
                        <b className="text-[#1E1A17]">Output Specification:</b>
                        <p className="mt-0.5">{selectedQuestion.outputFormat}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Samples specs */}
                {(selectedQuestion.sampleInput || selectedQuestion.sampleOutput) && (
                  <div className="border-t border-[#E2D9CD]/50 pt-4 space-y-4">
                    {selectedQuestion.sampleInput && (
                      <div className="space-y-1.5">
                        <b className="text-xs uppercase tracking-wider text-[#8E8279]">Sample Input</b>
                        <pre className="bg-[#FBF7EE] p-3 rounded-lg text-xs font-mono text-[#1E1A17] overflow-x-auto">
                          {selectedQuestion.sampleInput}
                        </pre>
                      </div>
                    )}
                    {selectedQuestion.sampleOutput && (
                      <div className="space-y-1.5">
                        <b className="text-xs uppercase tracking-wider text-[#8E8279]">Sample Output</b>
                        <pre className="bg-[#FBF7EE] p-3 rounded-lg text-xs font-mono text-[#1E1A17] overflow-x-auto">
                          {selectedQuestion.sampleOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Proctoring camera layout */}
                <div className="border-t border-[#E2D9CD]/50 pt-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-[#5C524C]">
                      <span className={`w-2.5 h-2.5 rounded-full ${procStatus === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      Proctoring Status
                    </span>
                    <span className="font-bold font-mono text-rose-600">Violations: {violations}</span>
                  </div>

                  <div className="relative w-44 h-32 mx-auto bg-[#FBF7EE] rounded-xl border border-[#E2D9CD] overflow-hidden shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {procStatus !== 'Active' && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#8E8279] font-bold bg-[#FBF7EE]/90 text-center p-2">
                        Camera access blocked or inactive.
                      </div>
                    )}
                  </div>

                  {procWarning && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-[10.5px] rounded-lg text-center font-semibold animate-pulse">
                      ⚠️ Warning: {procWarning}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Workspace Panel */}
              <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#0c1220]">
                {/* Editor Tab bars */}
                <div className="flex justify-between items-center border-b border-[#CB5534]/12 bg-[#0a1020] shrink-0">
                  <div className="flex">
                    <button
                      onClick={() => handleSwitchTab('editor')}
                      className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-colors ${
                        codingTab === 'editor' ? 'border-[#CB5534] text-[#CB5534]' : 'border-transparent text-[#8E8279] hover:text-[#1E1A17]'
                      }`}
                    >
                      Code Editor
                    </button>
                    <button
                      onClick={() => handleSwitchTab('terminal')}
                      className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-colors ${
                        codingTab === 'terminal' ? 'border-[#CB5534] text-[#CB5534]' : 'border-transparent text-[#8E8279] hover:text-[#1E1A17]'
                      }`}
                    >
                      Interactive Terminal
                    </button>
                  </div>
                  
                  {/* Lang selector */}
                  {codingTab === 'editor' && (
                    <div className="px-4 flex items-center gap-2">
                      <span className="text-[10px] text-[#8E8279] font-bold uppercase">Language:</span>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="bg-[#FBF7EE] border border-[#E2D9CD] rounded-lg text-xs text-[#cdd9ec] px-2.5 py-1"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                      </select>
                    </div>
                  )}
                </div>

                {codingTab === 'editor' ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* TextArea for fallback or CodeMirror wrapper */}
                    <div className="flex-1 min-h-0 overflow-y-auto relative bg-[#0d1117] text-left">
                      <textarea
                        ref={editorRef}
                        defaultValue={STARTER_CODE[selectedLanguage]}
                        className="w-full h-full bg-[#0d1117] text-[#cdd9ec] font-mono p-4 outline-none resize-none border-none hidden"
                      />
                    </div>

                    {/* Stdin Panel wrapper */}
                    <div className="border-t border-[#CB5534]/10 bg-[#0a1020] p-4 space-y-2 shrink-0">
                      <details className="group">
                        <summary className="text-[11px] font-bold text-[#5C524C] uppercase tracking-wider cursor-pointer list-none flex items-center gap-1">
                          <span className="group-open:rotate-90 transition-transform">▸</span> Custom Stdin Test Input
                        </summary>
                        <textarea
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          placeholder="Provide custom input arguments..."
                          rows={2}
                          className="w-full mt-2 px-3 py-2 bg-[#FBF7EE] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] placeholder-zinc-800 outline-none focus:border-[#CB5534]/30"
                        />
                      </details>
                    </div>

                    {/* Output log */}
                    <div className="border-t border-[#CB5534]/10 bg-[#0a1020] shrink-0 p-4 space-y-2">
                      <div className="text-[10px] font-bold text-[#8E8279] uppercase tracking-widest">Output Log</div>
                      <pre className={`bg-[#FBF7EE] p-3.5 border border-[#E2D9CD]/50 rounded-xl text-xs font-mono min-h-[100px] max-h-[160px] overflow-y-auto whitespace-pre-wrap text-left ${
                        codeVerdict === 'Accepted' ? 'text-emerald-600' : codeVerdict ? 'text-rose-600' : 'text-emerald-500'
                      }`}>
                        {codeOutput}
                      </pre>
                    </div>

                    {/* Submit Actions */}
                    <div className="border-t border-[#CB5534]/10 bg-[#0a1020] p-4 flex flex-wrap gap-2 justify-between items-center shrink-0">
                      <button
                        onClick={handleOpenTerminalWorkspace}
                        className="px-4 py-2.5 bg-[#FDFCF7] border-[#E2D9CD] hover:bg-white/10 border border-[#E2D9CD] text-[#1E1A17] font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <TermIcon className="w-3.5 h-3.5" /> Workspace Path
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={handleRunCode}
                          disabled={runLoading}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          {runLoading ? "Compiling..." : "Run Test Code"}
                        </button>
                        <button
                          onClick={handleSubmitCode}
                          disabled={submitLoading}
                          className="px-5 py-2.5 bg-gradient-to-r from-[#CB5534] to-[#CB5534] hover:scale-[1.01] active:scale-95 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          {submitLoading ? "Submitting..." : "Submit Solutions"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 bg-[#0d1117] relative">
                    {/* Terminal name indicator */}
                    <div className="p-2 bg-[#FBF7EE]/60 border-b border-[#E2D9CD]/50 flex items-center justify-between text-[11px] font-mono text-[#5C524C]">
                      <span>File Name: solution.{selectedLanguage === 'python' ? 'py' : selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage === 'java' ? 'java' : 'js'}</span>
                      <span className="text-[10px] text-[#8E8279] font-bold">xterm.js connected</span>
                    </div>

                    {/* Xterm panel wrapper */}
                    <div ref={xtermRef} className="flex-1 w-full overflow-hidden bg-[#0d1117] p-2 text-left" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DIALOG ALERT POPUP MODAL */}
      {alertDialog.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white border-[#E2D9CD] border border-[#E2D9CD] rounded-2xl p-6 shadow-2xl space-y-4 animate-[scaleIn_0.2s_cubic-bezier(0.34,1.56,0.64,1)]">
            <div className="flex items-center gap-3">
              {alertDialog.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
              {alertDialog.type === 'error' && <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />}
              {alertDialog.type === 'warning' && <AlertCircle className="w-6 h-6 text-[#CB5534] shrink-0 animate-pulse" />}
              {alertDialog.type === 'confirm' && <AlertCircle className="w-6 h-6 text-[#CB5534] shrink-0 animate-pulse" />}
              {alertDialog.type === 'info' && <AlertCircle className="w-6 h-6 text-sky-400 shrink-0" />}
              
              <h4 className="text-base font-bold text-[#1E1A17] tracking-tight font-serif">{alertDialog.title}</h4>
            </div>

            <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed pr-1 select-text whitespace-pre-wrap text-left">
              {alertDialog.text}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              {alertDialog.type === 'confirm' && (
                <button
                  onClick={() => {
                    if (alertDialog.onCancel) alertDialog.onCancel();
                    else closeAlert();
                  }}
                  className="px-4 py-2 border border-[#E2D9CD] hover:bg-[#FDFCF7] border-[#E2D9CD] rounded-xl text-xs font-semibold text-[#5C524C] hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (alertDialog.onConfirm) {
                    alertDialog.onConfirm();
                  } else {
                    closeAlert();
                  }
                }}
                className="px-4 py-2 bg-[#CB5534] hover:bg-[#B24629] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                {alertDialog.type === 'confirm' ? 'Confirm' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Bot Launcher widget */}
      <BotWidget />
    </div>
  );
}

// Client helper method to load extras safely
const initExtras = (stu: any) => {
  if (!stu) return;
  const name = `${stu.firstName || ''} ${stu.lastName || ''}`.trim() || stu.name || stu.username || 'Student';
  if ((window as any).TenExtras2) {
    (window as any).TenExtras2.injectStudent({ student: stu, mountId: "ten-extras2-mount" });
    (window as any).TenExtras2.bulkSubmissionsToolbar({ employeeId: stu.employeeId });
  }
  if ((window as any).TenExtras) {
    let end = null;
    try {
      const t = (stu.tenure || "").toLowerCase();
      const days = t.indexOf("6") >= 0 ? 180 : t.indexOf("3") >= 0 ? 90 : 30;
      if (stu.joiningDate) {
        const d = new Date(stu.joiningDate);
        d.setDate(d.getDate() + days);
        end = d;
      }
    } catch(e) {}
    (window as any).TenExtras.injectStudent({
      employeeId: stu.employeeId,
      domain: stu.domain || "",
      name: name,
      mountId: "ten-extras-mount",
      internshipEndDate: end
    });
  }
  if ((window as any).TenSessionTimeout) {
    (window as any).TenSessionTimeout.start({ logoutUrl: "/login" });
  }
};
