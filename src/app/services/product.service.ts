import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

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

    // ── Four independent Product Creation Forms — each its own page/component,
    //    own FormGroup, own backend request/validation class. ────────────────

    createRawMaterial(data: FormData) {
        return this.httpClient.post<any>(`${ProductService.apiUrl}/raw-materials`, data);
    }

    createPackaging(data: FormData) {
        return this.httpClient.post<any>(`${ProductService.apiUrl}/packaging`, data);
    }

    createReadyProduct(data: FormData) {
        return this.httpClient.post<any>(`${ProductService.apiUrl}/ready-products`, data);
    }

    createCompound(data: FormData) {
        return this.httpClient.post<any>(`${ProductService.apiUrl}/compounds`, data);
    }

    updateProduct(id: number, data: FormData) {
        // Laravel doesn't support multipart body on PUT — use POST with _method spoofing
        data.append('_method', 'PUT');
        return this.httpClient.post<any>(`${ProductService.apiUrl}/${id}`, data);
    }

    deleteProduct(id: number) {
        return this.httpClient.delete<any>(`${ProductService.apiUrl}/${id}`, {});
    }

    // ── Recipe (BOM) components for a product ──────────────────────────────────
    getComponents(productId: number) {
        return this.httpClient.get<any>(`${ProductService.apiUrl}/${productId}/components`);
    }

    // components: [{ component_product_id, quantity, is_variable_quantity?, component_group? }]
    saveComponents(productId: number, components: { component_product_id: number; quantity: number; is_variable_quantity?: boolean; component_group?: string | null }[]) {
        return this.httpClient.put<any>(`${ProductService.apiUrl}/${productId}/components`, { components });
    }

    /** Composite Products' "Default Oil" picker — Raw Materials priced per-gram, NOT a recipe list. */
    getOilOptions(search?: string) {
        return this.httpClient.get<any>(`${ProductService.apiUrl}/oil-options`, { params: search ? { search } : {} });
    }
}
