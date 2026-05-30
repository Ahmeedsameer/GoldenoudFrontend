export interface PerfumeShop {
  id: number;
  name: string;
  address: string;
  phone: string;
  managerName: string;
  image?: string;
}

export const DEMO_SHOPS: PerfumeShop[] = [
  {
    id: 1,
    name: 'بيت العطور',
    address: 'الرياض - شارع العليا',
    phone: '011-1234567',
    managerName: 'أحمد محمد'
  },
  {
    id: 2,
    name: 'عطورات جوهرة',
    address: 'جدة - شارع التحلية',
    phone: '012-7654321',
    managerName: 'سارة علي'
  },
  {
    id: 3,
    name: 'مسك العنوان',
    address: 'الدمام - حي الفاتح',
    phone: '013-9876543',
    managerName: 'خالد يوسف'
  },
  {
    id: 4,
    name: 'روي للعود',
    address: 'الرياض - حي الازدهار',
    phone: '011-5556789',
    managerName: 'منى عبدالله'
  },
  {
    id: 5,
    name: 'العود العربي',
    address: 'المدينة المنورة',
    phone: '014-4443210',
    managerName: 'فاطمة محمد'
  },
  {
    id: 6,
    name: 'دامور العطور',
    address: 'الرياض - حي الملقا',
    phone: '011-3334455',
    managerName: 'عبدالرحمن'
  }
];