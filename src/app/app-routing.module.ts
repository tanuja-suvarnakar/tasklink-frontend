import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login/login.component';
import { RegisterComponent } from './components/register/register/register.component';
import { AuthGuard } from './guards/auth.guard';
import { flush } from '@angular/core/testing';
import { NotFoundComponent } from './components/not-found/not-found/not-found.component';
import { ProfileComponent } from './components/profile/profile/profile.component';
import { ProjectsComponent } from './components/projects/projects/projects.component';
import { TaskDetailComponent } from './components/task-detail/task-detail/task-detail.component';
import { TasksComponent } from './components/tasks/tasks/tasks.component';
import { GuestGuard } from './guards/guest.guard';
import { AppLayoutComponent } from './layout/app-layout/app-layout/app-layout.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout/auth-layout.component';
import { BacklogComponent } from './components/backlog/backlog/backlog.component';
import { BoardComponent } from './components/board/board/board.component';
import { AcceptInviteComponent } from './components/accept-invite/accept-invite/accept-invite.component';

const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'board', component: BoardComponent },
      { path: 'projects/:id/board', component: BoardComponent },
      { path: 'backlog', component: BacklogComponent },
      { path: 'tasks', component: TasksComponent },
      { path: 'tasks/:id', component: TaskDetailComponent },
      { path: 'projects', component: ProjectsComponent },
      { path: 'profile', component: ProfileComponent },
      // Summary (global and optional per-project)
      { path: 'projects/summary', component: TasksComponent },
      { path: 'projects/:id/summary', component: TasksComponent },
    ]
  },
  // ✅ Move this OUTSIDE the guarded layout
  { path: 'accept-invite', component: AcceptInviteComponent },
  { path: 'invite/:token', component: AcceptInviteComponent },

  {
    path: '',
    component: AuthLayoutComponent,
    canActivate: [GuestGuard],
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent }
    ]
  },
  { path: '**', component: NotFoundComponent }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
