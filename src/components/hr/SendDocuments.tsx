import React, { useState } from 'react';
import { 
  Search, 
  Send, 
  CheckCircle2, 
  FileText,
  User,
  Mail,
  Building,
  Check
} from 'lucide-react';
import { clsx } from 'clsx';
import { Intern, DocumentType } from '../../types';
import { DOCUMENT_TYPE_LABELS } from '../../data/hrMockData';

interface SendDocumentsProps {
  interns: Intern[];
  onSendDocument: (internIds: string[], documentType: DocumentType) => void;
}

const SendDocuments: React.FC<SendDocumentsProps> = ({ interns, onSendDocument }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInterns, setSelectedInterns] = useState<string[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | ''>('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const filteredInterns = interns.filter(intern =>
    intern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    intern.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    intern.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleInternSelection = (internId: string) => {
    setSelectedInterns(prev => 
      prev.includes(internId) 
        ? prev.filter(id => id !== internId)
        : [...prev, internId]
    );
  };

  const selectAll = () => {
    if (selectedInterns.length === filteredInterns.length) {
      setSelectedInterns([]);
    } else {
      setSelectedInterns(filteredInterns.map(i => i.id));
    }
  };

  const handleSend = async () => {
    if (selectedInterns.length === 0 || !selectedDocType) return;
    
    setSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    onSendDocument(selectedInterns, selectedDocType);
    setSending(false);
    setSent(true);
    
    setTimeout(() => {
      setSent(false);
      setSelectedInterns([]);
      setSelectedDocType('');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Send Documents</h1>
        <p className="text-slate-400 mt-1">Manually send documents to selected interns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Intern Selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Select Interns</h3>
              <button 
                onClick={selectAll}
                className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
              >
                {selectedInterns.length === filteredInterns.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search interns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {filteredInterns.map((intern) => (
                <div 
                  key={intern.id}
                  onClick={() => toggleInternSelection(intern.id)}
                  className={clsx(
                    "p-4 rounded-xl border cursor-pointer transition-all",
                    selectedInterns.includes(intern.id)
                      ? "bg-emerald-500/10 border-emerald-500"
                      : "bg-slate-900 border-slate-700 hover:border-slate-600"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                      selectedInterns.includes(intern.id)
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-600"
                    )}>
                      {selectedInterns.includes(intern.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
                      {intern.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium text-white">{intern.name}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {intern.email}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Building className="w-3 h-3" /> {intern.domain}
                        </span>
                      </div>
                    </div>
                    <span className={clsx(
                      "px-2 py-1 rounded-full text-xs font-bold capitalize",
                      intern.status === 'active' ? "bg-emerald-500/20 text-emerald-400" :
                      intern.status === 'completed' ? "bg-blue-500/20 text-blue-400" :
                      "bg-red-500/20 text-red-400"
                    )}>
                      {intern.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredInterns.length === 0 && (
              <div className="py-8 text-center">
                <User className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No interns found</p>
              </div>
            )}
          </div>
        </div>

        {/* Document Selection & Send */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-6">
            <div>
              <h3 className="font-bold text-white mb-4">Document Type</h3>
              <div className="space-y-2">
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDocType(key as DocumentType)}
                    className={clsx(
                      "w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all",
                      selectedDocType === key
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                        : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600"
                    )}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                    {selectedDocType === key && (
                      <CheckCircle2 className="w-5 h-5 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="pt-4 border-t border-slate-700">
              <h4 className="text-sm font-medium text-slate-400 mb-3">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Interns</span>
                  <span className="font-bold text-white">{selectedInterns.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Document</span>
                  <span className="font-bold text-white">
                    {selectedDocType ? DOCUMENT_TYPE_LABELS[selectedDocType] : 'Not selected'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={selectedInterns.length === 0 || !selectedDocType || sending}
              className={clsx(
                "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                sent 
                  ? "bg-emerald-500 text-white"
                  : selectedInterns.length === 0 || !selectedDocType
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : sent ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Sent Successfully!
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Documents
                </>
              )}
            </button>
          </div>

          {/* Quick Info */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h4 className="text-sm font-medium text-slate-400 mb-2">💡 Quick Tip</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Documents sent manually will be tracked in the Document History section. 
              For bulk sending on specific triggers, consider setting up an automation rule.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendDocuments;
