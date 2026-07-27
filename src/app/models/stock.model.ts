export interface Supplier {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  bank_account_number: string | null;
  mobile_wallet: string | null;
  instapay: string | null;
  iban: string | null;
  opening_balance: number;
  notes: string | null;
  supplies_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierContact {
  id: number;
  supplier_id: number;
  name: string;
  phone: string;
  address: string;
  position: string | null;
  created_at: string;
}

export type PaymentStatus = 'paid' | 'partial' | 'credit';

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
  invoice_number: string;
  discount: number;
  tax: number;
  paid_amount: number;
  cancelled_at: string | null;
  cancelled_by: number | null;
  cancelledBy?: { id: number; name: string } | null;
  // Derived server-side (Supply model accessors) — never stored, never trust a stale client copy.
  items_subtotal: number;
  total_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  is_cancelled: boolean;
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
  payment_method: 'debt' | 'immediate';
  invoice_number?: string;
  discount?: number;
  tax?: number;
  safe_id?: number;
  currency_id?: number;
  items: { product_id: number; quantity: number; unit_price: number; unit: string; capacity_ml?: number }[];
}

export interface UpdateSupplyRequest {
  supplier_id?: number;
  date?: string;
  payment_method?: 'debt' | 'immediate';
  invoice_number?: string;
  discount?: number;
  tax?: number;
}

// ── Supplier Payments ────────────────────────────────────────────────────

export interface SupplierPayment {
  id: number;
  supply_id: number;
  supplier_id: number;
  amount: number;
  date: string;
  note: string | null;
  supply?: Pick<Supply, 'id' | 'invoice_number' | 'supplier_id'>;
  supplier?: Pick<Supplier, 'id' | 'name'>;
  safe?: { id: number; shop?: { id: number; name: string } | null };
  currency?: { id: number; code: string };
  user?: { id: number; name: string };
}

export interface CreateSupplierPaymentRequest {
  supply_id: number;
  safe_id: number;
  currency_id: number;
  amount: number;
  note?: string;
  /** Optional — reuses the Payment Methods module; when the chosen method has an assigned safe, it overrides `safe_id`. */
  payment_method_id?: number;
}

// ── Supplier Ledger ───────────────────────────────────────────────────────

export interface SupplierLedgerInvoice {
  id: number; invoice_number: string; date: string;
  items_subtotal: number; discount: number; tax: number;
  total_amount: number; paid_amount: number; remaining_amount: number; payment_status: PaymentStatus;
}

export interface SupplierLedgerPayment {
  id: number; supply_id: number; invoice_number: string; amount: number; date: string;
  safe: string; currency: string | null; user: string | null; note: string | null;
}

export interface SupplierLedger {
  opening_balance: number;
  total_invoiced: number;
  total_paid: number;
  current_credit: number;
  outstanding_balance: number;
  invoices: SupplierLedgerInvoice[];
  payments: SupplierLedgerPayment[];
}

export interface SupplierBalanceRow {
  id: number; name: string; phone: string;
  opening_balance: number; total_invoiced: number; total_paid: number;
  current_credit: number; outstanding_balance: number; invoice_count: number;
}
