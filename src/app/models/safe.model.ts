export type TransactionType =
  | 'sale'
  | 'refund'
  | 'admin_deposit'
  | 'admin_withdrawal'
  | 'manager_deposit'
  | 'manager_expense'
  | 'transfer_in'
  | 'transfer_out';

export type TransactionDirection = 'in' | 'out';

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  rate: number;
  is_active: boolean;
}

export interface SafeType {
  id: number;
  name: string;
  kind: 'physical' | 'virtual';
  is_active: boolean;
}

export interface TransactionReason {
  id: number;
  name: string;
  direction: 'in' | 'out' | 'both';
  is_active: boolean;
}

export interface SafeBalance {
  currency: Currency;
  balance: string;
}

export interface Safe {
  id: number;
  shop_id: number | null;
  safe_type_id: number;
  is_active: boolean;
  shop: { id: number; name: string } | null;
  safe_type: SafeType;
  balances: SafeBalance[];
}

export interface SafeTransaction {
  id: number;
  safe_id: number;
  type: TransactionType;
  direction: TransactionDirection;
  amount: string;
  note: string | null;
  created_at: string;
  currency: Currency;
  reason: TransactionReason | null;
  user: { id: number; name: string; role: string };
  invoice: { id: number; status: string; date: string } | null;
  invoice_id: number | null;
  transfer_id: number | null;
}

export interface SafeTransfer {
  id: number;
  from_safe_id: number;
  to_safe_id: number;
  amount: string;
  note: string | null;
  from_safe: Safe;
  to_safe: Safe;
  currency: Currency;
  admin: { id: number; name: string };
  created_at: string;
}
