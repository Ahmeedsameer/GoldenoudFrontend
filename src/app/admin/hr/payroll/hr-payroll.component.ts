import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../services/hr.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';

@Component({
  selector: 'app-hr-payroll',
  imports: [CommonModule, FormsModule, LoadingComponent, ModalComponent],
  templateUrl: './hr-payroll.component.html',
})
export class HrPayrollComponent implements OnInit {
  private hr = inject(HrService);

  loading = false;
  generating = false;
  busyId: number | null = null;

  now = new Date();
  year = this.now.getFullYear();
  month = this.now.getMonth() + 1;
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  years = [this.now.getFullYear() - 1, this.now.getFullYear(), this.now.getFullYear() + 1];

  payrolls: any[] = [];

  // breakdown modal
  showDetail = false;
  detail: any = null;

  // deduction settings
  showSettings = false;
  settings: any[] = [];

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.hr.getPayrolls({ year: this.year, month: this.month, limit: 100 }).subscribe({
      next: (res) => { this.payrolls = res?.data || []; this.loading = false; },
      error: () => { this.payrolls = []; this.loading = false; },
    });
  }

  generateAll() {
    if (!confirm(`توليد كشوف رواتب كل الموظفين لشهر ${this.month}/${this.year}؟`)) return;
    this.generating = true;
    this.hr.generatePayroll({ year: this.year, month: this.month }).subscribe({
      next: () => { this.generating = false; this.load(); },
      error: (e) => { this.generating = false; alert(e?.error?.message || 'تعذّر التوليد'); },
    });
  }

  openDetail(p: any) {
    this.showDetail = true;
    this.detail = null;
    this.hr.getPayroll(p.id).subscribe({ next: (d) => this.detail = d, error: () => {} });
  }

  lock(p: any)   { this.act(p, () => this.hr.lockPayroll(p.id)); }
  unlock(p: any) { this.act(p, () => this.hr.unlockPayroll(p.id)); }
  pay(p: any)    { this.act(p, () => this.hr.markPaidPayroll(p.id)); }

  private act(p: any, fn: () => any) {
    this.busyId = p.id;
    fn().subscribe({
      next: () => { this.busyId = null; this.load(); },
      error: (e: any) => { this.busyId = null; alert(e?.error?.message || 'تعذّر'); },
    });
  }

  // ── Deduction settings ──────────────────────────
  openSettings() {
    this.showSettings = true;
    this.hr.getDeductionSettings().subscribe({ next: (s) => this.settings = s || [], error: () => {} });
  }

  saveSetting(s: any) {
    this.hr.updateDeductionSetting(s.id, { value: s.value, mode: s.mode, is_active: s.is_active }).subscribe({
      next: () => { s._saved = true; setTimeout(() => s._saved = false, 1500); },
      error: (e) => alert(e?.error?.message || 'تعذّر الحفظ'),
    });
  }
}
