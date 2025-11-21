// Shared types for summary

export type Status = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface ProjectSummaryDTO {
  totalTasks: number;
  completedTasks: number; // total completed overall
  createdLast7: number;
  updatedLast7: number;
  dueSoon: number; // due in next 7 days
  statusCount: Partial<Record<Status, number>>;
  recent: Array<{
    userName?: string;
    action?: string;
    taskTitle?: string;
    taskStatus?: Status | string;
    timestamp?: string;
  }>;
}

// UI-layer types
export interface RecentActivityItem {
  actorName?: string;
  action?: string;
  taskTitle?: string;
  status?: Status | string;
  timestamp?: string;

  // Optional fallbacks (not used with the current API, but harmless)
  id?: number;
  key?: string;
  title?: string;
  actorEmail?: string;
  actor?: { name?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectSummary {
  totalTasks: number;
  completedTasks: number;       // total completed overall
  createdLast7Days: number;     // created in last 7 days
  updatedLast7Days: number;     // updated in last 7 days
  dueSoonCount: number;         // due in next 7 days
  statusCount: Partial<Record<Status, number>>;
  recentActivity: RecentActivityItem[];
}