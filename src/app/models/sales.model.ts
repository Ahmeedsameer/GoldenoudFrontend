export interface SalesCategory {
  id: number;
  name: string;
}

export interface TesterUser {
  id: number;
  name: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
}

export type StockLevel = 'ok' | 'warning' | 'critical' | 'out';

export interface GoodsSearchResult {
  id: number;
  current_quantity: number;
  /** Total remaining stock of this product in the current shop (all batches). */
  product_shop_stock?: number;
  /** Traffic-light level computed by the backend (thresholds stay server-side). */
  stock_level?: StockLevel;
  /** Configured unit price (oil→category/gram, non-oil→product); null when unconfigured. */
  configured_unit_price?: number | null;
  /** 'weight' (grams) | 'unit' (pieces) — from the Product Type. */
  sells_by?: 'weight' | 'unit';
  /** Selling unit label (g / pcs), from the Product Type. */
  unit?: string;
  /** 'category' (oil) | 'product' (non-oil) | null. */
  pricing_source?: 'category' | 'product' | null;
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
        is_fixed?: boolean;
        value_percentage?: number | null;
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
  payments?: InvoicePayment[];
  created_at?: string;
}

/**
 * Supported payment methods. Mirror of the backend PaymentMethod enum.
 * Add a new method here (and to PAYMENT_METHODS below) to surface it in the UI.
 */
export type PaymentMethodValue = 'cash' | 'visa';

export interface PaymentMethodOption {
  value: PaymentMethodValue;
  label: string;
  /** Whether this method requires a transaction/reference number. */
  requiresTransactionNumber: boolean;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: 'cash', label: 'نقدي', requiresTransactionNumber: false },
  { value: 'visa', label: 'فيزا', requiresTransactionNumber: true },
];

export interface InvoicePaymentRow {
  currency_id: number;
  amount: number;
  payment_method: PaymentMethodValue;
  /** Required when payment_method needs a reference (e.g. visa). */
  transaction_number?: string | null;
}

/** A payment as returned by the API (for display on receipt / details). */
export interface InvoicePayment {
  id?: number;
  currency_id: number;
  amount: number;
  payment_method: PaymentMethodValue;
  transaction_number?: string | null;
  currency?: { id: number; code: string; symbol?: string };
}

export interface CreateInvoiceRequest {
  name: string;
  phone: string;
  date: string;
  price_type: 'wholesale' | 'retail';
  safe_id: number | null;
  total_amount: number;
  /** 'auto' (per-item pricing when configured, else legacy) or 'global' (force Global-Total). */
  pricing_mode?: 'auto' | 'global';
  payments: InvoicePaymentRow[];   // required for physical safes
  items: { product_id: number; quantity: number }[];
  /** Manager-approved one-time token — bypasses pending status for underpriced invoices. */
  override_token?: string;
}
