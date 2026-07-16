import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../services/hr.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

@Component({
  selector: 'app-hr-bonuses-penalties',
  imports: [CommonModule, FormsModule, LoadingComponent, DatePickerComponent],
  templateUrl: './hr-bonuses-penalties.component.html',
})
export class HrBonusesPenaltiesComponent implements OnInit {
  private hr = inject(HrService);

  tab: 'bonuses' | 'penalties' = 'bonuses';
  loading = false;
  saving = false;
  error = '';

  bonuses: any = null;
  penalties: any = null;
  employees: { id: number; name: string }[] = [];

  today = new Date().toISOString().substring(0, 10);
  form = { user_id: null as number | null, amount: null as number | null, reason: '', date: this.today, notes: '' };

  reasonPresets = {
    bonuses: ['أداء ممتاز', 'مكافأة عيد', 'تحقيق هدف مبيعات', 'رضا العملاء'],
    penalties: ['تحذير', 'شكوى عميل', 'مخالفة سياسة', 'إجراء تأديبي'],
  };

  ngOnInit(): void {
    this.hr.getEmployees({ page: -1 }).subscribe({
      next: (r) => (this.employees = (r.data?.data || r.data || r || []).map((e: any) => ({ id: e.id, name: e.name }))),
      error: () => {},
    });
    this.load();
  }

  switchTab(t: 'bonuses' | 'penalties') {
    this.tab = t;
    this.form = { user_id: null, amount: null, reason: '', date: this.today, notes: '' };
    this.error = '';
    this.load();
  }

  load() {
    this.loading = true;
    const req = this.tab === 'bonuses' ? this.hr.getBonuses({}) : this.hr.getPenalties({});
    req.subscribe({
      next: (d) => { if (this.tab === 'bonuses') this.bonuses = d; else this.penalties = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  get rows(): any[] {
    const d = this.tab === 'bonuses' ? this.bonuses : this.penalties;
    return d?.data ?? [];
  }

  submit() {
    if (!this.form.user_id || !this.form.amount || !this.form.reason || !this.form.date) {
      this.error = 'يرجى تعبئة كل الحقول المطلوبة (الموظف، المبلغ، السبب، التاريخ)';
      return;
    }
    this.error = '';
    this.saving = true;
    const payload = { ...this.form, user_id: this.form.user_id!, amount: this.form.amount! };
    const req = this.tab === 'bonuses' ? this.hr.createBonus(payload) : this.hr.createPenalty(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.form = { user_id: null, amount: null, reason: '', date: this.today, notes: '' };
        this.load();
      },
      error: (e) => { this.saving = false; this.error = e?.error?.message || 'تعذّر الحفظ'; },
    });
  }

  remove(row: any) {
    const label = this.tab === 'bonuses' ? 'المكافأة' : 'الخصم';
    if (!confirm(`حذف ${label} نهائيًا؟`)) return;
    const req = this.tab === 'bonuses' ? this.hr.deleteBonus(row.id) : this.hr.deletePenalty(row.id);
    req.subscribe({ next: () => this.load(), error: (e) => alert(e?.error?.message || 'تعذّر الحذف') });
  }
}
