import { Component, inject, OnInit } from '@angular/core';
import { PaginationComponent } from "../../../pagination/pagination.component";
import { SelectComponent , Option} from "../../../shared/components/form/select/select.component";
import { CategoryService } from '../../../services/category.service';
import { Category } from '../../../models/Category.model';
import { CommonModule } from '@angular/common';
import { CategoryTypePip } from '../../../pips/category-type.pip';
import { ButtonComponent } from "../../../shared/components/ui/button/button.component";
import { RouterLink } from "@angular/router";
import { LoadingComponent } from "../../../loading/loading.component";
import { PaginationHelperService } from '../../../services/pagination-helper.service';
import { ListManager } from '../../../services/list-manager';
import { map } from 'rxjs';

@Component({
  selector: 'app-category-list',
  imports: [PaginationComponent, SelectComponent, CommonModule, CategoryTypePip, ButtonComponent, RouterLink, LoadingComponent],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css',
})
export class CategoryListComponent implements OnInit{
  categoryService:CategoryService = inject(CategoryService);
  list = new ListManager<any>((params)=>this.categoryService.getCategories(params));
 
  

  nameFilter: string = '';
  typeFilter: string = '';

  selectOptions : Option[] = [
    {value: '', label: 'الكل'},
    { value: 'main', label: 'رئيسى' },
    { value: 'sub', label: 'مشتق' },
   
  ]

  categories:Category[] = [];
  ngOnInit(): void {
      this.list.load();
     
  }
  
  setNameFilter(name: string) {
    this.list.setFilter('name', name);
  }

  setTypeFilter(type: string) {
    this.list.setFilter('type', type);
  }


 
}
