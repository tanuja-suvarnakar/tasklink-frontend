import { Component, OnInit } from '@angular/core';
import { Validators, FormBuilder } from '@angular/forms';
import { finalize } from 'rxjs';
import { Project } from 'src/app/model/project.model';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit {
  projects: Project[] = [];
  projectsLoading = true;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['']
  });
  loading = false;

  // Pagination (7 per page)
  projectsPageSize = 5;
  projectsPage = 1;

  get projectsTotalPages(): number {
    return Math.max(1, Math.ceil(this.projects.length / this.projectsPageSize));
  }
  get projectsPageStart(): number {
    return (this.projectsPage - 1) * this.projectsPageSize;
  }
  get projectsPageEnd(): number {
    return Math.min(this.projectsPageStart + this.projectsPageSize, this.projects.length);
  }
  get projectsPaged(): Project[] {
    return this.projects.slice(this.projectsPageStart, this.projectsPageEnd);
  }
  get projectsPages(): number[] {
    return Array.from({ length: this.projectsTotalPages }, (_, i) => i + 1);
  }
  setProjectsPage(p: number) {
    this.projectsPage = Math.min(Math.max(1, p), this.projectsTotalPages);
  }
  prevProjectsPage() { this.setProjectsPage(this.projectsPage - 1); }
  nextProjectsPage() { this.setProjectsPage(this.projectsPage + 1); }
  trackProjectById(index: number, p: Project) { return p.id ?? index; }

  constructor(private api: ApiService, private fb: FormBuilder) {}

  ngOnInit() { 
    this.loadProjects();
    this.load();
  }

  load() {
    this.api.getProjects().subscribe(p => {
      this.projects = p || [];
      if (this.projectsPage > this.projectsTotalPages) {
        this.projectsPage = this.projectsTotalPages;
      }
    });
  }

  create() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.api.createProject(this.form.value as Project).subscribe({
      next: () => { this.form.reset(); this.loading = false; this.load(); },
      error: () => this.loading = false
    });
  }

  loadProjects() {
    this.projectsLoading = true;
    this.api.getProjects()
      .pipe(finalize(() => this.projectsLoading = false))
      .subscribe({
        next: (ps) => {
          this.projects = ps || [];
          if (this.projectsPage > this.projectsTotalPages) {
            this.projectsPage = this.projectsTotalPages;
          }
        },
        error: () => {
          this.projects = [];
          this.projectsPage = 1;
        }
      });
  }
}