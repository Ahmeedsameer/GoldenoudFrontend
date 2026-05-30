export interface TesterUser {
  id: number;
  name: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
}

export interface GoodsSearchResult {
  id: number;
  current_quantity: number;
  supply_item: {
    product: {
      id: number;
      name: string;
      sku: string;
      scalar: string;
      category?: {
        id: number;
        name: string;
        minimum_sell_price?: number;
      };
    };
  };
}

export interface PriceViolation {
  index: number;
  productName: string;
  enteredPrice: number;
  minimumPrice: number;
}

export interface InvoiceItem {
  id?: number;
  product_id: number;
  quantity: number;
  price: number;
  subtotal?: number;
  goods_id?: number;
  product?: {
    id: number;
    name: string;
    sku: string;
    scalar: string;
  };
}

export interface Invoice {
  id: number;
  invoice_number?: string;
  name: string;
  phone: string;
  seller?: { id: number; name: string };
  tester?: { id: number; name: string } | null;
  shop?: { id: number; name: string };
  date: string;
  price_type: 'wholesale' | 'retail';
  status: 'pending' | 'approved' | 'cancelled';
  total?: number;
  items?: InvoiceItem[];
  created_at?: string;
}

export interface CreateInvoiceRequest {
  name: string;
  phone: string;
  tester_id: number | null;
  date: string;
  price_type: 'wholesale' | 'retail';
  items: { product_id: number; quantity: number; price: number }[];
}
