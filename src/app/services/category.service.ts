import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private httpClient:HttpClient = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/categories';


  public createCategory(categoryData: any) {
    return this.httpClient.post<any>(`${this.apiUrl}/create`,categoryData).pipe(retry(2))
   
  }

  public getCategories(params:any) {
    return this.httpClient.get<any>(`${this.apiUrl}/list`,{params}).pipe(retry(2));
  }


  public  getCategoryById(categoryId: number) {
    return this.httpClient.get<any>(`${this.apiUrl}/show/${categoryId}`).pipe(retry(2));
  }

  public updateCategory(categoryId: number, categoryData: any) {
    return this.httpClient.post<any>(`${this.apiUrl}/update/${categoryId}`,categoryData).pipe(retry(2));
  }

  public deleteCategory(categoryId: number) {
    return this.httpClient.post<any>(`${this.apiUrl}/destroy/${categoryId}`,{}).pipe(retry(2));
  }
}
