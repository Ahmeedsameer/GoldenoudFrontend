import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerComponent } from '../../form/date-picker/date-picker.component';

export type ReportPeriod = 'today' | 'week' | 'month' | 'year';

export interface ReportFilterOption { id: number | string; name: string; }

export interface ReportFilterValue {
  period: ReportPeriod;
  from: string;
  to: string;
  customRangeActive: boolean;
  shopId: number | null;
  productType: string | null;
  categoryId: number | null;
  supplierId: number | null;
  sellerId: number | null;
  search: string;
}

export function defaultReportFilterValue(): ReportFilterValue {
  return {
    period: 'month', from: '', to: '', customRangeActive: false,
    shopId: null, productType: null, categoryId: null, supplierId: null, sellerId: null, search: '',
  };
}

const PRODUCT_TYPES: ReportFilterOption[] = [
  { id: 'RAW_MATERIAL', name: 'خامات' },
  { id: 'PACKAGING', name: 'مستلزمات تعبئة' },
  { id: 'READY_PRODUCT', name: 'منتجات جاهزة' },
  { id: 'COMPOUND', name: 'تركيبات' },
];

/**
 * The one filter bar every report uses — date range (presets + custom),
 * branch, product type, category, supplier, seller, and search. A report
 * enables only the pieces it needs via the `show*` inputs and reads/writes
 * a single ReportFilterValue via [(value)].
 */
@Component({
  selector: 'app-report-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  templateUrl: './report-filter-bar.component.html',
})
export class ReportFilterBarComponent {
  @Input() value: ReportFilterValue = defaultReportFilterValue();
  @Output() valueChange = new EventEmitter<ReportFilterValue>();
  @Output() apply = new EventEmitter<void>();

  @Input() showPeriod = true;
  @Input() showBranch = false;
  @Input() showProductType = false;
  @Input() showCategory = false;
  @Input() showSupplier = false;
  @Input() showSeller = false;
  @Input() showSearch = false;
  @Input() searchPlaceholder = 'بحث...';

  @Input() shops: ReportFilterOption[] = [];
  @Input() categories: ReportFilterOption[] = [];
  @Input() suppliers: ReportFilterOption[] = [];
  @Input() sellers: ReportFilterOption[] = [];

  productTypes = PRODUCT_TYPES;
  showCustomPicker = false;

  periods: { key: ReportPeriod; label: string }[] = [
    { key: 'today', label: 'اليوم' }, { key: 'week', label: 'الأسبوع' },
    { key: 'month', label: 'الشهر' }, { key: 'year', label: 'السنة' },
  ];

  private emit(patch: Partial<ReportFilterValue>): void {
    this.value = { ...this.value, ...patch };
    this.valueChange.emit(this.value);
  }

  setPeriod(p: ReportPeriod): void {
    this.emit({ period: p, customRangeActive: false, from: '', to: '' });
    this.showCustomPicker = false;
    this.apply.emit();
  }

  applyRange(): void {
    if (!this.value.from || !this.value.to) return;
    this.emit({ customRangeActive: true });
    this.showCustomPicker = false;
    this.apply.emit();
  }

  clearRange(): void {
    this.emit({ customRangeActive: false, from: '', to: '' });
    this.showCustomPicker = false;
    this.apply.emit();
  }

  onFromChange(v: string): void { this.value = { ...this.value, from: v }; }
  onToChange(v: string): void { this.value = { ...this.value, to: v }; }

  setShop(id: string): void { this.emit({ shopId: id ? +id : null }); this.apply.emit(); }
  setProductType(id: string): void { this.emit({ productType: id || null }); this.apply.emit(); }
  setCategory(id: string): void { this.emit({ categoryId: id ? +id : null }); this.apply.emit(); }
  setSupplier(id: string): void { this.emit({ supplierId: id ? +id : null }); this.apply.emit(); }
  setSeller(id: string): void { this.emit({ sellerId: id ? +id : null }); this.apply.emit(); }

  onSearchChange(v: string): void {
    this.emit({ search: v });
    this.apply.emit();
  }
}
