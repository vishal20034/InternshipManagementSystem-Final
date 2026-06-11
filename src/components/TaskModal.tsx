
import React, { useState } from 'react';
import { Task, User } from '../types';
import { 
  X, 
  Video, 
  FileText, 
  Send, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface TaskModalProps {
  task: Task | null;
  user: User;
  onClose: () => void;
  onSubmit: (taskId: string, link: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, user, onClose, onSubmit }) => {
  const [submissionLink, setSubmissionLink] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!task) return null;

  const isCompleted = user.completedTasks.includes(task.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionLink) {
      onSubmit(task.id, submissionLink);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setSubmissionLink('');
      }, 2000);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-lg">Task Week {task.weekNumber}</h2>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{task.domain}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
            <section>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">{task.taskTitle}</h3>
              <p className="text-slate-600 leading-relaxed">
                {task.taskDescription}
              </p>
            </section>

            <section className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 mb-4 text-slate-800">
                <Video className="w-5 h-5 text-red-600" />
                <span className="font-bold">Learning Resources</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">Watch this tutorial before starting the task to understand the core concepts.</p>
              <a 
                href={task.videoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all"
              >
                Watch Video Tutorial
              </a>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 font-bold">C</span>
                </div>
                <div>
                  <p className="text-[10px] text-yellow-700 uppercase font-bold">Reward</p>
                  <p className="font-bold text-yellow-800">{task.coinReward} Coins</p>
                </div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-indigo-700 uppercase font-bold">Difficulty</p>
                  <p className="font-bold text-indigo-800 capitalize">{task.difficultyLevel}</p>
                </div>
              </div>
            </section>

            {!isCompleted ? (
              <section>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Submission Link (GitHub / Drive / Vercel)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      required
                      placeholder="https://github.com/..."
                      value={submissionLink}
                      onChange={(e) => setSubmissionLink(e.target.value)}
                      className="flex-grow px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={submitted}
                      className={clsx(
                        "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all",
                        submitted ? "bg-emerald-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                      )}
                    >
                      {submitted ? (
                        <><CheckCircle2 className="w-5 h-5" /> Submitted</>
                      ) : (
                        <><Send className="w-5 h-5" /> Submit</>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    By submitting, you agree to our terms of internship and confirm this is your own work.
                  </p>
                </form>
              </section>
            ) : (
              <section className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center text-center gap-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                <h4 className="font-bold text-emerald-800 text-lg">You've Completed This Task!</h4>
                <p className="text-sm text-emerald-600 max-w-xs">
                  This task was successfully submitted and verified. Your rewards have been added to your balance.
                </p>
              </section>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TaskModal;
