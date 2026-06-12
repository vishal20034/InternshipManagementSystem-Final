"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ClipboardList, Coins, ExternalLink, PlayCircle, Send, Trophy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Task = Record<string, any>;

export default function V2TasksPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);
  const [submission, setSubmission] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("employeeId") || sessionStorage.getItem("employeeId") || "";
      if (!id) {
        router.push("/login");
        return;
      }
      setEmployeeId(id);
    }
  }, [router]);

  const loadTasks = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const response = await fetch("/api/v2/tasks/my-tasks", { headers: { "x-employee-id": employeeId } });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Could not load tasks.");
      const list = data.tasks || data.weeks || data.data || [];
      setTasks(Array.isArray(list) ? list : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadTasks();
    }
  }, [employeeId]);

  const flatTasks = useMemo(() => {
    return tasks.flatMap((item) => Array.isArray(item.tasks) ? item.tasks.map((task: Task) => ({ ...task, week: item.week })) : [item]);
  }, [tasks]);

  const startTask = async (task: Task) => {
    const id = task._id || task.id || task.taskId;
    if (!id) return;
    setSelected(task);
    try {
      await fetch(`/api/v2/tasks/${id}/start`, { method: "POST", headers: { "Content-Type": "application/json", "x-employee-id": employeeId } });
      await loadTasks();
    } catch {
      setMessage("Could not start this task.");
    }
  };

  const submitTask = async () => {
    if (!selected) return;
    const id = selected._id || selected.id || selected.taskId;
    if (!id || !submission.trim()) {
      setMessage("Add your submission link or notes before submitting.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v2/tasks/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-employee-id": employeeId },
        body: JSON.stringify({ submissionUrl: submission.trim(), notes: submission.trim() }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Submission failed.");
      setMessage("Task submitted successfully.");
      setSubmission("");
      setSelected(null);
      await loadTasks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const completed = flatTasks.filter((task) => ["submitted", "approved"].includes(task.status)).length;
  const coins = flatTasks.reduce((sum, task) => sum + Number(task.coinsAwarded || task.coins || 0), 0);

  return (
    <main className="min-h-screen bg-[#FBF7EE] text-[#1E1A17] font-sans px-4 py-8 relative overflow-hidden select-none">
      
      {/* Decorative Orbs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-[#CB5534]/5 to-transparent blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-[#CB5534]/3 to-transparent blur-[100px] rounded-full pointer-events-none z-0" />

      <section className="mx-auto max-w-6xl space-y-6 relative z-10 animate-[fadeUp_0.4s_ease_both]">
        
        {/* Main Card Header */}
        <Card className="bg-white border-[#E2D9CD] shadow-[0_8px_30px_rgba(30,26,23,0.03)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#CB5534] to-transparent" />
          <CardHeader className="pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="font-display text-3xl font-extrabold tracking-tight text-[#1E1A17]">Task Journey</CardTitle>
                <p className="mt-1.5 text-xs sm:text-sm text-[#5C524C] font-medium">
                  Complete weekly internship tasks, watch guidance videos, and track your review status.
                </p>
              </div>
              <button 
                onClick={() => router.push("/student-dashboard")}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-[#E2D9CD] hover:border-[#CB5534] hover:bg-[#CB5534]/5 text-[#1E1A17] rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer bg-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Roster / Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E2D9CD] bg-[#FDFCF7] p-4 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-[#CB5534]/8 border border-[#CB5534]/15 rounded-lg flex items-center justify-center text-[#CB5534] shrink-0">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[#1E1A17]">{flatTasks.length}</p>
                  <p className="text-xs text-[#5C524C] font-semibold">Total Assigned Tasks</p>
                </div>
              </div>
              <div className="rounded-xl border border-[#E2D9CD] bg-[#FDFCF7] p-4 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/8 border border-emerald-500/15 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[#1E1A17]">{completed}</p>
                  <p className="text-xs text-[#5C524C] font-semibold">Submitted / Approved</p>
                </div>
              </div>
              <div className="rounded-xl border border-[#E2D9CD] bg-[#FDFCF7] p-4 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/8 border border-amber-500/15 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-[#1E1A17]">{coins}</p>
                  <p className="text-xs text-[#5C524C] font-semibold">Stipend Coins Tracked</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {message && (
          <div className="flex items-center gap-2 rounded-xl border border-[#CB5534]/20 bg-[#CB5534]/5 p-4 text-xs font-semibold text-[#CB5534]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#5C524C] font-semibold text-xs flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-[#E2D9CD] border-t-[#CB5534] rounded-full animate-spin"></span>
            Loading tasks...
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {flatTasks.map((task, index) => {
              const id = task._id || task.id || task.taskId || index;
              const status = task.status || "available";
              const isApproved = status === "approved";
              const isSubmitted = status === "submitted";
              const isProgress = status === "in_progress";

              return (
                <Card key={id} className="bg-white border-[#E2D9CD] shadow-sm relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-[#CB5534]/5 border border-[#CB5534]/15 text-[#CB5534] rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Week {task.week || index + 1}
                        </span>
                        <CardTitle className="text-base font-extrabold text-[#1E1A17] leading-tight pt-1">
                          {task.title || task.name || `Week ${task.week || index + 1} Task`}
                        </CardTitle>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isApproved ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                        isSubmitted ? "bg-blue-50 border-blue-200 text-blue-600" :
                        isProgress ? "bg-amber-50 border-amber-200 text-amber-600" :
                        "bg-stone-50 border-stone-200 text-stone-600"
                      }`}>
                        {status.replace("_", " ")}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    <p className="text-xs text-[#5C524C] leading-relaxed font-medium">
                      {task.description || task.instructions || "Complete the assigned internship activity and submit proof."}
                    </p>

                    {task.coordinatorFeedback && (
                      <div className="rounded-xl border border-[#E2D9CD] bg-[#FDFCF7] p-3 text-[11px] text-[#5C524C] font-semibold">
                        <span className="text-[10px] uppercase font-bold text-[#CB5534] block mb-1">Coordinator Feedback:</span>
                        {task.coordinatorFeedback}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E2D9CD]/50">
                      {task.videoUrl && (
                        <button 
                          onClick={() => window.open(task.videoUrl, "_blank")}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E2D9CD] hover:border-[#CB5534] text-[#1E1A17] rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer bg-white"
                        >
                          <PlayCircle className="h-3.5 w-3.5 text-[#CB5534]" /> Watch Video
                        </button>
                      )}
                      {task.resourceUrl && (
                        <button 
                          onClick={() => window.open(task.resourceUrl, "_blank")}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E2D9CD] hover:border-[#CB5534] text-[#1E1A17] rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer bg-white"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-[#CB5534]" /> Open Resource
                        </button>
                      )}
                      
                      <div className="ml-auto flex gap-2">
                        {!isApproved && !isSubmitted && !isProgress && (
                          <button 
                            onClick={() => startTask(task)}
                            className="flex items-center gap-1 px-4 py-1.5 bg-[#CB5534] hover:bg-[#B24629] text-white rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer border-none"
                          >
                            <Trophy className="h-3.5 w-3.5" /> Start Task
                          </button>
                        )}
                        {isProgress && (
                          <button 
                            onClick={() => setSelected(task)}
                            className="flex items-center gap-1 px-4 py-1.5 bg-white border border-[#CB5534] hover:bg-[#CB5534]/5 text-[#CB5534] rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" /> Submit Link
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Submission Modal Overlay */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1A17]/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <Card className="w-full max-w-lg bg-white border-[#E2D9CD] shadow-2xl relative overflow-hidden animate-[scaleUp_0.2s_ease-out]">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#CB5534]" />
            <CardHeader>
              <CardTitle className="font-display text-lg font-bold text-[#1E1A17]">Submit Task Deliverable</CardTitle>
              <p className="text-xs text-[#5C524C] font-semibold">{selected.title || selected.name || "Task Submission"}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5C524C]">
                  GitHub / Live Deployment / Document Link
                </label>
                <Input 
                  value={submission} 
                  onChange={(event) => setSubmission(event.target.value)} 
                  placeholder="e.g. https://github.com/username/project" 
                  className="w-full px-4 py-2.5 bg-[#FDFCF7] border border-[#E2D9CD] rounded-xl text-xs text-[#1E1A17] focus:outline-none focus:border-[#CB5534]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 border border-[#E2D9CD] hover:bg-[#F5EFEB] rounded-xl text-xs font-semibold text-[#5C524C] transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitTask} 
                  disabled={submitting}
                  className="px-5 py-2 bg-[#CB5534] hover:bg-[#B24629] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5"
                >
                  {submitting ? "Submitting..." : "Submit Proof"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
