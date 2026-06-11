import { DocumentRecord, Intern, AutomationRule, HRUser, DocumentType } from '../types';

export const MOCK_HR_USER: HRUser = {
  id: 'hr001',
  name: 'Priya Sharma',
  email: 'priya.hr@ten.org',
  role: 'hr'
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  offer_letter: 'Offer Letter',
  id_card: 'ID Card',
  completion_certificate: 'Completion Certificate',
  lor: 'Letter of Recommendation',
  internship_letter: 'Internship Letter',
  noc: 'No Objection Certificate',
  experience_certificate: 'Experience Certificate'
};

export const MOCK_INTERNS: Intern[] = [
  {
    id: 'int001',
    name: 'Vishal Pawar',
    email: 'vishal@example.com',
    phone: '+91 9876543210',
    domain: 'Python Development',
    durationType: '3months',
    joinDate: '2024-01-15',
    endDate: '2024-04-15',
    status: 'active',
    documentsReceived: ['offer_letter', 'id_card']
  },
  {
    id: 'int002',
    name: 'Ananya Singh',
    email: 'ananya@example.com',
    phone: '+91 9876543211',
    domain: 'Web Development',
    durationType: '6months',
    joinDate: '2024-01-10',
    endDate: '2024-07-10',
    status: 'active',
    documentsReceived: ['offer_letter', 'id_card', 'internship_letter']
  },
  {
    id: 'int003',
    name: 'Rahul Verma',
    email: 'rahul@example.com',
    phone: '+91 9876543212',
    domain: 'Data Science',
    durationType: '3months',
    joinDate: '2023-10-01',
    endDate: '2024-01-01',
    status: 'completed',
    documentsReceived: ['offer_letter', 'id_card', 'completion_certificate', 'lor', 'experience_certificate']
  },
  {
    id: 'int004',
    name: 'Sneha Patel',
    email: 'sneha@example.com',
    phone: '+91 9876543213',
    domain: 'App Development',
    durationType: '3months',
    joinDate: '2024-02-01',
    endDate: '2024-05-01',
    status: 'active',
    documentsReceived: ['offer_letter']
  },
  {
    id: 'int005',
    name: 'Amit Kumar',
    email: 'amit@example.com',
    phone: '+91 9876543214',
    domain: 'Python Development',
    durationType: '6months',
    joinDate: '2024-01-20',
    endDate: '2024-07-20',
    status: 'active',
    documentsReceived: ['offer_letter', 'id_card']
  },
  {
    id: 'int006',
    name: 'Pooja Reddy',
    email: 'pooja@example.com',
    phone: '+91 9876543215',
    domain: 'Web Development',
    durationType: '3months',
    joinDate: '2023-11-15',
    endDate: '2024-02-15',
    status: 'completed',
    documentsReceived: ['offer_letter', 'id_card', 'completion_certificate', 'experience_certificate']
  }
];

export const MOCK_DOCUMENT_HISTORY: DocumentRecord[] = [
  {
    id: 'doc001',
    internId: 'int001',
    internName: 'Vishal Pawar',
    internEmail: 'vishal@example.com',
    domain: 'Python Development',
    documentType: 'offer_letter',
    sendMethod: 'automation',
    status: 'delivered',
    sentAt: '2024-01-15T09:00:00Z',
    deliveredAt: '2024-01-15T09:02:00Z',
    automationRule: 'Welcome Package - On Join'
  },
  {
    id: 'doc002',
    internId: 'int001',
    internName: 'Vishal Pawar',
    internEmail: 'vishal@example.com',
    domain: 'Python Development',
    documentType: 'id_card',
    sendMethod: 'manual',
    status: 'delivered',
    sentAt: '2024-01-16T14:30:00Z',
    deliveredAt: '2024-01-16T14:32:00Z',
    sentBy: 'Priya Sharma'
  },
  {
    id: 'doc003',
    internId: 'int002',
    internName: 'Ananya Singh',
    internEmail: 'ananya@example.com',
    domain: 'Web Development',
    documentType: 'offer_letter',
    sendMethod: 'automation',
    status: 'delivered',
    sentAt: '2024-01-10T09:00:00Z',
    deliveredAt: '2024-01-10T09:01:30Z',
    automationRule: 'Welcome Package - On Join'
  },
  {
    id: 'doc004',
    internId: 'int002',
    internName: 'Ananya Singh',
    internEmail: 'ananya@example.com',
    domain: 'Web Development',
    documentType: 'id_card',
    sendMethod: 'automation',
    status: 'delivered',
    sentAt: '2024-01-10T09:00:00Z',
    deliveredAt: '2024-01-10T09:01:45Z',
    automationRule: 'Welcome Package - On Join'
  },
  {
    id: 'doc005',
    internId: 'int002',
    internName: 'Ananya Singh',
    internEmail: 'ananya@example.com',
    domain: 'Web Development',
    documentType: 'internship_letter',
    sendMethod: 'manual',
    status: 'delivered',
    sentAt: '2024-01-25T11:00:00Z',
    deliveredAt: '2024-01-25T11:03:00Z',
    sentBy: 'Priya Sharma'
  },
  {
    id: 'doc006',
    internId: 'int003',
    internName: 'Rahul Verma',
    internEmail: 'rahul@example.com',
    domain: 'Data Science',
    documentType: 'completion_certificate',
    sendMethod: 'automation',
    status: 'delivered',
    sentAt: '2024-01-01T10:00:00Z',
    deliveredAt: '2024-01-01T10:02:00Z',
    automationRule: 'Completion Package - On Completion'
  },
  {
    id: 'doc007',
    internId: 'int003',
    internName: 'Rahul Verma',
    internEmail: 'rahul@example.com',
    domain: 'Data Science',
    documentType: 'lor',
    sendMethod: 'manual',
    status: 'delivered',
    sentAt: '2024-01-02T15:00:00Z',
    deliveredAt: '2024-01-02T15:05:00Z',
    sentBy: 'Priya Sharma'
  },
  {
    id: 'doc008',
    internId: 'int004',
    internName: 'Sneha Patel',
    internEmail: 'sneha@example.com',
    domain: 'App Development',
    documentType: 'offer_letter',
    sendMethod: 'automation',
    status: 'delivered',
    sentAt: '2024-02-01T09:00:00Z',
    deliveredAt: '2024-02-01T09:01:00Z',
    automationRule: 'Welcome Package - On Join'
  },
  {
    id: 'doc009',
    internId: 'int004',
    internName: 'Sneha Patel',
    internEmail: 'sneha@example.com',
    domain: 'App Development',
    documentType: 'id_card',
    sendMethod: 'automation',
    status: 'pending',
    sentAt: '2024-02-05T09:00:00Z',
    automationRule: 'Weekly ID Card Batch'
  },
  {
    id: 'doc010',
    internId: 'int005',
    internName: 'Amit Kumar',
    internEmail: 'amit@example.com',
    domain: 'Python Development',
    documentType: 'offer_letter',
    sendMethod: 'automation',
    status: 'delivered',
    sentAt: '2024-01-20T09:00:00Z',
    deliveredAt: '2024-01-20T09:01:30Z',
    automationRule: 'Welcome Package - On Join'
  },
  {
    id: 'doc011',
    internId: 'int005',
    internName: 'Amit Kumar',
    internEmail: 'amit@example.com',
    domain: 'Python Development',
    documentType: 'id_card',
    sendMethod: 'manual',
    status: 'sent',
    sentAt: '2024-02-10T10:30:00Z',
    sentBy: 'Priya Sharma'
  },
  {
    id: 'doc012',
    internId: 'int006',
    internName: 'Pooja Reddy',
    internEmail: 'pooja@example.com',
    domain: 'Web Development',
    documentType: 'experience_certificate',
    sendMethod: 'manual',
    status: 'failed',
    sentAt: '2024-02-16T14:00:00Z',
    sentBy: 'Priya Sharma',
    errorMessage: 'Invalid email address'
  }
];

export const MOCK_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule001',
    name: 'Welcome Package - On Join',
    documentType: 'offer_letter',
    triggerCondition: 'on_join',
    isActive: true,
    lastRun: '2024-02-01T09:00:00Z',
    totalSent: 156
  },
  {
    id: 'rule002',
    name: 'ID Card - On Join',
    documentType: 'id_card',
    triggerCondition: 'on_join',
    isActive: true,
    lastRun: '2024-02-01T09:00:00Z',
    totalSent: 142
  },
  {
    id: 'rule003',
    name: 'Completion Package - On Completion',
    documentType: 'completion_certificate',
    triggerCondition: 'on_completion',
    isActive: true,
    lastRun: '2024-01-31T18:00:00Z',
    totalSent: 89
  },
  {
    id: 'rule004',
    name: 'Weekly ID Card Batch',
    documentType: 'id_card',
    triggerCondition: 'weekly',
    isActive: true,
    lastRun: '2024-02-05T09:00:00Z',
    totalSent: 34
  },
  {
    id: 'rule005',
    name: 'Monthly Progress Report',
    documentType: 'internship_letter',
    triggerCondition: 'monthly',
    isActive: false,
    lastRun: '2024-01-01T00:00:00Z',
    totalSent: 12
  }
];
