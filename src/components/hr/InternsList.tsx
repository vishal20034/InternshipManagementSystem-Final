import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  UserPlus,
  Mail,
  Phone,
  Building,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  Eye,
  Send
} from 'lucide-react';
import { clsx } from 'clsx';
import { Intern } from '../../types';
import { DOCUMENT_TYPE_LABELS } from '../../data/hrMockData';
import { format, parseISO } from 'date-fns';

interface InternsListProps {
  interns: Intern[];
  onSendDocument: (internId: string) => void;
}

const InternsList: React.FC<InternsListProps> = ({ interns, onSendDocument }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'dropped'>('all');
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedIntern, setExpandedIntern] = useState<string | null>(null);

  const domains = [...new Set(interns.map(i => i.domain))];

  const filteredInterns = interns.filter(intern => {
    const matchesSearch = 
      intern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intern.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || intern.status === filterStatus;
    const matchesDomain = filterDomain === 'all' || intern.domain === filterDomain;
    return matchesSearch && matchesStatus && matchesDomain;
  });

  const stats = {
    total: interns.length,
    active: interns.filter(i => i.status === 'active').length,
    completed: interns.filter(i => i.status === 'completed').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Interns</h1>
          <p className="text-slate-400 mt-1">Manage interns and their document status</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-bold">
          <UserPlus className="w-4 h-4" />
          Add Intern
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-500">Total Interns</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-500">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-blue-400">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name or email..."
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Status</label>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Domain</label>
              <select 
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
              >
                <option value="all">All Domains</option>
                {domains.map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Interns List */}
      <div className="space-y-4">
        {filteredInterns.map((intern) => (
          <div 
            key={intern.id}
            className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
          >
            <div 
              className="p-6 cursor-pointer hover:bg-slate-750 transition-colors"
              onClick={() => setExpandedIntern(expandedIntern === intern.id ? null : intern.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                  {intern.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white">{intern.name}</h3>
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-xs font-bold capitalize",
                      intern.status === 'active' ? "bg-emerald-500/20 text-emerald-400" :
                      intern.status === 'completed' ? "bg-blue-500/20 text-blue-400" :
                      "bg-red-500/20 text-red-400"
                    )}>
                      {intern.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" /> {intern.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-4 h-4" /> {intern.domain}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400 flex items-center gap-1 justify-end">
                    <FileText className="w-4 h-4" />
                    {intern.documentsReceived.length} docs received
                  </p>
                  <ChevronDown className={clsx(
                    "w-5 h-5 text-slate-500 mt-2 ml-auto transition-transform",
                    expandedIntern === intern.id && "rotate-180"
                  )} />
                </div>
              </div>
            </div>

            {expandedIntern === intern.id && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Details */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-4 h-4 text-slate-500" />
                        {intern.phone}
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        {format(parseISO(intern.joinDate), 'MMM dd, yyyy')} - {format(parseISO(intern.endDate), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-4 h-4 text-slate-500" />
                        {intern.durationType === '3months' ? '3 Months' : '6 Months'} Track
                      </div>
                    </div>
                  </div>

                  {/* Documents Received */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Documents Received</h4>
                    <div className="flex flex-wrap gap-2">
                      {intern.documentsReceived.length > 0 ? (
                        intern.documentsReceived.map((docType) => (
                          <span 
                            key={docType}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {DOCUMENT_TYPE_LABELS[docType]}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No documents received yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-700">
                  <button 
                    onClick={() => onSendDocument(intern.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
                  >
                    <Send className="w-4 h-4" />
                    Send Document
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all text-sm font-medium">
                    <Eye className="w-4 h-4" />
                    View Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredInterns.length === 0 && (
          <div className="py-16 text-center bg-slate-800 rounded-xl border border-slate-700">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">No interns found</h3>
            <p className="text-slate-400 mt-1 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InternsList;
