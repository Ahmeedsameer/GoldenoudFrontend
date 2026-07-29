export type TransactionType =
  | 'sale'
  | 'refund'
  | 'admin_deposit'
  | 'admin_withdrawal'
  | 'manager_deposit'
  | 'manager_expense'
  | 'transfer_in'
  | 'transfer_out'
  | 'bank_charge'
  | 'bank_charge_reversal';

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

/** One payment method's derived balance within a currency — see SafeService::getBalancesByPaymentMethod(). */
export interface PaymentMethodBalance {
  payment_method_id: number | null;
  name: string;
  balance: number;
}

/** Per-currency breakdown of a safe's balance by payment method — keyed by currency_id on Safe.balances_by_method. */
export interface CurrencyMethodBalance {
  total: number;
  methods: PaymentMethodBalance[];
}

export interface Safe {
  id: number;
  shop_id: number | null;
  safe_type_id: number;
  is_active: boolean;
  shop: { id: number; name: string } | null;
  safe_type: SafeType;
  balances: SafeBalance[];
  /** Keyed by currency_id — always sums to the matching entry in `balances`. */
  balances_by_method?: Record<number, CurrencyMethodBalance>;
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
  /** Sub Safes: the child safe this row belongs to, set directly at write time (new rows). */
  payment_method: { id: number; name: string; type: string } | null;
  /** Legacy path — historical rows (before payment_method_id existed) only have this. Prefer `payment_method` first. */
  invoice_payment: { id: number; payment_method: { id: number; name: string; type: string } | null } | null;
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
  /** Sub Safes: both null = ordinary cross-branch/whole-safe transfer (unchanged). */
  from_payment_method_id?: number | null;
  to_payment_method_id?: number | null;
  from_payment_method?: { id: number; name: string } | null;
  to_payment_method?: { id: number; name: string } | null;
}
