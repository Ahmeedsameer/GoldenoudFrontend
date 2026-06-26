export interface Category{
    id: number|null;
    name: string;
    image: string | null;
    parent: Category | null;
    products_count: number;
    minimum_sell_price: number;
    is_fixed: boolean;
    value_percentage: number | null;
    created_at: Date | null;
}
