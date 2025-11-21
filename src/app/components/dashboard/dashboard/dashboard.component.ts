import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { Project } from 'src/app/model/project.model';
import { Task } from 'src/app/model/task.model';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';
import { finalize, take } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html'
})

export class DashboardComponent implements OnInit {
  today = new Date();
  user$ = this.auth.currentUser$;

  projects: Project[] = [];
  projectMap = new Map<number, string>();
  recentTasks: Task[] = [];

  // Loading flags
  loadingProjects = true;
  loadingTasks = true;
  userLoading = true;

  // Pagination — What’s Next (recent tasks): 5 per page
  tasksPageSize = 3;
  tasksPage = 1;

  get tasksTotalPages(): number {
    return Math.max(1, Math.ceil(this.recentTasks.length / this.tasksPageSize));
  }
  get tasksPageStart(): number {
    return (this.tasksPage - 1) * this.tasksPageSize;
  }
  get tasksPageEnd(): number {
    return Math.min(this.tasksPageStart + this.tasksPageSize, this.recentTasks.length);
  }
  get recentTasksPaged(): Task[] {
    return this.recentTasks.slice(this.tasksPageStart, this.tasksPageEnd);
  }
  get tasksPages(): number[] {
    return Array.from({ length: this.tasksTotalPages }, (_, i) => i + 1);
  }
  setTasksPage(p: number) { this.tasksPage = Math.min(Math.max(1, p), this.tasksTotalPages); }
  prevTasksPage() { this.setTasksPage(this.tasksPage - 1); }
  nextTasksPage() { this.setTasksPage(this.tasksPage + 1); }

  // TrackBy for recent tasks
  trackTaskById(index: number, t: Task) { return t.id ?? index; }

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    // User skeleton until first emission
    this.auth.currentUser$
      .pipe(take(1))
      .subscribe({
        next: () => (this.userLoading = false),
        error: () => (this.userLoading = false)
      });

    this.api.getProjects()
      .pipe(finalize(() => (this.loadingProjects = false)))
      .subscribe(p => {
        this.projects = p || [];
        p?.forEach(pr => { if (pr.id != null) this.projectMap.set(pr.id, pr.name); });
      });

    this.api.getTasks()
      .pipe(finalize(() => (this.loadingTasks = false)))
      .subscribe(ts => {
        const tasks = ts || [];
        // Sort recent tasks; pagination will control visible count
        this.recentTasks = [...tasks].sort((a, b) => {
          const ad = new Date(a.updatedAt || a.createdAt || 0).getTime() || (a.id ? a.id : 0);
          const bd = new Date(b.updatedAt || b.createdAt || 0).getTime() || (b.id ? b.id : 0);
          return bd - ad;
        });
        // Clamp current page when data changes
        if (this.tasksPage > this.tasksTotalPages) this.tasksPage = this.tasksTotalPages;
      });

    console.log(this.auth.currentUser$);
  }

  goProject(p: Project) {
    if (p.id != null) this.router.navigate(['/projects', p.id, 'board']);
  }

  projectName(id?: number): string {
    if (!id) return '';
    return this.projectMap.get(id) || '';
  }

  timeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d} day${d > 1 ? 's' : ''} ago`;
    if (h > 0) return `${h} hour${h > 1 ? 's' : ''} ago`;
    if (m > 0) return `${m} min ago`;
    return 'just now';
  }
}