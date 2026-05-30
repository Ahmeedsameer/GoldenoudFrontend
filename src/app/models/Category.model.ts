export interface Category{
    id: number|null;
    name: string;
    image: string | null;
    parent: Category | null;
    products_count: number;
    created_at: Date | null;
}
