import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

import { Task } from 'src/app/model/task.model';
import { Project } from 'src/app/model/project.model';
import { ProjectSummaryDTO } from '../model/project-summary.types';
export interface VerifyInviteResponse {
email: string;
projectName: string;
role: string;
}
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export interface ProjectMember {
  id: number;
  role: MemberRole;
  user: { id: number; name?: string; email?: string };
  project?: { id: number; name?: string };
}

@Injectable({ providedIn: 'root' })
export class ApiService {

  private base = environment.apiBase ?? 'https://backeendtasklink.onrender.com/api';

  constructor(private http: HttpClient) {}

  // Tasks
  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.base}/tasks`);
  }

  // IMPORTANT: backend now serves project-scoped tasks
  getTasksByProject(projectId?: number): Observable<Task[]> {
    if (!projectId) return this.getTasks();
    return this.http.get<Task[]>(`${this.base}/projects/${projectId}/tasks`);
  }

  getTask(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.base}/tasks/${id}`);
  }

  // Always include projectId (either in arg or in body)
  createTask(t: Partial<Task>, projectId?: number): Observable<Task> {
    const body = { ...t, projectId: projectId ?? t.projectId };
    return this.http.post<Task>(`${this.base}/tasks`, body);
  }

  // Allow partial payloads
  updateTask(id: number, t: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.base}/tasks/${id}`, t as any);
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/tasks/${id}`);
  }

  // Projects
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.base}/projects`);
  }

  getProject(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.base}/projects/${id}`);
  }

  createProject(p: Project): Observable<Project> {
    return this.http.post<Project>(`${this.base}/projects`, p);
  }

  // Membership + invites
  inviteMember(projectId: number, email: string, role: MemberRole = 'MEMBER') {
    return this.http.post(`${this.base}/projects/${projectId}/members/invite`, { email, role });
  }


  getMyMembership(projectId: number) {
    return this.http.get<ProjectMember>(`${this.base}/projects/${projectId}/me`);
  }

  verifyInvite(token: string): Observable<VerifyInviteResponse> {
return this.http.get<VerifyInviteResponse>(`${this.base}/auth/verify`, {
params: { token }
});
}

// FIX: same here
acceptInvite(token: string): Observable<ProjectMember> {
return this.http.post<ProjectMember>(`${this.base}/projects/invites/accept`, null, {
params: { token }
});
}


  
getProjectMembers(projectId: number): Observable<ProjectMember[]> {
return this.http.get<ProjectMember[]>(`${this.base}/projects/${projectId}/members/list`);
}

assignTask(taskId: number, userId: number) {
const params = new HttpParams().set('userId', String(userId));
// API expects empty body
return this.http.post<any>(`${this.base}/tasks/${taskId}/assign`, null, { params });
}

  getProjectSummary(): Observable<ProjectSummaryDTO> {
    return this.http.get<ProjectSummaryDTO>(`${this.base}/projects/summary`);
  }
checkUserExists(email: string) {
  return this.http.get<boolean>(`${this.base}/auth/check-user?email=${encodeURIComponent(email)}`);
}

  

}