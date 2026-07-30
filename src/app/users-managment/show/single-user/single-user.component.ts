import { Component, inject, OnInit } from '@angular/core';
import { UserMetaCardComponent } from "../../../shared/components/user-profile/user-meta-card/user-meta-card.component";
import { UserManagmentService } from '../../../services/user-managment.service';
import { User } from '../../../models/User.model';
import { LoadingComponent } from "../../../loading/loading.component";
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-single-user',
  imports: [UserMetaCardComponent, LoadingComponent],
  templateUrl: './single-user.component.html',
  styleUrl: './single-user.component.css',
})
export class SingleUserComponent implements OnInit{

  user:User|null = null; 
  private userManagmentService:UserManagmentService = inject(UserManagmentService);
  private router : ActivatedRoute = inject(ActivatedRoute);



  ngOnInit(): void {
      const userId = Number(this.router.snapshot.paramMap.get('id'));
      if(userId){
        this.loadUser(+userId);
      }else{

      }
  
  }

  loadUser(userId: number) {
    this.userManagmentService.getUserById(userId).subscribe({
      next:(response)=>{
        this.user = response;
      },
      error:(err)=>{
        console.error(err);
      }
    });
  }

}
