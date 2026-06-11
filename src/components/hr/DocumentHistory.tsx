import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Zap,
  User,
  Calendar,
  FileText,
  ChevronDown,
  RefreshCw,
  Eye
} from 'lucide-react';
import { clsx } from 'clsx';
import { DocumentRecord, DocumentType, SendMethod, DocumentStatus } from '../../types';
import { DOCUMENT_TYPE_LABELS } from '../../data/hrMockData';
import { format, parseISO } from 'date-fns';

interface DocumentHistoryProps {
  documents: DocumentRecord[];
}

const DocumentHistory: React.FC<DocumentHistoryProps> = ({ documents }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<SendMethod | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | 'all'>('all');
  const [filterDocType, setFilterDocType] = useState<DocumentType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const totalSent = documents.length;
    const manualCount = documents.filter(d => d.sendMethod === 'manual').length;
    const automationCount = documents.filter(d => d.sendMethod === 'automation').length;
    const deliveredCount = documents.filter(d => d.status === 'delivered').length;
    const pendingCount = documents.filter(d => d.status === 'pending' || d.status === 'sent').length;
    const failedCount = documents.filter(d => d.status === 'failed').length;

    return { totalSent, manualCount, automationCount, deliveredCount, pendingCount, failedCount };
  }, [documents]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = 
        doc.internName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.internEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.domain.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesMethod = filterMethod === 'all' || doc.sendMethod === filterMethod;
      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
      const matchesDocType = filterDocType === 'all' || doc.documentType === filterDocType;

      return matchesSearch && matchesMethod && matchesStatus && matchesDocType;
    });
  }, [documents, searchQuery, filterMethod, filterStatus, filterDocType]);

  const getStatusBadge = (status: DocumentStatus) => {
    const config = {
      delivered: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Send },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      failed: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle }
    };
    const { bg, text, icon: Icon } = config[status];
    return (
      <span className={clsx("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold capitalize", bg, text)}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getMethodBadge = (method: SendMethod) => {
    if (method === 'automation') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
          <Zap className="w-3 h-3" />
          Automation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
        <User className="w-3 h-3" />
        Manual
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Document History</h1>
          <p className="text-slate-400 mt-1">Track all documents sent to interns via manual or automation</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all text-sm font-medium">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-bold">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Sent', value: stats.totalSent, color: 'text-white', bg: 'bg-slate-800' },
          { label: 'Manual', value: stats.manualCount, color: 'text-slate-300', bg: 'bg-slate-800', icon: User },
          { label: 'Automation', value: stats.automationCount, color: 'text-purple-400', bg: 'bg-purple-500/10', icon: Zap },
          { label: 'Delivered', value: stats.deliveredCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
          { label: 'Pending', value: stats.pendingCount, color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock },
          { label: 'Failed', value: stats.failedCount, color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle },
        ].map((stat, idx) => (
          <div key={idx} className={clsx("p-4 rounded-xl border border-slate-700", stat.bg)}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              {stat.icon && <stat.icon className={clsx("w-4 h-4", stat.color)} />}
            </div>
            <p className={clsx("text-2xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by intern name, email, or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              showFilters ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={clsx("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Send Method</label>
              <select 
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value as SendMethod | 'all')}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="all">All Methods</option>
                <option value="manual">Manual</option>
                <option value="automation">Automation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Status</label>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as DocumentStatus | 'all')}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Document Type</label>
              <select 
                value={filterDocType}
                onChange={(e) => setFilterDocType(e.target.value as DocumentType | 'all')}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="all">All Types</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing <span className="font-bold text-white">{filteredDocs.length}</span> of {documents.length} records
        </p>
      </div>

      {/* Document Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Intern</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Document</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Method</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Sent At</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Sent By / Rule</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                        {doc.internName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-white">{doc.internName}</p>
                        <p className="text-xs text-slate-500">{doc.internEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-300">{DOCUMENT_TYPE_LABELS[doc.documentType]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getMethodBadge(doc.sendMethod)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(doc.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar className="w-4 h-4" />
                      {format(parseISO(doc.sentAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {doc.sendMethod === 'manual' ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-300">{doc.sentBy}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-purple-300">{doc.automationRule}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-all" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      {doc.status === 'failed' && (
                        <button className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all" title="Resend">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="Send Email">
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDocs.length === 0 && (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">No documents found</h3>
            <p className="text-slate-400 mt-1 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentHistory;
