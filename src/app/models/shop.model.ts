export interface ShopManager {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Shop {
  id: number;
  name: string;
  address: string;
  username: string;
  status: 'active' | 'inactive';
  employees_count: number;
  manager: ShopManager | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  shift_start: string;
  shift_end: string;
}

export interface UserSearchResult {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
}
