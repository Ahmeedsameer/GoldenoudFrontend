export type TransactionType =
  | 'sale'
  | 'refund'
  | 'admin_deposit'
  | 'admin_withdrawal'
  | 'manager_deposit'
  | 'manager_expense';

export type TransactionDirection = 'in' | 'out';

export interface Safe {
  id: number;
  shop_id: number;
  balance: string;
  shop: { id: number; name: string; address?: string };
  created_at: string;
  updated_at: string;
}

export interface SafeTransaction {
  id: number;
  safe_id: number;
  type: TransactionType;
  direction: TransactionDirection;
  amount: string;
  invoice_id: number | null;
  note: string | null;
  user_id: number;
  user: { id: number; name: string; role: string };
  invoice: { id: number; status: string; date: string } | null;
  created_at: string;
}
