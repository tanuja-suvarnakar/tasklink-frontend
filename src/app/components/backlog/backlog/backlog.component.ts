import { Component, OnInit } from '@angular/core';

import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Task } from 'src/app/model/task.model';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-backlog',
  templateUrl: './backlog.component.html'
})
export class BacklogComponent implements OnInit {
  tasks: Task[] = [];
  loading = false;
  error = '';
  newTitle = '';

  // Inline edit state
  editingTaskId: number | null = null;
  editingTitleValue = '';
  savingEdit = false;

  // Pagination
  pageSize = 5;
  currentPage = 1;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.tasks.length / this.pageSize));
  }
  get pageStart(): number {
    return (this.currentPage - 1) * this.pageSize;
  }
  get pageEnd(): number {
    return Math.min(this.pageStart + this.pageSize, this.tasks.length);
  }
  get pagedTasks(): Task[] {
    return this.tasks.slice(this.pageStart, this.pageEnd);
  }
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
  setPage(page: number) {
    this.currentPage = Math.min(Math.max(1, page), this.totalPages);
  }
  prevPage() { this.setPage(this.currentPage - 1); }
  nextPage() { this.setPage(this.currentPage + 1); }

  trackById(index: number, item: Task) {
    return item.id ?? index;
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.getTasks().subscribe({
      next: (ts) => {
        this.loading = false;
        this.error = '';
        // Backlog = To Do tasks
        this.tasks = [...ts.filter(t => !t.status || t.status === 'OPEN')]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // Clamp page if data size changed
        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.message || 'Failed to load backlog';
      }
    });
  }

  drop(event: CdkDragDrop<Task[]>) {
    // Adjust indexes from the paged view to the full array
    const absPrev = this.pageStart + event.previousIndex;
    const absCurr = this.pageStart + event.currentIndex;

    moveItemInArray(this.tasks, absPrev, absCurr);

    // Persist the new order (global across all pages)
    this.tasks.forEach((t, idx) => {
      if (!t.id) return;
      if (t.order !== idx) {
        this.api.updateTask(t.id, { ...t, order: idx }).subscribe({ next: () => {}, error: () => {} });
      }
    });
  }

  create() {
    const title = this.newTitle.trim();
    if (!title) return;
    const payload: Task = { title, status: 'OPEN', order: this.tasks.length, issueType: 'TASK', priority: 'MEDIUM' };
    this.api.createTask(payload).subscribe({
      next: (t) => {
        this.tasks = [...this.tasks, t];
        this.newTitle = '';
        // Jump to last page so the newly added item is visible
        this.setPage(this.totalPages);
      },
      error: () => {}
    });
  }

  // Inline title edit
  startInlineEdit(t: Task, ev?: Event) {
    ev?.stopPropagation();
    if (!t?.id) return;
    this.editingTaskId = t.id;
    this.editingTitleValue = (t.title || '').toString();
    setTimeout(() => {
      const el = document.getElementById(`bl-edit-title-${t.id}`) as HTMLInputElement | null;
      el?.focus(); el?.select();
    }, 0);
  }

  cancelInlineEdit(ev?: Event) {
    ev?.stopPropagation();
    this.savingEdit = false;
    this.editingTaskId = null;
    this.editingTitleValue = '';
  }

  saveInlineEdit(t: Task, ev?: Event) {
    ev?.stopPropagation();
    if (!t?.id) return;
    const newTitle = (this.editingTitleValue || '').trim();
    if (!newTitle || newTitle === t.title) {
      this.cancelInlineEdit();
      return;
    }

    this.savingEdit = true;
    const payload: Task = { ...t, title: newTitle };

    this.api.updateTask(t.id, payload).subscribe({
      next: (updated) => {
        t.title = updated?.title ?? newTitle;
        this.savingEdit = false;
        this.cancelInlineEdit();
      },
      error: () => {
        this.savingEdit = false;
        this.cancelInlineEdit();
      }
    });
  }
}