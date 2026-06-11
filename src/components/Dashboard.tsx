
import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Trophy,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { User, Task } from '../types';
import { motion } from 'framer-motion';

interface DashboardProps {
  user: User;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, tasks, onTaskClick }) => {
  const completedCount = user.completedTasks.length;
  const progress = (completedCount / tasks.length) * 100;
  
  const currentWeekTasks = tasks.filter(t => t.weekNumber <= 2); // Simulating current progress

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
        <p className="text-slate-500 mt-1">You're doing great. Keep up the momentum to earn more TEN coins.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Completed Tasks', value: completedCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Tasks', value: tasks.length, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Coins', value: user.coins, icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Course Progress', value: `${Math.round(progress)}%`, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Recent Tasks</h2>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {currentWeekTasks.map((task) => (
              <div 
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="group p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 transition-all cursor-pointer flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  user.completedTasks.includes(task.id) ? 'bg-emerald-100' : 'bg-slate-100'
                }`}>
                  {user.completedTasks.includes(task.id) ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <span className="text-lg font-bold text-slate-500">W{task.weekNumber}</span>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{task.taskTitle}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{task.difficultyLevel}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-xs font-medium text-yellow-600">{task.coinReward} Coins</span>
                  </div>
                </div>
                <div className="text-slate-400 group-hover:text-indigo-500">
                  <ExternalLink className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-800">Learning Path</h2>
          <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
            <div className="relative z-10">
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10">
                Current Domain
              </span>
              <h3 className="text-xl font-bold mt-4">{user.domain}</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Unlock advanced concepts in {user.domain.split(' ')[0]} and earn up to 500 bonus coins this month.
              </p>
              <button className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-indigo-500/20">
                Continue Learning
              </button>
            </div>
            <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-2xl">
            <h4 className="font-bold text-slate-800 mb-4">Quick Links</h4>
            <div className="space-y-3">
              {[
                'Internship Guidelines',
                'Download ID Card',
                'Join Discord Server',
                'Help Center'
              ].map((link, i) => (
                <a key={i} href="#" className="block text-sm text-slate-600 hover:text-indigo-600 transition-colors font-medium underline-offset-4 hover:underline">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
