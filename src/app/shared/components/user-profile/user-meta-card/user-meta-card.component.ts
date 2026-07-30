import { Component, Input } from '@angular/core';
import { User } from '../../../../models/User.model';
import { UserRolePip } from '../../../../pips/user-role.pip';

@Component({
  selector: 'app-user-meta-card',
  imports: [
    UserRolePip
],
  templateUrl: './user-meta-card.component.html',
  styles: ``
})
export class UserMetaCardComponent {

  @Input()
  user:User = {
   id:null,
    name:'',
    email:'',
    role:'',
    password:null,
    createdAt:null,
    emailVerifiedAt:null

   };
}
