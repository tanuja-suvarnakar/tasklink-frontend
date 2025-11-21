import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, map } from 'rxjs/operators';
import { ProjectSummary, Status, ProjectSummaryDTO } from 'src/app/model/project-summary.types';
import { ApiService } from 'src/app/services/api.service';


@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html'
})
export class TasksComponent implements OnInit {
  loading = false;
  error = '';
  summary?: ProjectSummary;

  // Donut config
  readonly R = 48;
  readonly W = 12;
  readonly C = 2 * Math.PI * this.R;

  segments: { label: string; key: Status; value: number; color: string; dash: number; offset: number }[] = [];

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    // Global summary (no projectId needed)
    this.loadSummary();
  }

  loadSummary() {
    this.loading = true;
    this.error = '';

    this.api.getProjectSummary()
      .pipe(
        map((dto: ProjectSummaryDTO) => this.adaptSummary(dto)),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (s: ProjectSummary) => {
          this.summary = s;
          this.buildSegments();
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Failed to load project summary';
        }
      });
  }

  private adaptSummary(dto: ProjectSummaryDTO): ProjectSummary {
    return {
      totalTasks: dto.totalTasks ?? 0,
      completedTasks: dto.completedTasks ?? 0, // total overall
      createdLast7Days: dto.createdLast7 ?? 0,
      updatedLast7Days: dto.updatedLast7 ?? 0,
      dueSoonCount: dto.dueSoon ?? 0,
      statusCount: dto.statusCount ?? {},
      recentActivity: (dto.recent ?? []).map(r => ({
        actorName: r.userName,
        action: r.action,
        taskTitle: r.taskTitle,
        status: r.taskStatus,
        timestamp: r.timestamp
      }))
    };
  }

  private buildSegments() {
    if (!this.summary) { this.segments = []; return; }

    const open = this.summary.statusCount?.OPEN ?? 0;
    const inprog = this.summary.statusCount?.IN_PROGRESS ?? 0;
    const done = this.summary.statusCount?.DONE ?? 0;

    const total = Math.max(0, open + inprog + done);
    if (!total) { this.segments = []; return; }

    const defs = [
      { label: 'In Progress', key: 'IN_PROGRESS' as Status, value: inprog, color: '#0ea5e9' },
      { label: 'To Do',       key: 'OPEN'        as Status, value: open,   color: '#10b981' },
      { label: 'Done',        key: 'DONE'        as Status, value: done,   color: '#22c55e' }
    ];

    let offset = 0;
    this.segments = defs
      .filter(s => s.value > 0)
      .map(s => {
        const dash = (s.value / total) * this.C;
        const seg = { ...s, dash, offset };
        offset += dash;
        return seg;
      });
  }

  countOf(k: Status): number {
    return this.summary?.statusCount?.[k] ?? 0;
  }

  initials(nameOrEmail?: string): string {
    const s = (nameOrEmail || '').trim();
    if (!s) return 'U';
    const main = s.includes('@') ? s.split('@')[0] : s;
    const parts = main.split(/[.\s_-]+/).filter(Boolean);
    return ((parts[0]?.[0] || s[0] || 'U') + (parts[1]?.[0] || '')).toUpperCase();
  }

  timeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    // Handle microseconds like 2025-11-07T10:01:30.154016
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      d = new Date(dateStr.replace(/(\.\d{3})\d+/, '$1')); // trim extra decimals
    }
    const diff = Date.now() - d.getTime();
    if (isNaN(diff)) return '';
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `${day} day${day > 1 ? 's' : ''} ago`;
    if (hr > 0) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
    if (min > 0) return `${min} min ago`;
    return 'just now';
  }

  openBoard() {
    this.router.navigate(['/board']); // global board
  }
}