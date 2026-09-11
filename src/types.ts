export type Role = 'SUPER_ADMIN' | 'PM' | 'MEMBER' | 'GUEST_AUDITOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  title: string;
  department: string;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  startDate: string;
  targetEndDate: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: Role;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  color: string;
  position: number;
}

export interface Attachment {
  id: string;
  entityType: 'TASK' | 'RFI' | 'COMMENT';
  entityId: string;
  fileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  storageKey: string;
  fileUrl: string;
  uploaderId: string;
  uploaderName: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  mentions: string[]; // User IDs
  createdAt: string;
}

export type WorkPackageType = 'PHASE' | 'TASK' | 'MILESTONE';

export interface Task {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  wpType?: WorkPackageType;
  parentId?: string; // For parent-child hierarchy in OpenProject
  startDate?: string; // YYYY-MM-DD for Gantt timeline
  dueDate: string; // YYYY-MM-DD
  progress?: number; // 0 - 100 percentage
  dependencies?: string[]; // Predecessor Task IDs
  isMilestone?: boolean; // Whether it is a milestone
  estimatedHours?: number;
  spentHours?: number;
  milestone?: string;
  position: number; // Floating point for Lexorank
  createdBy: string;
  assigneeId: string; // Primary assignee
  collaboratorIds: string[]; // Watchers / Collaborators
  tags: string[];
  moduleName?: string;
  relatedRfiIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type RFIStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'ANSWERED' | 'CLOSED' | 'REJECTED';

export interface RFIHistory {
  id: string;
  rfiId: string;
  actorId: string;
  actorName: string;
  action: string;
  fromStatus?: RFIStatus;
  toStatus?: RFIStatus;
  note?: string;
  timestamp: string;
}

export interface RFI {
  id: string;
  rfiCode: string; // e.g. RFI-BLD1-2026-0042
  projectId: string;
  subject: string;
  question: string;
  suggestedSolution?: string;
  officialResponse?: string;
  status: RFIStatus;
  costImpact: boolean;
  costAmount?: number; // Estimated additional cost in TWD/USD
  scheduleImpact: number; // Delay in days (0 for no impact)
  assignedTo: string; // Respondent User ID
  requestedBy: string; // Requester User ID
  dueDate: string;
  closedAt?: string;
  relatedTaskIds?: string[];
  createdAt: string;
  updatedAt: string;
  clientSigned: boolean;
  pmSigned: boolean;
}

export type SwimlaneMode = 'NONE' | 'PRIORITY' | 'ASSIGNEE' | 'MODULE';

export interface ApiLog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  endpoint: string;
  status: number;
  durationMs: number;
  requestBody?: any;
  responseBody?: any;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'MENTION' | 'ASSIGN' | 'RFI_ANSWER' | 'RFI_SIGN' | 'STATUS_CHANGE';
  read: boolean;
  linkId?: string;
  linkType?: 'TASK' | 'RFI';
  createdAt: string;
}
