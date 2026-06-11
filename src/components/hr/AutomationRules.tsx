import React from 'react';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Settings,
  Clock,
  CheckCircle2,
  Calendar,
  FileText,
  Trash2,
  Edit
} from 'lucide-react';
import { clsx } from 'clsx';
import { AutomationRule } from '../../types';
import { DOCUMENT_TYPE_LABELS } from '../../data/hrMockData';
import { format, parseISO } from 'date-fns';

interface AutomationRulesProps {
  rules: AutomationRule[];
  onToggleRule: (ruleId: string) => void;
}

const TRIGGER_LABELS: Record<string, string> = {
  on_join: 'When intern joins',
  on_completion: 'When internship completes',
  weekly: 'Every week',
  monthly: 'Every month',
  custom: 'Custom schedule'
};

const AutomationRules: React.FC<AutomationRulesProps> = ({ rules, onToggleRule }) => {
  const activeRules = rules.filter(r => r.isActive);
  const totalAutomatedSends = rules.reduce((sum, r) => sum + r.totalSent, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Automation Rules</h1>
          <p className="text-slate-400 mt-1">Configure automatic document sending based on triggers</p>
        </div>
        <button 
          onClick={() => alert('Create rule modal coming soon!')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          Create Rule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Rules</p>
              <p className="text-2xl font-bold text-white">{activeRules.length}</p>
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Automated Sends</p>
              <p className="text-2xl font-bold text-white">{totalAutomatedSends}</p>
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Time Saved (est.)</p>
              <p className="text-2xl font-bold text-white">{Math.round(totalAutomatedSends * 2)} hrs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div 
            key={rule.id}
            className={clsx(
              "p-6 bg-slate-800 rounded-xl border transition-all",
              rule.isActive ? "border-emerald-500/30" : "border-slate-700"
            )}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className={clsx(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                rule.isActive ? "bg-purple-500/20" : "bg-slate-700"
              )}>
                <Zap className={clsx("w-6 h-6", rule.isActive ? "text-purple-400" : "text-slate-500")} />
              </div>

              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-white">{rule.name}</h3>
                  <span className={clsx(
                    "px-2 py-0.5 rounded-full text-xs font-bold",
                    rule.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                  )}>
                    {rule.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {DOCUMENT_TYPE_LABELS[rule.documentType]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {TRIGGER_LABELS[rule.triggerCondition]}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {rule.totalSent} sent
                  </span>
                  {rule.lastRun && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Last run: {format(parseISO(rule.lastRun), 'MMM dd, HH:mm')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onToggleRule(rule.id)}
                  className={clsx(
                    "p-2 rounded-lg transition-all",
                    rule.isActive 
                      ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" 
                      : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  )}
                  title={rule.isActive ? 'Pause Rule' : 'Activate Rule'}
                >
                  {rule.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button className="p-2 bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-all" title="Edit Rule">
                  <Edit className="w-5 h-5" />
                </button>
                <button className="p-2 bg-slate-700 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete Rule">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="font-bold text-purple-300">How Automation Works</h4>
            <p className="text-sm text-purple-200/70 mt-1 leading-relaxed">
              Automation rules automatically send specified documents when trigger conditions are met. 
              For example, setting up an "On Join" trigger will automatically send the selected document 
              to every new intern as soon as they are added to the system. All automated sends are tracked 
              in the Document History section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationRules;
