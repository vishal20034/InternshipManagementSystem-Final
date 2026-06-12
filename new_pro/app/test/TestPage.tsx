"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Inter, Playfair_Display } from 'next/font/google';
import {
  ShieldCheck,
  Award,
  AlertCircle,
  Loader2,
  ArrowRight,
  BookOpen,
  Camera,
  Trophy,
  Inbox,
  AlertTriangle,
  ThumbsUp,
  Star,
  Zap,
  CheckCircle2,
  XCircle,
  Video,
  ChevronLeft
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

interface Question {
  question: string;
  options: string[];
}

interface LeaderboardEntry {
  employeeId: string;
  studentName: string;
  percentage: number;
  score: number;
  totalQuestions: number;
}

interface AlertState {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function TestPage() {
  const router = useRouter();
  
  // Student Info
  const [student, setStudent] = useState<{ employeeId: string; domain: string; name: string } | null>(null);
  
  // Test State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [noTestAvailable, setNoTestAvailable] = useState(false);
  
  // Camera & Screen Flow States
  const [isCameraGateActive, setIsCameraGateActive] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [testActive, setTestActive] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  
  // Results
  const [result, setResult] = useState<{
    percentage: number;
    score: number;
    totalQuestions: number;
  } | null>(null);
  
  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Custom Dialog Modal State
  const [alert, setAlert] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    title: '',
    text: '',
  });

  // Refs for video playback
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);

  // 1. Initial Load & Auth check
  useEffect(() => {
    const studentDataStr = localStorage.getItem("student");
    if (!studentDataStr) {
      router.push("/login");
      return;
    }

    try {
      const studentData = JSON.parse(studentDataStr);
      const normalizedStudent = {
        employeeId: studentData.employeeId,
        domain: studentData.domain,
        name: studentData.name || studentData.fullName || "Student",
      };
      setStudent(normalizedStudent);
      checkTestAndLoadLeaderboard(normalizedStudent.domain);
    } catch (e) {
      router.push("/login");
    }
  }, [router]);

  // Tab switch warn detection
  useEffect(() => {
    if (!testActive || testFinished) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        showAlert({
          type: 'warning',
          title: 'Tab Switch Detected',
          text: 'Switching tabs during the test is not allowed. This incident has been noted.',
          confirmText: 'Acknowledge',
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [testActive, testFinished]);

  // Handle active video stream updates in DOM refs
  useEffect(() => {
    if (cameraStream) {
      if (isCameraGateActive && previewVideoRef.current) {
        previewVideoRef.current.srcObject = cameraStream;
      }
      if (testActive && pipVideoRef.current) {
        pipVideoRef.current.srcObject = cameraStream;
      }
    }
  }, [cameraStream, isCameraGateActive, testActive]);

  const showAlert = (config: Omit<AlertState, 'isOpen'>) => {
    setAlert({ ...config, isOpen: true });
  };

  const closeAlert = () => {
    setAlert((prev) => ({ ...prev, isOpen: false }));
  };

  const checkTestAndLoadLeaderboard = async (domain: string) => {
    setLoading(true);
    try {
      // Check test availability
      const r = await fetch(`/get-test-questions/${encodeURIComponent(domain)}`);
      const d = await r.json();
      if (!d.success || !d.questions || d.questions.length === 0) {
        setNoTestAvailable(true);
      } else {
        setQuestions(d.questions);
        setAnswers(new Array(d.questions.length).fill(null));
      }
      
      // Load leaderboard
      await loadLeaderboard(domain);
    } catch (e) {
      setNoTestAvailable(true);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (domain: string) => {
    try {
      const r = await fetch(`/test-leaderboard/${encodeURIComponent(domain)}`);
      const d = await r.json();
      if (d.success && d.leaderboard) {
        setLeaderboard(d.leaderboard);
      }
    } catch (e) {
      console.error("Leaderboard loading failed:", e);
    }
  };

  const requestCameraAndStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
      
      showAlert({
        type: 'success',
        title: 'Camera Active',
        text: 'Camera is ON. Loading your test now...',
        confirmText: 'Proceed',
      });
      
      // Auto-start test after 1.5s
      setTimeout(() => {
        closeAlert();
        setIsCameraGateActive(false);
        setTestActive(true);
      }, 1500);

    } catch (err) {
      showAlert({
        type: 'error',
        title: 'Camera Required',
        text: 'You must allow camera access to take the test. Please enable camera access in your browser settings and try again.',
        confirmText: 'Try Again',
      });
    }
  };

  const selectAnswer = (qi: number, oi: number) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[qi] = oi;
      return updated;
    });
  };

  const triggerSubmit = async () => {
    const unanswered = answers.filter((a) => a === null).length;
    if (unanswered > 0) {
      showAlert({
        type: 'confirm',
        title: 'Unanswered Questions',
        text: `You have ${unanswered} unanswered question(s). Are you sure you want to submit the test?`,
        confirmText: 'Submit Anyway',
        cancelText: 'Go Back',
        onConfirm: () => {
          closeAlert();
          performSubmission();
        },
        onCancel: () => closeAlert()
      });
    } else {
      performSubmission();
    }
  };

  const performSubmission = async () => {
    if (!student) return;
    setSubmitting(true);
    try {
      const r = await fetch("/submit-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: student.employeeId,
          studentName: student.name,
          domain: student.domain,
          answers,
        }),
      });
      const d = await r.json();

      if (d.success) {
        // Stop camera tracks
        if (cameraStream) {
          cameraStream.getTracks().forEach((track) => track.stop());
        }
        
        setResult({
          percentage: d.percentage,
          score: d.score,
          totalQuestions: d.totalQuestions,
        });
        
        setTestActive(false);
        setTestFinished(true);
        
        // Reload leaderboard
        await loadLeaderboard(student.domain);
      } else {
        showAlert({
          type: 'error',
          title: 'Submission Failed',
          text: d.message || 'There was an issue submitting your test. Please try again.',
          confirmText: 'Retry',
        });
      }
    } catch (e) {
      showAlert({
        type: 'error',
        title: 'Server Error',
        text: 'A network or server error occurred. Please check your internet connection and try again.',
        confirmText: 'Retry',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Score styling functions
  const getScoreMessage = (pct: number) => {
    if (pct >= 80) return { text: "Excellent Performance!", icon: Star, color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (pct >= 60) return { text: "Good Job!", icon: ThumbsUp, color: "text-[#CB5534] bg-[#CB5534]/5 border-[#CB5534]/15" };
    if (pct >= 40) return { text: "Keep Practicing!", icon: BookOpen, color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { text: "Don't Give Up — Try Again!", icon: Zap, color: "text-rose-600 bg-rose-50 border-rose-200" };
  };

  const letters = ["A", "B", "C", "D"];

  if (loading) {
    return (
      <div className={`${inter.variable} ${playfair.variable} min-h-screen bg-[#FBF7EE] text-[#1E1A17] flex flex-col justify-center items-center gap-4`}>
        <Loader2 className="w-10 h-10 animate-spin text-[#CB5534]" />
        <p className="text-sm font-semibold tracking-wide text-[#5C524C] font-sans">Loading Test Portal details...</p>
      </div>
    );
  }

  return (
    <div className={`${inter.variable} ${playfair.variable} min-h-screen bg-[#FBF7EE] text-[#1E1A17] font-sans p-6 relative overflow-hidden selection:bg-[#CB5534]/30 selection:text-[#1E1A17]`}>
      
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#CB5534]/5 to-transparent rounded-full filter blur-3xl pointer-events-none z-0" />

      <div className="max-w-3xl mx-auto relative z-10 space-y-6 animate-[fadeUp_0.4s_ease_both]">
        
        {/* Header Block */}
        <div className="bg-white border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 flex justify-between items-center flex-wrap gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E1A17] tracking-tight font-display flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#CB5534]" /> Test Portal
            </h1>
            <p className="text-xs sm:text-sm text-[#5C524C] font-semibold font-mono">
              {student ? `${student.domain} · ${student.name}` : 'Loading...'}
            </p>
          </div>
          <a
            href="/student-dashboard"
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#E2D9CD] hover:border-[#CB5534] hover:bg-[#CB5534]/5 text-[#1E1A17] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </a>
        </div>

        {/* State 1: No Test Available */}
        {noTestAvailable && (
          <div className="bg-white border border-[#E2D9CD] rounded-2xl p-10 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-[#CB5534]/8 border border-[#CB5534]/15 rounded-full flex items-center justify-center mx-auto text-[#CB5534]">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#1E1A17] font-display">No test available yet for your domain.</h3>
            <p className="text-[#5C524C] text-sm max-w-md mx-auto leading-relaxed font-medium">
              Your coordinator hasn&apos;t uploaded any questions for your domain. Check back later.
            </p>
          </div>
        )}

        {/* State 2: Camera Gate (Before Starting) */}
        {!noTestAvailable && isCameraGateActive && !testFinished && (
          <div className="bg-white border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1E1A17] font-display flex items-center justify-center gap-2">
                <Camera className="w-6 h-6 text-[#CB5534]" /> Camera Verification Required
              </h2>
              <p className="text-[#5C524C] text-sm max-w-lg mx-auto leading-relaxed font-medium">
                To maintain test integrity, your camera must remain ON throughout the duration of this evaluation. Please grant camera access to begin.
              </p>
            </div>

            <div className="relative max-w-sm mx-auto rounded-xl overflow-hidden border border-[#E2D9CD] bg-[#FDFCF7] aspect-video flex items-center justify-center shadow-inner">
              <video
                ref={previewVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {!cameraStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50 text-[#8E8279] space-y-2">
                  <Video className="w-8 h-8 animate-pulse text-[#8E8279]" />
                  <span className="text-xs font-bold">Camera Feed Offline</span>
                </div>
              )}
            </div>

            <button
              onClick={requestCameraAndStart}
              className="px-8 py-3.5 bg-[#CB5534] hover:bg-[#B24629] text-white font-bold text-sm rounded-xl transition-all active:scale-95 shadow-[0_4px_16px_rgba(203,85,52,0.15)] cursor-pointer border-none"
            >
              Enable Camera & Start Test
            </button>
          </div>
        )}

        {/* State 3: Test Area (Active Evaluation) */}
        {!noTestAvailable && testActive && (
          <div className="space-y-6">
            
            {/* Pip and Status Banner */}
            <div className="bg-white border border-[#E2D9CD] rounded-2xl p-4 sm:p-5 flex justify-between items-center gap-4 flex-wrap shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-bold tracking-wider text-[#CB5534] uppercase">Active Assessment</span>
                <p className="text-sm text-[#1E1A17] font-bold">{student?.domain} &middot; {questions.length} Questions</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-32 aspect-video rounded-lg overflow-hidden border border-[#E2D9CD] bg-black">
                  <video
                    ref={pipVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 border border-emerald-200 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Camera Live
                </div>
              </div>
            </div>

            {/* Questions Grid */}
            <div className="space-y-4">
              {questions.map((q, qi) => (
                <div key={qi} className="bg-white border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-[#E2D9CD]/50 pb-3">
                    <span className="text-xs font-extrabold tracking-widest text-[#CB5534] uppercase">Question {qi + 1} of {questions.length}</span>
                    {answers[qi] !== null && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Answered</span>
                    )}
                  </div>
                  
                  <p className="text-base sm:text-lg text-[#1E1A17] font-display font-extrabold leading-relaxed">{q.question}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {(q.options || []).map((opt, oi) => {
                      const isSelected = answers[qi] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => selectAnswer(qi, oi)}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-left text-sm transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-[#CB5534] bg-[#CB5534]/5 text-[#1E1A17] font-semibold'
                              : 'border-[#E2D9CD] bg-[#FDFCF7] hover:border-[#CB5534] text-[#5C524C] hover:text-[#1E1A17] hover:bg-[#CB5534]/4'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                            isSelected
                              ? 'bg-[#CB5534] border-[#CB5534] text-white'
                              : 'bg-white border-[#E2D9CD] text-[#5C524C]'
                          }`}>
                            {letters[oi]}
                          </div>
                          <span className="leading-snug">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Submission triggers */}
            <div className="text-center pt-4">
              <button
                onClick={triggerSubmit}
                disabled={submitting}
                className="px-10 py-4 bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white font-bold text-base rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 mx-auto cursor-pointer border-none"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <>Submit Test <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* State 4: Test Finished (Results Presentation) */}
        {!noTestAvailable && testFinished && result && (
          <div className="bg-white border border-[#E2D9CD] rounded-2xl p-8 sm:p-12 text-center space-y-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
            
            <div className="space-y-1">
              <div className="text-5xl sm:text-6xl font-extrabold tracking-tight font-display text-[#CB5534]">
                {result.percentage}%
              </div>
              <p className="text-[#5C524C] font-semibold text-sm sm:text-base">
                {result.score} / {result.totalQuestions} Questions Correct
              </p>
            </div>

            {(() => {
              const msg = getScoreMessage(result.percentage);
              const IconComponent = msg.icon;
              return (
                <div className={`inline-flex items-center gap-2 px-5 py-3 rounded-full border text-sm font-bold mx-auto ${msg.color}`}>
                  <IconComponent className="w-4 h-4 shrink-0" />
                  {msg.text}
                </div>
              );
            })()}

            <p className="text-xs sm:text-sm text-[#8E8279] max-w-sm mx-auto leading-relaxed font-medium">
              Your results have been logged in the system. Check the leaderboard below to see how your peers are performing.
            </p>

            <div className="pt-2">
              <a
                href="/student-dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 border border-[#E2D9CD] rounded-xl text-[#5C524C] hover:text-[#1E1A17] font-bold text-xs hover:border-[#CB5534] hover:bg-[#CB5534]/5 transition-all"
              >
                Return to Student Dashboard
              </a>
            </div>
          </div>
        )}

        {/* Always visible: Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="bg-white border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            <h3 className="text-lg font-bold text-[#1E1A17] tracking-wide font-display flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#CB5534]" /> Peer Leaderboard
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {leaderboard.map((entry, idx) => {
                const isMe = student && entry.employeeId === student.employeeId;
                const isTop3 = idx < 3;
                const badgeColors = [
                  "bg-amber-50 border-amber-200 text-amber-600", // 1st
                  "bg-stone-50 border-stone-200 text-stone-500", // 2nd
                  "bg-amber-100 border-amber-300 text-amber-800"  // 3rd
                ];

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-4 p-4 rounded-xl border text-sm transition-all ${
                      isMe
                        ? 'border-[#CB5534] bg-[#CB5534]/5 shadow-sm'
                        : 'border-[#E2D9CD] bg-[#FDFCF7]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs border ${
                        isTop3 ? badgeColors[idx] : 'bg-white border-[#E2D9CD] text-[#5C524C]'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`font-bold ${isMe ? 'text-[#CB5534]' : 'text-[#1E1A17]'}`}>
                        {entry.studentName} {isMe && <span className="text-xs text-[#5C524C] font-normal">(You)</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Bar Fill visualization */}
                      <div className="hidden sm:flex items-center gap-2 w-32">
                        <div className="flex-1 h-1.5 bg-[#E2D9CD] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#CB5534] rounded-full"
                            style={{ width: `${entry.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-[#5C524C]">{entry.percentage}%</span>
                      </div>
                      
                      <span className="text-xs font-mono text-[#5C524C] font-semibold sm:hidden">
                        {entry.percentage}%
                      </span>

                      <span className="text-xs font-mono font-bold text-[#CB5534] bg-[#CB5534]/5 px-2 py-0.5 rounded border border-[#CB5534]/15">
                        {entry.score} / {entry.totalQuestions}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Alert modal overlay */}
      {alert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1A17]/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white border border-[#E2D9CD] rounded-2xl p-6 shadow-2xl space-y-4 animate-[scaleIn_0.2s_cubic-bezier(0.34,1.56,0.64,1)]">
            
            {/* Modal Icon and Header */}
            <div className="flex items-center gap-3">
              {alert.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
              {alert.type === 'error' && <XCircle className="w-6 h-6 text-rose-600 shrink-0" />}
              {alert.type === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />}
              {alert.type === 'info' && <ShieldCheck className="w-6 h-6 text-[#CB5534] shrink-0" />}
              {alert.type === 'confirm' && <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />}
              
              <h4 className="text-base font-bold text-[#1E1A17] font-display">{alert.title}</h4>
            </div>

            {/* Modal text */}
            <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed pr-1 font-medium">{alert.text}</p>

            {/* Modal buttons */}
            <div className="flex justify-end gap-2 pt-2">
              {alert.type === 'confirm' && alert.onCancel && (
                <button
                  onClick={alert.onCancel}
                  className="px-4 py-2 border border-[#E2D9CD] hover:bg-[#F5EFEB] rounded-xl text-xs font-semibold text-[#5C524C] transition-all cursor-pointer bg-white"
                >
                  {alert.cancelText || 'Cancel'}
                </button>
              )}
              <button
                onClick={() => {
                  if (alert.onConfirm) alert.onConfirm();
                  else closeAlert();
                }}
                className="px-4 py-2 bg-[#CB5534] hover:bg-[#B24629] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer border-none"
              >
                {alert.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
