
import React, { useState } from 'react';
import { Task, User } from '../types';
import { 
  Search, 
  PlayCircle, 
  CheckCircle2, 
  ChevronRight,
  Clock
} from 'lucide-react';
import { clsx } from 'clsx';

interface TasksListProps {
  tasks: Task[];
  user: User;
  onTaskClick: (task: Task) => void;
}

const TasksList: React.FC<TasksListProps> = ({ tasks, user, onTaskClick }) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.taskDescription.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isCompleted = user.completedTasks.includes(task.id);
    if (filter === 'completed') return matchesSearch && isCompleted;
    if (filter === 'pending') return matchesSearch && !isCompleted;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Your Internship Tasks</h1>
          <p className="text-slate-500 mt-1">Complete weekly tasks to earn certificates and rewards.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64"
            />
          </div>
          <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(['all', 'pending', 'completed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize",
                  filter === t ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map((task) => (
          <div 
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer flex flex-col md:flex-row md:items-center gap-6"
          >
            <div className="relative flex-shrink-0">
              <div className={clsx(
                "w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105",
                user.completedTasks.includes(task.id) ? "bg-emerald-50" : "bg-indigo-50"
              )}>
                {user.completedTasks.includes(task.id) ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                ) : (
                  <PlayCircle className="w-10 h-10 text-indigo-500" />
                )}
              </div>
              <div className="absolute -top-2 -right-2 bg-white border border-slate-100 shadow-sm px-2 py-0.5 rounded-full">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Week {task.weekNumber}</span>
              </div>
            </div>

            <div className="flex-grow">
              <div className="flex items-center gap-3 mb-2">
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  task.difficultyLevel === 'easy' ? "bg-emerald-100 text-emerald-700" :
                  task.difficultyLevel === 'medium' ? "bg-blue-100 text-blue-700" :
                  task.difficultyLevel === 'hard' ? "bg-orange-100 text-orange-700" :
                  "bg-red-100 text-red-700"
                )}>
                  {task.difficultyLevel}
                </span>
                <span className="text-xs font-bold text-yellow-600 flex items-center gap-1">
                  <span className="w-1 h-1 bg-yellow-400 rounded-full" />
                  {task.coinReward} Coins
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                {task.taskTitle}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-1">
                {task.taskDescription}
              </p>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Clock className="w-3 h-3" />
                  Due: Next Sunday
                </div>
                {user.completedTasks.includes(task.id) ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    Completed
                  </span>
                ) : (
                  <span className="text-xs font-bold text-indigo-600 group-hover:underline">
                    Start Task
                  </span>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No tasks found</h3>
            <p className="text-slate-500 mt-1 text-sm">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksList;
