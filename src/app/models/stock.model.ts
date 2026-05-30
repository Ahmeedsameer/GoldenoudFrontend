export interface Supplier {
  id: number;
  name: string;
  phone: string;
  supplies_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupplyProduct {
  id: number;
  name: string;
  scalar: string; // kg | g | l | ml | pcs
  sku?: string;
}

export interface SupplyItem {
  id: number;
  supply_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product: SupplyProduct;
}

export interface Supply {
  id: number;
  supplier_id: number;
  date: string;
  payment_method: 'debt' | 'immediate';
  items_count: number;
  supplier: Pick<Supplier, 'id' | 'name' | 'phone'>;
  items: SupplyItem[];
}

export interface SupplyItemWithSupply extends SupplyItem {
  supply: Pick<Supply, 'id' | 'date' | 'payment_method'>;
}

export interface Goods {
  id: number;
  shop_id: number | null;
  current_quantity: number;
  date: string;
  supply_item: SupplyItemWithSupply & {
    product: SupplyProduct & { sku: string };
  };
}

export interface TransferRequest {
  goods_id: number;
  quantity: number;
  to_shop_id: number | null;
}

export interface TransferResponse {
  message: string;
  source: Goods;
  destination: Goods;
}

export interface CreateSupplyRequest {
  supplier_id: number;
  date: string;
  payment_method: 'debt' | 'immediate';
  items: { product_id: number; quantity: number; unit_price: number }[];
}

export interface UpdateSupplyRequest {
  supplier_id?: number;
  date?: string;
  payment_method?: 'debt' | 'immediate';
}
