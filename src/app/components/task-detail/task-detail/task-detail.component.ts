import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { ApiService } from 'src/app/services/api.service';

// ... keep your imports
type Status = 'OPEN' | 'IN_PROGRESS' | 'DONE';

@Component({
  selector: 'app-task-detail',
  templateUrl: './task-detail.component.html'
})
export class TaskDetailComponent implements OnInit {
  id!: number;
  loading = false;
  isModal = false;
  isEditing = false; // NEW

  // Assignment + membership
  members: { id: number; name?: string; email?: string }[] = [];
  isAdmin = false;
  selectedAssigneeId?: number;
  meUserId?: number;

  // Task + basic meta
  task: any;
  assigneeName?: string;
  reporterName?: string;

  // UI
  activeActivityTab: 'comments' | 'history' | 'worklog' = 'comments';

  form = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    status: ['OPEN' as Status, [Validators.required]],
    dueDate: [''] // NEW: for <input type="datetime-local">
  });

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private fb: FormBuilder,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    this.isModal = this.route.outlet === 'modal';
    this.id = +(this.route.snapshot.paramMap.get('id') || 0);

    if (this.id) {
      this.api.getTask(this.id).subscribe((t: any) => {
        this.task = t;

        this.form.patchValue({
          title: t?.title ?? '',
          description: t?.description ?? '',
          status: (t?.status as Status) ?? 'OPEN',
          dueDate: t?.dueDate ? this.toInputDateTime(t.dueDate) : ''
        });

        this.assigneeName = t?.assigneeName || t?.assignee?.name;
        this.selectedAssigneeId = t?.assigneeId ?? t?.assignee?.id;

        const projectId = t?.projectId || t?.project?.id;
        if (projectId) {
          this.loadMembersAndRole(projectId);
        }
      });
    }
  }

  // Toggle edit mode
  toggleEdit() {
    if (this.isEditing) {
      // cancel -> reset to backend values
      this.resetFormFromTask();
      this.isEditing = false;
    } else {
      this.isEditing = true;
    }
  }

  cancelEdit() {
    this.resetFormFromTask();
    this.isEditing = false;
  }

  private resetFormFromTask() {
    const t = this.task || {};
    this.form.patchValue({
      title: t?.title ?? '',
      description: t?.description ?? '',
      status: (t?.status as Status) ?? 'OPEN',
      dueDate: t?.dueDate ? this.toInputDateTime(t.dueDate) : ''
    });
    this.selectedAssigneeId = t?.assigneeId ?? t?.assignee?.id;
    this.assigneeName = t?.assigneeName || t?.assignee?.name || 'Unassigned';
  }

  private loadMembersAndRole(projectId: number) {
    this.api.getProjectMembers(projectId).subscribe((ms: any[]) => {
      this.members = (ms || []).map((m: any) => m.user);
    });

    this.api.getMyMembership(projectId).subscribe({
      next: (me: any) => {
        this.isAdmin = me?.role === 'OWNER' || me?.role === 'ADMIN';
        this.meUserId = me?.user?.id;
      },
      error: () => {
        this.isAdmin = false;
        this.meUserId = undefined;
      }
    });
  }

  assignTo(userId?: number) {
    if (!userId) {
      this.selectedAssigneeId = undefined;
      this.assigneeName = 'Unassigned';
      return; // we will persist assignee on save()
    }

    // Optional: live assign if you want; or just let Save persist
    this.selectedAssigneeId = userId;
    this.assigneeName =
      this.members.find(m => m.id === userId)?.name ||
      this.assigneeName ||
      'Assigned';
  }

  assignToMe() {
    if (!this.isAdmin || !this.meUserId) return;
    this.assignTo(this.meUserId);
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.isModal) this.close(); }

  close() {
    if (this.isModal) {
      this.router.navigate([{ outlets: { modal: null } }]);
    } else {
      this.location.back();
    }
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;

    const fv = this.form.getRawValue(); // includes values even if visually blocked
    const payload: any = {
      title: fv.title ?? this.task?.title ?? '',
      description: fv.description ?? this.task?.description ?? '',
      status: (fv.status as Status) ?? this.task?.status ?? 'OPEN',
      // map to backend format "YYYY-MM-DDTHH:mm:00"
      dueDate: fv.dueDate ? this.toBackendDateTime(fv.dueDate as string) : null,
      assigneeId: this.selectedAssigneeId ?? null,
      reporterId: this.task?.reporterId ?? this.task?.reporter?.id ?? null,
      projectId: this.task?.projectId ?? this.task?.project?.id ?? null
    };

    this.api.updateTask(this.id, payload).subscribe({
      next: () => {
        this.isEditing = false;
        if (this.isModal) {
          this.close();
        } else {
          this.router.navigate(['/tasks']);
        }
      },
      error: () => this.loading = false
    });
  }

  delete() {
    this.api.deleteTask(this.id).subscribe(() => {
      this.isModal ? this.close() : this.router.navigate(['/tasks']);
    });
  }

  statusLabel(s: Status | string | null | undefined): string {
    switch (s) {
      case 'IN_PROGRESS': return 'In Progress';
      case 'DONE': return 'Done';
      case 'OPEN':
      default: return 'To Do';
    }
  }

  statusChipClass(s: Status | string | null | undefined): string {
    switch (s) {
      case 'IN_PROGRESS': return 'bg-sky-100 text-sky-700 border border-sky-200';
      case 'DONE': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'OPEN':
      default: return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  }

  selectTab(tab: 'comments' | 'history' | 'worklog') {
    this.activeActivityTab = tab;
  }

  get issueKey(): string {
    return this.task?.key || `TASK-${this.id}`;
  }

  // Helpers for datetime-local <-> backend string
  private toInputDateTime(value: string): string {
    // returns 'YYYY-MM-DDTHH:mm' for input[type=datetime-local]
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    // Note: adjust for timezone if your backend sends UTC
  }

  private toBackendDateTime(localStr: string): string {
    // returns 'YYYY-MM-DDTHH:mm:00' without timezone marker, matching your curl
    const d = new Date(localStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }
}