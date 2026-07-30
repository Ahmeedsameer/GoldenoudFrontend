import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private httpClient:HttpClient = inject(HttpClient);
  private apiUrl = environment.apiUrl.categories;
  private productTypesUrl = `${environment.apiBaseUrl}/product-types`;

  /** Product Types drive which category fields are visible/required. */
  public getProductTypes() {
    return this.httpClient.get<any>(this.productTypesUrl).pipe(retry(2));
  }

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
