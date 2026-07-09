export interface ConventionUser {
  id: number;
  name: string;
  email?: string;
  role?: string;
}

export interface Convention {
  id: number;
  amount: string;
  low_balance_notified?: boolean;
  admin_id: number;
  shop_id: number;
  admin?: ConventionUser | null;
  shop?: { id: number; name: string; manager_id?: number; manager?: ConventionUser | null } | null;
  transactions_count?: number;
  transactions_sum_amount?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ConventionTransactionType = 'WITHDRAW' | 'RECHARGE';

export interface ConventionTransaction {
  id: number;
  convention_id: number;
  type: ConventionTransactionType;
  manager_id: number | null;
  admin_id: number | null;
  amount: string;
  reason: string | null;
  notes: string | null;
  date: string;
  manager?: ConventionUser | null;
  admin?: ConventionUser | null;
  created_at?: string;
  updated_at?: string;
}

export interface AppNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  read_at: string | null;
  created_at: string;
}
