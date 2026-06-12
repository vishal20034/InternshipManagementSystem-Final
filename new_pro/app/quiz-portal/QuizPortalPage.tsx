"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Inter, Playfair_Display } from 'next/font/google';
import {
  ShieldCheck,
  Award,
  AlertCircle,
  Loader2,
  ArrowRight,
  Camera,
  Clock,
  Coins,
  RefreshCw,
  ClipboardList,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Video,
  ChevronLeft,
  ChevronRight
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
  answer: number;
}

export default function QuizPortalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Params
  const taskId = searchParams.get('taskId') || '';
  const weekNum = parseInt(searchParams.get('week') || '1') || 1;
  const isFirstAttempt = searchParams.get('attempt') !== 'retry';

  // Student Info
  const [employeeId, setEmployeeId] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(true);

  // Proctoring Camera Stream
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatusText, setCameraStatusText] = useState('🔄 Requesting camera access…');
  const [cameraStatusColor, setCameraStatusColor] = useState('text-[#8E8279]');
  const [cameraActive, setCameraActive] = useState(false);

  // Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  // Violations & Safety
  const [violations, setViolations] = useState(0);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  // Results
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    passed: boolean;
    coins: number;
    autoSubmit: boolean;
  } | null>(null);

  // Video display refs
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);

  // Get student info from localStorage on load
  useEffect(() => {
    let currentDomain = searchParams.get('domain') || '';
    let currentEmpId = '';

    try {
      const studentData = JSON.parse(localStorage.getItem('student') || '{}');
      currentEmpId = studentData.employeeId || localStorage.getItem('employeeId') || localStorage.getItem('ten_employee_id') || '';
      if (!currentDomain) {
        currentDomain = studentData.domain || '';
      }
    } catch {
      currentEmpId = localStorage.getItem('employeeId') || '';
    }

    if (!currentEmpId) {
      router.push('/login');
      return;
    }

    setEmployeeId(currentEmpId);
    setDomain(currentDomain);
    
    // Initialize questions & camera
    initPortal(currentEmpId, currentDomain);

    return () => {
      // Clean up camera stream if left
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [router, searchParams]);

  // Handle video stream source updates in Refs
  useEffect(() => {
    if (cameraStream) {
      if (!quizStarted && previewVideoRef.current) {
        previewVideoRef.current.srcObject = cameraStream;
      }
      if (quizStarted && pipVideoRef.current) {
        pipVideoRef.current.srcObject = cameraStream;
      }
    }
  }, [cameraStream, quizStarted]);

  // Tab switch anti-cheat visibility tracking
  useEffect(() => {
    if (!quizStarted || quizFinished) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations((prev) => {
          const next = prev + 1;
          if (next >= 3) {
            setShowSecurityWarning(false);
            performSubmit(answers, questions, true, next);
          } else {
            setShowSecurityWarning(true);
          }
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [quizStarted, quizFinished, answers, questions]);

  // Timer Tick down
  useEffect(() => {
    if (!quizStarted || quizFinished) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          performSubmit(answers, questions, true, violations);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quizStarted, quizFinished, answers, questions, violations]);

  const initPortal = async (empId: string, domainName: string) => {
    setLoading(true);
    const [camOk, qOk] = await Promise.all([
      setupCamera(),
      loadQuestions(empId, domainName)
    ]);
    setLoading(false);
  };

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      setCameraStream(stream);
      setCameraActive(true);
      setCameraStatusText('✅ Front camera active — identity verified');
      setCameraStatusColor('text-emerald-600');
      return true;
    } catch (err) {
      setCameraActive(false);
      setCameraStatusText('⚠️ Camera access not allowed — starting without video feeds.');
      setCameraStatusColor('text-[#CB5534]');
      return false;
    }
  };

  const loadQuestions = async (empId: string, domainName: string) => {
    try {
      const res = await fetch('/api/v2/student/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-id': empId
        },
        body: JSON.stringify({ taskId, domain: domainName, weekNumber: weekNum })
      });
      const data = await res.json();
      if (data.success && data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        return true;
      }
    } catch (e) {
      console.warn("Could not load questions from server. Using fallback.");
    }
    // Fallback
    setQuestions(getOfflineFallback(domainName));
    return true;
  };

  const getOfflineFallback = (d: string): Question[] => {
    return [
      {
        question: `What is the primary objective of ${d || 'this domain'}?`,
        options: ['Memorization', 'Problem solving with technology', 'Hardware design', 'None of the above'],
        answer: 1
      },
      {
        question: 'What does debugging mean?',
        options: ['Adding features', 'Finding and fixing errors', 'Writing documentation', 'Deploying the app'],
        answer: 1
      },
      {
        question: 'What is version control used for?',
        options: ['Controlling user access', 'Tracking code changes', 'Server management', 'UI design'],
        answer: 1
      },
      {
        question: 'What is an API?',
        options: ['A database', 'Application Programming Interface', 'A frontend framework', 'A server'],
        answer: 1
      },
      {
        question: 'What does "open source" mean?',
        options: ['Paid software', 'Software with publicly available source code', 'Closed network', 'Encrypted code'],
        answer: 1
      }
    ];
  };

  const startQuiz = () => {
    if (questions.length === 0) return;
    setQuizStarted(true);
  };

  const selectAnswer = (optIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQIndex]: optIndex
    }));
  };

  const nextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  const performSubmit = async (
    currentAnswers: Record<number, number>,
    allQuestions: Question[],
    autoSubmit: boolean = false,
    violationsCount: number = violations
  ) => {
    setQuizFinished(true);
    setQuizStarted(false);

    // Stop proctoring camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }

    // Calculate score locally
    let correct = 0;
    allQuestions.forEach((q, i) => {
      if (currentAnswers[i] === q.answer) {
        correct++;
      }
    });

    const total = allQuestions.length;
    const passed = correct >= 3;
    const coinsReward = isFirstAttempt ? (passed ? 50 : 0) : (passed ? 25 : 0);

    setResult({
      correct,
      total,
      passed,
      coins: coinsReward,
      autoSubmit
    });

    // Report results back to the server
    try {
      await fetch('/api/v2/student/quiz-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-id': employeeId
        },
        body: JSON.stringify({
          taskId,
          score: correct,
          total,
          passed,
          coins: coinsReward,
          violations: violationsCount,
          autoSubmit
        })
      });
    } catch (e) {
      console.error("Failed to sync result to server:", e);
    }
  };

  const retryQuiz = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('attempt', 'retry');
    router.replace(`/quiz-portal?${params.toString()}`);
    // Reload state manually
    setAnswers({});
    setCurrentQIndex(0);
    setViolations(0);
    setTimeLeft(600);
    setResult(null);
    setQuizFinished(false);
    initPortal(employeeId, domain);
  };

  const goBackToTasks = () => {
    router.push('/v2-tasks');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const allAnswered = Object.keys(answers).length >= questions.length;
  const isLastQuestion = currentQIndex === questions.length - 1;
  const letters = ['A', 'B', 'C', 'D'];

  if (loading) {
    return (
      <div className={`${inter.variable} ${playfair.variable} min-h-screen bg-[#FBF7EE] text-[#1E1A17] flex flex-col justify-center items-center gap-4`}>
        <Loader2 className="w-10 h-10 animate-spin text-[#CB5534]" />
        <p className="text-sm font-semibold tracking-wide text-[#5C524C] font-sans">Initializing Proctoring Portal...</p>
      </div>
    );
  }

  return (
    <div className={`${inter.variable} ${playfair.variable} min-h-screen bg-[#FBF7EE] text-[#1E1A17] font-sans relative overflow-hidden selection:bg-[#CB5534]/30 selection:text-[#1E1A17]`}>
      
      {/* Background Orbs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-[#CB5534]/5 to-transparent blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Screen 1: Camera Permission / Rules screen */}
      {!quizStarted && !quizFinished && (
        <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-[#E2D9CD] rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-[0_24px_64px_-16px_rgba(30,26,23,0.06),_0_0_0_1px_rgba(226,217,205,0.3)] relative animate-[fadeUp_0.4s_ease_both]">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent rounded-t-3xl" />
            
            <div className="space-y-2">
              <div className="w-12 h-12 bg-[#CB5534]/8 border border-[#CB5534]/15 rounded-full flex items-center justify-center mx-auto text-[#CB5534]">
                <Camera className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#1E1A17] tracking-tight font-display">Quiz Proctoring</h2>
              <p className="text-xs sm:text-sm text-[#5C524C] leading-relaxed max-w-sm mx-auto font-medium">
                This quiz requires your <strong className="text-[#CB5534]">front camera</strong> to be active. The video feed is used strictly to verify quiz integrity.
              </p>
            </div>

            {/* Video preview or offline warning */}
            <div className="w-48 h-36 border border-[#E2D9CD] rounded-xl overflow-hidden bg-stone-50 mx-auto relative flex items-center justify-center shadow-inner">
              <video
                ref={previewVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 text-[#8E8279] space-y-2">
                  <Video className="w-6 h-6 animate-pulse text-[#8E8279]" />
                  <span className="text-[10px] font-bold">No Feed Detected</span>
                </div>
              )}
            </div>

            <div className={`text-[11px] font-bold text-center ${cameraStatusColor}`}>
              {cameraStatusText}
            </div>

            {/* Rules guidelines */}
            <div className="bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl p-4 text-left text-xs text-[#5C524C] space-y-2.5 font-medium">
              <div className="text-[#1E1A17] font-bold text-[13px] flex items-center gap-1.5 font-display border-b border-[#E2D9CD] pb-2 mb-1">
                <ClipboardList className="w-4 h-4 text-[#CB5534]" /> Quiz Rules & Guidelines:
              </div>
              <div>&bull; 5 multiple-choice questions &bull; 10 minutes limit</div>
              <div>&bull; Score <strong className="text-[#1E1A17]">3/5 (60%)</strong> or higher to pass</div>
              <div className="text-[#CB5534] font-bold">&bull; Tab-switches are monitored (3 violations = auto-submit)</div>
              <div>&bull; Keep front camera active at all times</div>
              <div className="text-emerald-700 font-bold">&bull; 🪙 {isFirstAttempt ? '50' : '25'} coins reward on pass</div>
            </div>

            <button
              onClick={startQuiz}
              className="w-full py-3.5 bg-[#CB5534] hover:bg-[#B24629] text-white font-bold rounded-xl text-sm transition-all hover:scale-[1.01] active:scale-95 shadow-[0_4px_16px_rgba(203,85,52,0.15)] flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              Start Quiz <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Screen 2: Active Evaluation Screen */}
      {quizStarted && !quizFinished && (
        <div className="min-h-screen flex flex-col justify-between relative z-10 animate-fade-in">
          
          {/* Header Progress and Timer bar */}
          <header className="bg-white/95 backdrop-blur-md sticky top-0 z-20 border-b border-[#E2D9CD] px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#CB5534]/8 border border-[#CB5534]/20 flex items-center justify-center font-bold text-sm text-[#CB5534]">
                &infin;
              </div>
              <span className="text-[#1E1A17] font-bold tracking-tight text-base font-display">TEN Quiz Portal</span>
            </div>

            <div className="flex items-center gap-6">
              {/* Progress visualizer */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#5C524C] font-bold">
                <span>Q {currentQIndex + 1} / {questions.length}</span>
                <div className="w-24 h-1.5 bg-[#E2D9CD] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#CB5534] transition-all duration-300"
                    style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Timer indicator */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#5C524C]" />
                <div className={`px-4 py-1.5 rounded-lg border font-mono font-bold text-base transition-all ${
                  timeLeft <= 60
                    ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'
                    : 'bg-[#FDFCF7] border-[#E2D9CD] text-[#1E1A17]'
                }`}>
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Live Pip proctoring thumbnail */}
              {cameraActive && (
                <div className="w-20 aspect-video border border-emerald-500 rounded-lg overflow-hidden bg-black relative shrink-0">
                  <video
                    ref={pipVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute top-1 left-1 bg-emerald-500 text-white font-extrabold text-[8px] px-1 rounded">LIVE</div>
                </div>
              )}
            </div>
          </header>

          {/* Active assessment questions container */}
          <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
            
            {/* Navigational Dots list */}
            <div className="flex flex-wrap gap-2 justify-center py-2">
              {questions.map((_, idx) => {
                const isCurrent = idx === currentQIndex;
                const isAnswered = answers[idx] !== undefined;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`w-9 h-9 rounded-lg border text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? 'border-[#CB5534] bg-[#CB5534]/8 text-[#CB5534]'
                        : isAnswered
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                          : 'border-[#E2D9CD] bg-[#FDFCF7] text-[#5C524C] hover:border-[#CB5534]'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Main Question Card wrapper */}
            {questions[currentQIndex] && (
              <div className="bg-white border border-[#E2D9CD] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                
                {/* Header status */}
                <div className="flex justify-between items-center text-xs font-extrabold tracking-widest uppercase text-[#8E8279] border-b border-[#E2D9CD]/50 pb-3">
                  <span>Question {currentQIndex + 1} of {questions.length}</span>
                  {answers[currentQIndex] !== undefined && (
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[9px]">Saved</span>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl text-[#1E1A17] font-display font-extrabold leading-relaxed">
                  {questions[currentQIndex].question}
                </h3>

                {/* Multiple choice options */}
                <div className="flex flex-col gap-3">
                  {questions[currentQIndex].options.map((opt, oi) => {
                    const isSelected = answers[currentQIndex] === oi;
                    return (
                      <button
                        key={oi}
                        onClick={() => selectAnswer(oi)}
                        className={`flex items-center gap-3 p-4 rounded-xl border text-left text-sm transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#CB5534] bg-[#CB5534]/5 text-[#1E1A17] font-semibold'
                            : 'border-[#E2D9CD] bg-[#FDFCF7] hover:border-[#CB5534] text-[#5C524C] hover:text-[#1E1A17] hover:bg-[#CB5534]/4'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 border ${
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
            )}

            {/* Navigational controls block */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                onClick={prevQuestion}
                disabled={currentQIndex === 0}
                className="px-5 py-3 border border-[#E2D9CD] hover:border-[#CB5534] disabled:opacity-30 rounded-xl text-xs font-bold text-[#5C524C] hover:text-[#1E1A17] transition-all flex items-center gap-1.5 cursor-pointer bg-white"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              {!isLastQuestion ? (
                <button
                  onClick={nextQuestion}
                  className="px-6 py-3 bg-white border border-[#E2D9CD] hover:border-[#CB5534] hover:bg-[#CB5534]/5 hover:text-[#CB5534] rounded-xl text-xs font-bold text-[#5C524C] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => performSubmit(answers, questions, false)}
                  disabled={!allAnswered}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-md"
                >
                  Submit Quiz <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>

          </main>
        </div>
      )}

      {/* Screen 3: Results screen presentation */}
      {quizFinished && result && (
        <div className="min-h-screen flex items-center justify-center p-6 relative z-10 animate-[fadeIn_0.3s_ease-out]">
          <div className="w-full max-w-md bg-white border border-[#E2D9CD] rounded-2xl p-8 text-center space-y-6 shadow-[0_8px_32px_rgba(30,26,23,0.04)] relative">
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent ${
              result.passed ? 'via-emerald-500' : 'via-rose-500'
            } to-transparent`} />

            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl">
                {result.passed ? (
                  <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                    <Sparkles className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center shadow-sm">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                )}
              </div>

              <h2 className={`text-2xl font-extrabold font-display ${
                result.passed ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {result.passed ? 'Quiz Passed!' : result.autoSubmit ? 'Time Exceeded!' : 'Quiz Failed'}
              </h2>

              <div className="text-4xl font-black text-[#1E1A17] font-display tracking-tight pt-1">
                {result.correct} / {result.total}
              </div>
              
              <p className="text-[#5C524C] text-xs sm:text-sm leading-relaxed max-w-xs mx-auto font-medium">
                {result.passed
                  ? `Excellent job! You answered ${result.correct}/${result.total} correctly. The task has been updated as approved.`
                  : `You answered ${result.correct}/${result.total} correctly. A score of 3/5 is needed to complete this task.`}
              </p>
            </div>

            {/* Coins / Rewards display */}
            {result.passed && result.coins > 0 && (
              <div className="bg-[#CB5534]/5 border border-[#CB5534]/15 rounded-xl p-4 text-center space-y-1">
                <div className="text-2xl font-extrabold text-[#CB5534] flex items-center justify-center gap-1.5">
                  <Coins className="w-6 h-6 shrink-0" /> +{result.coins} Coins
                </div>
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                  Added to stipend balance
                </div>
              </div>
            )}

            {/* Buttons for exit/retry */}
            <div className="flex gap-2.5 pt-2 flex-col sm:flex-row">
              <button
                onClick={goBackToTasks}
                className="flex-1 py-3 bg-[#CB5534] hover:bg-[#B24629] text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer border-none shadow-sm"
              >
                Back to Task Journey
              </button>
              
              {!result.passed && (
                <button
                  onClick={retryQuiz}
                  className="flex-1 py-3 border border-[#E2D9CD] hover:border-[#CB5534] hover:bg-[#CB5534]/5 hover:text-[#CB5534] text-[#1E1A17] font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 bg-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security alert Dialog Warning (Proctor overlay) */}
      {showSecurityWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1A17]/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm bg-white border border-rose-200 rounded-2xl p-6 text-center space-y-4 shadow-2xl animate-[scaleIn_0.2s_cubic-bezier(0.34,1.56,0.64,1)]">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>

            <h3 className="text-lg font-bold text-rose-600 font-display">⚠️ Proctor Violation!</h3>
            
            <p className="text-[#5C524C] text-xs sm:text-sm leading-relaxed font-medium">
              You switched away from the active quiz tab. This has been flagged. 3 violations will result in automatic quiz submission.
            </p>

            <div className="space-y-1">
              <div className="text-4xl font-extrabold text-rose-600 font-display">{violations}</div>
              <span className="text-[10px] text-[#8E8279] font-bold uppercase tracking-widest">Violations Detected</span>
            </div>

            <button
              onClick={() => setShowSecurityWarning(false)}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer w-full border-none"
            >
              Resume Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
