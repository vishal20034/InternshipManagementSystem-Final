import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import TasksList from './components/TasksList';
import TaskModal from './components/TaskModal';
import HRSidebar from './components/hr/HRSidebar';
import HRNavbar from './components/hr/HRNavbar';
import HRDashboard from './components/hr/HRDashboard';
import DocumentHistory from './components/hr/DocumentHistory';
import SendDocuments from './components/hr/SendDocuments';
import AutomationRules from './components/hr/AutomationRules';
import InternsList from './components/hr/InternsList';
import { MOCK_USER, MOCK_TASKS } from './data/mockData';
import { MOCK_HR_USER, MOCK_INTERNS, MOCK_DOCUMENT_HISTORY, MOCK_AUTOMATION_RULES } from './data/hrMockData';
import { User, Task, DocumentRecord, Intern, AutomationRule, DocumentType } from './types';

const App: React.FC = () => {
  // Portal state
  const [portalMode, setPortalMode] = useState<'student' | 'hr'>('student');
  
  // Student portal state
  const [user, setUser] = useState<User>(MOCK_USER);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // HR portal state
  const [hrActiveTab, setHrActiveTab] = useState('hr-dashboard');
  const [documentHistory, setDocumentHistory] = useState<DocumentRecord[]>(MOCK_DOCUMENT_HISTORY);
  const [interns, setInterns] = useState<Intern[]>(MOCK_INTERNS);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(MOCK_AUTOMATION_RULES);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Student task submission handler
  const handleTaskSubmit = (taskId: string, link: string) => {
    console.log(`Submitted task ${taskId} with link: ${link}`);
    setUser(prev => {
      if (prev.completedTasks.includes(taskId)) return prev;
      const task = MOCK_TASKS.find(t => t.id === taskId);
      const reward = task ? task.coinReward : 0;
      return {
        ...prev,
        completedTasks: [...prev.completedTasks, taskId],
        coins: prev.coins + reward
      };
    });
  };

  // HR document send handler
  const handleSendDocument = (internIds: string[], documentType: DocumentType) => {
    const newDocs: DocumentRecord[] = internIds.map((internId, idx) => {
      const intern = interns.find(i => i.id === internId);
      return {
        id: `doc_new_${Date.now()}_${idx}`,
        internId,
        internName: intern?.name || 'Unknown',
        internEmail: intern?.email || 'unknown@example.com',
        domain: intern?.domain || 'Unknown',
        documentType,
        sendMethod: 'manual' as const,
        status: 'sent' as const,
        sentAt: new Date().toISOString(),
        sentBy: MOCK_HR_USER.name
      };
    });
    
    setDocumentHistory(prev => [...newDocs, ...prev]);
    
    // Update interns' document list
    setInterns(prev => prev.map(intern => {
      if (internIds.includes(intern.id) && !intern.documentsReceived.includes(documentType)) {
        return {
          ...intern,
          documentsReceived: [...intern.documentsReceived, documentType]
        };
      }
      return intern;
    }));
  };

  // HR automation rule toggle handler
  const handleToggleRule = (ruleId: string) => {
    setAutomationRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  // Render student portal content
  const renderStudentContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} tasks={MOCK_TASKS} onTaskClick={setSelectedTask} />;
      case 'tasks':
        return <TasksList user={user} tasks={MOCK_TASKS} onTaskClick={setSelectedTask} />;
      case 'rewards':
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6 border border-yellow-100">
              <span className="text-4xl">🏆</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Leaderboard coming soon!</h2>
            <p className="text-slate-500 mt-2 max-w-md">You're currently ranked #12 out of 450 interns in the {user.domain} track.</p>
          </div>
        );
      case 'payments':
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-indigo-600 rounded-3xl p-8 text-white flex justify-between items-center">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Available Balance</p>
                <h2 className="text-4xl font-bold mt-1">₹ 2,500.00</h2>
                <p className="text-indigo-200 text-xs mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" /> Verified Stipend Account
                </p>
              </div>
              <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all">
                Withdraw Funds
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Stipend Status</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-sm text-slate-500">Fixed Stipend</span>
                    <span className="text-sm font-bold text-slate-800">₹ 2,000</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-sm text-slate-500">Performance Bonus</span>
                    <span className="text-sm font-bold text-emerald-600">+ ₹ 500</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm text-slate-500">TDS Deduction</span>
                    <span className="text-sm font-bold text-red-500">- ₹ 0</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Payment Methods</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="font-medium text-slate-700 text-sm">UPI: vishal@okaxis</span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase font-bold">Primary</span>
                  </div>
                  <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-bold hover:border-indigo-300 hover:text-indigo-500 transition-all">
                    + Add New Method
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center py-20">
            <h2 className="text-xl font-bold text-slate-800">{activeTab} View</h2>
            <p className="text-slate-500 mt-2">This module is currently under maintenance.</p>
          </div>
        );
    }
  };

  // Render HR portal content
  const renderHRContent = () => {
    switch (hrActiveTab) {
      case 'hr-dashboard':
        return (
          <HRDashboard 
            documents={documentHistory} 
            interns={interns} 
            automationRules={automationRules}
            onNavigate={setHrActiveTab}
          />
        );
      case 'document-history':
        return <DocumentHistory documents={documentHistory} />;
      case 'send-documents':
        return <SendDocuments interns={interns} onSendDocument={handleSendDocument} />;
      case 'automation':
        return <AutomationRules rules={automationRules} onToggleRule={handleToggleRule} />;
      case 'interns':
        return (
          <InternsList 
            interns={interns} 
            onSendDocument={() => {
              setHrActiveTab('send-documents');
            }} 
          />
        );
      default:
        return (
          <div className="text-center py-20">
            <h2 className="text-xl font-bold text-white">{hrActiveTab} View</h2>
            <p className="text-slate-400 mt-2">This module is currently under development.</p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  // HR Portal
  if (portalMode === 'hr') {
    return (
      <div className="min-h-screen bg-slate-900 flex">
        <HRSidebar 
          activeTab={hrActiveTab} 
          setActiveTab={setHrActiveTab}
          onSwitchToStudent={() => setPortalMode('student')}
        />
        
        <div className="flex-grow ml-64 flex flex-col">
          <HRNavbar user={MOCK_HR_USER} />
          
          <main className="mt-16 p-8 min-h-[calc(100vh-64px)] overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {renderHRContent()}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Student Portal
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-grow ml-64 flex flex-col">
        <Navbar user={user} />
        
        <main className="mt-16 p-8 min-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {renderStudentContent()}
            
            {/* HR Portal Switch Button */}
            <div className="fixed bottom-6 right-6">
              <button 
                onClick={() => setPortalMode('hr')}
                className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-all text-sm font-bold"
              >
                <span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs">HR</span>
                Switch to HR Portal
              </button>
            </div>
          </div>
        </main>
      </div>

      <TaskModal 
        task={selectedTask} 
        user={user} 
        onClose={() => setSelectedTask(null)} 
        onSubmit={handleTaskSubmit}
      />
    </div>
  );
};

export default App;
