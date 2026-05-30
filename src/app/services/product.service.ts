import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../enviroment';

@Injectable({
  providedIn: 'root',
})
export class ProductService {

    httpClient: HttpClient = inject(HttpClient);

    static apiUrl = environment.apiUrl.products;

    getProducts(params: any) {
        return this.httpClient.get<any>(`${ProductService.apiUrl}`, { params });
    }

    getProductById(id: number) {
        return this.httpClient.get<any>(`${ProductService.apiUrl}/${id}`);
    }

    createProduct(data: FormData) {
        return this.httpClient.post<any>(`${ProductService.apiUrl}/`, data);
    }

    updateProduct(id: number, data: FormData) {
        // Laravel doesn't support multipart body on PUT — use POST with _method spoofing
        data.append('_method', 'PUT');
        return this.httpClient.post<any>(`${ProductService.apiUrl}/${id}`, data);
    }

    deleteProduct(id: number) {
        return this.httpClient.delete<any>(`${ProductService.apiUrl}/${id}`, {});
    }
}
