import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Task } from 'src/app/model/task.model';


@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html'
})
export class TaskListComponent implements OnInit {
  tasks: Task[] = [];
  loading = false;

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['']
  });

  constructor(private api: ApiService, private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getTasks().subscribe(t => (this.tasks = t));
  }

  create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    const payload: Task = {
      title: this.form.value.title!,
      description: this.form.value.description || ''
    };
    this.api.createTask(payload).subscribe({
      next: () => { this.form.reset(); this.loading = false; this.load(); },
      error: () => { this.loading = false; }
    });
  }

  open(id?: number): void {
    if (id) this.router.navigate(['/tasks', id]);
  }
}