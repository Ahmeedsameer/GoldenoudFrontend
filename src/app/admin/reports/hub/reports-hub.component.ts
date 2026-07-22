import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface ReportCard {
  title: string;
  description: string;
  path?: string;
  queryParams?: Record<string, any>;
  icon: string;
  /** True when this exact functionality doesn't exist anywhere yet — rendered disabled, no link. */
  comingSoon?: boolean;
}
interface ReportGroup { title: string; cards: ReportCard[]; }

/**
 * Central navigation hub for every report — organized into the 8 business
 * sections. This is a navigation center, not a page generator: cards whose
 * data already lives inside an existing report link straight there (with a
 * section/mode query param so the right part of that page is in view)
 * instead of duplicating a page. Cards marked "قريباً" represent
 * functionality that genuinely doesn't exist anywhere in the ERP yet.
 */
@Component({
  selector: 'app-reports-hub',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reports-hub.component.html',
})
export class ReportsHubComponent {
  groups: ReportGroup[] = [
    {
      title: 'المبيعات',
      cards: [
        { title: 'تقرير المبيعات', description: 'نظرة شاملة: الإيرادات، البائعين، الفئات، العملاء، الفواتير', path: '/dashboard/reports/sales', icon: '💰' },
        { title: 'المبيعات اليومية', description: 'اتجاه المبيعات اليومي ضمن الفترة المختارة', path: '/dashboard/reports/sales', queryParams: { period: 'today', section: 'trend' }, icon: '📅' },
        { title: 'المبيعات الشهرية', description: 'اتجاه المبيعات الشهري ضمن الفترة المختارة', path: '/dashboard/reports/sales', queryParams: { period: 'month', section: 'trend' }, icon: '🗓️' },
        { title: 'مبيعات العملاء', description: 'عملاء مسجلون مقابل زبائن عابرون، وأفضل العملاء إنفاقاً', path: '/dashboard/reports/sales', queryParams: { section: 'customers' }, icon: '🧑‍🤝‍🧑' },
        { title: 'أداء البائعين', description: 'ترتيب البائعين حسب الإيرادات وعدد الفواتير', path: '/dashboard/reports/sales', queryParams: { section: 'sellers' }, icon: '🧑‍💼' },
        { title: 'مبيعات المنتجات الجاهزة', description: 'أفضل المنتجات الجاهزة مبيعاً حسب الإيرادات', path: '/dashboard/reports/sales', queryParams: { section: 'products' }, icon: '📦' },
        { title: 'مبيعات التركيبات', description: 'أفضل تركيبات العطور مبيعاً حسب الإيرادات', path: '/dashboard/reports/sales', queryParams: { section: 'products' }, icon: '🧴' },
        { title: 'تقرير الفواتير', description: 'قائمة الفواتير الكاملة مع كل الفلاتر', path: '/dashboard/reports/sales', queryParams: { section: 'invoices' }, icon: '🧾' },
        { title: 'تقرير المرتجعات', description: 'لا يوجد نظام مرتجعات في الـERP حالياً', icon: '↩️', comingSoon: true },
      ],
    },
    {
      title: 'المخزون',
      cards: [
        { title: 'تقرير المخزون', description: 'نظرة شاملة على قيمة المخزون والمنتجات المنخفضة', path: '/dashboard/stock-intelligence', icon: '📦' },
        { title: 'قيمة المخزون', description: 'قيمة المخزون وأعداد المنتجات حسب النوع', path: '/dashboard/inventory-dashboard', icon: '💎' },
        { title: 'منتجات منخفضة المخزون', description: 'المنتجات التي اقتربت من حد إعادة الطلب', path: '/dashboard/stock-intelligence', queryParams: { section: 'low-stock' }, icon: '⚠️' },
        { title: 'منتجات نفدت من المخزون', description: 'المنتجات ذات الكمية صفر حالياً', path: '/dashboard/stock-intelligence', queryParams: { section: 'low-stock' }, icon: '🚫' },
        { title: 'حركة المخزون', description: 'يعرض حالياً لكل منتج على حدة من صفحة تفاصيل المنتج', icon: '🔄', comingSoon: true },
        { title: 'المخزون الراكد', description: 'منتجات لم تُباع منذ فترة طويلة رغم توفرها', icon: '🐌', comingSoon: true },
        { title: 'منتجات قاربت الانتهاء', description: 'لا يوجد نظام تواريخ صلاحية في الـERP حالياً', icon: '⏳', comingSoon: true },
      ],
    },
    {
      title: 'المشتريات',
      cards: [
        { title: 'تقرير المشتريات', description: 'سجل التوريدات والمشتريات عبر كل الموردين', path: '/dashboard/stock', icon: '🛒' },
        { title: 'سجل المشتريات', description: 'كل عمليات الشراء والتوريد المسجّلة', path: '/dashboard/stock', icon: '📜' },
        { title: 'تحليل تكلفة الشراء', description: 'اتجاه تكلفة الشراء عبر الزمن', icon: '📉', comingSoon: true },
        { title: 'مشتريات الموردين', description: 'حجم وقيمة المشتريات من كل مورد', path: '/dashboard/stock/suppliers', icon: '🚚' },
        { title: 'أداء الموردين', description: 'تحليل تفصيلي لكل مورد من ملفه الشخصي', path: '/dashboard/stock/suppliers', icon: '📈' },
      ],
    },
    {
      title: 'التسعير',
      cards: [
        { title: 'تقرير التسعير', description: 'التكلفة، سعر البيع، والربح التقديري لكل منتج', path: '/dashboard/pricing', icon: '🏷️' },
        { title: 'منتجات بدون سعر بيع', description: 'منتجات جاهزة مُشتراة بدون سعر بيع مُعتمد', icon: '❗', comingSoon: true },
        { title: 'سجل تغييرات الأسعار', description: 'يعرض حالياً لكل منتج على حدة من صفحة تفاصيل المنتج', icon: '🕒', comingSoon: true },
        { title: 'منتجات تحتاج مراجعة السعر', description: 'منتجات لم يُراجع سعرها منذ فترة طويلة', icon: '🔍', comingSoon: true },
        { title: 'تحليل هامش الربح', description: 'توزيع هامش الربح عبر كل المنتجات', icon: '📊', comingSoon: true },
      ],
    },
    {
      title: 'تقارير العطور',
      cards: [
        { title: 'استهلاك الزيوت', description: 'الزيوت الأكثر استخداماً في تركيبات البيع الفعلية', path: '/dashboard/reports/perfume-consumption', icon: '🧪' },
        { title: 'استهلاك الزجاجات', description: 'الزجاجات الأكثر استخداماً في تركيبات البيع الفعلية', path: '/dashboard/reports/perfume-consumption', icon: '🍾' },
        { title: 'الزيوت الأكثر استخداماً', description: 'ترتيب الزيوت حسب الكمية المستهلكة', path: '/dashboard/reports/perfume-consumption', icon: '🥇' },
        { title: 'الزجاجات الأكثر استخداماً', description: 'ترتيب الزجاجات حسب الكمية المستهلكة', path: '/dashboard/reports/perfume-consumption', icon: '🥈' },
        { title: 'أفضل العطور مبيعاً', description: 'أعلى المنتجات إيراداً — جاهزة وتركيبات', path: '/dashboard/reports/sales', queryParams: { section: 'products' }, icon: '👑' },
        { title: 'إحصائيات التركيبات', description: 'إحصائيات مجمّعة لكل تركيبات العطور المُباعة', icon: '🧬', comingSoon: true },
      ],
    },
    {
      title: 'الموردون',
      cards: [
        { title: 'إحصائيات الموردين', description: 'مقارنة شاملة بين كل الموردين', icon: '📋', comingSoon: true },
        { title: 'ترتيب الموردين', description: 'ترتيب الموردين حسب الحجم والاستقرار والسعر', icon: '🏆', comingSoon: true },
        { title: 'أفضل مورد لكل فئة', description: 'أفضل مورد لكل نوع منتج (خامات، تعبئة، جاهزة)', icon: '⭐', comingSoon: true },
        { title: 'قيمة مشتريات الموردين', description: 'إجمالي قيمة المشتريات من كل مورد', path: '/dashboard/stock/suppliers', icon: '💵' },
        { title: 'تغييرات أسعار الموردين', description: 'سجل تغيّر أسعار الشراء لكل مورد عبر الزمن', icon: '📈', comingSoon: true },
        { title: 'مقارنة الموردين', description: 'مقارنة مباشرة بين مورّدين أو أكثر', icon: '⚖️', comingSoon: true },
      ],
    },
    {
      title: 'الفروع',
      cards: [
        { title: 'مقارنة الفروع', description: 'الإيرادات، الربح التقديري، وأفضل بائع لكل فرع', path: '/dashboard/reports/branch-comparison', icon: '🏬' },
        { title: 'إيرادات الفروع', description: 'إيرادات كل فرع ضمن الفترة المختارة', path: '/dashboard/reports/branch-comparison', icon: '💰' },
        { title: 'ربح الفروع', description: 'الربح التقديري لكل فرع ضمن الفترة المختارة', path: '/dashboard/reports/branch-comparison', icon: '📈' },
        { title: 'مخزون الفروع', description: 'توزيع المخزون وقيمته على كل فرع', icon: '📦', comingSoon: true },
        { title: 'استهلاك الفروع', description: 'استهلاك الزيوت والزجاجات مقسّم لكل فرع', icon: '🧪', comingSoon: true },
        { title: 'أداء الفروع', description: 'مقارنة شاملة لأداء كل فرع عبر الزمن', path: '/dashboard/reports/branch-comparison', icon: '🎯' },
      ],
    },
    {
      title: 'تقارير التحويلات',
      cards: [
        { title: 'تقارير التحويلات', description: 'مؤشرات ومتوسط الأوقات ونسبة النجاح لكل التحويلات', path: '/dashboard/reports/transfers', icon: '🔄' },
        { title: 'التحويلات حسب الفرع', description: 'الوارد والصادر لكل فرع', path: '/dashboard/reports/transfers', queryParams: { type: 'by-branch' }, icon: '🏬' },
        { title: 'التحويلات حسب المنتج', description: 'أكثر المنتجات نقلاً بين الفروع', path: '/dashboard/reports/transfers', queryParams: { type: 'by-product' }, icon: '📦' },
        { title: 'التحويلات حسب الفئة', description: 'توزيع التحويلات على فئات المنتجات', path: '/dashboard/reports/transfers', queryParams: { type: 'by-category' }, icon: '🗂️' },
        { title: 'التحويلات حسب المدير', description: 'عدد الطلبات لكل مدير فرع', path: '/dashboard/reports/transfers', queryParams: { type: 'by-manager' }, icon: '👔' },
        { title: 'التحويلات حسب الموظف', description: 'عدد الطلبات لكل موظف', path: '/dashboard/reports/transfers', queryParams: { type: 'by-employee' }, icon: '🧑‍💼' },
        { title: 'التحويلات المتأخرة', description: 'طلبات تجاوزت المهلة المتوقعة للموافقة أو الشحن', path: '/dashboard/reports/transfers', queryParams: { type: 'delayed' }, icon: '🚨' },
        { title: 'التحويلات المعلّقة', description: 'كل الطلبات التي لم تُغلق بعد', path: '/dashboard/reports/transfers', queryParams: { type: 'pending' }, icon: '⏳' },
        { title: 'تقرير الفواتير الداخلية', description: 'كل فواتير النقل الداخلية مع فلاتر كاملة: المصدر، الوجهة، النوع، الحالة، المُنشئ، المعتمِد، المستلِم', path: '/dashboard/reports/transfer-invoices', icon: '🧾' },
        { title: 'التالف أثناء النقل', description: 'الأصناف التي وصلت تالفة', path: '/dashboard/reports/transfers', queryParams: { type: 'damaged' }, icon: '💔' },
        { title: 'المفقود أثناء النقل', description: 'الأصناف التي وصلت ناقصة', path: '/dashboard/reports/transfers', queryParams: { type: 'missing' }, icon: '❓' },
      ],
    },
    {
      title: 'تقارير الهالك',
      cards: [
        { title: 'تقارير الهالك', description: 'مؤشرات وتوزيع الهالك حسب المنتج والفرع والسبب', path: '/dashboard/reports/waste', icon: '🗑️' },
        { title: 'الهالك حسب المنتج', description: 'أكثر المنتجات هالكاً وقيمتها التقديرية', path: '/dashboard/reports/waste', queryParams: { type: 'by-product' }, icon: '📦' },
        { title: 'الهالك حسب الفئة', description: 'توزيع الهالك على فئات المنتجات', path: '/dashboard/reports/waste', queryParams: { type: 'by-category' }, icon: '🗂️' },
        { title: 'الهالك حسب الفرع', description: 'أكثر الفروع هالكاً', path: '/dashboard/reports/waste', queryParams: { type: 'by-branch' }, icon: '🏬' },
        { title: 'الهالك حسب الموظف', description: 'من سجّل الهالك ولأي كمية', path: '/dashboard/reports/waste', queryParams: { type: 'by-employee' }, icon: '🧑‍💼' },
        { title: 'الهالك حسب المورد', description: 'أي مورّد جاء منه المخزون الذي تم إتلافه', path: '/dashboard/reports/waste', queryParams: { type: 'by-supplier' }, icon: '🚚' },
        { title: 'الهالك حسب السبب', description: 'كسر، انتهاء صلاحية، تسرب، فقدان...', path: '/dashboard/reports/waste', queryParams: { type: 'by-reason' }, icon: '❗' },
        { title: 'اتجاه الهالك', description: 'الكمية والقيمة يومياً عبر الفترة المختارة', path: '/dashboard/reports/waste', queryParams: { type: 'trend' }, icon: '📈' },
        { title: 'الأكثر هالكاً', description: 'أعلى 15 منتج من حيث كمية الهالك', path: '/dashboard/reports/waste', queryParams: { type: 'top-products' }, icon: '🏆' },
      ],
    },
    {
      title: 'تقارير جرد المخزون',
      cards: [
        { title: 'كل جلسات الجرد', description: 'كل جلسات الجرد بحالاتها المختلفة', path: '/dashboard/reports/counts', icon: '📋' },
        { title: 'جلسات معتمدة', description: 'الجلسات التي تم اعتمادها وتنفيذها', path: '/dashboard/reports/counts', queryParams: { type: 'approved' }, icon: '✅' },
        { title: 'جلسات معلّقة', description: 'جلسات لا تزال قيد الجرد أو المراجعة', path: '/dashboard/reports/counts', queryParams: { type: 'pending' }, icon: '⏳' },
        { title: 'دقة الفروع', description: 'نسبة دقة الجرد لكل فرع', path: '/dashboard/reports/counts', queryParams: { type: 'branch-accuracy' }, icon: '🏬' },
        { title: 'دقة الموظفين', description: 'نسبة دقة الجرد لكل موظف قام بالعد', path: '/dashboard/reports/counts', queryParams: { type: 'employee-accuracy' }, icon: '🧑‍💼' },
        { title: 'تباين المنتجات', description: 'أكثر المنتجات اختلافاً بين الجرد المتكرر', path: '/dashboard/reports/counts', queryParams: { type: 'product-variance' }, icon: '📊' },
        { title: 'أكبر الفروقات', description: 'أعلى 20 فرقاً بين الكمية الفعلية والنظامية', path: '/dashboard/reports/counts', queryParams: { type: 'biggest-differences' }, icon: '⚠️' },
        { title: 'اتجاه دقة الجرد', description: 'دقة كل جلسة جرد عبر الزمن', path: '/dashboard/reports/counts', queryParams: { type: 'accuracy-trend' }, icon: '📈' },
      ],
    },
    {
      title: 'تقارير تسويات المخزون',
      cards: [
        { title: 'التسويات الموجبة', description: 'كل التسويات التي زادت المخزون', path: '/dashboard/reports/adjustments', queryParams: { type: 'positive' }, icon: '📈' },
        { title: 'التسويات السالبة', description: 'كل التسويات التي أنقصت المخزون', path: '/dashboard/reports/adjustments', queryParams: { type: 'negative' }, icon: '📉' },
        { title: 'التسويات حسب الفرع', description: 'حجم التسويات لكل فرع', path: '/dashboard/reports/adjustments', queryParams: { type: 'by-branch' }, icon: '🏬' },
        { title: 'التسويات حسب المنتج', description: 'أكثر المنتجات تسويةً', path: '/dashboard/reports/adjustments', queryParams: { type: 'by-product' }, icon: '📦' },
        { title: 'التسويات حسب الموظف', description: 'من طلب كل تسوية', path: '/dashboard/reports/adjustments', queryParams: { type: 'by-employee' }, icon: '🧑‍💼' },
        { title: 'التسويات حسب الأصل', description: 'ناتجة عن جرد أم تسوية يدوية', path: '/dashboard/reports/adjustments', queryParams: { type: 'by-reason' }, icon: '❗' },
        { title: 'الاتجاه الشهري', description: 'حجم التسويات شهرياً', path: '/dashboard/reports/adjustments', queryParams: { type: 'monthly-trend' }, icon: '📊' },
      ],
    },
    {
      title: 'حركة وتتبّع المخزون',
      cards: [
        { title: 'تقرير حركة المخزون', description: 'كشف حساب كامل: مشتريات، مبيعات، نقل، هالك، تسويات — لكل صنف', path: '/dashboard/reports/stock-movement', icon: '📒' },
        { title: 'دفتر حساب المخزون', description: 'السجل الزمني الكامل لحركة صنف واحد مع الرصيد الجاري', path: '/dashboard/reports/inventory-ledger', icon: '📖' },
        { title: 'تتبّع دفعات المخزون (FIFO)', description: 'دورة حياة كل دفعة شراء من المورّد حتى الاستهلاك الكامل', path: '/dashboard/reports/batches', icon: '🔎' },
        { title: 'تقرير التدقيق على المخزون', description: 'كل عملية أثّرت على المخزون: من قام بها، والفرق بين الكمية القديمة والجديدة', path: '/dashboard/reports/inventory-audit', icon: '🧮' },
      ],
    },
    {
      title: 'التقارير المالية',
      cards: [
        { title: 'الربح الشهري', description: 'الإيرادات مقابل التكلفة التقديرية شهرياً', path: '/dashboard/reports/monthly-profit', icon: '📈' },
        { title: 'الإيرادات', description: 'ملخص الخزائن والمعاملات المالية عبر الفروع', path: '/dashboard/reports/financial', icon: '🏦' },
        { title: 'المصروفات', description: 'لا يوجد نظام تتبّع مصروفات في الـERP حالياً', icon: '💸', comingSoon: true },
        { title: 'صافي الربح', description: 'لا يوجد نظام تتبّع مصروفات في الـERP حالياً', icon: '🎯', comingSoon: true },
        { title: 'التدفق النقدي', description: 'لا يوجد نظام تتبّع مصروفات في الـERP حالياً', icon: '🌊', comingSoon: true },
      ],
    },
  ];
}
