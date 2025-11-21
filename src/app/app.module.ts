import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { DashboardComponent } from './components/dashboard/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login/login.component';
import { RegisterComponent } from './components/register/register/register.component';
import { TaskDetailComponent } from './components/task-detail/task-detail/task-detail.component';
import { TaskListComponent } from './components/task-list/task-list/task-list.component';
import { AuthInterceptor } from './services/auth.interceptor';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ProjectsComponent } from './components/projects/projects/projects.component';
import { TasksComponent } from './components/tasks/tasks/tasks.component';
import { AppLayoutComponent } from './layout/app-layout/app-layout/app-layout.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout/auth-layout.component';
import { ErrorInterceptor } from './services/error.interceptor';
import { NotFoundComponent } from './components/not-found/not-found/not-found.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProfileComponent } from './components/profile/profile/profile.component';
import { BoardComponent } from './components/board/board/board.component';
import { BacklogComponent } from './components/backlog/backlog/backlog.component';
import { AcceptInviteComponent } from './components/accept-invite/accept-invite/accept-invite.component';



@NgModule({
  declarations: [
    AppComponent,
    AuthLayoutComponent,
    AppLayoutComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    TasksComponent,
    TaskDetailComponent,
    ProjectsComponent,
    ProfileComponent,
    NotFoundComponent,
    TaskListComponent,
    BoardComponent,
    BacklogComponent,
    AcceptInviteComponent

  ],
  imports: [BrowserModule, 
    ReactiveFormsModule, 
    HttpClientModule, 
    AppRoutingModule,
     FormsModule,
      DragDropModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
