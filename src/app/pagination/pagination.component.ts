import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationResult } from '../services/pagination-helper.service';

@Component({
  selector: 'app-pagination',
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent {



  @Input()
  paginationResult: PaginationResult<any> | null = null;

  
  @Input()
  itemsPerPage = 0;
 

  @Output() pageChange = new EventEmitter<number>();
  

  

  goToPage(page: number | null) {
    if (page) {
       this.pageChange.emit(page);
      
    }
  }

  



}
