import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService, User } from 'src/app/services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  user$: Observable<User | null>;

  constructor(private auth: AuthService) {
    this.user$ = this.auth.currentUser$; // subscribe to current user observable
  }
}