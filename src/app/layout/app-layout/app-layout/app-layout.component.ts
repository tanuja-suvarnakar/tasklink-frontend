import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AcceptInviteComponent } from 'src/app/components/accept-invite/accept-invite/accept-invite.component';
import { BacklogComponent } from 'src/app/components/backlog/backlog/backlog.component';
import { BoardComponent } from 'src/app/components/board/board/board.component';
import { DashboardComponent } from 'src/app/components/dashboard/dashboard/dashboard.component';
import { ProfileComponent } from 'src/app/components/profile/profile/profile.component';
import { ProjectsComponent } from 'src/app/components/projects/projects/projects.component';
import { TaskDetailComponent } from 'src/app/components/task-detail/task-detail/task-detail.component';
import { TasksComponent } from 'src/app/components/tasks/tasks/tasks.component';

children: [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },

  // Board routes
  { path: 'board', component: BoardComponent },               // generic board with project picker
  { path: 'projects/:id/board', component: BoardComponent },  // deep link board

  // Backlog / Tasks
  { path: 'backlog', component: BacklogComponent },
  { path: 'tasks', component: TasksComponent },

  // Task detail (full + modal)
  { path: 'tasks/:id', component: TaskDetailComponent },
  { path: 'tasks/:id', component: TaskDetailComponent, outlet: 'modal' },

  // Invite accept
  { path: 'accept-invite', component: AcceptInviteComponent },

  // Projects + profile
  { path: 'projects', component: ProjectsComponent },
  { path: 'profile', component: ProfileComponent }
]


@Component({
  selector: 'app-app-layout',
  templateUrl: './app-layout.component.html'
})


export class AppLayoutComponent {
  constructor(public auth: AuthService) {}
  
}