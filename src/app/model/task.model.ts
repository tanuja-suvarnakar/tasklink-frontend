export type IssueType = 'TASK' | 'BUG' | 'STORY';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
  id?: number;
  key?: string;
  title: string;
  description?: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  dueDate?: string;
  assigneeId?: any;
  assigneeName?: string;
  projectId?: number;

  issueType?: IssueType;
  priority?: Priority;
  storyPoints?: number;
  order?: number;

  // new (optional)
  createdAt?: string;
  updatedAt?: string;
}