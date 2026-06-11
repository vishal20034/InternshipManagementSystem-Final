import React from 'react';
import { 
  Users, 
  FileText, 
  Zap, 
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Send,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { DocumentRecord, Intern, AutomationRule } from '../../types';
import { DOCUMENT_TYPE_LABELS } from '../../data/hrMockData';
import { format, parseISO } from 'date-fns';

interface HRDashboardProps {
  documents: DocumentRecord[];
  interns: Intern[];
  automationRules: AutomationRule[];
  onNavigate: (tab: string) => void;
}

const HRDashboard: React.FC<HRDashboardProps> = ({ documents, interns, automationRules, onNavigate }) => {
  const activeInterns = interns.filter(i => i.status === 'active').length;
  const totalDocsSent = documents.length;
  const automationSent = documents.filter(d => d.sendMethod === 'automation').length;
  const manualSent = documents.filter(d => d.sendMethod === 'manual').length;
  const pendingDocs = documents.filter(d => d.status === 'pending' || d.status === 'sent').length;
  const activeRules = automationRules.filter(r => r.isActive).length;

  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">HR Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of intern documents and automation status</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Interns', value: activeInterns, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total Docs Sent', value: totalDocsSent, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Via Automation', value: automationSent, icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Active Rules', value: activeRules, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-slate-800 rounded-2xl border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Manual vs Automation Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <h3 className="font-bold text-white mb-4">Document Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400 flex items-center gap-2">
                  <User className="w-4 h-4" /> Manual Sends
                </span>
                <span className="text-sm font-bold text-white">{manualSent}</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-400 rounded-full transition-all"
                  style={{ width: `${(manualSent / totalDocsSent) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" /> Automation Sends
                </span>
                <span className="text-sm font-bold text-white">{automationSent}</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${(automationSent / totalDocsSent) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Automation handles {Math.round((automationSent / totalDocsSent) * 100)}% of all documents
            </span>
            <span className="text-xs text-emerald-400 font-medium">↑ 12% this month</span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <h3 className="font-bold text-white mb-4">Delivery Status</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Delivered', value: documents.filter(d => d.status === 'delivered').length, icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'Pending', value: pendingDocs, icon: Clock, color: 'text-yellow-400' },
              { label: 'Failed', value: documents.filter(d => d.status === 'failed').length, icon: AlertCircle, color: 'text-red-400' },
            ].map((item, idx) => (
              <div key={idx} className="text-center p-4 bg-slate-900 rounded-xl">
                <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-white">{item.value}</p>
                <p className="text-xs text-slate-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          {pendingDocs > 0 && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-yellow-300">{pendingDocs} document(s) awaiting delivery confirmation</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-white">Recent Document Activity</h3>
          <button 
            onClick={() => onNavigate('document-history')}
            className="text-sm text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {recentDocuments.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 p-4 bg-slate-900 rounded-xl">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                doc.sendMethod === 'automation' ? 'bg-purple-500/20' : 'bg-slate-700'
              }`}>
                {doc.sendMethod === 'automation' ? (
                  <Zap className="w-5 h-5 text-purple-400" />
                ) : (
                  <Send className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-grow">
                <p className="text-sm text-white">
                  <span className="font-medium">{DOCUMENT_TYPE_LABELS[doc.documentType]}</span>
                  <span className="text-slate-500"> sent to </span>
                  <span className="font-medium">{doc.internName}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {doc.sendMethod === 'automation' ? `via ${doc.automationRule}` : `by ${doc.sentBy}`}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold capitalize ${
                  doc.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                  doc.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  doc.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {doc.status}
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  {format(parseISO(doc.sentAt), 'MMM dd, HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => onNavigate('send-documents')}
          className="p-6 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-white text-left transition-all group"
        >
          <Send className="w-8 h-8 mb-3" />
          <h4 className="font-bold text-lg">Send Documents</h4>
          <p className="text-emerald-100 text-sm mt-1">Manually send documents to interns</p>
          <ArrowRight className="w-5 h-5 mt-4 group-hover:translate-x-1 transition-transform" />
        </button>
        
        <button 
          onClick={() => onNavigate('document-history')}
          className="p-6 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 text-white text-left transition-all group"
        >
          <FileText className="w-8 h-8 mb-3 text-blue-400" />
          <h4 className="font-bold text-lg">Document History</h4>
          <p className="text-slate-400 text-sm mt-1">View all sent documents</p>
          <ArrowRight className="w-5 h-5 mt-4 text-slate-500 group-hover:translate-x-1 group-hover:text-white transition-all" />
        </button>
        
        <button 
          onClick={() => onNavigate('automation')}
          className="p-6 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 text-white text-left transition-all group"
        >
          <Zap className="w-8 h-8 mb-3 text-purple-400" />
          <h4 className="font-bold text-lg">Automation Rules</h4>
          <p className="text-slate-400 text-sm mt-1">Configure automatic sending</p>
          <ArrowRight className="w-5 h-5 mt-4 text-slate-500 group-hover:translate-x-1 group-hover:text-white transition-all" />
        </button>
      </div>
    </div>
  );
};

export default HRDashboard;
