import { Injectable } from '@angular/core';


export interface PaginationResult<T> {
  data: T[];       
  links: any[];    
  currentPage: number;
  totalPages: number;

}

@Injectable({
  providedIn: 'root'
})
export class PaginationHelperService {

  
  extractPaginationResult<T>(response: any): PaginationResult<T> {
    
   
    const metaData = response.meta ? response.meta : response;
    // the next page stored in the least element of reponse.meta.links
    // the previous page stored in the first element of reponse.meta.links
    return {
      data: response.data || [],
      links: metaData.links || [],
      currentPage: metaData.current_page || 1,
      totalPages: metaData.last_page || 1,
          
    };
  }
}

export function extractPagination<T>(response: any): PaginationResult<T> {
  const metaData = response.meta ? response.meta : response;
  // console.log(response);
  
  return {
    data: response.data || [],
    links: metaData.links || [],
    currentPage: metaData.current_page || 1,
    totalPages: metaData.last_page || 1,
     };
}