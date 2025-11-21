
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  template: '<div class="p-8 text-center">Joining project…</div>'
})



export class AcceptInviteComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router,
    private auth: AuthService
  ) { }

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token') || '';

    this.api.verifyInvite(token).subscribe({
      next: (info: any) => {
        const invitedEmail = info.email;

        // ✅ Step 1: Check if invited email already exists
        this.api.checkUserExists(invitedEmail).subscribe({
          next: (exists: boolean) => {
            // ✅ Step 2: If already logged in
            if (this.auth.isLoggedIn()) {
              const me = this.getCurrentUserEmail();

              if (me && me.toLowerCase() === invitedEmail.toLowerCase()) {
                // ✅ Same user → accept directly
                this.api.acceptInvite(token).subscribe({
                  next: (pm: any) => this.goToProjectOrLogin(pm),
                  error: () => this.router.navigate(['/login'], { queryParams: { inviteError: 'true' } })
                });
              } else {
                // 🚫 Logged in as different user → logout & redirect
                this.auth.logout();
                if (exists) {
                  // Invited user already has account → go to login
                  this.router.navigate(['/login'], { queryParams: { token, switchAccount: 'true' } });
                } else {
                  // Invited user doesn't exist → go to register
                  this.router.navigate(['/register'], { queryParams: { token } });
                }
              }
            } else {
              // ✅ Not logged in yet
              if (exists) {
                this.router.navigate(['/login'], { queryParams: { token } });
              } else {
                this.router.navigate(['/register'], { queryParams: { token } });
              }
            }
          },
          error: () => this.router.navigate(['/login'], { queryParams: { inviteError: 'true' } })
        });
      },
      error: () => this.router.navigate(['/login'], { queryParams: { inviteError: 'true' } })
    });
  }

  private getCurrentUserEmail(): string | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw).email : null;
    } catch {
      return null;
    }
  }

  private goToProjectOrLogin(pm: any) {
    const projectId = pm?.project?.id;
    if (projectId) {
      this.router.navigate([`/projects/${projectId}`]);
    } else {
      this.router.navigate(['/login'], { queryParams: { inviteAccepted: 'true' } });
    }
  }
}
