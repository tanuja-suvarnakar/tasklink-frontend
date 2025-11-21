import { AfterViewInit, ChangeDetectorRef, Component, HostListener, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, CdkDropList, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { finalize } from 'rxjs/operators';
import { ApiService } from 'src/app/services/api.service';

type Status = 'OPEN' | 'IN_PROGRESS' | 'DONE';
const STATUS_VALUES: Status[] = ['OPEN', 'IN_PROGRESS', 'DONE'];

function normalizeStatus(s: any): Status {
  const v = (s ?? 'OPEN').toString().trim().toUpperCase().replace(/\s+/g, '_');
  return (STATUS_VALUES as string[]).includes(v) ? (v as Status) : 'OPEN';
}

type Role = 'OWNER' | 'ADMIN' | 'MEMBER';
interface ProjectMember {
  userId: number;
  name: string;
  email: string;
  role: Role;
}

// Replace with your actual interfaces
interface Project { id?: number; name: string; }
interface Task {
  id?: number;
  key?: string;
  title: string;
  description?: string;
  status?: Status | string;
  order?: number;
  assignee?: any;
  assigneeId?: number | null;
  assigneeName?: string;
  dueDate?: string;
  issueType?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectId?: number;
}

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html'
})
export class BoardComponent implements OnInit, AfterViewInit {
  // Loading states
  loading = false;            // board (tasks) loading
  loadingProjects = true;     // projects list (cards) loading
  loadingMembers = false;     // members row loading

  error = '';
  filter = '';

  // Inline title editor state
  editingTitleTaskId: number | null = null;
  editingTitleValue = '';
  savingTitle = false;

  // Selected project context
  projectId?: number;
  project?: Project;

  // Project list for the cards
  projects: Project[] = [];

  // Project search + pagination (client-side)
  projectSearch = '';
  projectsPageSize = 9;
  projectsPage = 1;

  get filteredProjects(): Project[] {
    const q = this.projectSearch.trim().toLowerCase();
    if (!q) return this.projects;
    return this.projects.filter((p: any) => {
      const name = (p?.name || '').toLowerCase();
      const desc = (p?.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }
  get projectsTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProjects.length / this.projectsPageSize));
  }
  get projectsPageStart(): number {
    return (this.projectsPage - 1) * this.projectsPageSize;
  }
  get projectsPageEnd(): number {
    return Math.min(this.projectsPageStart + this.projectsPageSize, this.filteredProjects.length);
  }
  get projectsPaged(): Project[] {
    return this.filteredProjects.slice(this.projectsPageStart, this.projectsPageEnd);
  }
  get projectsPages(): number[] {
    return Array.from({ length: this.projectsTotalPages }, (_, i) => i + 1);
  }
  setProjectsPage(p: number) {
    this.projectsPage = Math.min(Math.max(1, p), this.projectsTotalPages);
  }
  prevProjectsPage() { this.setProjectsPage(this.projectsPage - 1); }
  nextProjectsPage() { this.setProjectsPage(this.projectsPage + 1); }
  onProjectSearchChange(v: string) {
    this.projectSearch = v;
    this.projectsPage = 1; // reset to first page on new search
  }
  trackProjectById = (_: number, p: Project) => (p as any).id ?? (p as any).name;

  // Project members
  members: ProjectMember[] = [];
  assigneeMenuForTaskId: number | null = null;
  assigningTaskId: number | null = null;

  columns: Record<Status, Task[]> = { OPEN: [], IN_PROGRESS: [], DONE: [] };
  newTitle: Record<Status, string> = { OPEN: '', IN_PROGRESS: '', DONE: '' };

  readonly STATUS_META: { key: Status; label: string }[] = [
    { key: 'OPEN', label: 'To Do' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'DONE', label: 'Done' }
  ];

  @ViewChildren(CdkDropList) dropLists!: QueryList<CdkDropList<Task[]>>;
  dropListReady = false;

  private dragActive = false;
  private suppressClicksUntil = 0;

  // Invite modal state
  inviteOpen = false;
  inviteEmail = '';
  inviteRole: 'ADMIN' | 'MEMBER' = 'MEMBER';
  inviting = false;
  inviteError = '';
  toastMsg = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Always load projects for cards
    this.loadProjectsList();

    // React to route param changes (deep link /projects/:id/board)
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id') || params.get('projectId');
      this.projectId = idParam ? +idParam : undefined;

      if (this.projectId) {
        this.loadMembers();
        this.load(); // load tasks for selected project
      } else {
        // No project selected: clear board
        this.project = undefined;
        this.members = [];
        this.columns = { OPEN: [], IN_PROGRESS: [], DONE: [] };
        this.error = '';
      }
    });
  }

  ngAfterViewInit(): void {
    this.dropListReady = true;
    this.cdr.detectChanges();
  }

  // Project list + choose one
  loadProjectsList(): void {
    this.loadingProjects = true;
    this.api.getProjects()
      .pipe(finalize(() => (this.loadingProjects = false)))
      .subscribe({
        next: (ps: Project[]) => {
          this.projects = ps || [];
          // Keep selected project name in header if opened
          if (this.projectId) {
            this.project = this.projects.find(p => p.id === this.projectId);
          }
          // Clamp pagination if list size changed (also honors current search)
          if (this.projectsPage > this.projectsTotalPages) {
            this.projectsPage = this.projectsTotalPages;
          }
        },
        error: () => (this.projects = [])
      });
  }

  goToProject(p: Project): void {
    if (!p?.id) return;
    this.router.navigate(['/projects', p.id, 'board']);
  }

  // Load project members
  loadMembers(): void {
    if (!this.projectId) return;
    this.loadingMembers = true;
    this.api.getProjectMembers(this.projectId)
      .pipe(finalize(() => (this.loadingMembers = false)))
      .subscribe({
        next: (ms: any) => (this.members = ms || []),
        error: () => (this.members = [])
      });
  }

  initialsOf(nameOrEmail: string): string {
    const s = (nameOrEmail || '').trim();
    if (!s) return 'U';
    const main = s.includes('@') ? s.split('@')[0] : s;
    const parts = main.split(/[.\s_-]+/).filter(Boolean);
    const initials = (parts[0]?.[0] || '').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
    return initials || (s[0] || 'U').toUpperCase();
  }

  private decorateTask(raw: any): any {
    const assignee = raw?.assignee;
    const nameFromApi = assignee
      ? [assignee.firstname, assignee.lastname].filter(Boolean).join(' ') || assignee.email
      : raw.assigneeName || raw.assignee?.name || '';
    return {
      ...raw,
      assigneeId: assignee?.id ?? raw.assigneeId ?? null,
      assigneeName: nameFromApi || ''
    };
  }

  load(): void {
    if (!this.projectId) return;
    this.loading = true;

    this.api.getTasksByProject(this.projectId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (tasks: any) => {
          this.error = '';
          const list: Task[] = Array.isArray(tasks) ? tasks : (tasks?.items || tasks?.data || []);
          this.columns = { OPEN: [], IN_PROGRESS: [], DONE: [] };

          for (const t of list as any[]) {
            const tt = this.decorateTask(t);
            const s = normalizeStatus((tt as any).status);
            this.columns[s].push(tt);
          }

          (Object.keys(this.columns) as Status[]).forEach(k => {
            this.columns[k] = this.sortByOrder(this.columns[k]);
          });
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Failed to load board';
        }
      });
  }

  dropListRefsExcept(current: CdkDropList): CdkDropList[] {
    const all = this.dropLists?.toArray() ?? [];
    return all.filter(l => l !== current);
  }
  alwaysAllow = () => true;

  onDragStarted() { this.dragActive = true; }
  onDragEnded() { this.dragActive = false; this.suppressClicksUntil = Date.now() + 150; }

  onCardClick(t: any) {
    if (this.dragActive || Date.now() < this.suppressClicksUntil) return;
    const id = t?.id;
    if (!id) return;

    const outlets = {
      primary: this.projectId ? ['projects', this.projectId, 'board'] : ['board'],
      modal: ['tasks', id]
    };

    this.router.navigate([{ outlets }]);
  }

  sortByOrder(list: Task[]): Task[] {
    return [...list].sort((a: any, b: any) => ((a?.order ?? 0) - (b?.order ?? 0)));
  }

  matchesFilter(t: Task): boolean {
    if (!this.filter) return true;
    const q = this.filter.toLowerCase();
    const key = ((t as any).key ?? '').toString();
    const title = ((t as any).title ?? '').toString();
    const desc = ((t as any).description ?? '').toString();
    const assigneeName = ((t as any).assigneeName ?? (t as any)?.assignee?.name ?? '').toString();
    return [key, title, desc, assigneeName].some(v => v.toLowerCase().includes(q));
  }

  count(status: Status): number {
    return this.columns[status].reduce((acc, t) => acc + (this.matchesFilter(t) ? 1 : 0), 0);
  }

  trackByTask = (_: number, t: Task) => (t as any).id ?? (t as any).title;

  drop(event: CdkDragDrop<Task[]>, newStatus: Status): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.persistOrder(event.container.data, newStatus);
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    const moved = event.container.data[event.currentIndex] as any;
    if (!moved?.id) return;

    moved.status = newStatus;
    moved.order = event.currentIndex;

    this.api.updateTask(moved.id!, { title: moved.title, description: moved.description, status: newStatus, order: moved.order } as any)
      .subscribe({
        next: () => {
          this.persistOrder(event.container.data, newStatus);
          const prevStatus = this.getStatusFromListId(event.previousContainer.id);
          if (prevStatus) this.persistOrder(event.previousContainer.data, prevStatus);
        },
        error: () => {}
      });
  }

  private persistOrder(list: Task[], status: Status) {
    list.forEach((t: any, idx) => {
      if (!t?.id) return;
      if (t.order !== idx || normalizeStatus(t.status) !== status) {
        const payload: any = { title: t.title, description: t.description, status, order: idx };
        this.api.updateTask(t.id, payload).subscribe({ next: () => {}, error: () => {} });
      }
    });
  }

  private getStatusFromListId(dropListId: string): Status | null {
    const s = dropListId.replace('list-', '').toUpperCase();
    const normalized = s.replace(/\s+/g, '_') as Status;
    return (STATUS_VALUES as string[]).includes(normalized) ? (normalized as Status) : null;
  }

  onNewTitleChange(status: Status, val: string) {
    this.newTitle[status] = val;
  }

  createQuick(status: Status) {
    if (!this.projectId) {
      this.showToast('Select a project above (or open via Projects) to create issues.');
      return;
    }
    const title = (this.newTitle[status] || '').trim();
    if (!title) return;
    const payload: any = {
      title,
      description: '',
      status,
      order: this.columns[status].length
    };
    this.api.createTask(payload, this.projectId).subscribe({
      next: (t: Task) => {
        this.columns[status] = [...this.columns[status], this.decorateTask(t)];
        this.newTitle[status] = '';
      },
      error: () => {}
    });
  }

  invite() {
    if (!this.projectId) {
      this.showToast('Open/select a project first to invite members.');
      return;
    }
    this.inviteEmail = '';
    this.inviteRole = 'MEMBER';
    this.inviteError = '';
    this.inviteOpen = true;
  }
  closeInvite() { this.inviteOpen = false; }

  submitInvite() {
    if (!this.projectId) return;

    const email = (this.inviteEmail || '').trim();
    if (!email) { this.inviteError = 'Please enter an email'; return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { this.inviteError = 'Invalid email address'; return; }

    this.inviting = true;
    this.api.inviteMember(this.projectId, email, this.inviteRole as any).subscribe({
      next: () => { this.inviting = false; this.inviteOpen = false; this.showToast('Invitation sent!'); },
      error: (err: any) => { this.inviting = false; this.inviteError = err?.error || err?.message || 'Invite failed'; }
    });
  }

  openAssigneeMenu(t: any, ev?: Event) {
    ev?.stopPropagation();
    this.assigneeMenuForTaskId = t?.id ?? null;
  }
  closeAssigneeMenu() { this.assigneeMenuForTaskId = null; }

  isAssignedTo(t: any, m: ProjectMember): boolean {
    const id = (t?.assigneeId ?? t?.assignee?.id ?? null);
    return id === m.userId;
  }

  assignTo(t: any, m: ProjectMember, ev?: Event) {
    ev?.stopPropagation();
    if (!t?.id || !m?.userId) return;

    this.assigningTaskId = t.id;
    this.api.assignTask(t.id, m.userId).subscribe({
      next: (updated: any) => {
        const assignee = updated?.assignee;
        t.assigneeId = assignee?.id ?? m.userId;
        t.assigneeName = [assignee?.firstname, assignee?.lastname].filter(Boolean).join(' ')
          || assignee?.email || m.name || m.email || '';
        this.assigningTaskId = null;
        this.assigneeMenuForTaskId = null;
        this.showToast('Assigned successfully');
      },
      error: (err: any) => {
        this.assigningTaskId = null;
        this.showToast(err?.error?.message || err?.message || 'Failed to assign');
      }
    });
  }

  showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => (this.toastMsg = ''), 2000);
  }

  @HostListener('document:keydown.escape') onEsc() {
    if (this.inviteOpen) this.closeInvite();
    if (this.assigneeMenuForTaskId != null) this.closeAssigneeMenu();
  }
  @HostListener('document:click') onDocumentClick() {
    if (this.assigneeMenuForTaskId != null) this.closeAssigneeMenu();
  }

  startTitleEdit(t: any, ev?: Event) {
    ev?.stopPropagation();
    if (!t?.id) return;

    this.assigneeMenuForTaskId = null;
    this.editingTitleTaskId = t.id;
    this.editingTitleValue = (t.title || '').toString();

    setTimeout(() => {
      const el = document.getElementById(`edit-title-${t.id}`) as HTMLInputElement | null;
      el?.focus();
      el?.select();
    }, 0);
  }

  cancelTitleEdit(ev?: Event) {
    ev?.stopPropagation();
    this.savingTitle = false;
    this.editingTitleTaskId = null;
    this.editingTitleValue = '';
  }

  saveTitle(t: any, ev?: Event) {
    ev?.stopPropagation();
    if (!t?.id) return;

    const newTitle = (this.editingTitleValue || '').trim();
    if (!newTitle || newTitle === t.title) {
      this.cancelTitleEdit();
      return;
    }

    this.savingTitle = true;

    const payload: any = {
      title: newTitle,
      description: t.description ?? '',
      status: (t.status || 'OPEN'),
      order: typeof t.order === 'number' ? t.order : 0
    };

    this.api.updateTask(t.id, payload).subscribe({
      next: (updated: any) => {
        t.title = updated?.title ?? newTitle;
        this.savingTitle = false;
        this.cancelTitleEdit();
        this.showToast('Title updated');
      },
      error: (err: any) => {
        this.savingTitle = false;
        this.showToast(err?.error?.message || err?.message || 'Failed to update title');
      }
    });
  }
}