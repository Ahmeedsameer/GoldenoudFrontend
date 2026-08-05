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
  email?: string | null;
  address?: string | null;
  shop_id?: number | null;
  shop?: { id: number; name: string } | null;
  created_at?: string | null;
  /** Present on list/detail responses (Customer Management module) — computed
   *  from the customer's own invoices, never stored redundantly. */
  total_invoices?: number;
  total_purchases?: number | null;
  first_purchase_date?: string | null;
  last_purchase_date?: string | null;
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
  /** Real FIFO batch cost, falling back to product average cost — report/detail views only, never printed. */
  unit_cost?: number;
  line_cost?: number;
  line_profit?: number;
  product?: {
    id: number;
    name: string;
    sku: string;
    scalar: string;
    purchase_cost?: number;
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
 * Payment Methods module — admin-managed, unlimited (Cash EGP, Visa CIB,
 * Vodafone Cash, InstaPay, Fawry, ...). Replaces the old hardcoded 2-value
 * PaymentMethodValue union — fetched from the backend, never hardcoded here.
 */
export type PaymentMethodType = 'cash' | 'visa' | 'mastercard' | 'bank_card' | 'mobile_wallet' | 'bank_transfer' | 'other';

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  cash: 'نقدي', visa: 'فيزا', mastercard: 'ماستركارد', bank_card: 'بطاقة بنكية',
  mobile_wallet: 'محفظة إلكترونية', bank_transfer: 'تحويل بنكي', other: 'أخرى',
};

/** Card types eligible for a processing fee — mirrors PaymentMethod::CARD_TYPES on the backend. */
export const CARD_PAYMENT_TYPES: PaymentMethodType[] = ['visa', 'mastercard', 'bank_card'];

export interface PaymentMethod {
  id: number;
  name: string;
  /** Bank Cards module — issuing bank (CIB, QNB, Banque Misr, HSBC, ...), only meaningful for card types. */
  bank?: string | null;
  /** Wallet's phone number — only meaningful for type === 'mobile_wallet'. */
  wallet_phone?: string | null;
  type: PaymentMethodType;
  currency_id: number;
  processing_fee_percent: number;
  is_active: boolean;
  currency?: { id: number; code: string; symbol?: string };
  /** Assigned safe — every payment via this method auto-credits it, no manual pick at sale time. Null = falls back to the branch's default physical safe. */
  safe_id?: number | null;
  safe?: { id: number; shop?: { id: number; name: string } | null } | null;
  /** Branch restriction — empty/absent = unrestricted (every active branch can use it). */
  shops?: { id: number; name: string }[];
}

export interface InvoicePaymentRow {
  currency_id: number;
  amount: number;
  payment_method_id: number;
  /** Required when the selected method is a card type (visa/mastercard/bank_card). */
  transaction_number?: string | null;
}

/** A payment as returned by the API (for display on receipt / details). */
export interface InvoicePayment {
  id?: number;
  currency_id: number;
  amount: number;
  payment_method_id?: number;
  /** Legacy string snapshot (derived server-side from the method's type) — kept for old rows. */
  payment_method?: string;
  processing_fee_percent?: number;
  processing_fee_amount?: number;
  net_amount?: number;
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
