import { map, Observable } from 'rxjs';
import { extractPagination, PaginationResult } from './pagination-helper.service';

export class ListManager<T> {
  

  public result: PaginationResult<T> = { 
    data: [], 
    links: [], 
    currentPage: 1, 
    totalPages: 1 
  };
  
  public limit: number = 10;
  public filters: any = {}; 
  public loading: boolean = false;

  private fetchFn: (params: any) => Observable<PaginationResult<T>>;

  constructor(fetchFn: (params: any) => Observable<PaginationResult<T>>) {
    this.fetchFn = fetchFn;
  }

  public load(): void {
    this.loading = true;
    
    const requestParams = {
   
      page: this.result.currentPage, 
      limit: this.limit,
      ...this.filters
    };

    this.fetchFn(requestParams).pipe(map(
    rowResponse => extractPagination<T>(rowResponse)
    )).subscribe({
      next: (res: PaginationResult<T>) => {
        this.result = res; 

        console.log(res);
        
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  public setPage(page: number): void {
    this.result.currentPage = page;
    this.load();
  }

  public setFilter(key: string, value: any): void {
    this.filters[key] = value;
    this.result.currentPage = 1; // تريكة مهمة: لما نفلتر لازم نرجع لصفحة 1
    this.load();
  }

  public clearFilters(): void {
    this.filters = {};
    this.result.currentPage = 1;
    this.load();
  }

  public setLimit(limit: number): void {
    this.limit = limit;
  }

  public setLimitAndReload(limit: number): void {
    this.setLimit(limit);
    this.result.currentPage = 1; // لما نغير عدد العناصر بالصفحة لازم نرجع لصفحة 1
    this.load();
  }

}