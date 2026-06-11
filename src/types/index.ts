
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Task {
  id: string;
  domain: string;
  durationType: '3months' | '6months';
  weekNumber: number;
  taskTitle: string;
  taskDescription: string;
  videoUrl: string;
  coinReward: number;
  difficultyLevel: Difficulty;
  completed?: boolean;
  submissionDate?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  domain: string;
  durationType: '3months' | '6months';
  coins: number;
  completedTasks: string[]; // task ids
  joinedDate: string;
}

export interface InternshipStats {
  totalTasks: number;
  completedTasks: number;
  currentWeek: number;
  totalCoins: number;
  rank: number;
}

// HR Portal Types
export type DocumentType = 
  | 'offer_letter' 
  | 'id_card' 
  | 'completion_certificate' 
  | 'lor' 
  | 'internship_letter'
  | 'noc'
  | 'experience_certificate';

export type DocumentStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export type SendMethod = 'manual' | 'automation';

export interface DocumentRecord {
  id: string;
  internId: string;
  internName: string;
  internEmail: string;
  domain: string;
  documentType: DocumentType;
  sendMethod: SendMethod;
  status: DocumentStatus;
  sentAt: string;
  deliveredAt?: string;
  sentBy?: string; // HR name for manual sends
  automationRule?: string; // Rule name for automated sends
  errorMessage?: string;
}

export interface Intern {
  id: string;
  name: string;
  email: string;
  phone: string;
  domain: string;
  durationType: '3months' | '6months';
  joinDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'dropped';
  documentsReceived: DocumentType[];
}

export interface AutomationRule {
  id: string;
  name: string;
  documentType: DocumentType;
  triggerCondition: 'on_join' | 'on_completion' | 'weekly' | 'monthly' | 'custom';
  isActive: boolean;
  lastRun?: string;
  totalSent: number;
}

export interface HRUser {
  id: string;
  name: string;
  email: string;
  role: 'hr' | 'admin';
}
